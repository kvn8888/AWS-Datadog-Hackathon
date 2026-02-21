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
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from streaming import emit_event, get_or_create_queue, sse_generator, cleanup_queue
from models import GenerateRequest, GenerateResponse, RegenerateRequest, TestCodeRequest, TestCodeResponse

load_dotenv()

# Import orchestrator (real pipeline) — falls back to mock if agents aren't available
try:
    from orchestrator import generate_course as real_generate_course, regenerate_lesson, get_courses_store
    _courses = get_courses_store()
    USE_REAL_PIPELINE = True
except ImportError:
    _courses = {}
    USE_REAL_PIPELINE = False


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
    # Startup — initialize Datadog observability
    try:
        from observability import init_observability
        init_observability()
    except ImportError:
        pass
    yield
    # Shutdown — clean up
    _courses.clear()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="LearnForge", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://localhost:8081", "http://localhost:8082", "http://localhost:8083"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/course/generate", response_model=GenerateResponse)
async def generate_course_endpoint(req: GenerateRequest):
    """Start course generation. Returns courseId immediately; generation runs in background."""
    course_id = str(uuid.uuid4())
    queue = get_or_create_queue(course_id)
    if USE_REAL_PIPELINE:
        asyncio.create_task(real_generate_course(req.topic, req.difficulty, queue, course_id))
    else:
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
    # Return as dict for JSON serialization
    if hasattr(course, "model_dump"):
        return course.model_dump()
    return course


@app.post("/course/{course_id}/lesson/{lesson_index}/regenerate")
async def regenerate_lesson_endpoint(course_id: str, lesson_index: int, req: RegenerateRequest):
    """Regenerate a specific lesson with custom instructions."""
    if not USE_REAL_PIPELINE:
        raise HTTPException(status_code=501, detail="Real pipeline not available")
    queue = get_or_create_queue(f"{course_id}-regen-{lesson_index}")
    asyncio.create_task(regenerate_lesson(course_id, lesson_index, req.instruction, queue))
    return {"status": "regenerating", "courseId": course_id, "lessonIndex": lesson_index}


@app.post("/course/test-code", response_model=TestCodeResponse)
async def test_code_endpoint(req: TestCodeRequest):
    """On-demand code testing via TestSprite / local execution."""
    try:
        from tools.testsprite import _run_code_locally
        result = _run_code_locally(req.code, req.language)
        return TestCodeResponse(**result)
    except Exception as e:
        return TestCodeResponse(passed=False, error=str(e))


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "male-qn-qingse"


class ImageRequest(BaseModel):
    prompt: str | None = None
    aspect_ratio: str = "16:9"
    subject_reference: list[dict[str, Any]] | None = None


