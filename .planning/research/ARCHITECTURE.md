# Architecture Research

**Domain:** AI-powered multi-agent course generation platform (Python/Strands + Next.js/CopilotKit)
**Researched:** 2026-02-20
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
+-------------------------------------------------------------------+
|                         BROWSER (Next.js)                         |
|                                                                   |
|  +--------------------+   +-----------------------------------+   |
|  |   Course Viewer    |   |   CopilotKit Sidebar (Chat UI)    |   |
|  |  - Outline         |   |   - useCopilotReadable (state)    |   |
|  |  - Lesson panel    |   |   - useCopilotAction handlers     |   |
|  |  - Audio player    |   |   - "Make lesson 2 easier"        |   |
|  |  - PASS/FIXED/FAIL |   |   - "Add error handling section"  |   |
|  |  - Agent status    |   +--------------|--------------------+   |
|  +---------|----------+                  |                        |
+------------|------------------------------|------------------------+
             |  REST/SSE                    |  /api/copilotkit
             |                             |  (CopilotKit runtime)
+------------|------------------------------|------------------------+
|            v                             v                        |
|   +------------------+    +---------------------------+          |
|   |  FastAPI Backend  |    |  Next.js API Routes       |          |
|   |  (Python)         |    |  /api/copilotkit          |          |
|   |                   |    |  (CopilotKit Python SDK   |          |
|   |  POST /course/    |    |   proxied through Next.js  |          |
|   |    generate       |    |   or direct FastAPI route) |          |
|   |  GET  /course/:id |    +---------------------------+          |
|   |    /stream (SSE)  |                                           |
|   |  GET  /course/:id |                                           |
|   |  POST /course/:id |                                           |
|   |    /lesson/:n/    |                                           |
|   |    regenerate     |                                           |
|   |  POST /course/:id |                                           |
|   |    /lesson/:n/    |                                           |
|   |    test           |                                           |
|   +---------|----------+                                          |
|             |                                                     |
|   +---------v-------------------------------------------------+   |
|   |              Bedrock Strands Orchestrator                  |   |
|   |                                                           |   |
|   |  +------------+  +------------+  +----------+  +-------+  |   |
|   |  |  Planner   |  |  Creator   |  |Validator |  | Fixer |  |   |
|   |  |  Agent 1   |->|  Agent 2   |->| Agent 3  |->|Agent 4|  |   |
|   |  +------------+  +-----+------+  +----+-----+  +---+---+  |   |
|   |                        |              |             |      |   |
|   |                        |     +--------+        re-validate|   |
|   |                        |     | fails              loop    |   |
|   |                        v     v                            |   |
|   |               +--------+-----+--------+                   |   |
|   |               |     SSE Event Queue   |                   |   |
|   |               +------------------------+                  |   |
|   +-----------------------------------------------------------+   |
|             |              |              |                       |
+-------------|--------------|--------------|------------------------+
              |              |              |
   +----------v--+  +--------v------+  +---v-----------+
   | AWS Bedrock |  |   MiniMax     |  |  TestSprite   |
   | Claude      |  |  TTS API      |  |  Code Exec    |
   | Sonnet-4    |  |  Image API    |  |  API          |
   +-------------+  +---------------+  +---------------+
              |
   +----------v-----------+
   |  Datadog              |
   |  LLM Observability    |
   |  + statsd metrics     |
   +----------------------+
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Next.js frontend | Course viewer, CopilotKit React integration, SSE consumer, action registration | `@copilotkit/react-core`, `@copilotkit/react-ui`, EventSource API |
| CopilotKit sidebar | Agentic chat, shared readable state, in-context action triggers | `useCopilotReadable`, `useCopilotAction`, `CopilotSidebar` |
| FastAPI backend | REST endpoints, SSE streaming, Strands orchestration host, CopilotKit runtime endpoint | Python `fastapi`, `uvicorn`, `copilotkit` Python SDK v0.1.78 |
| Planner Agent | Decomposes topic into 3-5 sequenced lessons with objectives | Strands `Agent`, pure reasoning, no tools |
| Creator Agent | Writes explanation, code examples, quizzes, calls MiniMax TTS + image gen | Strands `Agent` + `@tool` decorators for MiniMax calls |
| Validator Agent | Extracts code snippets, runs TestSprite, fact-checks claims | Strands `Agent` + `run_testsprite` tool |
| Fixer Agent | Rewrites failing code, re-validates with TestSprite | Strands `Agent` + `run_testsprite` tool |
| SSE event queue | In-process async queue that agents write to; `/stream` endpoint drains it | Python `asyncio.Queue` |
| MiniMax TTS | Narration audio per lesson | Direct HTTP to `api.minimaxi.chat/v1/t2a_v2` |
| MiniMax Image Gen | Concept diagrams per lesson | Direct HTTP to `api.minimaxi.chat/v1/image/generation` |
| TestSprite | Code execution gating / test generation | Direct HTTP to TestSprite API (confirm at hackathon) |
| Datadog | LLM trace observability, custom statsd metrics | `ddtrace` + `datadog` Python packages |

