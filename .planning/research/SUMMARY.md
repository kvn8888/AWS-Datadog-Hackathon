# Project Research Summary

**Project:** LearnForge
**Domain:** AI-powered multi-agent verified course generation platform (hackathon build)
**Researched:** 2026-02-20
**Confidence:** HIGH (stack), MEDIUM (features, architecture), MEDIUM (pitfalls)

## Executive Summary

LearnForge is a 6-hour solo hackathon build targeting $9,500 across three sponsor prizes: CopilotKit ($3,500), TestSprite ($3,500), and MiniMax ($2,500). The product generates structured multi-lesson coding courses using a 4-agent Bedrock Strands pipeline (Planner → Creator → Validator → Fixer), with every code example tested by TestSprite before delivery, per-lesson TTS narration and concept visuals from MiniMax, and a CopilotKit-powered sidebar that lets judges edit the course via natural language. The competitive differentiation is explicit: no existing AI tutorial platform has a validation-and-repair feedback loop before learners see content — LearnForge generates, tests, fixes, then ships.

The recommended approach is a Python 3.12 + FastAPI backend running Strands agents bridged to a Next.js 16 + CopilotKit frontend via the AG-UI protocol (`ag_ui_strands`). MiniMax TTS and image generation are called directly via `httpx` inside Strands `@tool` functions. Datadog LLM Observability is enabled through `ddtrace` auto-instrumentation of Bedrock calls plus OTLP export. The build order must prioritize infrastructure wiring (backend skeleton, SSE, CopilotKit connection) before any agent logic, because all four agents depend on that foundation working correctly.

The two highest risks are: (1) TestSprite API uncertainty — its behavior as test-generator vs. code-executor must be confirmed in the first 30 minutes, and two Validator implementations must be pre-written to cover both scenarios; and (2) MiniMax latency — 10 API calls for a 5-lesson course can take 35–100 seconds sequentially, which kills demo pacing; the mitigation is `asyncio.gather` for parallel TTS + image calls per lesson plus pre-cached demo courses as fallback before judging begins.

---

## Key Findings

### Recommended Stack

The stack is anchored by constraints from the three sponsor prize frameworks. Python 3.12 is the hard ceiling: `ag_ui_strands` requires `>=3.12` and `copilotkit` caps at `<3.13`, making 3.12.x the only version satisfying all dependencies simultaneously. Strands Agents 1.27.0 (released 2026-02-19) provides the native `multiagent.Graph` for the 4-agent pipeline and built-in OTLP telemetry. The critical bridge is `ag_ui_strands==0.1.1` — the only verified path to connect CopilotKit's React frontend to a Strands Python backend without rebuilding CopilotKit internals. MiniMax has no official Python SDK covering TTS or image generation; direct `httpx` calls to `api.minimaxi.chat/v1/` are the correct approach. Stack versions are all verified against PyPI, npm, and GitHub as of 2026-02-20.

**Core technologies:**
- `strands-agents==1.27.0`: Multi-agent pipeline (Planner/Creator/Validator/Fixer) — mandated Bedrock prize framework with native Graph orchestration
- `ag_ui_strands==0.1.1`: CopilotKit ↔ Strands bridge — the only verified integration path; requires Python 3.12+
- `fastapi==0.129.0` + `uvicorn==0.41.0`: HTTP server, SSE endpoints, CORS handling
- `httpx==0.28.1`: Async HTTP client for MiniMax TTS + Image Gen API calls (no official SDK)
- `boto3==1.42.53`: AWS Bedrock API access; required by Strands
- `ddtrace==4.4.0` + OTLP exporter stack: Datadog LLM Observability — disable memory profiler (`DD_PROFILING_MEMORY_ENABLED=false`) due to known v4.1–4.4 issue
- `next@16.1.6` + `@copilotkit/react-core@1.51.4`: Frontend framework + CopilotKit React hooks
- `tailwindcss@4.2.0`: CSS-first config (no `tailwind.config.js` in v4); break from v3 syntax

