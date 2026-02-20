"""Tests for SSE streaming infrastructure."""

import asyncio
import json
import pytest
from dataclasses import asdict
from streaming import (
    AgentEvent,
    get_or_create_queue,
    cleanup_queue,
    emit_event,
    sse_generator,
    _course_queues,
)


@pytest.fixture(autouse=True)
def clear_queues():
    """Ensure queue state is clean for each test."""
    _course_queues.clear()
    yield
    _course_queues.clear()


# ---------------------------------------------------------------------------
# AgentEvent
# ---------------------------------------------------------------------------
class TestAgentEvent:
    def test_creation(self):
        event = AgentEvent(agent="planner", status="running", data={"msg": "hi"})
        assert event.agent == "planner"
        assert event.status == "running"
        assert event.data == {"msg": "hi"}

    def test_serialization(self):
        event = AgentEvent(agent="creator", status="done", data={"lesson": 0})
        d = asdict(event)
        assert d["agent"] == "creator"
        assert json.dumps(d)  # JSON-serializable


# ---------------------------------------------------------------------------
# Queue management
# ---------------------------------------------------------------------------
class TestQueueManagement:
    def test_get_or_create_new(self):
        q = get_or_create_queue("course-1")
        assert isinstance(q, asyncio.Queue)
        assert "course-1" in _course_queues

    def test_get_or_create_existing(self):
        q1 = get_or_create_queue("course-2")
        q2 = get_or_create_queue("course-2")
        assert q1 is q2

    def test_cleanup_existing(self):
        get_or_create_queue("course-3")
        cleanup_queue("course-3")
        assert "course-3" not in _course_queues

    def test_cleanup_missing_no_error(self):
        cleanup_queue("nonexistent")  # Should not raise


# ---------------------------------------------------------------------------
# emit_event
# ---------------------------------------------------------------------------
class TestEmitEvent:
    @pytest.mark.asyncio
    async def test_puts_event_on_queue(self):
        q = asyncio.Queue()
        await emit_event(q, "validator", "running", {"lesson": 1})
        event = await q.get()
        assert isinstance(event, AgentEvent)
        assert event.agent == "validator"
        assert event.status == "running"
        assert event.data["lesson"] == 1


# ---------------------------------------------------------------------------
# sse_generator
# ---------------------------------------------------------------------------
class TestSSEGenerator:
    @pytest.mark.asyncio
    async def test_yields_sse_format(self):
        q = get_or_create_queue("sse-test")
        await q.put(AgentEvent(agent="planner", status="running", data={}))
        await q.put(AgentEvent(agent="orchestrator", status="complete", data={}))

        frames = []
        async for frame in sse_generator("sse-test"):
            frames.append(frame)

        assert len(frames) == 2
        assert frames[0].startswith("data: ")
        assert frames[0].endswith("\n\n")

        # Parse the JSON from the SSE frame
        payload = json.loads(frames[0].removeprefix("data: ").strip())
        assert payload["agent"] == "planner"

    @pytest.mark.asyncio
    async def test_stops_on_complete(self):
        q = get_or_create_queue("stop-test")
        await q.put(AgentEvent(agent="orchestrator", status="complete", data={}))

        count = 0
        async for _ in sse_generator("stop-test"):
            count += 1
        assert count == 1

    @pytest.mark.asyncio
    async def test_stops_on_error(self):
        q = get_or_create_queue("error-test")
        await q.put(AgentEvent(agent="orchestrator", status="error", data={"message": "boom"}))

        count = 0
        async for _ in sse_generator("error-test"):
            count += 1
        assert count == 1