---

## Recommended Project Structure

```
learnforge/
├── backend/
│   ├── main.py                  # FastAPI app, all route definitions
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── planner.py           # Agent 1: Curriculum Planner
│   │   ├── creator.py           # Agent 2: Content Creator
│   │   ├── validator.py         # Agent 3: Validator
│   │   └── fixer.py             # Agent 4: Fixer
│   ├── orchestrator.py          # generate_course() flow, SSE queue writes
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── minimax.py           # @tool wrappers: generate_narration, generate_visual
│   │   └── testsprite.py        # @tool wrapper: run_testsprite
│   ├── models.py                # Pydantic models: Course, Lesson, ValidationResult
│   ├── streaming.py             # SSE helpers, AgentEvent dataclass
│   ├── observability.py         # Datadog statsd calls, ddtrace config
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Root: CopilotKit provider + layout
│   │   ├── api/
│   │   │   └── copilotkit/
│   │   │       └── route.ts     # CopilotKit runtime Next.js API route
│   │   └── layout.tsx
│   ├── components/
│   │   ├── CourseEditor.tsx     # Main layout shell
│   │   ├── AgentStatusPanel.tsx # Live SSE-fed agent status cards
│   │   ├── CourseOutline.tsx    # Lesson list with PASS/FIXED/FAIL badges
│   │   ├── LessonViewer.tsx     # Explanation, code, narration player, visual
│   │   ├── ValidationBadge.tsx  # PASS / FIXED / FAIL indicator
│   │   └── GenerateForm.tsx     # Topic input + difficulty selector
│   ├── hooks/
│   │   ├── useCourseStream.ts   # SSE EventSource hook, agent status state
│   │   └── useCopilotActions.ts # All useCopilotAction + useCopilotReadable calls
│   ├── lib/
│   │   └── api.ts               # Typed fetch wrappers for backend REST endpoints
│   ├── types/
│   │   └── course.ts            # TypeScript types mirroring backend Pydantic models
│   └── package.json
│
├── .env.example                 # All required key names, no values
└── README.md
```

### Structure Rationale

- **backend/agents/:** One file per agent keeps system prompts and tool bindings isolated. Fast to find and edit during a 6-hour hackathon.
- **backend/tools/:** External API wrappers are `@tool`-decorated functions. Separating them from agents makes it easy to mock during testing and swap MiniMax/TestSprite if the API differs from expectations.
- **backend/orchestrator.py:** The generate_course() and regenerate_lesson() flows live here — separate from the FastAPI route handlers in main.py so the logic is testable without HTTP.
- **backend/streaming.py:** SSE logic isolated so the rest of the code just calls `emit_event(queue, agent_name, status, data)`.
- **frontend/hooks/:** CopilotKit action registration and SSE subscription are hooks, not inline in components. This avoids re-registering actions on every render.
- **frontend/lib/api.ts:** All backend calls in one file. When the backend URL changes (or when switching to pre-cached demo data as fallback), there is only one place to update.

---

## Architectural Patterns

### Pattern 1: Per-Lesson Pipeline with SSE Progress Emission

**What:** The orchestrator processes each lesson sequentially through all four agents. After each significant step, it emits an SSE event describing which agent is active and what it just completed.

**When to use:** Sequential multi-agent pipelines where the user needs live visibility. The Planner runs once; Creator, Validator, and Fixer run once per lesson.

**Trade-offs:** Sequential per-lesson processing is slower than fully parallel (all lessons at once) but produces a better streaming demo — the first lesson appears while later ones are still generating. Fully parallel would require more complex state management and risks race conditions in the SSE queue.