**What NOT to use:**
- `minimax-python==0.2.0` — video generation only, does not cover TTS or image endpoints
- `copilotkit==0.1.78` as the Strands bridge — hard-depends on LangGraph (400MB+); use `ag_ui_strands` instead
- Python 3.13+ — breaks `copilotkit` import
- `next@15` — current latest is 16.1.6 and CopilotKit actively tests against it

### Expected Features

Feature prioritization is driven by prize criteria, not user value. Every feature decision should answer: does this satisfy a specific judge's evaluation criteria? The MVP is 9 features; missing any one of them leaves a prize undefended.

**Must have — P1 (build before anything else):**
- 4-agent pipeline (Planner → Creator → Validator → Fixer) — core to all three prizes; the judge question "why multiple agents?" must have a live answer
- TestSprite runs on every code example — the TestSprite integration must be essential, not cosmetic; if removing TestSprite just removes a badge it fails the prize criteria
- PASS/FIXED/FAIL badges per lesson — visible proof of the testing story
- Fixer feedback loop with re-validation — was FAIL, now PASS is the money shot for TestSprite judges
- CopilotKit `useCopilotReadable` + at least 2 `useCopilotAction`s (generateCourse, regenerateLesson) — bidirectional state + UI-mutating actions is what separates a CopilotKit integration from a chatbot
- Natural language → visible course change ("make lesson 2 easier" → lesson 2 updates live)
- MiniMax TTS narration that actually plays in the browser — audio must play, not just be a URL in the DOM
- MiniMax image gen concept visual per lesson — volume of calls matters to MiniMax judges (8+ calls for a 4-lesson course)
- Agent status panel via SSE — fills the 60–120s generation wait with visible AI activity; without it judges see a frozen screen
- Validation summary dashboard — quantifies the TestSprite story
- Pre-cached demo courses — not a demo feature, a demo safety net; build before judging

**Should have — P2 (add in Hours 3–4 after P1 works):**
- On-demand "Test This Code" button per lesson
- FIXED badge with before/after code diff
- Difficulty slider triggering curriculum replan
- Voice tone variation per lesson type (speed parameter variation)
- 3rd CopilotKit action (adjustDifficulty or testLesson)

**Defer — P3/Do Not Build:**
- Video scene transitions (3+ hours, latency-prohibitive)
- Quiz grading engine
- Course export
- Mobile responsive layout (desktop-only science fair demo)
- User auth / persistence

**Critical dependency chain:** TestSprite is the linchpin — Validator, Fixer, on-demand testing, FIXED badges, and validation dashboard all depend on it. The course object schema must be locked in Hour 1 or both the frontend (CopilotKit state) and backend (agents writing to it) integration becomes painful. MiniMax calls live inside the Creator Agent, not as standalone features.

### Architecture Approach

The system is a two-process architecture: a Python FastAPI backend hosting the Strands agent pipeline and CopilotKit runtime endpoint, and a Next.js frontend consuming REST endpoints, SSE streams, and the CopilotKit React provider. Course generation is fully asynchronous: POST to `/course/generate` returns a `courseId` immediately, an `asyncio.Queue` receives agent events as generation proceeds in a background task, and the frontend opens an `EventSource` to `/course/{courseId}/stream` to consume those events in real time. Completed courses are stored in-memory (single-process demo scope). All `useCopilotAction` and `useCopilotReadable` registrations belong in a single `hooks/useCopilotActions.ts` hook called once at the top-level component — registering inside child components that re-render causes action registry instability.

