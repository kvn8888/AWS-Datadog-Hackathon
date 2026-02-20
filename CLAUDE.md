# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

LearnForge is an AI-powered platform that generates **verified micro-courses** on programming topics. Users type a topic, and four collaborating AI agents produce a complete course where every code example is executed and tested before the learner sees it.

**Core value:** Every code example in every lesson is tested and verified before the learner sees it.

Built for the AWS x Anthropic x Datadog GenAI Hackathon (Feb 2026). Solo builder, ~6 hours.

## Architecture

### System Flow

```
User enters topic
  → POST /course/generate (returns courseId)
  → Orchestrator spawns background pipeline:
      Planner → (Creator → Validator → Fixer) × N lessons
  → SSE events emitted at each agent boundary
  → Frontend subscribes via EventSource
  → GET /course/{id} fetches completed course
  → CopilotKit sidebar enables natural language course manipulation
```

### 4-Agent Pipeline

| Agent | Model | Role | Tools |
|-------|-------|------|-------|
| **Planner** | Claude Sonnet (Bedrock) | Breaks topic into 3-5 sequenced lessons | None (pure reasoning) |
| **Creator** | Claude Sonnet (Bedrock) | Writes explanations, code, quizzes | `generate_narration`, `generate_visual` |
| **Validator** | Claude Haiku (Bedrock) | Executes every code example via TestSprite | `run_testsprite` |
| **Fixer** | Claude Haiku (Bedrock) | Rewrites failing code, max 3 iterations | `run_testsprite` |

### Tech Stack

**Backend (Python 3.12+):**
- Strands Agents 1.27.0 — AWS Bedrock multi-agent framework
- FastAPI 0.129.0 — API server with SSE streaming
- ag_ui_strands 0.1.1 — CopilotKit ↔ Strands bridge (NOT `copilotkit` Python SDK)
- httpx 0.28.1 — MiniMax API client (no official SDK for TTS/images)
- boto3 1.42.53 — AWS Bedrock access
- ddtrace 4.4.0 + OpenTelemetry — Datadog LLM Observability
- Pydantic 2.x — Data models (schema locked)

**Frontend (TypeScript):**
- Next.js 16.1.6 (App Router)
- React 19.2.3
- CopilotKit 1.51.4 (react-core, react-ui, runtime)
- Tailwind CSS 4

**External APIs:**
- AWS Bedrock (Claude models via Strands)
- MiniMax (TTS `speech-02-hd` + image gen `image-01`)
- TestSprite (code validation — 3 modes: execute, generate, local fallback)
- Datadog (LLM Observability + custom statsd metrics)

## Project Structure

```
LearnForge/
├── backend/
│   ├── main.py              # FastAPI app, routes, CopilotKit mount
│   ├── models.py            # Pydantic models — SCHEMA LOCKED
│   ├── orchestrator.py      # 4-agent pipeline orchestration
│   ├── streaming.py         # SSE infrastructure (asyncio.Queue per course)
│   ├── observability.py     # Datadog tracing + custom metrics
│   ├── requirements.txt     # Pinned Python dependencies
│   ├── conftest.py          # Pytest root config (mocks strands SDK)
│   ├── pytest.ini           # Pytest settings
│   ├── agents/
│   │   ├── planner.py       # Curriculum design agent
│   │   ├── creator.py       # Lesson content + MiniMax tools
│   │   ├── validator.py     # Code execution via TestSprite
│   │   └── fixer.py         # Code repair (max 3 iterations)
│   ├── tools/
│   │   ├── minimax.py       # TTS narration + concept image generation
│   │   └── testsprite.py    # Code validation (3 modes)
│   └── tests/               # 107 pytest tests
│       ├── conftest.py      # Shared fixtures
│       ├── test_models.py
│       ├── test_streaming.py
│       ├── test_agent_parsers.py
│       ├── test_tools_testsprite.py
│       ├── test_tools_minimax.py
│       ├── test_api.py
│       ├── test_observability.py
│       └── test_orchestrator.py
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # CopilotKit provider + CopilotSidebar
│   │   ├── layout.tsx        # Root layout with metadata
│   │   └── api/copilotkit/
│   │       └── route.ts      # CopilotRuntime proxy to backend
│   ├── components/
│   │   ├── CourseEditor.tsx   # Main container (state + hooks)
│   │   ├── GenerateForm.tsx   # Topic input + generate button
│   │   ├── AgentStatusPanel.tsx # Live planner/creator/validator/fixer status
│   │   ├── CourseOutline.tsx  # Lesson navigation sidebar
│   │   ├── LessonViewer.tsx   # Lesson content, code, quiz, test button
│   │   └── ValidationBadge.tsx # PASS/FIXED/FAIL/PENDING badges
│   ├── hooks/
│   │   ├── useCourseStream.ts # SSE EventSource consumer
│   │   └── useCopilotActions.ts # ALL CopilotKit state + actions (single hook)
│   ├── lib/
│   │   └── api.ts            # Backend API client (fetch wrappers)
│   ├── types/
│   │   └── course.ts         # TypeScript types mirroring Pydantic models
│   ├── __tests__/            # 37 vitest tests
│   ├── vitest.config.ts
│   ├── vitest.setup.ts
│   └── package.json
├── .planning/                # GSD workflow artifacts
│   ├── PROJECT.md            # Project context and key decisions
│   ├── REQUIREMENTS.md       # 20 requirements (PIPE, CKIT, MMAX, VIEW, OBSV)
│   ├── ROADMAP.md            # 5 phases, 12 plans
│   ├── STATE.md              # Progress tracking (100% complete)
│   └── research/             # Tech stack, architecture, pitfalls research
├── .env.example              # All required environment variables
└── CLAUDE.md                 # This file
```

