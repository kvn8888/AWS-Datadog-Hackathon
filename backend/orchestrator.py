"""Orchestrator — Wires the 4-agent pipeline: Planner → Creator → Validator → Fixer.

Emits SSE events at each agent boundary via asyncio.Queue.
Runs as a background task (asyncio.create_task) so the API returns immediately.

Performance: lessons are processed in parallel after planning.
Validation runs code directly (no LLM) for speed.
"""

import asyncio
import json
import time
import uuid
from functools import partial

from models import (
    Course, Lesson, CodeExample, ValidationStatus,
    LessonPlan, SnippetResult, ValidationResult,
)
from streaming import emit_event, cleanup_queue
from agents.planner import create_planner_agent, parse_planner_output
from agents.creator import create_creator_agent, parse_creator_output
from agents.fixer import create_fixer_agent, parse_fixer_output, MAX_FIX_ITERATIONS
from tools.testsprite import _run_code_locally


# In-memory course store (shared with main.py)
_courses: dict[str, Course] = {}


def get_courses_store() -> dict[str, Course]:
    return _courses


async def _run_agent(agent, prompt: str) -> str:
    """Run a Strands agent in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, partial(agent, prompt))
    # Strands agent() returns an AgentResult; extract the text and strip trailing newlines
    return str(result).strip()


def _validate_code_directly(code: str, language: str = "python") -> dict:
    """Run code directly via subprocess — no LLM needed."""
    return _run_code_locally(code, language)


async def _process_lesson(
    i: int, plan: dict, topic: str, difficulty: str,
    queue: asyncio.Queue
) -> tuple[Lesson, int, int, int]:
    """Process a single lesson: create → validate → fix. Returns (lesson, checks, failures, fixes)."""
    # Create per-lesson agent instances (Strands doesn't support concurrent use)
    creator = create_creator_agent()
    fixer = create_fixer_agent()

    lesson_start = time.time()
    total_checks = 0
    total_failures = 0
    total_fixes = 0

    # --- CREATOR ---
    await emit_event(queue, "creator", "running", {
        "lesson": i, "title": plan.get("title", f"Lesson {i+1}"),
        "message": f"Writing lesson {i+1}: {plan.get('title', '')}..."
    })

    t0 = time.time()
    creator_prompt = (
        f"Create lesson content for lesson {i+1} of a {difficulty}-level course on '{topic}'.\n"
        f"Lesson plan:\n{json.dumps(plan, indent=2)}\n"
        f"IMPORTANT: Be concise. 2 paragraphs max for explanation. 1-2 code examples max."
    )
    raw_lesson = await _run_agent(creator, creator_prompt)
    lesson_data = parse_creator_output(raw_lesson)
    creator_elapsed = time.time() - t0

    await emit_event(queue, "creator", "done", {
        "lesson": i, "elapsed": round(creator_elapsed, 1),
        "message": f"Lesson {i+1} written in {creator_elapsed:.1f}s"
    })

    try:
        from observability import track_agent_call
        track_agent_call("creator", creator_elapsed, True)
    except Exception:
        pass

    # --- VALIDATOR (direct code execution, no LLM) ---
    code_examples = lesson_data.get("code_examples", [])
    # Normalize: ensure each item is a dict with "code" and "language" keys
    _normalized = []
    for _ex in code_examples:
        if isinstance(_ex, str):
            _normalized.append({"code": _ex, "language": "python", "validation_status": "pending"})
        elif isinstance(_ex, dict):
            _normalized.append(_ex)
        elif hasattr(_ex, 'model_dump'):
            _normalized.append(_ex.model_dump())
        elif hasattr(_ex, 'dict'):
            _normalized.append(_ex.dict())
        else:
            _normalized.append({"code": str(_ex), "language": "python", "validation_status": "pending"})
    code_examples = _normalized
    total_checks = len(code_examples)

    if code_examples:
        await emit_event(queue, "validator", "running", {
            "lesson": i, "snippets": len(code_examples),
            "message": f"Testing {len(code_examples)} code snippet(s) for lesson {i+1}..."
        })

        t0 = time.time()
        results = []
        for j, ex in enumerate(code_examples):
            code = ex.get("code", "")
            lang = ex.get("language", "python")
            result = await asyncio.get_event_loop().run_in_executor(
                None, _validate_code_directly, code, lang
            )
            results.append({"index": j, **result})

            await emit_event(queue, "validator", "progress", {
                "lesson": i, "snippet": j,
                "passed": result.get("passed", False),
                "message": f"Snippet {j+1}/{len(code_examples)}: {'PASS' if result.get('passed') else 'FAIL'}"
            })

        validator_elapsed = time.time() - t0

        failures = [r for r in results if not r.get("passed", True)]
        total_failures = len(failures)

        try:
            from observability import track_agent_call
            track_agent_call("validator_direct", validator_elapsed, True)
        except Exception:
            pass

        # --- FIXER (only if needed, uses LLM) ---
        if failures:
            await emit_event(queue, "fixer", "running", {
                "lesson": i, "failures": len(failures),
                "message": f"Fixing {len(failures)} failing snippet(s) in lesson {i+1}..."
            })

            t0 = time.time()
            for fail in failures:
                idx = fail.get("index", 0)
                if idx < len(code_examples):
                    original_code = code_examples[idx].get("code", "")
                    error_msg = fail.get("error", "Unknown error")

                    fixer_prompt = (
                        f"Fix this code that failed validation:\n"
                        f"```python\n{original_code}\n```\n"
                        f"Error: {error_msg}\n"
                        f"The code should demonstrate: {plan.get('title', 'the concept')}\n"
                        f"Be minimal — fix only the error, keep the code short."
                    )

                    raw_fix = await _run_agent(fixer, fixer_prompt)
                    fix_result = parse_fixer_output(raw_fix)
                    fixed_code = fix_result.get("fixed_code", original_code)

                    # Re-validate the fixed code directly (don't trust LLM's "passed")
                    revalidation = await asyncio.get_event_loop().run_in_executor(
                        None, _validate_code_directly, fixed_code, code_examples[idx].get("language", "python")
                    )

                    code_examples[idx] = {
                        "language": code_examples[idx].get("language", "python"),
                        "code": fixed_code,
                        "original_code": original_code,
                        "validation_status": "fixed" if revalidation.get("passed") else "fail",
                    }
                    total_fixes += 1

            fixer_elapsed = time.time() - t0
            await emit_event(queue, "fixer", "done", {
                "lesson": i, "fixed": len(failures),
                "elapsed": round(fixer_elapsed, 1),
                "message": f"Fixed {len(failures)} snippet(s) in {fixer_elapsed:.1f}s"
            })

            try:
                from observability import track_agent_call
                track_agent_call("fixer", fixer_elapsed, True)
            except Exception:
                pass

        # Set validation status on remaining code examples
        for j, ex in enumerate(code_examples):
            if "validation_status" not in ex or ex["validation_status"] == "pending":
                matching = [r for r in results if r.get("index") == j]
                if matching and matching[0].get("passed"):
                    ex["validation_status"] = "pass"
                elif not matching:
                    ex["validation_status"] = "pass"

        # Overall lesson status
        statuses = [ex.get("validation_status", "pending") for ex in code_examples]
        if "fail" in statuses:
            overall_status = ValidationStatus.FAIL
        elif "fixed" in statuses:
            overall_status = ValidationStatus.FIXED
        else:
            overall_status = ValidationStatus.PASS

        await emit_event(queue, "validator", "done", {
            "lesson": i, "status": overall_status.value,
            "elapsed": round(validator_elapsed, 1),
            "message": f"Lesson {i+1} validation: {overall_status.value} ({validator_elapsed:.1f}s)"
        })
    else:
        overall_status = ValidationStatus.PASS

    lesson_elapsed = time.time() - lesson_start

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

    await emit_event(queue, "processing", "lesson_done", {
        "lesson": i, "elapsed": round(lesson_elapsed, 1),
        "message": f"Lesson {i+1} complete in {lesson_elapsed:.1f}s"
    })

    return lesson, total_checks, total_failures, total_fixes


async def generate_course(topic: str, difficulty: str, queue: asyncio.Queue, course_id: str) -> None:
    """Run the full 4-agent pipeline for a course."""
    course_start = time.time()

    try:
        # ---------------------------------------------------------------
        # 1. PLANNER
        # ---------------------------------------------------------------
        await emit_event(queue, "planner", "running", {"message": f"Planning curriculum for: {topic}"})

        t0 = time.time()
        planner = create_planner_agent()
        planner_prompt = (
            f"Create a {difficulty}-level micro-course curriculum for: {topic}\n"
            f"Keep it to exactly 3 lessons for speed. Be concise in content_outline."
        )
        raw_plan = await _run_agent(planner, planner_prompt)
        lesson_plans = parse_planner_output(raw_plan)
        planner_elapsed = time.time() - t0

        await emit_event(queue, "planner", "done", {
            "lessons": len(lesson_plans),
            "elapsed": round(planner_elapsed, 1),
            "message": f"Planned {len(lesson_plans)} lessons in {planner_elapsed:.1f}s"
        })

        try:
            from observability import track_agent_call
            track_agent_call("planner", planner_elapsed, True)
        except Exception:
            pass

        # ---------------------------------------------------------------
        # 2-4. PARALLEL: Creator → Validator → Fixer per lesson
        # ---------------------------------------------------------------
        await emit_event(queue, "processing", "running", {
            "message": f"Processing {len(lesson_plans)} lessons in parallel..."
        })

        # Process all lessons concurrently (each creates its own agent instances)
        tasks = [
            _process_lesson(i, plan, topic, difficulty, queue)
            for i, plan in enumerate(lesson_plans)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        lessons = []
        total_checks = 0
        total_failures = 0
        total_fixes = 0

        for r in results:
            if isinstance(r, Exception):
                await emit_event(queue, "processing", "error", {
                    "message": f"Lesson failed: {str(r)}"
                })
                continue
            lesson, checks, failures, fixes = r
            lessons.append(lesson)
            total_checks += checks
            total_failures += failures
            total_fixes += fixes

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

        course_elapsed = time.time() - course_start

        # Datadog metrics
        try:
            from observability import track_course_generated, track_validation
            track_course_generated(topic, course_elapsed, len(lessons))
            track_validation(total_checks, total_failures, total_fixes)
        except Exception:
            pass

        await emit_event(queue, "orchestrator", "complete", {
            "courseId": course_id,
            "totalLessons": len(lessons),
            "totalChecks": total_checks,
            "fixes": total_fixes,
            "elapsedSeconds": round(course_elapsed, 1),
            "message": f"Course complete! {len(lessons)} lessons in {course_elapsed:.1f}s"
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
        fixer = create_fixer_agent()

        await emit_event(queue, "creator", "running", {
            "lesson": lesson_index, "title": old_lesson.title,
            "message": f"Regenerating lesson {lesson_index+1}..."
        })

        t0 = time.time()

        # Serialize existing lesson content so the Creator can build on it
        existing_quiz = []
        for q in old_lesson.quiz_questions:
            if hasattr(q, 'model_dump'):
                existing_quiz.append(q.model_dump())
            elif hasattr(q, 'dict'):
                existing_quiz.append(q.dict())
            else:
                existing_quiz.append(q)

        existing_code = []
        for ex in old_lesson.code_examples:
            if hasattr(ex, 'model_dump'):
                existing_code.append(ex.model_dump())
            elif hasattr(ex, 'dict'):
                existing_code.append(ex.dict())
            else:
                existing_code.append(ex)

        import json
        creator_prompt = (
            f"You are modifying an EXISTING lesson. Apply the user's instruction while KEEPING all existing content.\n"
            f"User instruction: {instruction}\n\n"
            f"EXISTING LESSON (preserve and build on this):\n"
            f"Title: {old_lesson.title}\n"
            f"Objectives: {json.dumps(old_lesson.objectives)}\n"
            f"Explanation: {old_lesson.explanation}\n"
            f"Code examples: {json.dumps(existing_code, default=str)}\n"
            f"Quiz questions: {json.dumps(existing_quiz, default=str)}\n\n"
            f"Course topic: {course.topic}, difficulty: {course.difficulty}\n"
            f"IMPORTANT: Keep ALL existing content (explanation, code examples, quiz questions) "
            f"and ADD or MODIFY only what the user asked for. Do NOT remove existing items unless explicitly asked."
        )
        raw_lesson = await _run_agent(creator, creator_prompt)
        lesson_data = parse_creator_output(raw_lesson)
        creator_elapsed = time.time() - t0

        await emit_event(queue, "creator", "done", {
            "lesson": lesson_index,
            "elapsed": round(creator_elapsed, 1),
            "message": f"Lesson regenerated in {creator_elapsed:.1f}s"
        })

        try:
            from observability import track_agent_call
            track_agent_call("creator", creator_elapsed, True)
        except Exception:
            pass

        # Validate directly (no LLM)
        code_examples = lesson_data.get("code_examples", [])
        # Normalize: ensure each item is a dict with "code" and "language" keys
        normalized = []
        for ex in code_examples:
            if isinstance(ex, str):
                normalized.append({"code": ex, "language": "python", "validation_status": "pending"})
            elif isinstance(ex, dict):
                normalized.append(ex)
            elif hasattr(ex, 'model_dump'):
                normalized.append(ex.model_dump())
            elif hasattr(ex, 'dict'):
                normalized.append(ex.dict())
            else:
                normalized.append({"code": str(ex), "language": "python", "validation_status": "pending"})
        code_examples = normalized
        if code_examples:
            await emit_event(queue, "validator", "running", {
                "lesson": lesson_index, "snippets": len(code_examples),
                "message": f"Testing {len(code_examples)} snippet(s)..."
            })
            t0 = time.time()
            results = []
            for j, ex in enumerate(code_examples):
                result = await asyncio.get_event_loop().run_in_executor(
                    None, _validate_code_directly, ex.get("code", ""), ex.get("language", "python")
                )
                results.append({"index": j, **result})

            failures = [r for r in results if not r.get("passed", True)]
            validator_elapsed = time.time() - t0

            if failures:
                await emit_event(queue, "fixer", "running", {
                    "lesson": lesson_index, "failures": len(failures),
                    "message": f"Fixing {len(failures)} snippet(s)..."
                })
                t0 = time.time()
                for fail in failures:
                    idx = fail.get("index", 0)
                    if idx < len(code_examples):
                        original = code_examples[idx].get("code", "")
                        raw_fix = await _run_agent(
                            fixer,
                            f"Fix:\n```python\n{original}\n```\nError: {fail.get('error', '')}\nBe minimal."
                        )
                        fix_result = parse_fixer_output(raw_fix)
                        code_examples[idx] = {
                            "language": "python",
                            "code": fix_result.get("fixed_code", original),
                            "original_code": original,
                            "validation_status": "fixed" if fix_result.get("passed") else "fail",
                        }
                fixer_elapsed = time.time() - t0
                await emit_event(queue, "fixer", "done", {
                    "lesson": lesson_index, "elapsed": round(fixer_elapsed, 1)
                })

            # Set pass status on un-updated examples
            for j, ex in enumerate(code_examples):
                if ex.get("validation_status") in (None, "pending"):
                    matching = [r for r in results if r.get("index") == j]
                    if matching and matching[0].get("passed"):
                        ex["validation_status"] = "pass"
                    elif not matching:
                        ex["validation_status"] = "pass"

        statuses = [ex.get("validation_status", "pass") for ex in code_examples]
        overall = ValidationStatus.FAIL if "fail" in statuses else (
            ValidationStatus.FIXED if "fixed" in statuses else ValidationStatus.PASS
        )

        await emit_event(queue, "validator", "done", {
            "lesson": lesson_index, "status": overall.value,
            "message": f"Validation: {overall.value}"
        })

        # Preserve existing quiz questions if Creator didn't return any
        new_quiz = lesson_data.get("quiz_questions", [])
        if not new_quiz and old_lesson.quiz_questions:
            new_quiz = []
            for q in old_lesson.quiz_questions:
                if hasattr(q, 'model_dump'):
                    new_quiz.append(q.model_dump())
                elif hasattr(q, 'dict'):
                    new_quiz.append(q.dict())
                else:
                    new_quiz.append(q)

        course.lessons[lesson_index] = Lesson(
            title=lesson_data.get("title", old_lesson.title),
            objectives=lesson_data.get("objectives", old_lesson.objectives),
            explanation=lesson_data.get("explanation", "") or old_lesson.explanation,
            code_examples=[CodeExample(**ex) for ex in code_examples],
            quiz_questions=new_quiz,
            audio_url=lesson_data.get("audio_url") or old_lesson.audio_url,
            image_url=lesson_data.get("image_url") or old_lesson.image_url,
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