**Major components:**
1. **Planner Agent** — decomposes topic into 3–5 sequenced lesson plans with objectives; pure reasoning, no tools; runs once per course
2. **Creator Agent** — writes explanation, code examples, and quizzes per lesson; calls `generate_narration()` and `generate_visual()` via `@tool` wrappers to MiniMax; TTS + image calls must be `asyncio.gather`'d in parallel
3. **Validator Agent** — extracts code snippets, calls TestSprite, returns pass/fail per snippet; has an adversarial system prompt so it actively tries to break code
4. **Fixer Agent** — rewrites failing code, re-validates through TestSprite; must have a max-iteration cap (prevent infinite loop)
5. **FastAPI + SSE layer** — `asyncio.Queue` per courseId; `StreamingResponse` with `X-Accel-Buffering: no` header; CORS must allow `http://localhost:3000`
6. **CopilotKit runtime endpoint** — `create_strands_app()` via `ag_ui_strands` mounted on FastAPI; `runtimeUrl` in the Next.js provider points to this; the `/copilotkit` route must be separate from domain API routes
7. **Next.js frontend** — `CourseEditor` → `CourseOutline` + `LessonViewer`; `useCourseStream` hook drives the agent status panel; `useCopilotActions` hook registers all CopilotKit state and actions at the top level
8. **Datadog observability** — `ddtrace` auto-instruments Bedrock calls; OTLP export to Datadog Agent at `http://localhost:4318`; custom `statsd` metrics for validation pass rates and generation timing

**Recommended file structure:**
```
learnforge/
├── backend/
│   ├── main.py               # FastAPI app, route definitions
│   ├── agents/               # One file per agent (planner, creator, validator, fixer)
│   ├── orchestrator.py       # generate_course() and regenerate_lesson() flows
│   ├── tools/                # minimax.py, testsprite.py (@tool wrappers)
│   ├── models.py             # Pydantic: Course, Lesson, ValidationResult
│   ├── streaming.py          # SSE helpers, asyncio.Queue, AgentEvent
│   └── observability.py      # ddtrace config, statsd tracking
├── frontend/
│   ├── app/page.tsx          # CopilotKit provider + layout root
│   ├── app/api/copilotkit/   # CopilotKit Next.js route handler
│   ├── components/           # CourseEditor, AgentStatusPanel, CourseOutline, LessonViewer, ValidationBadge, GenerateForm
│   ├── hooks/                # useCourseStream, useCopilotActions
│   ├── lib/api.ts            # Typed fetch wrappers (single place to change backend URL)
│   └── types/course.ts       # TypeScript types mirroring Pydantic models
└── .env.example
```

### Critical Pitfalls

1. **CopilotKit backend misconfiguration** — The frontend `CopilotKit` provider requires `runtimeUrl` pointing to an endpoint served by `create_strands_app()` via `ag_ui_strands`, not an arbitrary REST route. Wire and smoke-test the CopilotKit ↔ Python connection in the first 15 minutes. Warning sign: sidebar renders but no actions appear in Python server logs.

2. **TestSprite API misunderstanding** — TestSprite may generate test cases rather than execute code. Confirming this in the first 30 minutes before writing a single line of Validator code prevents a mid-hackathon architectural rebuild. Pre-write both Validator implementations: one for direct execution (Scenario A) and one for test-generation + local subprocess runner (Scenario B).

3. **MiniMax latency killing pipeline pacing** — Sequential TTS + image calls add 35–100 seconds for a 5-lesson course. Use `asyncio.gather(tts_call(), image_call())` per lesson from the first implementation. Pre-generate assets for demo topics before judging begins. Implement graceful degradation: HTTP 429 should log and continue, not crash the pipeline.

4. **Blocking the FastAPI event loop with synchronous Strands calls** — `agent.run()` is synchronous; calling it directly inside an `async def` handler freezes all other requests including the SSE stream the frontend has open. Use `asyncio.create_task()` for background generation and `loop.run_in_executor(None, agent.run, prompt)` for individual agent calls.

5. **Bedrock throttling with no retry logic** — Multiple agents hitting Bedrock in a shared hackathon environment triggers `ThrottlingException`. Add a 3-retry exponential backoff wrapper before the first Bedrock call. Use Claude Haiku 3.5 for Validator/Fixer (structured JSON work) and reserve Sonnet for Creator (creative generation).

6. **Registering CopilotKit actions inside frequently re-rendering components** — Causes action registry instability mid-session. All `useCopilotAction` and `useCopilotReadable` calls belong in a single dedicated hook invoked once at the top-level `CourseEditor`.

---

## Implications for Roadmap

