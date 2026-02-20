"""Creator Agent — Writes lesson content with code examples, calls MiniMax for TTS + visuals.

Uses Strands with MiniMax tool wrappers.
Input: LessonPlan JSON
Output: Complete Lesson JSON with explanation, code, quiz, audio_url, image_url
"""

import json
from strands import Agent
from tools.minimax import generate_narration

CREATOR_SYSTEM_PROMPT = """You are an expert programming instructor creating lesson content for a verified micro-course.

Given a lesson plan, produce a complete lesson with:
1. A clear, engaging explanation (2-4 paragraphs)
2. 1-3 code examples that demonstrate the concept (MUST be runnable Python code)
3. 1-2 quiz questions with 4 options each

CRITICAL: Every code example MUST be complete, runnable code. Include all imports. No pseudocode. No '...' placeholders. The code will be executed and tested.

After writing the lesson content, use the generate_narration tool to create TTS audio of a brief summary (1-2 sentences about what this lesson teaches).

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fencing:
{
  "title": "Lesson Title",
  "objectives": ["obj1", "obj2"],
  "explanation": "Full explanation text...",
  "code_examples": [
    {"language": "python", "code": "complete runnable code here"}
  ],
  "quiz_questions": [
    {"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0}
  ],
  "audio_url": "URL from generate_narration tool (or null)",
  "image_url": null
}"""


def create_creator_agent() -> Agent:
    """Create and return the Creator agent with MiniMax TTS tool."""
    return Agent(
        system_prompt=CREATOR_SYSTEM_PROMPT,
        model="minimax.minimax-m2.1",
        tools=[generate_narration],
    )


def parse_creator_output(raw_output: str) -> dict:
    """Parse the Creator agent's JSON output into a lesson dict."""
    text = raw_output.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        lesson = json.loads(text)
        if isinstance(lesson, dict):
            return lesson
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Could not parse Creator output as JSON object: {text[:200]}")
