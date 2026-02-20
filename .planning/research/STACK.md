# Stack Research

**Domain:** AI-powered multi-agent course generation platform (hackathon build)
**Researched:** 2026-02-20
**Confidence:** HIGH (all versions verified against PyPI, npm registry, and GitHub as of today)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python | 3.12.x | Backend runtime | Hard ceiling at 3.12: `copilotkit` Python SDK requires `<3.13`. `strands-agents` supports 3.10-3.14 but 3.12 is the highest version that satisfies all backend deps simultaneously. Do NOT use 3.13+. |
| strands-agents | 1.27.0 | Multi-agent pipeline (Planner/Creator/Validator/Fixer) | The mandated Bedrock prize framework. Released 2026-02-19 with native `multiagent.Graph` for deterministic pipelines and `multiagent.Swarm` for autonomous collaboration. Built-in OpenTelemetry tracing via `OTEL_EXPORTER_OTLP_ENDPOINT` env var. |
| strands-agents-tools | 0.2.21 | Built-in tools for agents | Provides `http_request`, `file_read`, `file_write` and other tools usable by agents as capabilities. Required companion to `strands-agents`. |
| ag_ui_strands | 0.1.1 | CopilotKit ↔ Strands bridge | The official AG-UI protocol adapter for Strands (ag-ui-protocol/ag-ui repo, `integrations/aws-strands`). Provides `StrandsAgent` wrapper and `create_strands_app()` FastAPI factory. This is the ONLY verified path to connect CopilotKit frontend to a Strands Python backend without rebuilding CopilotKit internals. |
| ag-ui-protocol | 0.1.13 | Event stream protocol | Base protocol layer underlying `ag_ui_strands`. Required dependency, provides `RunAgentInput`, event types. |
| FastAPI | 0.129.0 | HTTP server / SSE endpoint | `ag_ui_strands` is built on FastAPI. Handles CORS, mounts agent sub-apps, streams SSE back to CopilotKit frontend. FastAPI's `StreamingResponse` handles SSE natively. |
| uvicorn | 0.41.0 | ASGI server | Standard FastAPI runner. Start with `uvicorn.run(app, host="0.0.0.0", port=8000)`. |
| boto3 | 1.42.53 | AWS Bedrock API client | Required by `strands-agents` for Bedrock model provider. Pin `<2.0.0,>=1.26.0` per strands requirement. |
| pydantic | 2.12.5 | Data validation | Used by FastAPI and strands. Pydantic v2 required (v1 incompatible). |
| httpx | 0.28.1 | HTTP client for MiniMax API | No official MiniMax Python SDK for TTS/images. Use `httpx` directly against `https://api.minimax.io/v1/` REST endpoints. Async-native, already a strands dependency. |
| ddtrace | 4.4.0 | Datadog APM + LLM Observability | Datadog's Python tracing library. Provides LLM Observability for Bedrock calls via botocore auto-instrumentation. Use alongside Strands' OTLP export or independently via `DD_TRACE_ENABLED=true`. Released 2026-02-05. Python 3.9-3.14 compatible. |
| opentelemetry-api | 1.39.1 | OTEL base API | Required by strands-agents for tracing. Also required for Datadog OTLP ingestion pathway. |
| opentelemetry-sdk | 1.39.1 | OTEL SDK | Pairs with api. |
| opentelemetry-exporter-otlp-proto-http | 1.39.1 | OTLP HTTP exporter | Ships traces from Strands to Datadog Agent (which accepts OTLP at `http://localhost:4318`). Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` and Strands auto-exports. |
| python-dotenv | 1.2.1 | Environment config | Standard `.env` file loader. All API keys (Bedrock, MiniMax, Datadog) loaded via env vars. |
| Next.js | 16.1.6 | Frontend framework | Mandated CopilotKit framework. App Router (default in Next 13+). The `@copilotkit/runtime` package runs as a Next.js Route Handler (`/api/copilotkit`). |
| React | 19.2.4 | UI library | Next.js 16 peer dep. CopilotKit 1.51.4 supports React 18 and 19. |
| @copilotkit/react-core | 1.51.4 | CopilotKit React hooks | Provides `useCopilotAction`, `useCopilotReadable`, `CopilotKit` provider. Core hooks for sharing frontend state with agents. |
| @copilotkit/react-ui | 1.51.4 | CopilotKit UI components | Provides `CopilotSidebar`, `CopilotChat` — the agentic sidebar for natural language course editing. |
| @copilotkit/runtime | 1.51.4 | CopilotKit backend runtime | Next.js Route Handler that proxies between CopilotKit frontend and the Strands FastAPI backend via AG-UI protocol. Install `@langchain/aws` as optional peer dep if using `BedrockAdapter` for the CopilotKit chat LLM. |
| TypeScript | 5.9.3 | Type safety | Standard for Next.js projects. CopilotKit is typed. |
| Tailwind CSS | 4.2.0 | Styling | No config file needed in v4 (CSS-first config). Pairs with shadcn/ui. Note: v4 is a major break from v3 — config syntax completely changed. |
| Zod | 4.3.6 | Schema validation | CopilotKit peer dep. Use for API route validation and type inference. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sse-starlette | 3.2.0 | SSE streaming helper | If bypassing `ag_ui_strands` for direct SSE to frontend. Not needed if using `create_strands_app()`. Keep as fallback option. |
| copilotkit (Python) | 0.1.78 | Alternative CopilotKit Python SDK | CopilotKit's own Python SDK — but it hard-depends on `langgraph>=0.3.25`. For pure Strands builds, use `ag_ui_strands` instead. This package is only needed if the architecture pivots to LangGraph. |
| anyio | 4.12.1 | Async primitives | Transitively required. Use for `asyncio.gather` patterns in parallel agent calls. |
| pytest | 9.0.2 | Testing | Python unit tests. With `pytest-asyncio` for async agent tests. |
| @langchain/aws | >=0.1.9 | CopilotKit's Bedrock chat adapter | Required ONLY if using CopilotKit's `BedrockAdapter` for the sidebar chat LLM. Optional peer dep of `@copilotkit/runtime`. |
| react-markdown | ^10.1.0 | Markdown rendering | Bundled with `@copilotkit/react-ui`. Needed for rendering lesson content. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| uv | Python package manager | Faster than pip, handles virtual envs. Used in strands-agents' own samples (`uv.lock` present). Command: `uv pip install strands-agents ag_ui_strands ddtrace` |
| create-next-app | Next.js scaffolding | `npx create-next-app@latest --typescript --tailwind --app`. Scaffolds App Router with TypeScript. |
| pnpm | Node package manager | CopilotKit repo uses pnpm. Faster installs than npm for monorepos. |
| Datadog Agent (local) | Local OTLP receiver | Run locally for dev to receive Strands OTLP traces. `docker run -e DD_API_KEY=... -e DD_OTLP_CONFIG_RECEIVER_HTTP_ENABLED=true datadog/agent`. |
| ruff | Python linter/formatter | Used by strands-agents itself. Replaces black+flake8. |

---

## Installation

### Python Backend

```bash
# Create venv with Python 3.12 (REQUIRED - copilotkit is <3.13)
uv venv --python 3.12
source .venv/bin/activate