The build order is driven by a strict dependency chain: infrastructure must work before agents can run, agents must work before the pipeline can be wired, and the pipeline must work before CopilotKit chat interactions are meaningful. Parallelizing work across these phases wastes time — a broken SSE connection discovered in Hour 4 after agents are built requires undoing work.

### Phase 1: Infrastructure Foundation (First 55 minutes)

**Rationale:** Every other phase depends on three things working: the FastAPI backend serving routes (including SSE), the Next.js frontend rendering with CopilotKit connected, and the MiniMax + TestSprite HTTP tool wrappers callable in isolation. These have no dependencies on each other and should be built in parallel where possible. The CopilotKit ↔ Python connection and SSE streaming must be smoke-tested before moving to agents — both are notorious silent failure points.

**Delivers:** Backend skeleton with mock endpoints returning hardcoded data; Next.js frontend rendering a hardcoded course; CopilotKit sidebar connected to FastAPI `/copilotkit`; SSE endpoint emitting mock events; MiniMax and TestSprite `@tool` wrappers making real API calls.

**Addresses:** Topic input UI, agent status panel (mock data), lesson navigation shell

**Avoids:** CopilotKit misconfiguration pitfall (Pitfall 1), SSE streaming broken under CORS (Pitfall 2), TestSprite API misunderstanding (Pitfall 4 — confirm API behavior while tool wrapper is being written)

**Research flag:** Standard patterns — no additional research needed. FastAPI, SSE, and Next.js scaffolding are well-documented.

---

### Phase 2: Agent Layer (Hours 1.5–3.5)

**Rationale:** With infrastructure validated, agents can be built in a dependency-aware order: Planner first (no tools needed, pure reasoning), then Creator (uses MiniMax tools from Phase 1), then Validator + Fixer together (both use the TestSprite tool). Each agent must produce well-typed JSON output matching the `models.py` Pydantic schema locked at the start of this phase — locking the schema here prevents integration pain in Phase 3.

**Delivers:** Planner producing curriculum JSON (3–5 lessons); Creator producing lesson content JSON with MiniMax audio URLs and image URLs; Validator running TestSprite and returning per-snippet pass/fail; Fixer rewriting failing code with a max-iteration cap; all agents tested in isolation against the tool wrappers from Phase 1.

**Uses:** `strands-agents==1.27.0`, `httpx` for MiniMax tools, TestSprite tool wrapper, `boto3` for Bedrock

**Implements:** Planner Agent, Creator Agent, Validator Agent, Fixer Agent components

**Avoids:** Sequential MiniMax calls (Pitfall 5 — `asyncio.gather` TTS + image from first implementation), Bedrock throttling (Pitfall 6 — add retry wrapper before first Bedrock call), one agent doing everything anti-pattern (keep all four separate even under time pressure)

**Research flag:** TestSprite integration needs attention — confirm execution vs. test-generation model at the start of this phase, then implement the correct Validator. MiniMax response shape (audio URL vs. raw bytes, image URL format) must be checked against actual API response on first call.

---

### Phase 3: Pipeline Integration + SSE Wiring (Hours 3.5–4.5)

**Rationale:** With validated agents and validated infrastructure, the orchestrator can wire them into the sequential per-lesson pipeline and connect SSE event emission at every agent boundary. The frontend SSE hook then consumes live events and drives the agent status panel. This phase also wires the CopilotKit actions to real backend endpoints.

**Delivers:** `orchestrator.py` with `generate_course()` emitting SSE events at each agent boundary; frontend `useCourseStream` hook driving the agent status panel with live data; `CourseOutline` and `LessonViewer` rendering real generated course content; `useCopilotReadable` sharing course state; `generateCourse` and `regenerateLesson` CopilotKit actions triggering real backend calls and visibly mutating course content.

**Implements:** Orchestrator, SSE event queue (asyncio.Queue per courseId), useCourseStream hook, useCopilotActions hook

**Avoids:** Blocking event loop with synchronous Strands calls (Pitfall 3 — `asyncio.create_task` for background generation), CopilotKit state sync lag (Pitfall 7 — emit terminal state before returning), multi-agent pipeline producing no intermediate UI updates (Pitfall 3)

