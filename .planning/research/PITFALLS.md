# Pitfalls Research

**Domain:** AI-powered multi-agent course generation (hackathon, 6 hours, solo)
**Researched:** 2026-02-20
**Confidence:** MEDIUM — based on training data knowledge of each technology (CopilotKit, Bedrock Strands, MiniMax, TestSprite, Datadog LLM Observability). External docs/search unavailable during research session. Flag low-confidence items for quick verification at project start.

---

## Critical Pitfalls

### Pitfall 1: CopilotKit Remote Action / CoAgent Backend Misconfiguration

**What goes wrong:**
CopilotKit's Python backend integration (CoAgents) requires the frontend to point to a specific `/copilotkit` HTTP endpoint on your Python server, AND the Python server must use `CopilotKitSDK` with `RemoteAction` wrappers — not plain FastAPI routes. Developers connect CopilotKit on the frontend, wire it to a generic FastAPI endpoint, and get silent failures: the sidebar renders but no actions fire, or the agent state never propagates to the UI.

**Why it happens:**
The CopilotKit Python SDK pattern is not obvious from the React-side docs. The frontend `CopilotKitProvider` expects a `runtimeUrl` pointing to an endpoint handled by `CopilotKitRemoteEndpoint` (or equivalent), not an arbitrary REST route. Under time pressure developers skip the SDK and try to "fake" the protocol manually.

**How to avoid:**
- Start with the official CoAgents Python quickstart verbatim before customizing anything.
- Use `copilotkit` Python package's `CopilotKitSDK` and mount it properly: `sdk = CopilotKitSDK(agents=[...])` then `add_fastapi_endpoint(app, sdk, "/copilotkit")`.
- Keep the `/copilotkit` route separate from your domain API routes.
- Smoke-test the connection in the first 15 minutes: send a "ping" action from the frontend and confirm it reaches the Python process.

**Warning signs:**
- CopilotKit sidebar renders but agent calls never fire
- No requests appearing in Python server logs when sidebar is interacted with
- Frontend console shows `CopilotKit: no runtime url` or CORS errors on `/copilotkit`
- Agent state in `useCoAgent` hook never updates

**Phase to address:** Foundation/infrastructure phase — wire the CopilotKit ↔ Python connection before writing any agent logic.

---

### Pitfall 2: SSE Streaming Breaks Under CORS / Reverse Proxy Without Correct Headers

**What goes wrong:**
The architecture calls for SSE streaming of agent status to the frontend. SSE connections from a Next.js dev server (port 3000) to a Python backend (port 8000) fail silently or drop immediately due to CORS preflight, missing `Content-Type: text/event-stream` headers, or buffering by intermediary layers (uvicorn response buffering, nginx proxy buffering). The frontend shows a spinner forever.

**Why it happens:**
Developers test the Python endpoint directly in curl and it works. The browser's EventSource does not send custom headers — so auth-style CORS configs that allow `Authorization` headers don't help here. Response buffering is enabled by default in many ASGI servers.

**How to avoid:**
- Set CORS to `allow_origins=["http://localhost:3000"]` AND `allow_methods=["GET", "OPTIONS"]` explicitly on the SSE route.
- Use `StreamingResponse` in FastAPI with `media_type="text/event-stream"` and set `X-Accel-Buffering: no` header.
- Configure uvicorn with `--no-access-log` is fine, but ensure no response caching middleware is installed.
- Test SSE from the browser's devtools Network tab (look for `EventStream` tab showing events) before wiring agent state to it.

**Warning signs:**
- SSE connects but immediately closes with status 200 and no events
- Browser Network tab shows the SSE request as "pending" with no data rows in EventStream panel
- CORS error in console specifically for `text/event-stream` content type
- Works in curl/HTTPie but not in browser

**Phase to address:** Foundation/infrastructure phase — validate SSE before building any agent that produces streaming output.

---

### Pitfall 3: Multi-Agent Orchestration with Strands: Blocking Agent Calls Kill Demo Interactivity

**What goes wrong:**
The 4-agent pipeline (Planner → Creator → Validator → Fixer) is implemented as sequential synchronous Strands agent invocations. The entire pipeline takes 60-180 seconds. The frontend shows a loading spinner. The user has no feedback. Judges see a blank screen for 2 minutes, then a completed course appears. This destroys demo impact.