# Core agent framework
uv pip install "strands-agents==1.27.0" "strands-agents-tools==0.2.21"

# CopilotKit ↔ Strands bridge (install from PyPI)
uv pip install "ag_ui_strands==0.1.1" "ag-ui-protocol==0.1.13"

# API server
uv pip install "fastapi==0.129.0" "uvicorn[standard]==0.41.0"

# HTTP client for MiniMax API (no official SDK)
uv pip install "httpx==0.28.1"

# AWS
uv pip install "boto3==1.42.53"

# Data validation
uv pip install "pydantic==2.12.5" "python-dotenv==1.2.1"

# Datadog observability
uv pip install "ddtrace==4.4.0" \
  "opentelemetry-api==1.39.1" \
  "opentelemetry-sdk==1.39.1" \
  "opentelemetry-exporter-otlp-proto-http==1.39.1"
```

### Next.js Frontend

```bash
# Scaffold
npx create-next-app@16 learnforge-frontend --typescript --tailwind --app --src-dir

# CopilotKit
npm install @copilotkit/react-core@1.51.4 @copilotkit/react-ui@1.51.4 @copilotkit/runtime@1.51.4

# CopilotKit optional peer deps for Bedrock chat adapter
npm install @langchain/aws @langchain/core

# Validation
npm install zod@4.3.6