**Research flag:** No additional research needed — this phase applies well-documented async Python and React patterns established in ARCHITECTURE.md.

---

### Phase 4: Observability + Demo Hardening (Hours 4.5–5.5)

**Rationale:** Datadog LLM Observability is a prize differentiator only if traces are visible during the demo. This phase wires `ddtrace`, verifies traces appear in the Datadog UI, adds custom `statsd` metrics for validation pass rates, and builds the fallback demo safety net. Without pre-cached courses, a live API failure during judging loses all three prizes.

**Delivers:** `ddtrace` auto-instrumenting Bedrock calls with LLM Observability; `statsd` custom metrics tracking validation pass rates, fix counts, and generation timing; Datadog dashboard showing LLM spans during demo; 2 pre-cached demo courses for Python async and AWS Lambda topics rendering correctly as fallbacks; validation summary dashboard (footer bar with total checks, first-pass rate, fixes applied).

**Uses:** `ddtrace==4.4.0`, OTLP exporter stack, Datadog Agent (Docker), `statsd`

**Avoids:** Missing Datadog instrumentation appearing only at demo time, demo crashing on MiniMax rate limit or Bedrock throttle

**Research flag:** Datadog Agent Docker setup (`DD_OTLP_CONFIG_RECEIVER_HTTP_ENABLED=true`) should be verified against current Datadog docs — the OTLP receiver configuration flag has changed in recent Agent versions.

---

### Phase 5: Visual Polish + P2 Features (Hour 5.5–6)

**Rationale:** P2 features that add judging value without risking the P1 core. Only enter this phase after the end-to-end demo works and has been rehearsed once. Stop and rehearse again after each P2 feature.

**Delivers:** FIXED badge with before/after code diff; on-demand "Test This Code" button; voice tone variation per lesson type; 3rd CopilotKit action (adjustDifficulty); PASS/FIXED/FAIL badge styling polish.

**Avoids:** Over-building at the expense of demo reliability; building P2 features before P1 is stable and rehearsed

**Research flag:** No additional research needed — all P2 features are incremental additions to Phase 3 components.

---

### Phase Ordering Rationale

- **Infrastructure before agents:** The CopilotKit ↔ Python connection and SSE streaming are silent failure modes that take significant debugging time to diagnose. Discovering them in Phase 3 after agents are built wastes all agent work.
- **Lock schema in Phase 2:** Both frontend TypeScript types and backend Pydantic models derive from the same course JSON structure. Changing the schema after Phase 3 integration breaks both sides simultaneously.
- **Orchestrator last among core phases:** The orchestrator is a wrapper that only adds value once all four agents are individually validated. Building it before agents work produces a wrapper that can't be tested.
- **Observability before visual polish:** Datadog traces take 1–2 minutes to appear after first instrumentation. Starting observability setup early gives time for traces to populate before the demo. A screenshot of a populated Datadog dashboard is the fallback if the live demo environment doesn't cooperate.

### Research Flags

Phases needing deeper research or immediate API verification during execution:
- **Phase 1 (tool wrappers):** TestSprite API behavior must be confirmed the moment the API key is received. Do not write the Validator Agent until this is known. Pre-write both Scenario A (code execution) and Scenario B (test generation + local subprocess) Validator implementations.
- **Phase 2 (Creator Agent):** MiniMax TTS response shape (audio URL vs. raw bytes) and image gen response shape must be confirmed on the first actual API call. The `@tool` implementations in ARCHITECTURE.md assume URL responses — adapt immediately if the actual response differs.
- **Phase 4 (Datadog):** Verify current Datadog Agent OTLP receiver flag (`DD_OTLP_CONFIG_RECEIVER_HTTP_ENABLED`) against live docs — configuration has evolved across recent Agent versions.