**Why it happens:**
Strands agents can be invoked synchronously. The natural first implementation is `planner.invoke() → creator.invoke() → validator.invoke()`. There is no inherent streaming of intermediate state — developers have to explicitly emit progress events between agent steps.

**How to avoid:**
- Emit a server-sent event after each agent completes: `yield f"data: {json.dumps({'stage': 'planning_complete', 'lessons': N})}\n\n"`.
- Show per-stage progress in the frontend: "Planning (1/4)... Creating lesson 1 (2/4)... Validating..."
- If a stage produces partial output (e.g., Creator finishes lesson 1 before lesson 2), stream the partial output immediately — don't wait for all lessons.
- Use async Strands invocations where possible so the Python event loop stays unblocked.

**Warning signs:**
- First end-to-end test takes >60s with no intermediate frontend updates
- Frontend state only changes once (blank → done)
- Demo script requires you to say "it's generating, just wait..." to judges

**Phase to address:** Agent orchestration phase — build progress emission into every agent boundary from the start, not as a post-hoc addition.

---

### Pitfall 4: TestSprite API Misunderstanding — Test Generation vs. Code Execution

**What goes wrong:**
PROJECT.md explicitly flags this: "Their API might be test generation rather than code execution." Developers assume TestSprite is a code execution sandbox, build the Validator agent to call it for execution results, and discover at hour 3 that TestSprite generates test cases but does not run arbitrary code. The entire Validator agent needs to be redesigned.

**Why it happens:**
The API name "TestSprite" and the hackathon pitch both imply code testing. The distinction between "generate tests for code" vs. "run code and return pass/fail" is subtle and critically different for this use case.

**How to avoid:**
- **First 30 minutes of the hackathon**: Read the TestSprite API docs completely before writing a single line of Validator code.
- Have a fallback ready: if TestSprite is test generation, the pivot is — TestSprite generates pytest test cases, you run them in a subprocess sandbox (`subprocess.run(["python", "-m", "pytest", ...], timeout=10)`).
- Pre-write both Validator implementations (execution sandbox vs. test generation + local runner) so you can switch without rebuilding.
- The pre-canned fallback: just run code snippets directly in `exec()` with stdout capture and treat non-exception as PASS.

**Warning signs:**
- TestSprite API response contains test file content (strings of test code) rather than pass/fail status
- API docs mention "generate", "scaffold", "write tests" rather than "run", "execute", "evaluate"
- Response latency is very fast (<500ms) — execution APIs are slower; generation is near-instant

**Phase to address:** Immediately — before writing the Validator agent. First action after getting the API key.

---

### Pitfall 5: MiniMax TTS/Image Rate Limits and Latency Kill the Pipeline

**What goes wrong:**
The Creator agent calls MiniMax TTS for narration AND MiniMax Image Gen for concept visuals per lesson. For a 5-lesson course this is 10 MiniMax API calls in the hot path. Each TTS call takes 2-5 seconds. Each image gen call takes 5-15 seconds. Sequential calls add 35-100 seconds to pipeline time. Hitting a rate limit mid-generation leaves the course half-built.

**Why it happens:**
Developers test with a single lesson, it works fast, then the 5-lesson demo takes forever. Rate limits only appear at the event (shared hackathon API key, many concurrent builders).

**How to avoid:**
- Make TTS and image gen calls concurrent per lesson using `asyncio.gather()` — don't await them sequentially.
- Pre-generate audio and images for the demo course before judging begins (use the pre-cached demo fallback from PROJECT.md).
- Implement graceful degradation: if MiniMax returns a rate limit error (HTTP 429), log the error, mark the asset as "unavailable", and continue. Don't let a missing image block course completion.
- Cache MiniMax responses to files keyed by content hash — if you regenerate the same lesson, don't re-call the API.
- Set a hard timeout (10s TTS, 20s image) and fall through to a placeholder if exceeded.

**Warning signs:**
- Pipeline time grows linearly with lesson count instead of sub-linearly
- HTTP 429 errors appearing in logs during multi-lesson generation
- Frontend shows lesson 1 complete, then 60-second pause before lesson 2 appears