# Dev dependencies
npm install -D typescript@5.9.3 @types/react@19.2.14 @types/node
```

---

## Integration Patterns

### Pattern: Strands Graph Pipeline (Planner → Creator → Validator → Fixer)

```python
from strands import Agent
from strands.multiagent.graph import Graph

planner = Agent(system_prompt="You plan courses...", tools=[...])
creator = Agent(system_prompt="You write lessons...", tools=[minimax_tts_tool, minimax_image_tool])
validator = Agent(system_prompt="You validate code...", tools=[testsprite_mcp_tool])
fixer = Agent(system_prompt="You fix broken code...", tools=[testsprite_mcp_tool])

pipeline = Graph()
pipeline.add_node("planner", planner)
pipeline.add_node("creator", creator)
pipeline.add_node("validator", validator)
pipeline.add_node("fixer", fixer)
pipeline.add_edge("planner", "creator")
pipeline.add_edge("creator", "validator")
pipeline.add_edge("validator", "fixer")  # conditional: only if failures exist
```

### Pattern: Strands → CopilotKit via AG-UI

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ag_ui_strands import StrandsAgent, create_strands_app
from strands import Agent

strands_agent = Agent(system_prompt="...", tools=[...])
agui_agent = StrandsAgent(agent=strands_agent, name="course_generator")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], ...)
app.mount("/agent", create_strands_app(agui_agent, "/"))
```

```typescript
// app/api/copilotkit/route.ts
import { CopilotRuntime, BedrockAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";

export const POST = async (req: Request) => {
  const runtime = new CopilotRuntime({
    remoteEndpoints: [{ url: "http://localhost:8000/agent" }]
  });
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new BedrockAdapter({ model: "us.anthropic.claude-sonnet-4-5-v2:0" }),
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

### Pattern: Strands → Datadog via OTLP

```bash
# Environment variables (strands auto-detects these)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # Datadog Agent OTLP receiver
OTEL_SERVICE_NAME=learnforge-agents
DD_API_KEY=your-key
```

Strands' `Tracer` class reads `OTEL_EXPORTER_OTLP_ENDPOINT` and ships traces automatically. No code changes required.

### Pattern: MiniMax TTS via httpx (no SDK)

```python
import httpx

async def generate_tts(text: str, api_key: str) -> bytes:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.minimax.io/v1/t2a_v2",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "speech-02-hd",
                "text": text,
                "voice_id": "male-qn-qingse",
                "audio_setting": {"format": "mp3", "sample_rate": 32000}
            }
        )
        return response.content
```

### Pattern: TestSprite via MCP Tool in Strands

```python
from mcp import StdioServerParameters, stdio_client
from strands.tools.mcp import MCPClient

# Connect to TestSprite MCP server
testsprite_mcp = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="npx",
        args=["-y", "@kayce_zhang/mcpdev"],
        env={"TESTSPRITE_API_KEY": os.getenv("TESTSPRITE_API_KEY")}
    ))
)
testsprite_mcp.start()
testsprite_tools = testsprite_mcp.list_tools_sync()

