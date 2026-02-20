# Feature Research

**Domain:** AI-powered verified course generation platform (hackathon)
**Researched:** 2026-02-20
**Confidence:** MEDIUM — no web access; analysis derived from project spec, hackathon spec, and training knowledge of CopilotKit, TestSprite, MiniMax, and AI tutoring platforms. Sponsor-specific criteria based on what each integration must demonstrate to win their prize track.

---

## Context: This Is a Hackathon, Not a Product

The downstream consumer of this document is a 6-hour solo build targeting three cash prizes ($9,500 total). Feature prioritization is NOT about user value or product-market fit — it's about what each sponsor judge needs to see to award their prize. Every feature decision must be evaluated against:

1. Does this satisfy CopilotKit judges? ($3,500)
2. Does this satisfy TestSprite judges? ($3,500)
3. Does this satisfy MiniMax judges? ($2,500)
4. Does this work reliably in a 3–5 minute science fair demo?
5. Can one person build it in 6 hours?

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features judges assume exist. Missing these = product feels incomplete and gets dismissed before the sponsor-specific features are evaluated.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Topic input → course generation | The core product loop. No generation = nothing to demo. | LOW | Single text input + difficulty picker. Works or the demo dies. |
| Structured multi-lesson output | Any "course" has multiple lessons. Single blob of text is not a course. | LOW | 3–5 lessons. Each with title, objective, explanation, code, quiz. |
| Code examples per lesson | It's a coding tutorial platform. Code is the point. | LOW | At minimum 1–2 code snippets per lesson. |
| Visible lesson navigation | Judges need to browse. Flat wall of text is not a course viewer. | LOW | Left panel outline + right panel content. Already in the spec layout. |
| Loading / progress indication | AI generation takes time. Silence during 60-second generation looks broken. | LOW–MED | SSE streaming of agent status. The 4-agent status cards solve this. |
| Audio playback (MiniMax TTS) | You claim it's a "video micro-course" with narration. No audio = false advertising. | MED | Per-lesson play button. Audio must actually play, not just show a URL. |
| Concept visual per lesson (MiniMax) | Paired with audio claim. Expected to have imagery. | MED | One image per lesson. Render in lesson preview panel. |
| Validation badges per lesson | PASS/FIXED/FAIL is central to the pitch. Missing these = the whole TestSprite story collapses. | LOW | Badge next to each lesson in the outline. |
| "Explain this differently" / regeneration | Any AI course tool has the ability to redo content. Static generation only looks like a one-shot generator. | MED | At minimum per-lesson regenerate button. CopilotKit chat layer covers the natural language version. |
| Quiz questions per lesson | Expected feature of any course/tutorial format. Absence feels like missing polish. | LOW | 1–3 questions per lesson, multiple choice. Static display is fine (no grading engine needed). |

---

### Differentiators (Competitive Advantage for Prizes)

These are what win prizes. Not expected by default, but directly tied to each sponsor's evaluation criteria.

#### CopilotKit Prize Differentiators ($3,500)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `useCopilotReadable` — course state shared with AI | CopilotKit judges want to see bidirectional state. Agent reads UI state, not just receives prompts. If course data isn't exposed via `useCopilotReadable`, the integration is superficial. | LOW | One `useCopilotReadable` call with the full course JSON. This is 5 lines of code with outsized judging impact. |
| `useCopilotAction` — agent-triggered UI mutations | This is what separates a CopilotKit integration from "chat with a sidebar." Agent actions must actually mutate the course state and re-render the UI. | MED | Implement: `generateCourse`, `regenerateLesson`, `adjustDifficulty`, `testLesson`. Each action modifies React state. |
| Natural language course editing via chat | User types "make lesson 2 easier" in the sidebar and the agent does it. This is the killer demo moment for CopilotKit judges. It must work live. | MED | Depends on: `useCopilotAction` for regenerateLesson + backend endpoint that accepts the instruction. |
| CopilotSidebar always open during demo | The sidebar being the primary UI for interaction (not just a help widget) shows deep integration. | LOW | Set `defaultOpen={true}`. Make the sidebar the first thing judges see. |
| In-context action buttons (not just chat) | Buttons directly in the lesson UI that trigger CopilotKit actions. "Regenerate," "Test Code" buttons show that CopilotKit is wired into the UI components, not just the sidebar. | LOW–MED | `useCopilotAction` can be triggered by buttons, not only by chat. Implement these per lesson. |
| Real-time UI updates when agent acts | When CopilotKit action triggers regeneration, the lesson panel updates immediately — the agent doesn't just return a string, it changes the visible course. This is what judges mean by "agentic UI." | MED | React state must update from action handler. The lesson preview re-renders with new content. |