**Example:**
```python
# backend/orchestrator.py
import asyncio
from agents.planner import planner_agent
from agents.creator import creator_agent
from agents.validator import validator_agent
from agents.fixer import fixer_agent
from streaming import emit_event

async def generate_course(topic: str, difficulty: str, queue: asyncio.Queue) -> dict:
    await emit_event(queue, "planner", "running", {"message": "Planning curriculum..."})
    curriculum = await planner_agent.run_async(
        f"Create curriculum for: {topic}, level: {difficulty}"
    )
    await emit_event(queue, "planner", "done", {"lessons": len(curriculum.lessons)})

    lessons = []
    for i, lesson_plan in enumerate(curriculum.lessons):
        await emit_event(queue, "creator", "running", {"lesson": i, "title": lesson_plan.title})
        content = await creator_agent.run_async(f"Generate lesson: {lesson_plan}")

        await emit_event(queue, "validator", "running", {"lesson": i})
        validation = await validator_agent.run_async(f"Validate: {content}")

        if validation.has_failures:
            await emit_event(queue, "fixer", "running", {"lesson": i, "failures": len(validation.failures)})
            fixed = await fixer_agent.run_async(
                f"Fix failures:\n{validation.failures}\nOriginal:\n{content}"
            )
            re_validation = await validator_agent.run_async(f"Validate: {fixed}")
            content = fixed
            content.validation_status = "fixed" if re_validation.passed else "fail"
        else:
            content.validation_status = "pass"

        lessons.append(content)
        await emit_event(queue, "validator", "done", {"lesson": i, "status": content.validation_status})

    await emit_event(queue, "orchestrator", "complete", {"total_lessons": len(lessons)})
    return build_course_json(topic, difficulty, curriculum, lessons)
```

### Pattern 2: CopilotKit Runtime Endpoint on the Python Backend

**What:** CopilotKit's Python SDK (v0.1.78) requires a LangGraph-compatible runtime endpoint. Rather than running a separate Node.js proxy, expose the CopilotKit runtime directly from FastAPI. The Next.js `/api/copilotkit/route.ts` proxies to it, or the frontend's `runtimeUrl` points directly at the FastAPI server.

**When to use:** Solo builds where adding a Node.js middleware layer wastes time. Direct FastAPI hosting of the CopilotKit runtime is the path of least resistance.

**Trade-offs:** CopilotKit Python SDK v0.1.78 depends on `langgraph` and `fastapi`. This means LangGraph is a transitive dependency even though Strands agents handle all actual work. Keep them decoupled — LangGraph is present only to satisfy the CopilotKit SDK, not used for orchestration.

**Example:**
```python
# backend/main.py
from fastapi import FastAPI
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK, Action

app = FastAPI()

sdk = CopilotKitSDK(
    actions=[
        Action(
            name="generateCourse",
            description="Generate a new verified micro-course",
            parameters=[
                {"name": "topic", "type": "string"},
                {"name": "difficulty", "type": "string"}
            ],
            handler=handle_generate_course  # calls orchestrator
        ),
        Action(
            name="regenerateLesson",
            description="Regenerate a specific lesson with instructions",
            parameters=[
                {"name": "courseId", "type": "string"},
                {"name": "lessonIndex", "type": "number"},
                {"name": "instruction", "type": "string"}
            ],
            handler=handle_regenerate_lesson
        ),
        Action(
            name="testLesson",
            description="Run TestSprite on a lesson's code examples",
            parameters=[
                {"name": "courseId", "type": "string"},
                {"name": "lessonIndex", "type": "number"}
            ],
            handler=handle_test_lesson
        )
    ]
)

add_fastapi_endpoint(app, sdk, "/copilotkit")
```

```typescript
// frontend/app/page.tsx
<CopilotKit runtimeUrl="http://localhost:8000/copilotkit">
  <CopilotSidebar ...>
    <CourseEditor />
  </CopilotSidebar>
</CopilotKit>
```

### Pattern 3: In-Process asyncio.Queue for SSE

**What:** The orchestrator writes `AgentEvent` objects to an `asyncio.Queue` during course generation. The SSE endpoint (`GET /course/:id/stream`) drains the queue using an async generator. No Redis, no message broker — just Python's built-in async queue.

**When to use:** Single-process, single-course-at-a-time demos. This is appropriate for a hackathon where running multiple simultaneous generations is out of scope.

**Trade-offs:** Works perfectly for a demo. Does not scale to concurrent users (each generation needs its own queue; a global queue would mix events from different courses). For the hackathon, store queues in a dict keyed by courseId.

