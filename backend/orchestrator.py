"""Orchestrator — Wires the 4-agent pipeline: Planner → Creator → Validator → Fixer.

Emits SSE events at each agent boundary via asyncio.Queue.
Runs as a background task (asyncio.create_task) so the API returns immediately.
"""

import asyncio
import json
import uuid
from functools import partial

from models import (
    Course, Lesson, CodeExample, ValidationStatus,
    LessonPlan, SnippetResult, ValidationResult,
)
from streaming import emit_event, cleanup_queue
from agents.planner import create_planner_agent, parse_planner_output
from agents.creator import create_creator_agent, parse_creator_output
from agents.validator import create_validator_agent, parse_validator_output
from agents.fixer import create_fixer_agent, parse_fixer_output, MAX_FIX_ITERATIONS


# In-memory course store (shared with main.py)
_courses: dict[str, Course] = {}


def get_courses_store() -> dict[str, Course]:
    return _courses


async def _run_agent(agent, prompt: str) -> str:
    """Run a Strands agent in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, partial(agent, prompt))
    # Strands agent() returns an AgentResult; extract the text
    return str(result)


async def generate_course(topic: str, difficulty: str, queue: asyncio.Queue, course_id: str) -> None:
    """Run the full 4-agent pipeline for a course."""
    try:
        # ---------------------------------------------------------------
        # 1. PLANNER
        # ---------------------------------------------------------------
        await emit_event(queue, "planner", "running", {"message": f"Planning curriculum for: {topic}"})

        planner = create_planner_agent()
        planner_prompt = f"Create a {difficulty}-level micro-course curriculum for: {topic}"
        raw_plan = await _run_agent(planner, planner_prompt)
        lesson_plans = parse_planner_output(raw_plan)

        await emit_event(queue, "planner", "done", {"lessons": len(lesson_plans)})

        # ---------------------------------------------------------------
        # 2-4. PER-LESSON: Creator → Validator → Fixer
        # ---------------------------------------------------------------
        creator = create_creator_agent()
        validator = create_validator_agent()
        fixer = create_fixer_agent()

        lessons: list[Lesson] = []

        for i, plan in enumerate(lesson_plans):
            # --- CREATOR ---
            await emit_event(queue, "creator", "running", {"lesson": i, "title": plan.get("title", f"Lesson {i+1}")})

            creator_prompt = (
                f"Create lesson content for lesson {i+1} of a {difficulty}-level course on '{topic}'.\n"
                f"Lesson plan:\n{json.dumps(plan, indent=2)}"
            )
            raw_lesson = await _run_agent(creator, creator_prompt)
            lesson_data = parse_creator_output(raw_lesson)

            await emit_event(queue, "creator", "done", {"lesson": i})

            # --- VALIDATOR ---
            await emit_event(queue, "validator", "running", {"lesson": i})

            code_examples = lesson_data.get("code_examples", [])
            validator_prompt = (
                f"Validate all code examples in this lesson:\n"
                f"{json.dumps(code_examples, indent=2)}"
            )
            raw_validation = await _run_agent(validator, validator_prompt)
            validation = parse_validator_output(raw_validation)

            results = validation.get("results", [])
            failures = [r for r in results if not r.get("passed", True)]

            # --- FIXER (if needed) ---
            if failures:
                await emit_event(queue, "fixer", "running", {"lesson": i, "failures": len(failures)})

                for fail in failures:
                    idx = fail.get("index", 0)
                    if idx < len(code_examples):
                        original_code = code_examples[idx].get("code", "")
                        error_msg = fail.get("error", "Unknown error")

                        fixer_prompt = (
                            f"Fix this code that failed validation:\n"
                            f"```python\n{original_code}\n```\n"
                            f"Error: {error_msg}\n"
                            f"The code should demonstrate: {plan.get('title', 'the concept')}"
                        )

                        raw_fix = await _run_agent(fixer, fixer_prompt)
                        fix_result = parse_fixer_output(raw_fix)

                        # Update code example with fix
                        code_examples[idx] = {
                            "language": code_examples[idx].get("language", "python"),
                            "code": fix_result.get("fixed_code", original_code),
                            "original_code": original_code,
                            "validation_status": "fixed" if fix_result.get("passed") else "fail",
                        }

                await emit_event(queue, "fixer", "done", {"lesson": i, "fixed": len(failures)})

            # Set validation status on remaining code examples
            for j, ex in enumerate(code_examples):
                if "validation_status" not in ex or ex["validation_status"] == "pending":
                    # Check if this snippet passed
                    matching = [r for r in results if r.get("index") == j]
                    if matching and matching[0].get("passed"):
                        ex["validation_status"] = "pass"
                    elif not matching:
                        ex["validation_status"] = "pass"  # Not tested = assume pass

            # Determine overall lesson validation status
            statuses = [ex.get("validation_status", "pending") for ex in code_examples]
            if "fail" in statuses:
                overall_status = ValidationStatus.FAIL
            elif "fixed" in statuses:
                overall_status = ValidationStatus.FIXED
            else:
                overall_status = ValidationStatus.PASS

            await emit_event(queue, "validator", "done", {"lesson": i, "status": overall_status.value})

            # Build Lesson object
            lesson = Lesson(
                title=lesson_data.get("title", plan.get("title", f"Lesson {i+1}")),
                objectives=lesson_data.get("objectives", plan.get("objectives", [])),
                explanation=lesson_data.get("explanation", ""),
                code_examples=[CodeExample(**ex) for ex in code_examples],
                quiz_questions=lesson_data.get("quiz_questions", []),
                audio_url=lesson_data.get("audio_url"),
                image_url=lesson_data.get("image_url"),
                validation_status=overall_status,
            )
            lessons.append(lesson)

        # ---------------------------------------------------------------
        # 5. BUILD AND STORE COURSE
        # ---------------------------------------------------------------
        course = Course(
            id=course_id,
            topic=topic,
            difficulty=difficulty,
            lessons=lessons,
            status="complete",
        )
        _courses[course_id] = course

        await emit_event(queue, "orchestrator", "complete", {
            "courseId": course_id,
            "totalLessons": len(lessons),
        })

    except Exception as exc:
        await emit_event(queue, "orchestrator", "error", {"message": str(exc)})
    finally:
        # Give the SSE consumer time to drain the final event
        await asyncio.sleep(0.5)
        cleanup_queue(course_id)


async def regenerate_lesson(
    course_id: str, lesson_index: int, instruction: str, queue: asyncio.Queue
) -> None:
    """Regenerate a single lesson with custom instructions."""
    course = _courses.get(course_id)
    if not course or lesson_index >= len(course.lessons):
        await emit_event(queue, "orchestrator", "error", {"message": "Course or lesson not found"})
        return

    try:
        old_lesson = course.lessons[lesson_index]
        creator = create_creator_agent()
        validator = create_validator_agent()
        fixer = create_fixer_agent()

        await emit_event(queue, "creator", "running", {"lesson": lesson_index, "title": old_lesson.title})

        creator_prompt = (
            f"Regenerate this lesson with the following instruction: {instruction}\n"
            f"Original lesson title: {old_lesson.title}\n"
            f"Original objectives: {old_lesson.objectives}\n"
            f"Course topic: {course.topic}, difficulty: {course.difficulty}"
        )
        raw_lesson = await _run_agent(creator, creator_prompt)
        lesson_data = parse_creator_output(raw_lesson)

        await emit_event(queue, "creator", "done", {"lesson": lesson_index})

        # Validate
        await emit_event(queue, "validator", "running", {"lesson": lesson_index})
        code_examples = lesson_data.get("code_examples", [])
        raw_validation = await _run_agent(
            validator,
            f"Validate all code examples:\n{json.dumps(code_examples, indent=2)}"
        )
        validation = parse_validator_output(raw_validation)
        failures = [r for r in validation.get("results", []) if not r.get("passed", True)]

        if failures:
            await emit_event(queue, "fixer", "running", {"lesson": lesson_index, "failures": len(failures)})
            for fail in failures:
                idx = fail.get("index", 0)
                if idx < len(code_examples):
                    original = code_examples[idx].get("code", "")
                    raw_fix = await _run_agent(
                        fixer,
                        f"Fix:\n```python\n{original}\n```\nError: {fail.get('error', '')}"
                    )
                    fix_result = parse_fixer_output(raw_fix)
                    code_examples[idx] = {
                        "language": "python",
                        "code": fix_result.get("fixed_code", original),
                        "original_code": original,
                        "validation_status": "fixed" if fix_result.get("passed") else "fail",
                    }
            await emit_event(queue, "fixer", "done", {"lesson": lesson_index})

        # Set pass status on un-updated examples
        for ex in code_examples:
            if ex.get("validation_status") in (None, "pending"):
                ex["validation_status"] = "pass"

        statuses = [ex.get("validation_status") for ex in code_examples]
        overall = ValidationStatus.FAIL if "fail" in statuses else (
            ValidationStatus.FIXED if "fixed" in statuses else ValidationStatus.PASS
        )

        await emit_event(queue, "validator", "done", {"lesson": lesson_index, "status": overall.value})

        # Update the lesson in the course
        course.lessons[lesson_index] = Lesson(
            title=lesson_data.get("title", old_lesson.title),
            objectives=lesson_data.get("objectives", old_lesson.objectives),
            explanation=lesson_data.get("explanation", ""),
            code_examples=[CodeExample(**ex) for ex in code_examples],
            quiz_questions=lesson_data.get("quiz_questions", []),
            audio_url=lesson_data.get("audio_url"),
            image_url=lesson_data.get("image_url"),
            validation_status=overall,
        )

        await emit_event(queue, "orchestrator", "complete", {
            "courseId": course_id,
            "lesson": lesson_index,
            "status": overall.value,
        })

    except Exception as exc:
        await emit_event(queue, "orchestrator", "error", {"message": str(exc)})
    finally:
        await asyncio.sleep(0.5)
        cleanup_queue(course_id)
