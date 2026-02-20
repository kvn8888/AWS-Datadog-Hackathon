# Agent Build Instructions — LearnForge

## Project Setup

### Backend (Python 3.12)
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend (Node.js)
```bash
cd frontend
npm install
```

## Running the Application

### Backend
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Both (development)
```bash
# Terminal 1: Backend
cd backend && source .venv/bin/activate && uvicorn main:app --port 8000 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Environment Variables

### Backend (.env)
```bash
# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# MiniMax
MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...

# TestSprite
TESTSPRITE_API_KEY=...

# Datadog
DD_API_KEY=...
DD_SITE=datadoghq.com
DD_PROFILING_MEMORY_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Testing (Hackathon Mode)

No formal test suites — smoke test manually:

```bash
# Test backend is running
curl http://localhost:8000/health

# Test SSE stream
curl -N http://localhost:8000/course/test-123/stream

# Test CopilotKit endpoint
curl http://localhost:8000/copilotkit

# Test MiniMax TTS (if API key set)
python -c "from tools.minimax import generate_narration; import asyncio; asyncio.run(generate_narration('Hello world'))"

# Test course generation
curl -X POST http://localhost:8000/course/generate -H "Content-Type: application/json" -d '{"topic": "Python basics"}'
```

## Key Learnings
- ag_ui_strands==0.1.1 is the ONLY bridge between CopilotKit and Strands
- Python 3.12 is required (3.13 breaks copilotkit)
- MiniMax has no Python SDK for TTS/images — use httpx directly
- Strands agent.run() is synchronous — use run_in_executor() in async contexts
- CopilotKit actions must be registered in ONE hook at the top-level component
- SSE needs `X-Accel-Buffering: no` header and `Cache-Control: no-cache`
- Tailwind 4 uses CSS-first config (no tailwind.config.js)

## File Structure
```
backend/
├── main.py               # FastAPI app, routes
├── agents/               # planner.py, creator.py, validator.py, fixer.py
├── orchestrator.py       # Pipeline flows
├── tools/                # minimax.py, testsprite.py
├── models.py             # Pydantic schemas
├── streaming.py          # SSE helpers
├── observability.py      # Datadog setup
└── requirements.txt

frontend/
├── app/
│   ├── page.tsx          # CopilotKit provider + layout
│   ├── layout.tsx        # Root layout
│   └── api/copilotkit/   # CopilotKit route handler
├── components/           # React components
├── hooks/                # Custom hooks
├── lib/api.ts            # API client
├── types/course.ts       # TypeScript types
├── package.json
└── tailwind.css
```
