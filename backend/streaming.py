"""SSE streaming infrastructure for agent status events.

Uses in-process asyncio.Queue per course ID. Each agent boundary
emits an AgentEvent that the SSE endpoint drains to the browser.
"""

import asyncio
import json
from dataclasses import dataclass, asdict
from typing import AsyncGenerator


@dataclass
class AgentEvent:
    """Event emitted at each agent boundary during course generation."""
    agent: str    # "planner" | "creator" | "validator" | "fixer" | "orchestrator"
    status: str   # "running" | "done" | "error" | "complete"
    data: dict


# In-memory store: courseId -> asyncio.Queue
_course_queues: dict[str, asyncio.Queue] = {}


def get_or_create_queue(course_id: str) -> asyncio.Queue:
    """Get existing queue for a course or create a new one."""
    if course_id not in _course_queues:
        _course_queues[course_id] = asyncio.Queue()
    return _course_queues[course_id]


def cleanup_queue(course_id: str) -> None:
    """Remove a queue after generation completes."""
    _course_queues.pop(course_id, None)


async def emit_event(queue: asyncio.Queue, agent: str, status: str, data: dict) -> None:
    """Push an agent event onto the queue for SSE delivery."""
    await queue.put(AgentEvent(agent=agent, status=status, data=data))


async def sse_generator(course_id: str) -> AsyncGenerator[str, None]:
    """Async generator that drains the course queue as SSE data frames."""
    queue = get_or_create_queue(course_id)
    while True:
        event = await queue.get()
        yield f"data: {json.dumps(asdict(event))}\n\n"
        if event.status in ("complete", "error"):
            break