# Use in Validator/Fixer agents
validator = Agent(tools=testsprite_tools, system_prompt="...")
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `ag_ui_strands` (AG-UI bridge) | `copilotkit` Python SDK (0.1.78) | Only if you pivot to LangGraph — CopilotKit's Python SDK has a hard `langgraph>=0.3.25` dependency and won't work natively with Strands |
| `strands.multiagent.Graph` | Sequential Python calls | If you need tight control over retry loops between Validator→Fixer without the overhead of the Graph abstraction. For hackathon speed, direct calls may be faster to implement. |
| `httpx` for MiniMax | `minimax-python` (0.2.0) | The only published `minimax-python` package is community-maintained and focuses on *video generation* only. Does not cover TTS (`t2a_v2`) or image generation. Do not use it. |
| `ddtrace==4.4.0` | OpenTelemetry only | Use ddtrace if you want native Datadog LLM Observability dashboard (cost tracking, prompt/response capture). Use OTLP-only if you just need traces. For hackathon: both together gives the best Datadog dashboard. |
| Python 3.12 | Python 3.13 | `copilotkit` Python SDK caps at `<3.13`. Using 3.13 breaks the copilotkit import. |
| `strands-agents-tools` | Custom tool implementations | `strands-agents-tools` provides `http_request` which is all you need for MiniMax API calls. Don't write custom tool wrappers if the built-in handles it. |
| Tailwind CSS 4.x | Tailwind CSS 3.x | v4 removes `tailwind.config.js` — configuration moves to `@theme` in CSS. CopilotKit's UI components use standard CSS classes and are compatible with both. Pick v4 for new projects to avoid technical debt. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `minimax-python==0.2.0` | Community package for video generation only. Does not implement TTS (`/v1/t2a_v2`) or image generation (`/v1/image_generation`) endpoints. Using it will mislead you into thinking these endpoints are covered when they're not. | Direct `httpx` calls to `https://api.minimax.io/v1/` |
| `copilotkit==0.1.78` (Python) as Strands bridge | Hard dependency on `langgraph>=0.3.25`. Importing it pulls in the full LangGraph stack (400MB+) for no benefit. Its FastAPI integration assumes LangGraph state graph protocol, not Strands. | `ag_ui_strands==0.1.1` which was specifically built for Strands |
| Python 3.13 or 3.14 | `copilotkit` Python SDK's `requires_python = <3.13,>=3.10`. Runtime import fails on 3.13+. Even though this copilotkit package may not be the primary bridge (ag_ui_strands is), you may need it for debugging/dev tooling. | Python 3.12.x |
| LangGraph | Adds 400MB of deps, requires reimplementing the pipeline in LangGraph's state graph API instead of Strands' `Graph`. This would forfeit the Bedrock Strands prize category. | `strands.multiagent.Graph` which provides the same directed pipeline pattern natively |
| Next.js 15 | Current latest is 16.1.6. CopilotKit actively tests against 16 and the `pr` dist-tag shows live PRs merging against it. No reason to pin to 15. | `next@16.1.6` |
| `sse-starlette` for primary streaming | Redundant when using `ag_ui_strands` — the AG-UI protocol handles SSE framing internally. Adding `sse-starlette` on top creates a second streaming layer. | `ag_ui_strands`'s built-in SSE via `create_strands_app()` |
| `datadog==0.52.1` (legacy SDK) | The `datadog` package is the old metrics-only SDK. It does not provide LLM Observability or APM tracing. It's a different product from `ddtrace`. | `ddtrace==4.4.0` which includes both APM and LLM Observability |

---

## Stack Patterns by Variant

**If TestSprite API is unavailable at hackathon event:**
- Fall back to `subprocess`-based Python execution sandbox
- Run code snippets with `subprocess.run(["python3", "-c", code], timeout=10, capture_output=True)`
- Use pytest-style assertion wrapping to produce PASS/FAIL
- This is the "pivot" mentioned in PROJECT.md: TestSprite generates test cases, you run them locally

**If MiniMax API key isn't obtained in time:**
- Use `boto3` to call Amazon Polly for TTS (already in the stack, no new auth needed)
- Use Bedrock's image generation (Nova Canvas) for concept visuals
- Both are available the moment AWS credentials are configured

**If Datadog Agent setup is slow:**
- Skip OTLP and use `ddtrace` with `DD_TRACE_AGENT_URL` pointing to Datadog's managed intake
- Or: instrument manually by logging structured metrics to stdout — judges can see the dashboard during the demo even if it's partially populated

