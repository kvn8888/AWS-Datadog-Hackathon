# LearnForge Fix Plan

Derived from `.planning/ROADMAP.md`. Execute in order — phases are hard dependencies.

## Phase 1: Infrastructure (P0 — do first)

- [x] **01-01: Backend skeleton** — FastAPI app with routes (`/course/generate`, `/course/{id}/stream`, `/copilotkit`), SSE asyncio.Queue, CopilotKit runtime endpoint via `create_strands_app()` from ag_ui_strands, CORS for localhost:3000. Python 3.12 venv, requirements.txt with pinned versions.
- [x] **01-02: Frontend skeleton** — Next.js 16 app with CopilotKit provider (`runtimeUrl` → `http://localhost:8000/copilotkit`), CopilotSidebar, GenerateForm (topic input), CourseOutline, LessonViewer, useCourseStream hook (EventSource for SSE). Tailwind 4 for styling. Hardcoded mock course for initial rendering.
- [x] **01-03: Tool wrappers** — MiniMax TTS tool (`generate_narration()` via httpx to `api.minimaxi.chat/v1/t2a_v2`), MiniMax image gen tool (`generate_visual()` via httpx to `api.minimaxi.chat/v1/image/generation`), TestSprite tool (both Scenario A: code execution and Scenario B: test generation + local subprocess). All as Strands `@tool` functions. Smoke test each wrapper.

## Phase 2: Agents (P0 — after Phase 1)

- [x] **02-01: Pydantic models** — Course, Lesson, CodeExample, ValidationResult, AgentEvent schemas in `backend/models.py`. Lock schema before any agent code. Create matching TypeScript types in `frontend/types/course.ts`.
- [x] **02-02: Planner Agent** — Strands agent with system prompt for curriculum design. Input: topic string. Output: Course JSON with 3-5 lessons, each with title, objectives, and content outline. Pure reasoning, no tools.
- [x] **02-03: Creator Agent** — Strands agent that writes lesson content. Calls `generate_narration()` and `generate_visual()` tools. Input: lesson plan from Planner. Output: complete Lesson JSON with explanation, code examples, quiz questions, audio URL, image URL. Use `asyncio.gather` for parallel MiniMax calls.
- [x] **02-04: Validator + Fixer Agents** — Validator: extracts code snippets, calls TestSprite tool, returns per-snippet PASS/FAIL. Fixer: rewrites failing code, re-validates through TestSprite, max 3 iterations. Both agents share TestSprite tool.

## Phase 3: Pipeline + CopilotKit (P0 — after Phase 2)

- [x] **03-01: Orchestrator** — `backend/orchestrator.py` with `generate_course()` flow: Planner → (Creator → Validator → Fixer) per lesson. Emits SSE events via asyncio.Queue at each agent boundary. Uses `asyncio.create_task()` for background execution. `regenerate_lesson()` flow for single-lesson regeneration.
- [x] **03-02: Frontend SSE integration** — Replace mock data with real SSE events. `useCourseStream` hook drives AgentStatusPanel with live Planner/Creator/Validator/Fixer updates. CourseOutline + LessonViewer render real course data. ValidationBadge (PASS/FIXED/FAIL) per lesson. Audio player for TTS narration. FIXED badge shows before/after code diff.
- [x] **03-03: CopilotKit wiring** — `useCopilotReadable` sharing full course state. `generateCourse` action: takes topic → triggers generate_course(). `regenerateLesson` action: takes lesson index + instructions → triggers regenerate_lesson(). All in single `useCopilotActions` hook at top-level CourseEditor component.

## Phase 4: Observability (P1 — after Phase 3)

- [x] **04-01: Datadog setup** — `ddtrace` auto-instrumentation of Bedrock calls. OTLP export to Datadog Agent at localhost:4318. `DD_PROFILING_MEMORY_ENABLED=false`. Custom statsd metrics: validation pass rate, fix count, generation latency in `backend/observability.py`. Docker Compose for Datadog Agent with `DD_OTLP_CONFIG_RECEIVER_HTTP_ENABLED=true`.

## Phase 5: Polish (P2 — after Phase 4)

- [x] **05-01: Test button + badges** — On-demand "Test This Code" endpoint + button wired to TestSprite per code example. PASS/FIXED/FAIL badge color styling (green/amber/red). Pre-cached demo courses for 2 topics (Python async, AWS Lambda) as API fallback.

## Completed
- [x] Project initialization and planning
- [x] Research completed (stack, features, architecture, pitfalls)
- [x] Requirements defined (20 requirements, 5 categories)
- [x] Roadmap created (5 phases, 12 plans)
- [x] All 12 implementation plans executed and committed

## Notes
- **All phases complete** — full product built
- **Schema lock in 02-01**: Both TypeScript types and Pydantic models from same schema
- **CopilotKit bridge**: ag_ui_strands, NOT copilotkit Python SDK
- **Python 3.12 only**: 3.13 breaks copilotkit dependency