## Key Commands

### Backend

```bash
# Install dependencies (Python 3.12 required)
cd backend
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests (107 tests)
cd backend && python3 -m pytest tests/ -v

# Run a specific test file
python3 -m pytest tests/test_models.py -v

# Quick smoke test (local code execution, no API keys needed)
python3 -c "from tools.testsprite import _run_code_locally; print(_run_code_locally('print(1+1)', 'python'))"
```

### Frontend

```bash
# Install dependencies
cd frontend && npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests (37 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
```

### Full Stack (development)

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
# → Opens at http://localhost:3000
```

## Critical Design Decisions

### Schema Lock
`backend/models.py` and `frontend/types/course.ts` are **schema locked**. Both must stay in sync. Do NOT change field names in one without updating the other. The key models are:
- `Course` → `id`, `topic`, `difficulty`, `lessons`, `status`
- `Lesson` → `title`, `objectives`, `explanation`, `code_examples`, `quiz_questions`, `audio_url`, `image_url`, `validation_status`
- `CodeExample` → `language`, `code`, `original_code`, `validation_status`
- `ValidationStatus` → `"pass"` | `"fixed"` | `"fail"` | `"pending"`

### CopilotKit Integration
- **ag_ui_strands** (NOT `copilotkit` Python SDK) is the correct CopilotKit ↔ Strands bridge
- ALL `useCopilotAction` and `useCopilotReadable` calls live in ONE hook (`useCopilotActions.ts`) registered at the top-level `CourseEditor` component — **never in child components**
- Frontend `/api/copilotkit` route proxies to backend `http://localhost:8000/copilotkit`

### Strands Agent Execution
- `Agent.run()` / `Agent()` is **synchronous** in Strands — must use `asyncio.run_in_executor()` to avoid blocking the FastAPI event loop
- `_run_agent()` in `orchestrator.py` handles this wrapping

### TestSprite Modes
`TESTSPRITE_MODE` env var selects execution strategy:
- `"execute"` — TestSprite runs code directly (Scenario A)
- `"generate"` — TestSprite generates tests, run locally (Scenario B)
- `"local"` (default) — Python subprocess fallback, no API key needed

### Validation Flow
Validation status per code example:
- `"pass"` — Code executed successfully
- `"fixed"` — Code failed, Fixer rewrote it, now passes. `original_code` contains the broken version.
- `"fail"` — Code failed and Fixer couldn't fix it after 3 attempts
- `"pending"` — Not yet validated

Overall lesson status is the worst status across its code examples (`fail` > `fixed` > `pass`).

### SSE Streaming
- One `asyncio.Queue` per courseId in `streaming.py`
- `emit_event()` pushes `AgentEvent` at each agent boundary
- `sse_generator()` drains queue as `data: {json}\n\n` SSE frames
- Generator stops on `"complete"` or `"error"` status
- Frontend consumes via `EventSource` in `useCourseStream` hook

### Mock Pipeline Fallback
When Strands agents are not importable (missing dependencies), `main.py` falls back to `mock_generate_course()` which simulates the pipeline with hardcoded data. The `/health` endpoint reports `"pipeline": "real"` or `"pipeline": "mock"`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/course/generate` | Start course generation, returns `{courseId}` |
| `GET` | `/course/{id}/stream` | SSE stream of agent status events |
| `GET` | `/course/{id}` | Fetch completed course data |
| `POST` | `/course/{id}/lesson/{i}/regenerate` | Regenerate a specific lesson |
| `POST` | `/course/test-code` | On-demand code testing via TestSprite |
| `GET` | `/health` | Health check with pipeline status |
| `POST` | `/copilotkit` | CopilotKit runtime (ag_ui_strands bridge) |

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes (for real pipeline) | AWS credentials for Bedrock |
| `AWS_SECRET_ACCESS_KEY` | Yes (for real pipeline) | AWS credentials for Bedrock |
| `AWS_DEFAULT_REGION` | Yes | Default: `us-east-1` |
| `MINIMAX_API_KEY` | No | MiniMax TTS + images (empty = tools return "") |
| `TESTSPRITE_API_KEY` | No | TestSprite validation (empty = local fallback) |
| `TESTSPRITE_MODE` | No | `"local"` (default), `"execute"`, or `"generate"` |
| `DD_API_KEY` | No | Datadog observability (empty = disabled) |
| `DD_SITE` | No | Default: `datadoghq.com` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | Default: `http://localhost:4318` |
| `NEXT_PUBLIC_BACKEND_URL` | No | Frontend → Backend URL, default: `http://localhost:8000` |