**Phase to address:** Creator agent phase — build async asset generation from the start. Never sequentialize TTS + image calls.

---

### Pitfall 6: Bedrock Model Invocation Costs / Throttling Not Anticipated

**What goes wrong:**
The Planner, Creator, Validator, and Fixer agents each invoke Claude via Bedrock. A single course generation makes 4+ LLM calls, each potentially 2-8K input tokens. At a hackathon with many concurrent builders hitting the same AWS account/region, Bedrock throttles with `ThrottlingException`. The pipeline crashes with an unhandled exception rather than retrying gracefully.

**Why it happens:**
Developers don't add retry logic during initial scaffolding — they assume the API is reliable. Bedrock throttling is more common in shared hackathon environments than in personal AWS accounts.

**How to avoid:**
- Wrap every Bedrock call with exponential backoff retry (max 3 retries, start at 1s). Strands may handle some of this, but verify.
- Use a smaller model (Claude Haiku 3.5) for the Validator/Fixer agents — they do structured JSON work, not creative generation. Reserve Sonnet for Creator.
- Limit system prompt + context size. Pass only what each agent strictly needs.
- Add a `max_tokens` cap on every call to prevent runaway generation and cost.

**Warning signs:**
- `ThrottlingException` or `ServiceUnavailableException` in Bedrock logs during testing
- Agent calls succeed individually but fail when the pipeline runs all 4 agents consecutively
- Strands agent raises unhandled exception partway through the pipeline

**Phase to address:** Agent infrastructure phase — add retry wrappers before integrating agents into the pipeline.

---

### Pitfall 7: CopilotKit Shared State / `useCoAgentState` Sync Lag Causing Stale UI

**What goes wrong:**
CopilotKit's `useCoAgentState` hook syncs agent state to the React frontend. During a long pipeline run, the frontend shows stale state (e.g., "validating..." still showing after validation is done) because state updates are batched or the agent forgot to emit a final state update. The demo shows an incorrect status for the last 10 seconds before the course appears.

**Why it happens:**
Agent state is pushed from the Python side via the CopilotKit protocol. If the agent exits without explicitly setting a terminal state, the last intermediate state persists. CopilotKit does not automatically infer "agent finished" from connection close.

**How to avoid:**
- Always emit a terminal state from the Python agent before returning: `copilotkit_emit_state({"status": "complete", "lessons": [...]})`.
- Test state transitions: start → planning → creating → validating → complete. Verify each transition renders in the UI.
- Use a simple state machine enum for pipeline status rather than free-form strings — prevents typos causing missed UI transitions.

**Warning signs:**
- UI shows "processing..." after the Python agent has already returned
- `useCoAgentState` value in React devtools doesn't update to final state
- Frontend needs a page refresh to show the completed course

