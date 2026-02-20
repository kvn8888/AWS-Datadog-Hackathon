# Roadmap: LearnForge

## Overview

LearnForge is built in five sequential phases where each phase is a hard dependency for the next. Infrastructure scaffolding must be smoke-tested first so that agent and SSE failures surface early rather than in Hour 4. Once infrastructure is validated, the four agents are built in dependency order with their tool wrappers. The wired pipeline then connects agents through the orchestrator, lights up CopilotKit chat actions, and delivers the real course viewer. Observability is layered on after the end-to-end flow works. Polish and P2 features are added only once the core demo is rehearsable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure** - Backend skeleton, Next.js frontend, CopilotKit + SSE wiring smoke-tested with mock data
- [ ] **Phase 2: Agents** - All four Strands agents (Planner, Creator, Validator, Fixer) individually validated with MiniMax and TestSprite tools
- [ ] **Phase 3: Pipeline + CopilotKit** - Orchestrator wires agents end-to-end, SSE drives live status panel, CopilotKit actions mutate real course content
- [ ] **Phase 4: Observability** - Datadog LLM Observability traces every agent call, custom metrics dashboard populated
- [ ] **Phase 5: Polish** - On-demand Test This Code button, validation badge polish, demo hardening

## Phase Details

### Phase 1: Infrastructure
**Goal**: The backend and frontend shells are connected and verifiable with mock data before any agent logic is written
**Depends on**: Nothing (first phase)
**Requirements**: VIEW-01, VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. User can type a topic in the frontend input and trigger a POST to `/course/generate` that returns a `courseId`
  2. The CopilotKit sidebar renders and its actions appear in the Python server logs (smoke test: no actions = misconfiguration)
  3. The SSE stream at `/course/{courseId}/stream` delivers mock agent events to the frontend agent status panel in real time
  4. A hardcoded course renders in the course outline and lesson viewer with navigation between lessons
**Plans**: TBD

Plans:
- [ ] 01-01: Backend skeleton (FastAPI, routes, SSE queue, CopilotKit runtime endpoint, CORS)
- [ ] 01-02: Frontend skeleton (Next.js, CopilotKit provider, CourseOutline, LessonViewer, useCourseStream, GenerateForm)
- [ ] 01-03: Tool wrappers (MiniMax TTS + image gen via httpx, TestSprite — both scenarios pre-written, integration smoke tests)

### Phase 2: Agents
**Goal**: All four Strands agents produce well-typed JSON output matching the locked Pydantic schema, each individually testable against Phase 1 tool wrappers
**Depends on**: Phase 1
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, MMAX-01, MMAX-02
**Success Criteria** (what must be TRUE):
  1. Planner produces a Course JSON with 3-5 sequenced lessons, each with a title and learning objectives, for any topic string
  2. Creator produces a complete Lesson JSON with explanation, code examples, quiz questions, a MiniMax TTS audio URL, and a MiniMax image URL for any lesson plan
  3. Validator runs every code example in a lesson through TestSprite and returns a per-snippet PASS or FAIL result
  4. Fixer rewrites failing code snippets, re-validates through TestSprite, and halts after 3 iterations regardless of outcome
  5. The 4-agent sequence Planner → Creator → Validator → Fixer completes for a single-lesson test case without error
**Plans**: TBD

Plans:
- [ ] 02-01: Pydantic models (Course, Lesson, ValidationResult, AgentEvent) — schema locked before any agent code
- [ ] 02-02: Planner Agent (Strands agent, system prompt, curriculum JSON output)
- [ ] 02-03: Creator Agent (Strands agent, calls generate_narration + generate_visual tools, lesson JSON output)
- [ ] 02-04: Validator Agent + Fixer Agent (TestSprite tool calls, per-snippet pass/fail, max-3-iteration rewrite loop)

### Phase 3: Pipeline + CopilotKit
**Goal**: A complete course generates end-to-end from topic input, SSE events drive a live agent status panel during the 60-120s wait, and CopilotKit natural language commands visibly mutate course content
**Depends on**: Phase 2
**Requirements**: PIPE-06, CKIT-01, CKIT-02, CKIT-03, CKIT-04, MMAX-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. User types a topic, clicks generate, and watches the agent status panel update with live Planner → Creator → Validator → Fixer events as generation proceeds
  2. The completed course displays in the lesson viewer with explanation, code, concept visual, and a working audio player for each lesson
  3. Each lesson shows a PASS, FIXED, or FAIL validation badge; FIXED lessons show a before/after code diff
  4. User types "regenerate lesson 2" in the CopilotKit sidebar and lesson 2 visibly updates in the course viewer without a full page reload
  5. User types "generate a course on Python async" in the CopilotKit sidebar and a full course generates and renders
**Plans**: TBD

Plans:
- [ ] 03-01: Orchestrator (generate_course flow, asyncio.Queue SSE emission at each agent boundary, asyncio.create_task for background execution)
- [ ] 03-02: Frontend SSE integration (useCourseStream hook driving AgentStatusPanel, CourseOutline + LessonViewer rendering real course data, ValidationBadge, audio player)
- [ ] 03-03: CopilotKit wiring (useCopilotReadable sharing course state, generateCourse action, regenerateLesson action, all in useCopilotActions hook at top-level CourseEditor)

### Phase 4: Observability
**Goal**: Every Bedrock and agent call is traced in Datadog LLM Observability, custom metrics quantify the validation story, and the dashboard is screenshot-ready for judging
**Depends on**: Phase 3
**Requirements**: OBSV-01, OBSV-02
**Success Criteria** (what must be TRUE):
  1. After generating a course, LLM spans from all four agent calls are visible in the Datadog LLM Observability UI with model, tokens, and latency
  2. The Datadog custom metrics dashboard shows validation pass rate, total fix count, and course generation latency updated after each course generation
**Plans**: TBD

Plans:
- [ ] 04-01: Datadog setup (ddtrace auto-instrumentation of Bedrock, OTLP export, DD_PROFILING_MEMORY_ENABLED=false, statsd custom metrics in observability.py, Datadog Agent Docker)

### Phase 5: Polish
**Goal**: The on-demand code testing button works, validation badges are visually polished, and pre-cached demo courses are ready as a live-API fallback
**Depends on**: Phase 4
**Requirements**: VIEW-05
**Success Criteria** (what must be TRUE):
  1. User clicks "Test This Code" on any lesson code example and a PASS or FAIL result appears within a few seconds without re-generating the whole course
  2. PASS/FIXED/FAIL badges are visually distinct (color-coded) and readable at a glance during a demo
**Plans**: TBD

Plans:
- [ ] 05-01: On-demand test endpoint + Test This Code button wired to TestSprite, badge styling polish, pre-cached demo courses for 2 topics as API fallback

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 0/3 | Not started | - |
| 2. Agents | 0/4 | Not started | - |
| 3. Pipeline + CopilotKit | 0/3 | Not started | - |
| 4. Observability | 0/1 | Not started | - |
| 5. Polish | 0/1 | Not started | - |