**CopilotKit Judge Mental Model:** They want to see that the integration is NOT a chatbot bolted onto a normal app. They want to see: (1) shared state between AI and UI, (2) actions that mutate the UI, (3) natural language controlling the application. If a judge can type in the sidebar and watch the course change, that's a prize-winning demo.

#### TestSprite Prize Differentiators ($3,500)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Every code example tested before display | Core product claim. The judge will ask: "Is every code example tested?" The answer must be yes, not "most" or "the ones we had time for." | MED | Extract all code blocks from Creator output, run each through TestSprite before course is returned to the frontend. |
| FIXED badge with before/after code diff | Shows the feedback loop working. The judge sees: original broken code, TestSprite error, fixed code, re-validation PASS. This is the money shot for TestSprite. | MED | Store original code + error + fixed code on the lesson object. Show in UI as a diff or toggle. |
| Fixer → re-validate loop | TestSprite judges want to see that failures don't just get flagged — they get fixed and retested. A fix loop that just shows "FAIL" is incomplete. It must show "was FAIL, now PASS." | HIGH | This is the hardest piece. Fixer rewrites code, Validator reruns TestSprite, result must be PASS before the lesson ships. Loop must have a max iteration count (prevent infinite). |
| On-demand "Test This Code" button | User-triggered TestSprite execution during demo. Judge asks "can I test this myself?" and you say yes. | LOW–MED | One POST endpoint + UI button per lesson. Runs TestSprite on the lesson's code snippets, returns result. |
| Validation summary dashboard | Aggregate numbers: total checks, first-pass rate, fixes applied, final pass rate. Tells the TestSprite story quantitatively. | LOW | Footer bar already in the spec. Pull from course validation summary object. |
| Quiz answer validation via TestSprite | Tests that correct answers are actually correct and wrong answers are actually wrong. This is a creative use of TestSprite beyond just code execution — judges love creative applications. | HIGH | Only build this if code validation loop is solid. Do not sacrifice the core loop for this. |

**TestSprite Judge Mental Model:** They want a deep, essential integration — not a surface check. The question they're asking is: "Would this product work without TestSprite?" The answer must be "no." If removing TestSprite just means removing a badge, it's not deep. If removing TestSprite means learners get broken code, that's deep.

**CRITICAL NOTE FROM SPEC:** TestSprite's actual API may be test generation, not code execution. If so, the story shifts: "TestSprite generates test cases, we run them in a sandbox." This is actually still a strong integration. Adapt immediately after getting the API key at the event.

#### MiniMax Prize Differentiators ($2,500)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-lesson TTS narration (primary) | Every lesson is narrated. The judge hears the audio. This must work and the voice must sound good — not robotic or choppy. | MED | Use `speech-02-hd` model per spec. Tone-calibrate: slower for code walkthroughs. Pre-generate for demo topics as backup. |
| Voice tone variation per lesson type | Explanations vs. code walkthroughs vs. quiz questions use different voice profiles or speeds. Shows intentional use of MiniMax, not just "generate audio." | LOW | Achieved via `speed` parameter variation. Explanations: 0.95x. Code walkthroughs: 0.85x. |
| Per-lesson concept diagram (image gen) | Visual + audio together is the "micro-course" experience. Image gen shows breadth of MiniMax usage. | MED | One image per lesson. Constrain to architectural/conceptual diagrams only. Do NOT try to generate UI screenshots (the model fails at this and it hurts the demo). |
| Diagrams matched to lesson content | The image prompt must reflect the lesson's specific concept, not generic stock art. A lesson on Lambda triggers should show Lambda trigger architecture, not a generic cloud icon. | MED | Creator agent outputs a specific image description per lesson. Pass it directly to MiniMax. |
| Video scene transitions (stretch goal) | MiniMax video generation between concept visuals. First frame = current lesson visual, last frame = next lesson visual. 3–5 second smooth transition. | HIGH | Only attempt if TTS + image gen are working and there is spare time. This is time-boxed to 30 minutes or dropped entirely. |
| Audio player with MiniMax attribution | Visible audio player in the lesson UI. Makes MiniMax's contribution tangible to the judge. They need to SEE it being used. | LOW | Standard HTML `<audio>` element with play/pause. The URL must be the MiniMax-generated audio. |