Phases with standard patterns (skip additional research):
- **Phase 1 (FastAPI + Next.js scaffolding):** Entirely standard; ARCHITECTURE.md provides complete working code.
- **Phase 3 (Orchestrator + SSE):** `asyncio.Queue` SSE pattern is well-documented; complete implementation provided in ARCHITECTURE.md.
- **Phase 5 (P2 polish):** All P2 features are incremental additions requiring no new architectural decisions.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against PyPI, npm registry, and GitHub as of 2026-02-20. Version constraints are exact and rationale is documented. `ag_ui_strands` as the CopilotKit ↔ Strands bridge is confirmed from the official AG-UI repo. |
| Features | MEDIUM | Prize criteria analysis is solid; CopilotKit API patterns are well-documented. TestSprite and MiniMax feature behavior is inferred from spec + training knowledge — verify at event. |
| Architecture | HIGH | Core patterns (FastAPI + SSE, asyncio.Queue, useCopilotAction registration, Strands @tool wrappers) are well-established. CopilotKit Python SDK dependency on LangGraph is a known complexity but managed via `ag_ui_strands`. |
| Pitfalls | MEDIUM | Infrastructure and async pitfalls are HIGH confidence (standard patterns). TestSprite and MiniMax API-specific pitfalls are MEDIUM — based on training knowledge, not live API verification. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **TestSprite API behavior (HIGH PRIORITY):** Whether TestSprite executes code or generates test cases is unknown until the hackathon. This is the single highest-risk unknown. Pre-write both Validator implementations. Confirm at the sponsor booth before Hour 1 ends.
- **MiniMax response shapes:** TTS response (audio URL vs. raw bytes) and image gen response format must be confirmed on first actual API call. The `generate_narration()` and `generate_visual()` tool implementations in ARCHITECTURE.md include adaptation notes but need live verification.
- **Bedrock model availability:** The specific model IDs (`us.anthropic.claude-sonnet-4-5-v2:0`) must be enabled in the AWS account before the hackathon. Confirm model access and cross-region inference setup before build day.
- **Datadog OTLP receiver flag:** Verify the exact Docker flag for enabling OTLP HTTP receiver against current Datadog Agent docs — this has changed across recent versions.

---

## Sources

### Primary (HIGH confidence)
- `https://pypi.org/pypi/strands-agents/json` — strands-agents 1.27.0 metadata, all dependencies
- `https://pypi.org/pypi/ag_ui_strands/json` — ag_ui_strands 0.1.1, confirms Python 3.12+ requirement
- `https://api.github.com/repos/ag-ui-protocol/ag-ui/contents/integrations/aws-strands/` — AG-UI Strands integration architecture and examples
- `https://api.github.com/repos/strands-agents/sdk-python/` — Strands Graph multi-agent source, OTLP tracer implementation
- `https://registry.npmjs.org/@copilotkit/react-core` — CopilotKit 1.51.4 dist-tags and peer dependencies
- `https://registry.npmjs.org/next/latest` — Next.js 16.1.6 confirmed
- `https://pypi.org/pypi/ddtrace/json` — ddtrace 4.4.0, memory profiler warning noted
- `https://pypi.org/pypi/minimax-python/json` — confirmed video-generation-only (do not use)
- `/Users/theaccount/projects/personal/LearnForge/.planning/PROJECT.md` — project spec (primary source)
- `/Users/theaccount/projects/personal/LearnForge/learnforge-hackathon-spec.md` — hackathon spec (primary source)

### Secondary (MEDIUM confidence)
- CopilotKit Python SDK CoAgents quickstart — `useCopilotAction`, `useCopilotReadable`, `CopilotSidebar` API patterns
- Bedrock Strands documentation — agent system prompts, `@tool` decorator pattern, async execution
- MiniMax API documentation — TTS and image gen endpoint structure (verify response shape on first call)
- Datadog LLM Observability Python docs — `ddtrace` + `LLMObs.enable()` setup
- FastAPI SSE with `StreamingResponse` — well-documented standard pattern

### Tertiary (LOW confidence — verify at hackathon)
- TestSprite API behavior (execution vs. test generation) — must confirm at sponsor booth
- MiniMax audio response format (URL vs. raw bytes) — must confirm on first API call
- Datadog Agent OTLP receiver flag — verify against current docs before demo day

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
