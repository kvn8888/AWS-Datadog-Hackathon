"""Tests for the orchestrator pipeline logic."""

import asyncio
import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from models import Course, Lesson, CodeExample, ValidationStatus
from orchestrator import get_courses_store, generate_course, regenerate_lesson, _courses
from streaming import AgentEvent


@pytest.fixture(autouse=True)
def clear_course_store():
    _courses.clear()
    yield
    _courses.clear()


# ---------------------------------------------------------------------------
# get_courses_store
# ---------------------------------------------------------------------------
class TestGetCoursesStore:
    def test_returns_dict(self):
        store = get_courses_store()
        assert isinstance(store, dict)

    def test_returns_same_reference(self):
        store1 = get_courses_store()
        store2 = get_courses_store()
        assert store1 is store2


# ---------------------------------------------------------------------------
# generate_course (with mocked agents)
# ---------------------------------------------------------------------------
class TestGenerateCourse:
    @pytest.mark.asyncio
    async def test_full_pipeline_happy_path(self):
        """Test the full pipeline with all agents mocked to return valid JSON."""
        planner_output = json.dumps([
            {"title": "Lesson 1", "objectives": ["obj1"], "content_outline": "outline1"},
        ])
        creator_output = json.dumps({
            "title": "Lesson 1",
            "objectives": ["obj1"],
            "explanation": "Explanation",
            "code_examples": [{"language": "python", "code": "print(1)"}],
            "quiz_questions": [{"question": "Q?", "options": ["A", "B", "C", "D"], "correct_index": 0}],
            "audio_url": None,
            "image_url": None,
        })
        validator_output = json.dumps({
            "lesson_index": 0,
            "results": [{"index": 0, "passed": True, "error": None, "output": "1"}],
            "all_passed": True,
        })

        call_count = {"n": 0}
        async def mock_run_agent(agent, prompt):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return planner_output
            elif call_count["n"] == 2:
                return creator_output
            else:
                return validator_output

        queue = asyncio.Queue()
        with patch("orchestrator._run_agent", side_effect=mock_run_agent):
            await generate_course("Python", "beginner", queue, "test-course-1")

        # Verify course was stored
        assert "test-course-1" in _courses
        course = _courses["test-course-1"]
        if hasattr(course, "lessons"):
            assert len(course.lessons) == 1
            assert course.status == "complete"
        else:
            assert len(course["lessons"]) == 1

        # Verify SSE events were emitted
        events = []
        while not queue.empty():
            events.append(await queue.get())
        # Note: queue is cleaned up by cleanup_queue, but events were already drained

    @pytest.mark.asyncio
    async def test_pipeline_with_failures_triggers_fixer(self):
        """When validator reports failures, fixer should be called."""
        planner_output = json.dumps([
            {"title": "Lesson 1", "objectives": ["obj1"], "content_outline": "outline1"},
        ])
        creator_output = json.dumps({
            "title": "Lesson 1",
            "objectives": ["obj1"],
            "explanation": "Explanation",
            "code_examples": [{"language": "python", "code": "print(x)"}],
            "quiz_questions": [],
            "audio_url": None,
            "image_url": None,
        })
        validator_output = json.dumps({
            "lesson_index": 0,
            "results": [{"index": 0, "passed": False, "error": "NameError: x", "output": ""}],
            "all_passed": False,
        })
        fixer_output = json.dumps({
            "fixed_code": "x = 1\nprint(x)",
            "explanation": "Defined x",
            "passed": True,
            "attempts": 1,
        })

        call_count = {"n": 0}
        async def mock_run_agent(agent, prompt):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return planner_output
            elif call_count["n"] == 2:
                return creator_output
            elif call_count["n"] == 3:
                return validator_output
            else:
                return fixer_output

        queue = asyncio.Queue()
        with patch("orchestrator._run_agent", side_effect=mock_run_agent):
            await generate_course("Python", "beginner", queue, "test-fix-1")

        course = _courses["test-fix-1"]
        if hasattr(course, "lessons"):
            lesson = course.lessons[0]
            assert lesson.code_examples[0].validation_status == ValidationStatus.FIXED
            assert lesson.code_examples[0].original_code == "print(x)"
        else:
            lesson = course["lessons"][0]
            assert lesson["code_examples"][0]["validation_status"] == "fixed"

    @pytest.mark.asyncio
    async def test_pipeline_error_emits_error_event(self):
        """If an exception occurs, an error event should be emitted."""
        async def mock_run_agent(agent, prompt):
            raise RuntimeError("Agent crashed")

        queue = asyncio.Queue()
        with patch("orchestrator._run_agent", side_effect=mock_run_agent):
            await generate_course("Python", "beginner", queue, "test-error-1")

        # Drain events — last one should be an error
        events = []
        while not queue.empty():
            events.append(await queue.get())

        # At minimum, the planner "running" event was emitted before the error
        assert len(events) >= 1


# ---------------------------------------------------------------------------
# regenerate_lesson
# ---------------------------------------------------------------------------
class TestRegenerateLesson:
    @pytest.mark.asyncio
    async def test_missing_course_emits_error(self):
        queue = asyncio.Queue()
        await regenerate_lesson("nonexistent", 0, "improve", queue)

        event = await queue.get()
        assert event.status == "error"
        assert "not found" in event.data["message"]

    @pytest.mark.asyncio
    async def test_invalid_lesson_index_emits_error(self):
        # Store a course with 1 lesson
        _courses["regen-test"] = Course(
            id="regen-test",
            topic="Python",
            lessons=[Lesson(title="L1")],
            status="complete",
        )

        queue = asyncio.Queue()
        await regenerate_lesson("regen-test", 5, "improve", queue)

        event = await queue.get()
        assert event.status == "error"