**MiniMax Judge Mental Model:** They want volume + quality. Volume = multiple calls (TTS + image gen across multiple lessons). Quality = the output sounds/looks good enough to demo. The worst outcome for MiniMax is: one blurry image and no audio. The best is: 4 lessons × (1 narration + 1 diagram) = 8 MiniMax API calls visible in the validation summary, and the judge hears the audio live.

---

### Anti-Features (Deliberately NOT Building)

Features to explicitly avoid given the 6-hour constraint. Each one has a plausible-sounding reason to build it. Resist.

| Anti-Feature | Why It Seems Good | Why to Avoid | What to Do Instead |
|--------------|-------------------|--------------|-------------------|
| User accounts / auth | "Users should save their courses" | 4+ hours of work for zero judging value. Judges don't log in. | Session-based state in memory. Courses persist until page refresh. |
| Course export (PDF, ZIP) | "Let learners take content offline" | Export logic is tedious, not differentiating, and can fail visibly during demo | Show "export" button that's disabled with tooltip "Coming soon" if pressed for time |
| Multiple simultaneous course generations | "Production resilience" | Requires queue management, async job tracking — doubles backend complexity | Single-user demo. One course at a time. Hardcode any concurrency blocks. |
| Mobile responsive UI | "Good UX practice" | Desktop science fair demo. Zero mobile judges. Consumes 1–2 hours of CSS work. | Desktop-only. 1280px minimum width. No media queries. |
| Video generation (full) | "Makes it a true video course" | MiniMax video gen for full courses is latency-prohibitive in a demo context. Slow API + stitching + playback = demo killer. | Use scene transitions only if TTS + image gen are solid AND there's 30 minutes spare. Otherwise drop it. |
| Streaming lesson content word-by-word | "Cool typing effect" | Streaming text tokens creates complex state management, delays when content isn't complete yet, and breaks validation (you can't run TestSprite on partial code). | Generate complete lesson content server-side, then push the finished lesson via SSE. The agent status panel gives the "live feeling" without streaming partial content. |
| Fact-checking against external docs | "Makes validation more rigorous" | Requires RAG pipeline, document retrieval, hallucination detection on top of everything else. Adds 3+ hours of complexity. | Claim it's an architecture feature in the pitch. Have Agent 3's system prompt include "fact-check technical claims." Do NOT wire up an actual retrieval system. |
| Quiz grading / user progress tracking | "Completes the course experience" | Requires score tracking, state persistence. Zero judging value. | Display quiz questions with answers visible. Let the user read them. Static is fine. |
| Difficulty auto-detection from user history | "Smart personalization" | Requires usage history, inference logic. Over-engineered for hackathon scope. | Explicit difficulty picker: Beginner / Intermediate / Advanced. User chooses. |
| A/B testing lesson variations | "Data-driven improvement" | Requires multiple generation paths, comparison UI. Two orders of magnitude too much for 6 hours. | The re-generation flow already handles "try a different version." |
| Custom voice training / voice cloning | "Personalized narration" | MiniMax custom voice requires a separate setup flow. Pre-built voices are sufficient and sound good. | Use `male-qn-qingse` or similar preset. Consistent voice across all lessons. |
| Error boundary / full production hardening | "Resilience" | Polished error handling takes hours and judges don't specifically test for it. A crash mid-demo is the real risk. | Have 2 pre-cached demo courses as fallback. Pre-generate content for the 2 demo topics. If live gen breaks, switch to cached. |