**If AG-UI/CopilotKit integration takes too long:**
- Build a simple Next.js frontend with `fetch` SSE against the FastAPI `/stream` endpoint
- Use a `<EventSource>` client to show agent status updates
- CopilotKit sidebar is a prize differentiator, not core functionality — sacrifice it before sacrificing TestSprite integration

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `strands-agents==1.27.0` | Python 3.10-3.14, `boto3>=1.26.0,<2.0.0`, `pydantic>=2.4.0,<3.0.0`, `mcp>=1.23.0,<2.0.0` | Released 2026-02-19. Very active (weekly releases). Pin to `==1.27.0` to prevent surprise breaking changes during hackathon. |
| `ag_ui_strands==0.1.1` | Python `>=3.12,<3.14`, `strands-agents>=1.15.0`, `fastapi>=0.115.12` | Requires Python 3.12+ (higher minimum than strands itself). Confirms Python 3.12 as the right choice. |
| `@copilotkit/react-core@1.51.4` | React 18 or 19, `zod>=3.0.0` | Latest stable. `1.51.5-next` exists but is pre-release. |
| `@copilotkit/runtime@1.51.4` | `openai` as peer dep (optional), `@langchain/aws` for BedrockAdapter | BedrockAdapter uses `@langchain/aws` under the hood — install it as a dep if using Bedrock for the CopilotKit chat LLM. |
| `ddtrace==4.4.0` | Python `>=3.9,<3.15`, has known profiling issue in `v4.1-v4.4` (memory profiler) | Disable memory profiler: `DD_PROFILING_MEMORY_ENABLED=false`. APM and LLM Obs are unaffected. |
| `next@16.1.6` | React `>=18.2.0 \|\| ^19.0.0` | Node.js 18.18+ required. |

---

## Sources

- `https://pypi.org/pypi/strands-agents/json` — strands-agents 1.27.0 metadata, dependencies verified (HIGH confidence)
- `https://pypi.org/pypi/ag_ui_strands/json` — ag_ui_strands 0.1.1 metadata (HIGH confidence)
- `https://api.github.com/repos/strands-agents/sdk-python` — strands-agents repo, confirmed OTLP tracing via env var (HIGH confidence)
- `https://api.github.com/repos/strands-agents/sdk-python/contents/src/strands/multiagent/graph.py` — Graph multi-agent source code (HIGH confidence)
- `https://api.github.com/repos/strands-agents/sdk-python/contents/src/strands/telemetry/tracer.py` — OTLP tracer implementation, confirmed `OTEL_EXPORTER_OTLP_ENDPOINT` usage (HIGH confidence)
- `https://api.github.com/repos/ag-ui-protocol/ag-ui/contents/integrations/aws-strands/ARCHITECTURE.md` — AG-UI Strands integration architecture (HIGH confidence)
- `https://api.github.com/repos/ag-ui-protocol/ag-ui/contents/integrations/aws-strands/python/pyproject.toml` — ag_ui_strands dependencies (HIGH confidence)
- `https://api.github.com/repos/ag-ui-protocol/ag-ui/contents/integrations/aws-strands/python/examples/server/api/agentic_chat.py` — Integration example (HIGH confidence)
- `https://registry.npmjs.org/@copilotkit/react-core` — CopilotKit 1.51.4 dist-tags, peerDependencies (HIGH confidence)
- `https://api.github.com/repos/CopilotKit/CopilotKit/contents/packages/v1/runtime/src/service-adapters/bedrock/bedrock-adapter.ts` — BedrockAdapter source, uses `@langchain/aws` (HIGH confidence)
- `https://pypi.org/pypi/copilotkit/json` — copilotkit 0.1.78, `requires_python <3.13`, langgraph dependency (HIGH confidence)
- `https://pypi.org/pypi/minimax-python/json` — minimax-python 0.2.0 is video generation only (HIGH confidence)
- `https://api.github.com/repos/TestSprite/Docs/contents/mcp/core/tools.mdx` — TestSprite 8 MCP tools, Playwright-based E2E testing (HIGH confidence)
- `https://api.github.com/repos/TestSprite/Docs/contents/learn/mcp-demo.mdx` — TestSprite is test generation + execution, not unit code runner (HIGH confidence)
- `https://pypi.org/pypi/ddtrace/json` — ddtrace 4.4.0, profiling warning noted (HIGH confidence)
- `https://registry.npmjs.org/next/latest` — next.js 16.1.6 (HIGH confidence)

---
*Stack research for: AI multi-agent course generation platform (LearnForge)*
*Researched: 2026-02-20*