**Example:**
```python
# backend/streaming.py
import asyncio
import json
from dataclasses import dataclass, asdict
from typing import AsyncGenerator

@dataclass
class AgentEvent:
    agent: str        # "planner" | "creator" | "validator" | "fixer" | "orchestrator"
    status: str       # "running" | "done" | "error" | "complete"
    data: dict

# In-memory store: courseId -> asyncio.Queue
_course_queues: dict[str, asyncio.Queue] = {}

def get_or_create_queue(course_id: str) -> asyncio.Queue:
    if course_id not in _course_queues:
        _course_queues[course_id] = asyncio.Queue()
    return _course_queues[course_id]

async def emit_event(queue: asyncio.Queue, agent: str, status: str, data: dict):
    await queue.put(AgentEvent(agent=agent, status=status, data=data))

async def sse_generator(course_id: str) -> AsyncGenerator[str, None]:
    queue = get_or_create_queue(course_id)
    while True:
        event = await queue.get()
        yield f"data: {json.dumps(asdict(event))}\n\n"
        if event.status == "complete" or event.status == "error":
            break

# backend/main.py
from fastapi.responses import StreamingResponse

@app.get("/course/{course_id}/stream")
async def stream_course(course_id: str):
    return StreamingResponse(
        sse_generator(course_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )
```

```typescript
// frontend/hooks/useCourseStream.ts
export function useCourseStream(courseId: string | null) {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});

  useEffect(() => {
    if (!courseId) return;
    const es = new EventSource(`http://localhost:8000/course/${courseId}/stream`);
    es.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      setAgentStatus(prev => ({
        ...prev,
        [event.agent]: { status: event.status, data: event.data }
      }));
      if (event.status === "complete") es.close();
    };
    return () => es.close();
  }, [courseId]);

  return agentStatus;
}
```

---

## Data Flow

### Course Generation Flow

```
User types topic + difficulty, clicks Generate
    |
    v
Frontend: POST /course/generate { topic, difficulty }
    |
    v
Backend: creates courseId, creates asyncio.Queue for courseId
Backend: starts generate_course() as background task (asyncio.create_task)
Backend: immediately returns { courseId }
    |
    v
Frontend: receives courseId
Frontend: opens EventSource to GET /course/{courseId}/stream
Frontend: renders AgentStatusPanel (all agents "idle")
    |
    v
Orchestrator (background task):
    |
    +-- emit("planner", "running") -> queue
    |       |
    |   Planner Agent -> Bedrock Claude Sonnet
    |   (Datadog traces this call)
    |   returns: curriculum JSON (3-5 lesson plans)
    |       |
    +-- emit("planner", "done") -> queue
    |
    FOR each lesson in curriculum:
        |
        +-- emit("creator", "running", { lesson: i }) -> queue
        |       |
        |   Creator Agent -> Bedrock Claude Sonnet
        |   Creator tools:
        |     generate_narration() -> POST minimaxi.chat/v1/t2a_v2
        |     generate_visual()    -> POST minimaxi.chat/v1/image/generation
        |   returns: lesson content JSON
        |       |
        +-- emit("creator", "done", { lesson: i }) -> queue
        |
        +-- emit("validator", "running", { lesson: i }) -> queue
        |       |
        |   Validator Agent -> Bedrock Claude Sonnet
        |   Validator tools:
        |     run_testsprite(code, language) -> POST testsprite API
        |   returns: validation result { passed, failures[] }
        |       |
        IF failures exist:
            |
            +-- emit("fixer", "running", { lesson: i, failures: n }) -> queue
            |       |
            |   Fixer Agent -> Bedrock Claude Sonnet
            |   Fixer tools:
            |     run_testsprite(code, language) -> POST testsprite API (re-validates)
            |   returns: fixed lesson content
            |       |
            +-- emit("fixer", "done", { lesson: i, status: "fixed"|"fail" }) -> queue
        |
        +-- emit("validator", "done", { lesson: i, status: "pass"|"fixed"|"fail" }) -> queue
    |
    +-- emit("orchestrator", "complete") -> queue
    |
    Backend: stores completed course in memory (dict: courseId -> Course)
    |
    v
Frontend: SSE events update AgentStatusPanel in real-time
Frontend: on "complete" event, fetches GET /course/{courseId}
Frontend: renders full course in CourseOutline + LessonViewer
```

### Lesson Regeneration Flow (CopilotKit Action)

```
User types: "Make lesson 2 more beginner-friendly"
    |
    v