---

## Feature Dependencies

```
[Topic Input]
    └──requires──> [Curriculum Planner Agent]
                       └──requires──> [Content Creator Agent]
                                          └──requires──> [MiniMax TTS] (per lesson)
                                          └──requires──> [MiniMax Image Gen] (per lesson)
                                          └──requires──> [Validator Agent]
                                                             └──requires──> [TestSprite Integration]
                                                             └──enables──> [PASS/FIXED/FAIL badges]
                                                             └──requires (on failure)──> [Fixer Agent]
                                                                                            └──requires──> [TestSprite Integration] (re-validation)

[CopilotKit Sidebar]
    └──requires──> [useCopilotReadable: course state]
    └──requires──> [useCopilotAction: generateCourse]
    └──enhances──> [useCopilotAction: regenerateLesson]
                       └──requires──> [Content Creator Agent] (single-lesson re-run)
                       └──requires──> [Validator Agent] (re-run after regeneration)

[Validation Dashboard]
    └──requires──> [Validator Agent] (raw data)
    └──requires──> [TestSprite Integration] (pass/fail counts)
    └──enhances──> [PASS/FIXED/FAIL badges]

[Audio Player]
    └──requires──> [MiniMax TTS] (audio URL stored on lesson object)

[Concept Visual]
    └──requires──> [MiniMax Image Gen] (image URL stored on lesson object)

[On-Demand "Test Code" button]
    └──requires──> [TestSprite Integration]
    └──enhances──> [Validator Agent] (same endpoint, user-triggered)

[FIXED badge with before/after]
    └──requires──> [Fixer Agent]
    └──requires──> [Lesson object stores: original_code, error_details, fixed_code]
```

### Dependency Notes

- **TestSprite is the linchpin:** Validator, Fixer, on-demand testing, FIXED badges, and validation dashboard all depend on TestSprite working. If TestSprite API is unavailable or different than expected, every downstream feature degrades. Resolve the TestSprite API question in the first 30 minutes.
- **Course object schema must be locked early:** Both frontend (CopilotKit state, lesson rendering) and backend (agents writing to it) depend on the same course JSON schema. Lock it in Hour 1 or integration becomes painful.
- **MiniMax calls happen inside Creator Agent, not separately:** TTS and image gen are not standalone features — they're tools the Creator Agent calls. The Creator Agent must be working before MiniMax calls are possible.
- **useCopilotReadable depends on course state existing:** You can't share state that doesn't exist. Course generation must succeed before CopilotKit interaction is meaningful. CopilotKit setup can be done in parallel, but the real demo moment requires a generated course.
- **regenerateLesson conflicts with streaming course gen:** If course generation is in progress, a simultaneous regeneration request can corrupt state. Use a simple lock/flag: disable regenerate buttons while full generation is running.

---

## MVP Definition

### Launch With (v1 — Must Work for Science Fair)

Minimum viable demo. If these work, you have a defensible demo for all three prizes.

- [x] **Topic input → 3-lesson course generated** — The demo starts here. Without generation, nothing else matters.
- [x] **Curriculum Planner → Content Creator → Validator pipeline** — The 4-agent story must be demonstrable, even if Agent 4 (Fixer) runs only when needed.
- [x] **TestSprite runs on every code example** — One FIXED badge is worth more than ten PASS badges. Judges need to see at least one fix happen.
- [x] **PASS/FIXED/FAIL badges visible per lesson** — The visual proof of the testing story. Must be in the UI before judging.
- [x] **MiniMax TTS audio plays for at least one lesson** — The judge must hear the audio. Pre-generate for the demo topic as insurance.
- [x] **MiniMax image gen produces one concept diagram** — Visible in the lesson preview. One is enough to demonstrate the capability.
- [x] **CopilotKit sidebar with `useCopilotReadable` and at least 2 `useCopilotAction`s** — `generateCourse` and `regenerateLesson` are the minimum. Chat must be able to trigger visible course changes.
- [x] **Validation summary dashboard** — Footer showing total checks, first-pass rate, fixes applied. Takes 1 hour to build, pays off in the TestSprite pitch.
- [x] **Agent status panel (SSE)** — Live status of which agent is doing what. Fills the generation wait time with visible AI activity. Must not look like a frozen screen.

