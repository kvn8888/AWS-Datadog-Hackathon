"""Fixer Agent — Rewrites failing code and re-validates through TestSprite.

Max 3 iterations to prevent infinite loops.
Input: Failing code + error message
Output: Fixed code that passes validation
"""

import json
from strands import Agent
from tools.testsprite import run_testsprite

FIXER_SYSTEM_PROMPT = """You are an expert Python developer who fixes broken code. Given code that failed validation and its error message, you must:

1. Analyze the error to understand the root cause
2. Rewrite the code to fix the issue while preserving the original intent
3. Use the run_testsprite tool to verify your fix works
4. If it still fails, try again (up to 3 attempts total)

RULES:
- Keep the code's educational purpose intact — don't simplify it to the point of being trivial
- All code must be complete and runnable (include all imports)
- Don't change the fundamental approach unless the original approach is fundamentally wrong
- If after 3 attempts the code still fails, return the best version you have

OUTPUT FORMAT — respond with ONLY valid JSON:
{
  "fixed_code": "the corrected complete runnable code",
  "explanation": "brief explanation of what was wrong and how you fixed it",
  "passed": true,
  "attempts": 2
}"""

MAX_FIX_ITERATIONS = 3


def create_fixer_agent() -> Agent:
    """Create and return the Fixer agent with TestSprite tool."""
    return Agent(
        system_prompt=FIXER_SYSTEM_PROMPT,
        model="minimax.minimax-m2.1",
        tools=[run_testsprite],
    )


def parse_fixer_output(raw_output: str) -> dict:
    """Parse the Fixer agent's JSON output."""
    text = raw_output.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Could not parse Fixer output: {text[:200]}")