CopilotKit sidebar: routes to regenerateLesson action handler
    |
    v
Frontend: POST /course/{courseId}/lesson/1/regenerate { instruction }
    |
    v
Backend: runs Creator -> Validator -> Fixer loop for lesson 1 only
         emits SSE events to existing queue (or new per-regen queue)
    |
    v
Frontend SSE: updates AgentStatusPanel for affected agents
Frontend: on completion, PATCH lesson 1 in local course state
CopilotKit: action handler returns confirmation string to chat
    |
    v
CopilotKit sidebar: displays "Lesson 2 has been regenerated and verified."
Frontend: CourseOutline badge updates (PASS/FIXED/FAIL)
```

### CopilotKit Shared State Flow

```
Course state (React useState in CourseEditor)
    |
    v
useCopilotReadable({ description: "Current course", value: JSON.stringify(course) })
    |
    v
CopilotKit runtime receives course state on every LLM call to the sidebar
    |
The LLM knows: which lessons exist, their titles, validation status, difficulty
    |
User: "The third lesson feels too advanced"
LLM: calls regenerateLesson({ lessonIndex: 2, instruction: "reduce complexity, add simpler examples" })
    |
    v
useCopilotAction handler executes -> backend -> SSE -> updated lesson returned
    v
setCourse(prev => { ...prev, lessons: [...updated] })
    |
    v
useCopilotReadable sends updated course on next LLM call
```

---

## Build Order

Dependencies flow left to right. Build in this order to unblock integrations as early as possible.

```
Phase 1 — Foundation (build these first, no dependencies on each other):

  [A] Backend skeleton       [B] Frontend skeleton       [C] Tool wrappers
  FastAPI + CORS             Next.js + CopilotKit        minimax.py
  /generate endpoint         CopilotKit provider         testsprite.py
  (returns mock courseId)    Layout + components         (stub HTTP calls)
  SSE endpoint               Hardcoded mock course       Test each independently
  asyncio.Queue wiring       AgentStatusPanel

Phase 2 — Agents (depends on A + C):

  [D] Planner Agent          [E] Creator Agent           [F] Validator + Fixer Agents
  Strands setup              Uses tool wrappers C        Uses testsprite tool C
  System prompt tuned        Calls MiniMax               Fixer loop + re-validate
  Returns curriculum JSON    Returns lesson JSON          Returns validation JSON

Phase 3 — Integration (depends on all above):

  [G] Orchestrator           [H] SSE -> Frontend         [I] CopilotKit actions
  Wires D -> E -> F          useCourseStream hook        useCopilotReadable
  Emits SSE events           AgentStatusPanel live       regenerateLesson action
  Stores course in memory    CourseOutline auto-updates  testLesson action

Phase 4 — Polish (depends on G + H + I):

  [J] Datadog metrics        [K] Demo hardening          [L] Visual polish
  ddtrace on agents          Pre-cache 2 courses         PASS/FIXED/FAIL badges
  statsd custom metrics      Fallback mock data          Audio player
  Dashboard panels           Demo script rehearsal       Validation dashboard bar
```

**Recommended build sequence for a solo developer:**
1. A (FastAPI skeleton with mock endpoints) — 15 min
2. B (Next.js + CopilotKit scaffolding, mock data rendered) — 20 min
3. C (MiniMax and TestSprite HTTP wrappers, tested in isolation) — 20 min
4. D (Planner agent producing curriculum JSON) — 20 min
5. E (Creator agent using MiniMax tools) — 25 min
6. F (Validator + Fixer loop) — 25 min
7. G (Orchestrator wiring all agents, emitting SSE) — 20 min
8. H (Frontend SSE hook, live agent status) — 15 min
9. I (CopilotKit actions wired to backend) — 20 min
10. J (Datadog traces + metrics) — 15 min
11. K + L (Demo prep, caching, visual polish) — remainder

---

## Key Integration Points

### 1. CopilotKit Python SDK (v0.1.78) on FastAPI

The SDK depends on `langgraph` and `fastapi`. It exposes actions as an endpoint that the CopilotKit React provider calls to route chat intent to registered handlers. The critical detail: the SDK's `Action` handlers run synchronously unless you use `async` functions — use `async def` for all handlers to avoid blocking the FastAPI event loop during Strands agent calls.

```python
# backend/requirements.txt
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
strands-agents>=0.1.0          # Bedrock Strands
copilotkit>=0.1.78             # CopilotKit Python SDK (pulls langgraph)
boto3>=1.34.0                  # Bedrock access
httpx>=0.27.0                  # Async HTTP for MiniMax + TestSprite
datadog>=0.49.0                # statsd client
ddtrace>=2.9.0                 # Datadog APM + LLM Observability
python-dotenv>=1.0.0
```

The `runtimeUrl` in the CopilotKit React provider must point to the FastAPI `/copilotkit` endpoint. During local development, set it to `http://localhost:8000/copilotkit` directly. For the hackathon demo, this avoids the need for a Next.js API route proxy.