### Add After Validation (v1.x — If Time Permits After Core Works)

Add these only after the core 9-point MVP above is working and demo-rehearsed.

- [ ] **On-demand "Test This Code" button** — Nice for the TestSprite demo. Add if Hour 3 is going well.
- [ ] **Difficulty slider triggering curriculum replan** — Good for CopilotKit demo (shows `adjustDifficulty` action). Add if CopilotKit integration is solid.
- [ ] **Voice tone variation per lesson type** — Low effort, elevates MiniMax integration. Add in Hour 3 if Creator Agent is stable.
- [ ] **FIXED badge with before/after code diff** — High judging value for TestSprite. Add if Fixer Agent is producing consistent results.
- [ ] **3rd CopilotKit action (adjustDifficulty or testLesson)** — More actions = deeper integration. Add as a stretch within CopilotKit work.

### Future Consideration (v2+ — Do Not Touch Today)

Features to explicitly defer. If you start building these during the hackathon, stop.

- [ ] **Video scene transitions** — Requires video gen, stitching, playback. 3+ hours. Drop it.
- [ ] **Quiz grading / scoring** — Zero judging value. Dropped.
- [ ] **Course export** — Not needed for demo. Dropped.
- [ ] **Fact-checking against external docs** — Claim in the pitch, do not build.
- [ ] **Full error boundary / production resilience** — Replace with cached demo fallback.

---

## Feature Prioritization Matrix

| Feature | Judge Value | Build Cost | Priority |
|---------|-------------|------------|----------|
| 4-agent pipeline (Planner → Creator → Validator → Fixer) | HIGH (all prizes) | HIGH | P1 |
| TestSprite on every code example | HIGH (TestSprite prize) | MED | P1 |
| PASS/FIXED/FAIL badges | HIGH (TestSprite prize) | LOW | P1 |
| CopilotKit `useCopilotReadable` + `useCopilotAction` | HIGH (CopilotKit prize) | MED | P1 |
| CopilotKit chat → visible UI change | HIGH (CopilotKit prize) | MED | P1 |
| MiniMax TTS narration (plays in UI) | HIGH (MiniMax prize) | MED | P1 |
| MiniMax image gen (concept visual) | HIGH (MiniMax prize) | MED | P1 |
| Agent status panel (SSE streaming) | MED (all prizes — demo credibility) | MED | P1 |
| Validation summary dashboard | MED (TestSprite prize) | LOW | P1 |
| Fixer feedback loop (re-validates with TestSprite) | HIGH (TestSprite prize) | HIGH | P1 |
| Pre-cached demo courses (fallback) | HIGH (demo reliability) | LOW | P1 |
| On-demand "Test Code" button | MED (TestSprite prize) | LOW | P2 |
| FIXED badge with before/after diff | MED (TestSprite prize) | MED | P2 |
| Difficulty slider → replan | MED (CopilotKit prize) | MED | P2 |
| Voice tone variation per lesson | LOW (MiniMax prize margin) | LOW | P2 |
| 3rd+ CopilotKit action | MED (CopilotKit prize depth) | LOW | P2 |
| Video scene transitions | LOW (stretch) | HIGH | P3 |
| Quiz grading engine | LOW | MED | P3 |
| Course export | LOW | MED | P3 |
| Mobile responsive layout | NONE | HIGH | DO NOT BUILD |
| User auth / persistence | NONE | HIGH | DO NOT BUILD |

**Priority key:**
- P1: Must have for demo — build before anything else
- P2: Should have — add in Hours 3–4 after P1 is working
- P3: Nice to have — only if everything else is done and tested

---

## Competitor Feature Analysis

Framing: what do existing AI tutoring/course-gen tools do, and how does LearnForge differentiate?