**Phase to address:** CopilotKit integration phase — define the state schema upfront and test all transitions before adding business logic.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode model IDs (e.g., `anthropic.claude-3-5-sonnet-20241022-v2:0`) | Faster to implement | Model IDs change, region availability varies | Acceptable for hackathon — put in config constant, not scattered inline |
| Skip retry logic on Bedrock calls | Less code | Demo crashes on first throttle | Never — add 3-retry wrapper from the start (30 min investment) |
| Sequential MiniMax calls instead of async | Simpler code | 3-5x slower pipeline | Never — async gather is equally simple and critical for demo timing |
| Single Python process (no queuing) | No Redis/Celery overhead | Only handles one generation at a time | Acceptable — hackathon is single-user |
| No input validation on user topic | Saves time | Prompt injection possible, oversized inputs possible | Acceptable for hackathon — add max length only |
| Mock TestSprite responses in dev | Faster local dev | May never test real integration path | Acceptable if integration-tested before demo |
| Pre-cached demo course as fallback | Safety net for demo | Doesn't exercise the live pipeline | Acceptable — have it, but demo live first |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| CopilotKit | Pointing `runtimeUrl` at a plain FastAPI route | Mount `CopilotKitSDK` via `add_fastapi_endpoint(app, sdk, "/copilotkit")` |
| CopilotKit | Using `useCopilotAction` for multi-step pipelines | Use `useCoAgent` + agent state for long-running tasks; `useCopilotAction` is for instant actions |
| Bedrock Strands | Passing full conversation history to every agent | Each Strands agent should receive only its required inputs — not the full upstream context |
| Bedrock Strands | Instantiating agent inside request handler | Instantiate once at module level; agent object is reusable |
| MiniMax TTS | Awaiting audio before proceeding to image gen | Use `asyncio.gather(tts_call(), image_call())` to parallelize per lesson |
| MiniMax | Not handling binary audio response | TTS returns audio bytes (MP3/WAV) — write to temp file, serve as static asset or base64 encode |
| MiniMax | Not handling `Content-Type` on image response | Image gen returns URL (not bytes) in some APIs — check response schema first |
| TestSprite | Assuming synchronous response | May be async with polling — check if API returns a job ID requiring status polling |
| TestSprite | Not handling timeout | Code execution has a max timeout — catch `TimeoutError` and report as execution failure |
| Datadog LLM Obs | Wrapping only the top-level pipeline call | Wrap each individual agent call with `ddtrace.llmobs.LLMObs.annotate()` or the Strands integration — otherwise all spans collapse into one |
| Datadog | Missing `DD_API_KEY` / `DD_SITE` environment variables at startup | App starts successfully but no traces appear — check with `ddtrace-run --info` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential LLM agent calls | Pipeline takes 2-4 min for 5 lessons | Parallelize Creator calls per lesson where possible (Creator for lesson 2 while Validator checks lesson 1) | Immediately visible at 3+ lessons |
| Storing full lesson content in CopilotKit agent state | State sync slows, large React re-renders | Store only metadata in coagent state; fetch full content via REST | At 5 lessons with audio URLs + image URLs |
| Loading all lessons at once in the frontend | Initial render lag, all audio loads simultaneously | Lazy-load lesson content; only fetch lesson N when user navigates to it | Immediately visible with audio assets |
| Returning full LLM output as course content without post-processing | Markdown code blocks contain invisible characters, wrong language tags | Strip and normalize code blocks before TestSprite validation | First validation attempt |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing user topic directly into system prompt without sanitization | Prompt injection — user could override agent instructions | Wrap user input: `User requested topic: {topic[:500]}` — cap length, don't interpolate raw into system prompt |
| Running user-provided code (from Fixer agent output) without sandboxing | Arbitrary code execution on your server | Run validation code in a subprocess with resource limits: `subprocess.run(..., timeout=10, env={})` — never `exec()` LLM output directly |
| Exposing Bedrock/MiniMax API keys in Next.js environment | Keys leaked to browser via `NEXT_PUBLIC_*` prefix | Keep all API keys in Python backend only. Next.js only calls your backend, never AWS/MiniMax directly |
| Logging full LLM prompts/responses including user topic | Sensitive content in logs | Log only metadata (tokens, latency, status) in production — acceptable to log content in hackathon dev |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress feedback during 60-120s generation | User thinks it's broken, refreshes, kills the pipeline | Show stage-by-stage progress: "Planning your course... Creating lesson 1... Validating code..." |
| Showing validation FAIL badges prominently | Demo looks broken even when the Fixer fixed it | Show FIXED badge (green with checkmark) as the positive outcome — it means the system worked |
| Playing all lesson audio automatically | Jarring, overlapping audio | Only autoplay current lesson; pause previous when advancing |
| Showing raw JSON/error details if an agent fails | Confusing to judges who aren't reading code | Catch all agent errors, show human-friendly message: "Course generation encountered an issue — try a different topic" |
| Course outline appearing only after full generation | No progressive disclosure | Stream lesson titles as they're planned (first agent output) so the UI feels responsive immediately |

---

## "Looks Done But Isn't" Checklist