```typescript
// Simplest working setup — point directly at FastAPI
<CopilotKit runtimeUrl="http://localhost:8000/copilotkit">
```

If CORS causes issues, configure FastAPI to allow the Next.js origin:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Strands Agent Async Execution

Strands `Agent.run()` is synchronous by default. FastAPI is async. Use `asyncio.run_in_executor` or confirm whether Strands provides `run_async`. For the hackathon, the safest pattern is to run Strands agents in a thread pool executor to avoid blocking the event loop:

```python
import asyncio
from functools import partial

async def run_agent_async(agent, prompt: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(agent.run, prompt))
```

Alternatively, wrap the entire `generate_course()` coroutine in `asyncio.create_task()` so the SSE endpoint can be opened before generation completes:

```python
@app.post("/course/generate")
async def generate(req: GenerateRequest):
    course_id = str(uuid.uuid4())
    queue = get_or_create_queue(course_id)
    asyncio.create_task(generate_course(req.topic, req.difficulty, queue, course_id))
    return {"courseId": course_id}
```

### 3. MiniMax API Integration

Both TTS and image generation are direct HTTP calls — no SDK required.

TTS endpoint: `POST https://api.minimaxi.chat/v1/t2a_v2`
Image endpoint: `POST https://api.minimaxi.chat/v1/image/generation`

Both require `Authorization: Bearer {MINIMAX_API_KEY}`. Use `httpx.AsyncClient` for non-blocking calls from within Strands tool functions:

```python
# backend/tools/minimax.py
import httpx
import os
from strands import tool

MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")
MINIMAX_BASE = "https://api.minimaxi.chat/v1"

@tool
async def generate_narration(text: str, tone: str = "calm") -> str:
    """Call MiniMax TTS to generate lesson narration audio. Returns audio URL."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MINIMAX_BASE}/t2a_v2",
            headers={"Authorization": f"Bearer {MINIMAX_API_KEY}"},
            json={
                "model": "speech-02-hd",
                "text": text,
                "voice_setting": {"voice_id": "male-qn-qingse", "speed": 0.95}
            },
            timeout=30.0
        )
        resp.raise_for_status()
        # MiniMax returns audio data or a URL; adapt based on actual response shape
        return resp.json().get("audio_url", "")

@tool
async def generate_visual(description: str) -> str:
    """Call MiniMax Image Gen for concept diagrams. Returns image URL."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MINIMAX_BASE}/image/generation",
            headers={"Authorization": f"Bearer {MINIMAX_API_KEY}"},
            json={
                "model": "image-01",
                "prompt": f"Clean minimal technical diagram: {description}. White background, professional, no text.",
                "aspect_ratio": "16:9"
            },
            timeout=60.0
        )
        resp.raise_for_status()
        return resp.json().get("image_url", "")
```

### 4. TestSprite Integration (API TBD)

TestSprite's exact API is unknown until the hackathon. Two scenarios:

**Scenario A — TestSprite executes code directly:**
```python
@tool
async def run_testsprite(code: str, language: str) -> dict:
    """Execute code through TestSprite. Returns { passed: bool, error: str | None }"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TESTSPRITE_BASE_URL}/execute",
            headers={"Authorization": f"Bearer {TESTSPRITE_API_KEY}"},
            json={"code": code, "language": language},
            timeout=30.0
        )
        return resp.json()  # { "passed": true/false, "error": "...", "output": "..." }
```