| Feature | Khanmigo / Khan Academy AI | Coursera AI Tutor | GitHub Copilot (inline) | LearnForge |
|---------|---------------------------|-------------------|------------------------|------------|
| Course structure from a topic | Yes (guided) | No (course catalog) | No (file-scoped) | Yes — full structured course |
| Code examples | Yes (simple) | Yes (no validation) | Yes (completions only) | Yes — all tested |
| Code execution / validation | No | No | No (Copilot Labs deprecated) | Yes — TestSprite validates every snippet |
| Fix broken code automatically | No | No | Partial (inline suggestions) | Yes — Fixer agent + re-validation loop |
| TTS narration | No | Yes (pre-recorded) | No | Yes — MiniMax TTS, per lesson, on-demand |
| Concept visuals | No | Yes (static) | No | Yes — MiniMax image gen, per lesson |
| Natural language course editing | No | No | Partial | Yes — CopilotKit sidebar |
| Live agent status / transparency | No | No | Partial | Yes — 4-agent status panel via SSE |

**Key differentiation to emphasize for judges:** The entire competitive landscape generates and ships. LearnForge generates, tests, fixes, then ships. No existing AI tutorial platform has a validation and repair feedback loop before the learner sees content. This is the actual gap being filled.

---

## Prize-Specific Feature Checklists

### CopilotKit Judge Checklist

Before demoing to the CopilotKit judge, verify:

- [ ] `CopilotKit` provider wraps the app
- [ ] `CopilotSidebar` is visible and defaultOpen
- [ ] `useCopilotReadable` exposes the current course object
- [ ] `useCopilotAction: generateCourse` — chat can trigger course generation
- [ ] `useCopilotAction: regenerateLesson` — chat can trigger lesson regeneration with instruction
- [ ] The regeneration actually changes visible content in the lesson panel
- [ ] At least 3 actions registered (generateCourse, regenerateLesson + one more)
- [ ] Demo: type "make lesson 2 easier" → watch lesson 2 change

### TestSprite Judge Checklist

Before demoing to the TestSprite judge, verify:

- [ ] At least one FIXED badge is visible (a lesson that had a failure and was fixed)
- [ ] The FIXED badge shows what went wrong (error message or summary)
- [ ] The validation summary shows non-100% first-pass rate (proves testing is real)
- [ ] TestSprite is called on the demo topic's code (not hardcoded results)
- [ ] On-demand test button works (or validation summary shows test count)
- [ ] Demo: point to FIXED badge → explain what TestSprite caught → show the fix

### MiniMax Judge Checklist

Before demoing to the MiniMax judge, verify:

- [ ] Audio plays from the play button (not just a URL string in the DOM)
- [ ] Audio sounds like narration, not monotone robot (use speech-02-hd)
- [ ] Image is visible in the lesson panel
- [ ] Image is relevant to lesson content (not generic)
- [ ] Validation summary (or console / Datadog) shows MiniMax API call count
- [ ] Demo: play audio → show image → explain: "TTS + image gen per lesson, X total MiniMax calls"

---

## Sources

- Project spec: `/Users/theaccount/projects/personal/LearnForge/.planning/PROJECT.md` (HIGH confidence — primary source)
- Hackathon spec: `/Users/theaccount/projects/personal/LearnForge/learnforge-hackathon-spec.md` (HIGH confidence — primary source)
- CopilotKit integration patterns: Training knowledge of `useCopilotReadable`, `useCopilotAction`, `CopilotSidebar` API (MEDIUM confidence — verify against CopilotKit docs at event)
- TestSprite integration: Training knowledge + spec note about API uncertainty (LOW–MEDIUM confidence — confirm API behavior with TestSprite booth at event)
- MiniMax API: Code in hackathon spec shows actual endpoint URLs and model names (MEDIUM confidence — spec author has used the API)
- AI tutoring platform competitive analysis: Training knowledge (MEDIUM confidence — patterns are stable, specific feature status may have changed)

---
*Feature research for: LearnForge — AI-powered verified video micro-course generation*
*Researched: 2026-02-20*
*Consumer: Roadmap creation for 6-hour hackathon build*