## Testing

### Backend (pytest — 107 tests)

Tests mock `strands`, `ag_ui_strands`, `ddtrace`, `datadog`, and `boto3` via `backend/conftest.py` so they run without AWS credentials or external SDKs.

| File | Tests | What it covers |
|------|-------|----------------|
| `test_models.py` | 30 | All Pydantic models, enums, defaults, validation errors, roundtrip serialization |
| `test_streaming.py` | 10 | Queue lifecycle, emit_event, SSE generator format, stop conditions |
| `test_agent_parsers.py` | 19 | All 4 agent output parsers: clean JSON, markdown-fenced, embedded, invalid |
| `test_tools_testsprite.py` | 12 | Local execution (pass/fail/syntax/imports), routing, API mode mocking |
| `test_tools_minimax.py` | 7 | No-key fallback, mocked HTTP success/error, nested response formats |
| `test_api.py` | 10 | All FastAPI endpoints via TestClient |
| `test_observability.py` | 11 | Datadog init, statsd tracking (with/without), timing context manager |
| `test_orchestrator.py` | 8 | Pipeline happy path, fixer trigger, error handling, regeneration |

### Frontend (vitest — 37 tests)

| File | Tests | What it covers |
|------|-------|----------------|
| `api.test.ts` | 6 | Fetch mocking, defaults, error handling, URL construction |
| `ValidationBadge.test.tsx` | 7 | All 4 statuses with correct labels and color classes |
| `GenerateForm.test.tsx` | 4 | Rendering, disabled states, input interaction |
| `AgentStatusPanel.test.tsx` | 4 | Conditional rendering, agent slots, status display |
| `CourseOutline.test.tsx` | 5 | Topic/difficulty, lesson list, badges, selection, highlight |
| `LessonViewer.test.tsx` | 11 | Objectives, code, quiz, test button, BEFORE/AFTER, media, empty states |

## Common Pitfalls

1. **Python version**: Must be 3.12.x. Python 3.13 breaks `copilotkit`/`ag_ui_strands` dependencies. The `strands-agents` package requires `>=3.12`.

2. **CopilotKit bridge**: Use `ag_ui_strands`, NOT the `copilotkit` Python SDK (which depends on LangGraph and is a different integration path).

3. **Strands is synchronous**: All `Agent()` calls block. Always wrap in `asyncio.run_in_executor()` when called from async FastAPI handlers. See `orchestrator.py:_run_agent()`.

4. **Agent output parsing**: LLM output may include markdown fencing (` ```json ... ``` `), prose before/after JSON, or both. All four parsers in `agents/` handle these cases with fallback extraction.

5. **MiniMax response shape varies**: The `generate_narration` and `generate_visual` tools handle both `{audio_url: "..."}` and nested `{data: {audio: {audio_url: "..."}}}` response formats.

6. **CORS**: Backend allows `http://localhost:3000` only. Update `main.py` CORS config if deploying to a different origin.

7. **Module-level env vars**: `MINIMAX_API_KEY`, `TESTSPRITE_MODE`, etc. are read at import time in `tools/*.py`. Use `unittest.mock.patch()` to override in tests.

8. **CopilotKit action registration**: Must be in a single hook at the top-level component. Registering actions in child components causes duplicate registrations and race conditions.

## Git Commit History

All implementation commits follow conventional commit format:

```
9dfa0c7  feat(backend): backend skeleton (01-01)
cd07803  feat(frontend): Next.js frontend (01-02)
2140018  feat(tools): MiniMax + TestSprite wrappers (01-03)
62272ae  feat(models): lock schema (02-01)
387eb2c  feat(agents): all four agents (02-02/03/04)
83c6459  feat(orchestrator): wire pipeline (03-01)
686f7aa  feat(copilotkit): CopilotKit actions (03-02/03-03)
b6c5700  feat(observability): Datadog (04-01)
bc46ff1  feat(ui): on-demand test button (05-01)
1d5dd24  test: comprehensive test suite (144 tests)
```
