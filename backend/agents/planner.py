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
        model="minimax.minimax-m2.1",
    )


def parse_planner_output(raw_output: str) -> list[dict]:
    """Parse the Planner agent's JSON output into a list of lesson plans."""
    # Strip whitespace and markdown fencing
    text = raw_output.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # Try direct parse
    try:
        plans = json.loads(text)
        if isinstance(plans, list):
            return plans
        # If it's a dict with a lessons key, extract that
        if isinstance(plans, dict) and "lessons" in plans:
            return plans["lessons"]
    except json.JSONDecodeError:
        pass

    # Try to find JSON array in the output (model may have prose around it)
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    # Try to find a JSON object wrapping lessons
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            obj = json.loads(text[start:end])
            if isinstance(obj, dict) and "lessons" in obj:
                return obj["lessons"]
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse Planner output as JSON array: {text[:500]}")