- [ ] **TestSprite integration:** Validator calls TestSprite AND actually uses the result to set PASS/FAIL — not just calling the API and ignoring the response
- [ ] **Fixer loop:** Fixer rewrites code AND re-validates through TestSprite — not just rewriting and assuming it's fixed
- [ ] **MiniMax audio:** Audio is actually playable in the browser (correct MIME type served, not just a file path that 404s)
- [ ] **MiniMax images:** Images render in the course viewer (URL is accessible, not a local temp path)
- [ ] **CopilotKit chat:** Natural language "regenerate lesson 3" actually triggers the backend agent, not just a UI response
- [ ] **Difficulty adjustment:** Changing difficulty level actually passes a parameter to the Creator agent, not just changes a UI label
- [ ] **Datadog traces:** Traces appear in the Datadog UI during demo — not just `ddtrace` installed but not configured
- [ ] **Validation badges:** PASS/FIXED/FAIL badges reflect actual TestSprite output per lesson, not hardcoded
- [ ] **SSE connection:** Progress events reach the browser in real time — test with devtools Network > EventStream before demo
- [ ] **Pre-cached fallback:** The fallback course data is loaded and renders correctly as a backup before the demo starts

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| TestSprite is test generation, not execution | MEDIUM | Pivot to: TestSprite generates tests → `subprocess` runs them locally. Pre-write the subprocess runner as backup |
| CopilotKit connection broken in demo | LOW | Switch to direct REST API calls from frontend; hide CopilotKit sidebar; present as "simplified demo" |
| MiniMax rate limited during demo | LOW | Serve pre-cached audio/images for the demo course — this is already in PROJECT.md as a planned fallback |
| Bedrock throttling mid-pipeline | MEDIUM | Add retry with backoff (30 min fix). Fallback: switch to smaller model or reduce context size |
| Strands pipeline too slow for demo | MEDIUM | Pre-generate the demo course before judging. "Live generation" demo = show progress on a pre-generated course with artificial delays |
| Datadog traces not appearing | LOW | Screenshot from dev session earlier in the day. Datadog agent may need `DD_SITE` set correctly for the account region |
| Agent state not syncing to CopilotKit frontend | MEDIUM | Bypass CopilotKit state; poll a REST `/status` endpoint from the frontend every 2 seconds instead |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CopilotKit backend misconfiguration | Phase 1: Foundation — wire CopilotKit ↔ Python endpoint first | Send a test action from sidebar and confirm Python log shows the call |
| SSE streaming broken | Phase 1: Foundation — validate SSE before any agent logic | Browser devtools EventStream tab shows events from Python |
| TestSprite API misunderstanding | Phase 0: Pre-start (before writing code) — read API docs immediately on key receipt | Make one test call and inspect response schema |
| Sequential MiniMax calls | Phase 2: Creator agent — use async gather from first implementation | Time a 3-lesson generation; should be <20s for assets |
| Multi-agent pipeline blocking UI | Phase 3: Pipeline integration — add progress events at each agent boundary | Frontend shows 4+ distinct status updates during a generation |
| Bedrock throttling crashes | Phase 1: Foundation — add retry wrapper before using Bedrock for anything | Manually trigger 5 rapid calls and confirm retry logic fires |
| CopilotKit state sync lag | Phase 2: CopilotKit frontend — define and test state schema before business logic | Step through all state transitions in devtools |
| Code execution without sandboxing | Phase 2: Validator agent — use subprocess from the start, never exec() | Verify code runs in subprocess with timeout and restricted env |
| Missing Datadog instrumentation | Phase 4: Observability — wrap all agent calls, verify traces appear | Datadog LLM Obs UI shows spans for each agent during a test run |

---

## Sources

- CopilotKit Python SDK documentation (training data, moderate confidence — verify CoAgents quickstart at docs.copilotkit.ai)
- Bedrock Strands Agents documentation (training data, moderate confidence — verify current patterns at strandsagents.com)
- MiniMax API documentation (training data, LOW confidence — verify TTS/image response format at platform.minimaxi.com)
- TestSprite API documentation (LOW confidence — must verify at hackathon; this is the highest-risk unknown)
- Datadog LLM Observability documentation (training data, moderate confidence — verify ddtrace Python integration)
- General hackathon multi-agent pipeline failure patterns (experience-based, HIGH confidence)
- FastAPI + async SSE patterns (HIGH confidence — well-documented standard patterns)

---
*Pitfalls research for: AI multi-agent course generation (LearnForge hackathon)*
*Researched: 2026-02-20*
