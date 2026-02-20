"""Planner Agent — Breaks a topic into 3-5 sequenced lessons with learning objectives.

Pure reasoning agent, no tools. Uses Bedrock Claude via Strands.
Input: topic string + difficulty level
Output: JSON list of LessonPlan objects
"""

import json
from strands import Agent

PLANNER_SYSTEM_PROMPT = """You are a curriculum design expert. Given a programming topic and difficulty level, create a structured micro-course curriculum.

RULES:
1. Create exactly 3-5 lessons, sequenced from foundational to advanced
2. Each lesson must have a clear title, 2-3 learning objectives, and a content outline
3. Content outlines should specify what code examples to include (at least 1 per lesson)
4. The first lesson should establish prerequisites and core concepts
5. The last lesson should synthesize earlier lessons into a practical application
6. Keep lessons focused — one main concept per lesson

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fencing:
[
  {
    "title": "Lesson Title",
    "objectives": ["Objective 1", "Objective 2"],
    "content_outline": "Describe what to cover: explanation topics, code examples to write, key points to emphasize"
  }
]"""


def create_planner_agent() -> Agent:
    """Create and return the Planner agent."""
    return Agent(
        system_prompt=PLANNER_SYSTEM_PROMPT,
        model="us.anthropic.claude-sonnet-4-5-v2:0",
    )


def parse_planner_output(raw_output: str) -> list[dict]:
    """Parse the Planner agent's JSON output into a list of lesson plans."""
    # Strip markdown fencing if present
    text = raw_output.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (``` markers)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        plans = json.loads(text)
        if isinstance(plans, list):
            return plans
    except json.JSONDecodeError:
        # Try to find JSON array in the output
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Could not parse Planner output as JSON array: {text[:200]}")
