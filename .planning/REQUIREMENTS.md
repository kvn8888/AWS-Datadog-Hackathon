# Requirements: LearnForge

**Defined:** 2026-02-20
**Core Value:** Every code example in every lesson is tested and verified before the learner sees it.

## v1 Requirements

Requirements for hackathon demo. Each maps to roadmap phases.

### Agent Pipeline

- [ ] **PIPE-01**: User can generate a course where Planner → Creator → Validator → Fixer execute in sequence
- [ ] **PIPE-02**: Planner breaks topic into 3-5 sequenced lessons with learning objectives
- [ ] **PIPE-03**: Creator writes explanation, code examples, and quiz questions per lesson
- [ ] **PIPE-04**: Validator runs every code example through TestSprite
- [ ] **PIPE-05**: Fixer rewrites failing code and re-validates through TestSprite (max 3 iterations)
- [ ] **PIPE-06**: FIXED badge shows before/after code diff for fixed examples

### CopilotKit Integration

- [ ] **CKIT-01**: CopilotKit sidebar shares live course state via useCopilotReadable
- [ ] **CKIT-02**: User can generate a course via CopilotKit chat (generateCourse action)
- [ ] **CKIT-03**: User can regenerate a specific lesson via CopilotKit chat (regenerateLesson action)
- [ ] **CKIT-04**: Natural language command visibly mutates course content in real time

### MiniMax Media

- [ ] **MMAX-01**: Creator generates TTS narration per lesson via MiniMax speech-02-hd
- [ ] **MMAX-02**: Creator generates concept visual per lesson via MiniMax image-01
- [ ] **MMAX-03**: Lesson viewer plays TTS audio with visible audio player

### Course Viewer

- [ ] **VIEW-01**: User can type a topic and trigger course generation
- [ ] **VIEW-02**: Course outline shows all lessons with navigation
- [ ] **VIEW-03**: Lesson viewer displays explanation, code, visuals, and audio
- [ ] **VIEW-04**: PASS/FIXED/FAIL validation badges visible per lesson
- [ ] **VIEW-05**: On-demand "Test This Code" button triggers TestSprite on a code example

### Observability

- [ ] **OBSV-01**: Datadog LLM Observability traces every Bedrock/agent call
- [ ] **OBSV-02**: Custom Datadog metrics for validation pass rate, generation latency, fix count

## v2 Requirements

Deferred to post-hackathon or stretch goals if time permits.

### CopilotKit Extended

- **CKIT-05**: 3rd CopilotKit action (adjustDifficulty) for deeper integration
- **CKIT-06**: Difficulty slider UI triggering curriculum replan

### Real-time Feedback

- **STRM-01**: Agent status panel with SSE streaming showing live agent activity
- **STRM-02**: Validation summary dashboard (total checks, first-pass rate, fixes applied)

### Demo Hardening

- **DEMO-01**: Pre-cached demo courses as API fallback during judging
- **DEMO-02**: Voice tone variation per lesson type (speed parameter variation)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Video generation / scene transitions | 3+ hours build time, latency-prohibitive for demo |
| User accounts / authentication | Hackathon demo, no persistence needed |
| Multiple simultaneous course generations | Single-user demo |
| Course export / download | Not needed for judging |
| Mobile responsiveness | Desktop-only science fair demo |
| Quiz grading engine | Complexity not justified for demo |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 2 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 2 | Pending |
| PIPE-06 | Phase 3 | Pending |
| CKIT-01 | Phase 3 | Pending |
| CKIT-02 | Phase 3 | Pending |
| CKIT-03 | Phase 3 | Pending |
| CKIT-04 | Phase 3 | Pending |
| MMAX-01 | Phase 2 | Pending |
| MMAX-02 | Phase 2 | Pending |
| MMAX-03 | Phase 3 | Pending |
| VIEW-01 | Phase 1 | Pending |
| VIEW-02 | Phase 1 | Pending |
| VIEW-03 | Phase 1 | Pending |
| VIEW-04 | Phase 3 | Pending |
| VIEW-05 | Phase 5 | Pending |
| OBSV-01 | Phase 4 | Pending |
| OBSV-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation — all 20 requirements mapped*
