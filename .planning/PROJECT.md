# LearnForge

## What This Is

LearnForge is an AI-powered platform that generates verified video micro-courses. Users type a topic, and four collaborating agents produce a complete course where every code example is executed and tested, every claim is fact-checked, and every lesson is narrated with professional TTS audio and concept visuals. Built for the AWS x Anthropic x Datadog GenAI Hackathon (Feb 20, 2026).

## Core Value

Every code example in every lesson is tested and verified before the learner sees it. If something fails, it gets fixed automatically — the learner never encounters broken code.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can type a topic and generate a 3-5 lesson micro-course
- [ ] 4-agent pipeline: Planner → Creator → Validator → Fixer
- [ ] Planner breaks topic into sequenced lessons with learning objectives
- [ ] Creator writes explanations, code examples, and quiz questions per lesson
- [ ] Creator calls MiniMax TTS for narration per lesson
- [ ] Creator calls MiniMax Image Gen for concept visuals per lesson
- [ ] Validator runs every code example through TestSprite
- [ ] Validator fact-checks claims against current docs
- [ ] Fixer rewrites broken code and re-validates through TestSprite
- [ ] CopilotKit interactive frontend with agentic chat sidebar
- [ ] User can regenerate specific lessons via natural language
- [ ] User can adjust difficulty level
- [ ] User can test code snippets on demand
- [ ] SSE streaming of agent status to frontend
- [ ] Course viewer with outline, lesson preview, audio player, concept visuals
- [ ] Validation badges (PASS/FIXED/FAIL) per lesson
- [ ] Datadog LLM Observability on every agent call
- [ ] Datadog custom metrics dashboard (cost, latency, accuracy rate)

### Out of Scope

- Video generation / scene transitions — stretch goal, not v1
- User accounts / authentication — hackathon demo, no persistence needed
- Multiple simultaneous course generations — single-user demo
- Course export / download — not needed for judging
- Mobile responsiveness — desktop demo only

## Context

**Hackathon:** AWS x Anthropic x Datadog GenAI Hackathon, Feb 20, 2026. ~6 hours of build time. Solo builder.

**Prize targets (priority order):**
1. CopilotKit — $3,500 (agentic course editor, shared state, in-context actions)
2. TestSprite — $3,500 (code execution testing, fix verification loop)
3. MiniMax — $2,500 (TTS narration, concept visuals)
4. Bedrock — $15K credits (Strands Agents, AgentCore orchestration)
5. Datadog — Meta Glasses (LLM Observability, custom metrics)

**The problem:** Every code tutorial on the internet has broken examples. Deprecated APIs, wrong imports, missing dependencies. Nobody tests tutorial code before publishing. LearnForge tests everything.

**Key pitch:** "Every code tutorial on the internet is wrong. Ours is tested."

**TestSprite note:** Their API might be test generation rather than code execution. If so, pivot: TestSprite writes test cases, we run them in a sandbox.

## Constraints

- **Timeline**: ~6 hours total build time (hackathon). Must be demo-ready by 5:00 PM.
- **Solo build**: One person building everything. Must be ruthless about scope.
- **Tech stack**: Python backend (Bedrock Strands), Next.js frontend (CopilotKit), MiniMax APIs, TestSprite API, Datadog.
- **API dependencies**: MiniMax, TestSprite, Bedrock — all require API keys obtained at the event.
- **Demo-first**: Everything must look good in a 3-5 minute science fair demo. Working > complete.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Python + Strands for backend | Required for Bedrock prize, native Strands support | — Pending |
| Next.js + CopilotKit for frontend | CopilotKit is React-native, Next.js is standard | — Pending |
| Prioritize CopilotKit/TestSprite/MiniMax | Highest cash prizes ($9,500 total) | — Pending |
| No user auth or persistence | Hackathon demo doesn't need it, saves hours | — Pending |
| Pre-cache demo courses as fallback | API latency could kill the demo | — Pending |

---
*Last updated: 2026-02-20 after initialization*