@app.post("/course/{course_id}/lesson/{lesson_index}/audio")
async def generate_lesson_audio(course_id: str, lesson_index: int, req: TTSRequest):
    """Generate TTS audio on demand for a lesson."""
    import os
    import base64

    api_key = os.getenv("MINIMAX_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=501, detail="MINIMAX_API_KEY not configured")

    course = _courses.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Handle both dict and Pydantic model storage
    lessons = course.lessons if hasattr(course, 'lessons') else course.get("lessons", [])
    if lesson_index >= len(lessons):
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Generate audio via MiniMax
    try:
        import httpx
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.minimaxi.chat/v1/t2a_v2",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "speech-02-hd",
                    "text": req.text[:5000],
                    "voice_setting": {
                        "voice_id": req.voice_id,
                        "speed": 0.95,
                    },
                    "audio_setting": {
                        "format": "mp3",
                        "sample_rate": 32000,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()

            # Extract audio bytes from MiniMax response
            # MiniMax returns audio as hex string in data.audio.data,
            # or base64, or sometimes a URL
            audio_bytes: bytes | None = None
            audio_url = ""

            if isinstance(data, dict):
                # Try data.audio.data (hex-encoded audio — most common)
                nested = data.get("data", {})
                if isinstance(nested, dict):
                    audio_obj = nested.get("audio")
                    if isinstance(audio_obj, dict):
                        hex_data = audio_obj.get("data", "")
                        if hex_data and isinstance(hex_data, str):
                            try:
                                audio_bytes = bytes.fromhex(hex_data)
                            except ValueError:
                                # Maybe it's base64
                                try:
                                    audio_bytes = base64.b64decode(hex_data)
                                except Exception:
                                    pass
                        # Fallback: audio_url in the audio object
                        if not audio_bytes:
                            url = audio_obj.get("audio_url", "")
                            if isinstance(url, str) and url.startswith("http"):
                                audio_url = url

                # Try data.audio as base64 string
                if not audio_bytes and not audio_url:
                    raw = nested.get("audio", "")
                    if isinstance(raw, str) and len(raw) > 100:
                        try:
                            audio_bytes = base64.b64decode(raw)
                        except Exception:
                            try:
                                audio_bytes = bytes.fromhex(raw)
                            except Exception:
                                pass

                # Try top-level audio_url
                if not audio_bytes and not audio_url:
                    url = data.get("audio_url", "")
                    if isinstance(url, str) and url.startswith("http"):
                        audio_url = url

            # Convert to a data URI the browser can play directly
            if audio_bytes and len(audio_bytes) > 100:
                b64 = base64.b64encode(audio_bytes).decode("ascii")
                audio_url = f"data:audio/mp3;base64,{b64}"
            elif audio_url and audio_url.startswith("http"):
                # Proxy-fetch the remote URL to avoid CORS issues
                try:
                    audio_resp = await client.get(audio_url, timeout=30.0)
                    audio_resp.raise_for_status()
                    b64 = base64.b64encode(audio_resp.content).decode("ascii")
                    audio_url = f"data:audio/mp3;base64,{b64}"
                except Exception:
                    pass  # Keep the original URL as fallback

            if not audio_url:
                raise HTTPException(
                    status_code=502,
                    detail=f"No audio in MiniMax response. Keys: {list(data.keys()) if isinstance(data, dict) else type(data).__name__}"
                )

            # Persist on the lesson (handle dict or model)
            lesson = lessons[lesson_index]
            if hasattr(lesson, 'audio_url'):
                lesson.audio_url = audio_url
            elif isinstance(lesson, dict):
                lesson["audio_url"] = audio_url
            return {"audio_url": audio_url}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"MiniMax API error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/course/{course_id}/lesson/{lesson_index}/image")
async def generate_lesson_image(course_id: str, lesson_index: int, req: ImageRequest):
    """Generate lesson concept image on demand via Gemini gemini-3-pro-image-preview."""
    import os
    import base64

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=501, detail="GEMINI_API_KEY not configured")

    course = _courses.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    lessons = course.lessons if hasattr(course, 'lessons') else course.get("lessons", [])
    if lesson_index >= len(lessons):
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson = lessons[lesson_index]
    lesson_title = lesson.title if hasattr(lesson, 'title') else lesson.get("title", "Lesson")
    lesson_explanation = lesson.explanation if hasattr(lesson, 'explanation') else lesson.get("explanation", "")

    prompt = req.prompt or (
        f"Generate a clean, minimal technical concept diagram or illustration for a programming lesson titled '{lesson_title}'. "
        f"Context: {lesson_explanation[:500]}. "
        f"Style: clean vector-style diagram, dark background (#0a0a14), use bright accent colors (purple, blue, green). "
        f"No text labels. Simple and clear."
    )

    try:
        import httpx
        async with httpx.AsyncClient(timeout=90.0) as client:
            # Gemini generateContent API with image generation
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt}
                            ]
                        }
                    ],
                    "generationConfig": {
                        "responseModalities": ["TEXT", "IMAGE"],
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()

            # Extract image from Gemini response
            # Response shape: data.candidates[0].content.parts[] where part has inlineData.data (base64)
            image_url = ""
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    inline = part.get("inlineData", {})
                    if inline.get("data") and inline.get("mimeType", "").startswith("image/"):
                        mime = inline["mimeType"]
                        b64 = inline["data"]
                        image_url = f"data:{mime};base64,{b64}"
                        break

            if not image_url:
                raise HTTPException(
                    status_code=502,
                    detail=f"No image in Gemini response: {str(data)[:200]}"
                )

            if hasattr(lesson, 'image_url'):
                lesson.image_url = image_url
            elif isinstance(lesson, dict):
                lesson["image_url"] = image_url

            return {"image_url": image_url}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.status_code} — {e.response.text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "learnforge", "pipeline": "real" if USE_REAL_PIPELINE else "mock"}


# ---------------------------------------------------------------------------
# CopilotKit runtime endpoint via ag_ui_strands
# Handles both CopilotKit info probes and AG-UI RunAgentInput.
# ---------------------------------------------------------------------------
try:
    from strands import Agent
    from strands.models.gemini import GeminiModel
    from ag_ui_strands import StrandsAgent, create_strands_app
    from fastapi import Request
    from starlette.responses import JSONResponse

    _placeholder_agent = Agent(
        system_prompt=(
            "You are LearnForge, an AI course generation assistant. "
            "You help users generate verified micro-courses on any programming topic. "
            "For now, acknowledge requests and let the user know the system is being set up."
        ),
        model=GeminiModel(model_id="gemini-3-flash-preview"),
    )
    _agui_agent = StrandsAgent(agent=_placeholder_agent, name="default")
    copilotkit_app = create_strands_app(_agui_agent, "/")

    @app.api_route("/copilotkit", methods=["GET", "POST"])
    async def copilotkit_proxy(request: Request):
        """Handle CopilotKit requests — intercept info probes, forward AG-UI runs."""
        if request.method == "GET":
            return JSONResponse({"status": "ok"})

        body = await request.json()

        # CopilotKit info probe — respond with agent capabilities
        if body.get("method") == "info":
            return JSONResponse({
                "agents": [{
                    "name": "default",
                    "description": "AI course generation assistant that creates verified micro-courses on programming topics.",
                }],
                "actions": [],
            })

        # CopilotKit wraps AG-UI payload in {"method": "...", "body": {...}}
        # Extract the inner body for the AG-UI Strands endpoint
        forward_body = body
        if "body" in body and isinstance(body["body"], dict):
            forward_body = body["body"]

        # Forward to the AG-UI Strands endpoint
        from starlette.testclient import TestClient
        client = TestClient(copilotkit_app)
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("content-length", None)
        response = client.post("/", json=forward_body, headers=headers)
        return StreamingResponse(
            iter([response.content]),
            media_type=response.headers.get("content-type", "application/json"),
            status_code=response.status_code,
        )

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
