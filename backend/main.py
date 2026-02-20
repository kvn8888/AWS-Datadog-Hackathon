"""LearnForge Backend — FastAPI app with SSE streaming and CopilotKit bridge.

Routes:
  POST /course/generate       → Start course generation, returns courseId
  GET  /course/{id}/stream    → SSE stream of agent status events
  GET  /course/{id}           → Fetch completed course data
  /copilotkit                 → CopilotKit runtime (ag_ui_strands bridge)
"""

import asyncio
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from streaming import emit_event, get_or_create_queue, sse_generator, cleanup_queue

load_dotenv()

# ---------------------------------------------------------------------------
# In-memory course store (replaced by DB in production)
# ---------------------------------------------------------------------------
_courses: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"


class GenerateResponse(BaseModel):
    courseId: str


# ---------------------------------------------------------------------------
# Mock course generation (replaced by orchestrator in Phase 3)
# ---------------------------------------------------------------------------
MOCK_COURSE = {
    "title": "Introduction to Python Async",
    "difficulty": "intermediate",
    "lessons": [
        {
            "title": "Understanding Coroutines",
            "objectives": ["Define what a coroutine is", "Write your first async function"],
            "explanation": "A coroutine is a special function that can pause and resume execution. In Python, you define coroutines using `async def`.",
            "code_examples": [
                {
                    "code": "import asyncio\n\nasync def hello():\n    print('Hello')\n    await asyncio.sleep(1)\n    print('World')\n\nasyncio.run(hello())",
                    "language": "python",
                    "validation_status": "pass",
                }
            ],
            "quiz": [
                {
                    "question": "What keyword makes a function a coroutine?",
                    "options": ["async", "await", "yield", "return"],
                    "answer": 0,
                }
            ],
            "audio_url": None,
            "image_url": None,
            "validation_status": "pass",
        },
        {
            "title": "Awaiting Tasks",
            "objectives": ["Use await to call coroutines", "Run multiple tasks concurrently"],
            "explanation": "The `await` keyword pauses a coroutine until the awaited task completes. Use `asyncio.gather()` to run tasks concurrently.",
            "code_examples": [
                {
                    "code": "import asyncio\n\nasync def fetch(url):\n    print(f'Fetching {url}')\n    await asyncio.sleep(1)\n    return f'Data from {url}'\n\nasync def main():\n    results = await asyncio.gather(\n        fetch('https://api.example.com/a'),\n        fetch('https://api.example.com/b'),\n    )\n    print(results)\n\nasyncio.run(main())",
                    "language": "python",
                    "validation_status": "pass",
                }
            ],
            "quiz": [
                {
                    "question": "Which function runs coroutines concurrently?",
                    "options": ["asyncio.gather", "asyncio.run", "asyncio.wait", "asyncio.sleep"],
                    "answer": 0,
                }
            ],
            "audio_url": None,
            "image_url": None,
            "validation_status": "pass",
        },
        {
            "title": "Error Handling in Async Code",
            "objectives": ["Handle exceptions in coroutines", "Use try/except with await"],
            "explanation": "Exceptions in coroutines propagate normally through `await`. Wrap awaited calls in try/except to handle errors gracefully.",
            "code_examples": [
                {
                    "code": "import asyncio\n\nasync def risky():\n    raise ValueError('something went wrong')\n\nasync def main():\n    try:\n        await risky()\n    except ValueError as e:\n        print(f'Caught: {e}')\n\nasyncio.run(main())",
                    "language": "python",
                    "validation_status": "fixed",
                    "original_code": "import asyncio\n\nasync def risky():\n    raise ValueError('something went wrong')\n\nasync def main():\n    await risky()  # unhandled!\n\nasyncio.run(main())",
                }
            ],
            "quiz": [
                {
                    "question": "How do you catch errors from awaited coroutines?",
                    "options": ["try/except around await", "asyncio.catch()", "with suppress():", "error callback"],
                    "answer": 0,
                }
            ],
            "audio_url": None,
            "image_url": None,
            "validation_status": "fixed",
        },
    ],
}


async def mock_generate_course(topic: str, difficulty: str, queue: asyncio.Queue, course_id: str) -> None:
    """Simulate the 4-agent pipeline with mock SSE events."""
    try:
        # Planner
        await emit_event(queue, "planner", "running", {"message": f"Planning curriculum for: {topic}"})
        await asyncio.sleep(0.5)
        await emit_event(queue, "planner", "done", {"lessons": 3})

        # Creator + Validator + Fixer per lesson
        for i, lesson in enumerate(MOCK_COURSE["lessons"]):
            await emit_event(queue, "creator", "running", {"lesson": i, "title": lesson["title"]})
            await asyncio.sleep(0.3)
            await emit_event(queue, "creator", "done", {"lesson": i})

            await emit_event(queue, "validator", "running", {"lesson": i})
            await asyncio.sleep(0.2)

            if lesson.get("validation_status") == "fixed":
                await emit_event(queue, "fixer", "running", {"lesson": i, "failures": 1})
                await asyncio.sleep(0.3)
                await emit_event(queue, "fixer", "done", {"lesson": i, "status": "fixed"})

            await emit_event(queue, "validator", "done", {"lesson": i, "status": lesson.get("validation_status", "pass")})

        # Store course
        course = {**MOCK_COURSE, "id": course_id, "topic": topic, "difficulty": difficulty}
        _courses[course_id] = course

        await emit_event(queue, "orchestrator", "complete", {"courseId": course_id, "totalLessons": len(MOCK_COURSE["lessons"])})
    except Exception as exc:
        await emit_event(queue, "orchestrator", "error", {"message": str(exc)})
    finally:
        cleanup_queue(course_id)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown — clean up queues
    _courses.clear()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="LearnForge", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/course/generate", response_model=GenerateResponse)
async def generate_course(req: GenerateRequest):
    """Start course generation. Returns courseId immediately; generation runs in background."""
    course_id = str(uuid.uuid4())
    queue = get_or_create_queue(course_id)
    asyncio.create_task(mock_generate_course(req.topic, req.difficulty, queue, course_id))
    return GenerateResponse(courseId=course_id)


@app.get("/course/{course_id}/stream")
async def stream_course(course_id: str):
    """SSE endpoint — streams agent status events for a course generation."""
    return StreamingResponse(
        sse_generator(course_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/course/{course_id}")
async def get_course(course_id: str):
    """Fetch completed course data."""
    course = _courses.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or still generating")
    return course


@app.get("/health")
async def health():
    return {"status": "ok", "service": "learnforge"}


# ---------------------------------------------------------------------------
# CopilotKit runtime endpoint via ag_ui_strands
# Placeholder — mounts a minimal Strands agent for CopilotKit sidebar connectivity.
# Real agent wiring happens in Phase 3 (03-03).
# ---------------------------------------------------------------------------
try:
    from strands import Agent
    from ag_ui_strands import StrandsAgent, create_strands_app

    _placeholder_agent = Agent(
        system_prompt=(
            "You are LearnForge, an AI course generation assistant. "
            "You help users generate verified micro-courses on any programming topic. "
            "For now, acknowledge requests and let the user know the system is being set up."
        ),
    )
    _agui_agent = StrandsAgent(agent=_placeholder_agent, name="learnforge")
    copilotkit_app = create_strands_app(_agui_agent, "/")
    app.mount("/copilotkit", copilotkit_app)
except ImportError:
    # ag_ui_strands or strands not installed yet — skip CopilotKit mount
    print("WARNING: ag_ui_strands not available, CopilotKit endpoint not mounted")
except Exception as exc:
    print(f"WARNING: CopilotKit mount failed: {exc}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
