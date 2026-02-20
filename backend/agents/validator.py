"""Validator Agent — Extracts code snippets and runs them through TestSprite.

Adversarial system prompt: actively tries to break code.
Input: Lesson JSON with code_examples
Output: ValidationResult with per-snippet pass/fail
"""

import json
from strands import Agent
from tools.testsprite import run_testsprite

VALIDATOR_SYSTEM_PROMPT = """You are a ruthless code reviewer and test engineer. Your job is to validate every code example in a lesson by executing it.

For EACH code example in the lesson:
1. Use the run_testsprite tool to execute the code
2. Record whether it passed or failed
3. If it failed, record the exact error message

Be adversarial: look for edge cases, missing imports, deprecated APIs, type errors, and runtime failures. If something looks suspicious, test it.

After testing ALL code examples, output ONLY valid JSON:
{
  "lesson_index": 0,
  "results": [
    {"index": 0, "passed": true, "error": null, "output": "..."},
    {"index": 1, "passed": false, "error": "NameError: ...", "output": ""}
  ],
  "all_passed": false
}"""


def create_validator_agent() -> Agent:
    """Create and return the Validator agent with TestSprite tool."""
    return Agent(
        system_prompt=VALIDATOR_SYSTEM_PROMPT,
        model="us.anthropic.claude-haiku-4-5-20251001",  # Haiku for structured JSON work
        tools=[run_testsprite],
    )


def parse_validator_output(raw_output: str) -> dict:
    """Parse the Validator agent's JSON output."""
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

    raise ValueError(f"Could not parse Validator output: {text[:200]}")