**Scenario B — TestSprite generates test cases (pivot plan):**
```python
@tool
async def run_testsprite(code: str, language: str) -> dict:
    """TestSprite generates tests; we execute them in a subprocess sandbox."""
    # Step 1: TestSprite generates test cases
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TESTSPRITE_BASE_URL}/generate-tests",
            headers={"Authorization": f"Bearer {TESTSPRITE_API_KEY}"},
            json={"code": code, "language": language}
        )
        tests = resp.json()["tests"]  # list of test strings

    # Step 2: Run tests in restricted subprocess
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code + "\n" + "\n".join(tests))
        fname = f.name
    result = subprocess.run(["python", fname], capture_output=True, timeout=10)
    return {
        "passed": result.returncode == 0,
        "error": result.stderr.decode() if result.returncode != 0 else None
    }
```

Confirm which scenario applies at the hackathon sponsor booth before Hour 1 ends.

### 5. Datadog LLM Observability

`ddtrace` auto-instruments Bedrock calls when the tracer is initialized. Wrap agent calls explicitly if auto-instrumentation misses Strands:

```python
# backend/observability.py
from ddtrace import tracer, patch
from ddtrace.llmobs import LLMObs
from datadog import statsd
import os

def init_observability():
    patch(botocore=True)  # Auto-instruments Bedrock SDK calls
    LLMObs.enable(
        ml_app="learnforge",
        api_key=os.getenv("DD_API_KEY"),
        site=os.getenv("DD_SITE", "datadoghq.com")
    )

def track_course_generated(topic: str, elapsed: float, lesson_count: int):
    statsd.increment("learnforge.course.generated", tags=[f"topic:{topic}"])
    statsd.histogram("learnforge.course.generation_time", elapsed)

def track_validation(failures: int, fixes: int, pass_rate: float):
    statsd.increment("learnforge.validation.total_checks")
    statsd.increment("learnforge.validation.first_pass_failures", value=failures)
    statsd.increment("learnforge.validation.fixes_applied", value=fixes)
    statsd.gauge("learnforge.validation.first_pass_rate", pass_rate)

def track_testsprite(passed: bool):
    statsd.increment("learnforge.testsprite.executions")
    statsd.increment("learnforge.testsprite.passes" if passed else "learnforge.testsprite.failures")
```

---

## Integration Points Summary

### External Services

| Service | Endpoint | Integration Pattern | Critical Notes |
|---------|----------|---------------------|----------------|
| AWS Bedrock | us-east-1 (default) | Strands `Agent` (wraps boto3 Bedrock Converse API) | Requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` in env |
| MiniMax TTS | `api.minimaxi.chat/v1/t2a_v2` | Direct async HTTP via `httpx` inside `@tool` | `MINIMAX_API_KEY` env var; response shape — confirm audio URL vs raw bytes |
| MiniMax Image Gen | `api.minimaxi.chat/v1/image/generation` | Direct async HTTP via `httpx` inside `@tool` | Same API key; 60s timeout; 16:9 aspect ratio |
| TestSprite | TBD at hackathon | Direct async HTTP; pivot plan if test-gen not exec | Confirm execution vs test-generation model at sponsor booth |
| Datadog | datadoghq.com | `ddtrace` (auto Bedrock), `datadog` statsd (custom metrics) | `DD_API_KEY`, `DD_SITE`, `DD_ENV=hackathon` |
| CopilotKit runtime | Hosted on FastAPI `/copilotkit` | `copilotkit` Python SDK + `add_fastapi_endpoint` | SDK v0.1.78 requires `langgraph`; keep LangGraph unused beyond SDK requirement |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend <-> Backend REST | JSON over HTTP (fetch) | CORS must be configured; base URL in `lib/api.ts` |
| Frontend <-> Backend SSE | `EventSource` API | One connection per courseId; close on "complete" event |
| Frontend <-> CopilotKit runtime | CopilotKit React provider internal protocol | `runtimeUrl` points to FastAPI `/copilotkit` |
| Orchestrator <-> Agents | Direct Python function calls (async) | No message bus; in-process; Strands agents are stateless per call |
| Agents <-> External tools | `@tool`-decorated async functions | Tool results returned to agent as strings; agent decides next action |
| Orchestrator <-> SSE queue | `asyncio.Queue` (in-process) | One queue per courseId; dict in module scope |
| Agents <-> Datadog | `ddtrace` trace context (auto) + `statsd.increment` (manual) | Initialize `ddtrace` before any agent calls |

---

## Anti-Patterns

### Anti-Pattern 1: Blocking the FastAPI Event Loop with Synchronous Strands Calls

**What people do:** Call `agent.run(prompt)` directly inside an `async def` FastAPI handler.

**Why it's wrong:** Strands `Agent.run()` is synchronous and CPU/IO-bound. Calling it directly inside an async handler blocks the entire FastAPI event loop, freezing all other requests including the SSE stream the frontend has open. The agent status panel stops updating mid-generation.

**Do this instead:** Use `asyncio.create_task()` to run generation in the background after immediately returning the courseId. Inside the background task, use `loop.run_in_executor(None, agent.run, prompt)` to run Strands calls in a thread pool.

### Anti-Pattern 2: Registering CopilotKit Actions Inside Render (React)

**What people do:** Call `useCopilotAction(...)` inside a component that re-renders frequently (e.g., inside `LessonViewer` which re-renders when the selected lesson changes).

**Why it's wrong:** CopilotKit de-duplicates action registrations by name, but calling the hook on every render creates instability in the action registry and can cause the sidebar to lose registered actions mid-session.

**Do this instead:** Put all `useCopilotAction` and `useCopilotReadable` calls in a single dedicated hook (`hooks/useCopilotActions.ts`) that is called once at the top-level `CourseEditor` component. Dependencies that change (like `course` state) should be referenced via closure refs, not by re-registering the action.

### Anti-Pattern 3: Polling Instead of SSE for Agent Status

**What people do:** Poll `GET /course/:id` every 500ms to check if generation is complete and update the UI.

**Why it's wrong:** Polling misses intermediate agent state (which agent is currently running, per-lesson progress). The judge demo specifically requires showing four agents working in real time. Polling also creates 6x more requests and adds latency to the status display.

**Do this instead:** Use `EventSource` (SSE) for agent status updates. SSE is a one-way push channel that requires no special client library, works over HTTP, and delivers sub-100ms event latency from server to browser.

### Anti-Pattern 4: One Agent Doing Everything

**What people do (temptation under time pressure):** Merge Creator + Validator into one agent to save implementation time.

**Why it's wrong:** A single agent asked to "write content AND verify it" will produce conservative, trivially simple code to avoid self-criticism. The tension between Creator (produce ambitious content) and Validator (break it ruthlessly) is the architectural feature that makes the Fixer loop interesting. It is also the answer to the most common judge question: "Why multiple agents?"

**Do this instead:** Keep all four agents separate even under time pressure. The Planner and Creator can share a system prompt style, but the Validator must have an adversarial prompt to be credible.

---

## Scaling Considerations

This is a hackathon demo. The relevant scale is 1 judge at a time, 5-minute demo window.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 demo (target) | In-memory course store, single asyncio.Queue per course, no persistence needed |
| Multi-judge (science fair) | Pre-generate 2 demo courses as fallback; display cached results if live gen is slow |
| Post-hackathon (hypothetical) | Add Redis for queue (replace asyncio.Queue), PostgreSQL for course persistence, task queue (Celery/ARQ) for background generation |
| Production (out of scope) | Separate microservices per agent, streaming token output per lesson, user auth, course persistence |

**First bottleneck for live demo:** MiniMax TTS and image generation latency. Each lesson requires 2 API calls (TTS + image) that can take 3-10 seconds each. For a 4-lesson course this is 24-80 seconds of blocking. Mitigation: pre-generate media for the 2 demo topics and cache audio/image URLs; fall back to cached versions if live generation is slow.

**Second bottleneck:** Bedrock cold start. The first Bedrock Converse call in a session takes 1-3 seconds longer than subsequent calls. Mitigation: send a warm-up call to Planner at app startup with a trivial prompt.

---

## Sources

- [Bedrock Strands Agents documentation](https://strandsagents.com/latest/)
- [CopilotKit Python SDK (v0.1.78)](https://docs.copilotkit.ai/coagents/quickstart/langgraph)
- [CopilotKit React hooks reference](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [FastAPI SSE with StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [MiniMax TTS API](https://www.minimaxi.com/document/T2A%20V2)
- [MiniMax Image Generation API](https://www.minimaxi.com/document/image-generation)
- [Datadog LLM Observability Python](https://docs.datadoghq.com/llm_observability/setup/sdk/python/)
- [Datadog ddtrace Bedrock instrumentation](https://ddtrace.readthedocs.io/en/stable/integrations.html#botocore)
- LearnForge hackathon spec: `learnforge-hackathon-spec.md`

---
*Architecture research for: LearnForge — AI-powered verified course generation platform*
*Researched: 2026-02-20*
