"""Tests for agent JSON output parsers."""

import json
import pytest
from agents.planner import parse_planner_output
from agents.creator import parse_creator_output
from agents.validator import parse_validator_output
from agents.fixer import parse_fixer_output


# ---------------------------------------------------------------------------
# Planner parser
# ---------------------------------------------------------------------------
class TestParsePlannerOutput:
    def test_clean_json(self):
        data = [{"title": "Lesson 1", "objectives": ["A"], "content_outline": "stuff"}]
        result = parse_planner_output(json.dumps(data))
        assert len(result) == 1
        assert result[0]["title"] == "Lesson 1"

    def test_markdown_fenced(self):
        raw = '```json\n[{"title": "L1", "objectives": [], "content_outline": "x"}]\n```'
        result = parse_planner_output(raw)
        assert result[0]["title"] == "L1"

    def test_embedded_in_text(self):
        raw = 'Here is the plan:\n[{"title": "L1", "objectives": [], "content_outline": "x"}]\nDone.'
        result = parse_planner_output(raw)
        assert result[0]["title"] == "L1"

    def test_multiple_lessons(self):
        data = [
            {"title": f"Lesson {i}", "objectives": [f"obj{i}"], "content_outline": f"outline{i}"}
            for i in range(5)
        ]
        result = parse_planner_output(json.dumps(data))
        assert len(result) == 5

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not parse"):
            parse_planner_output("This is not JSON at all")

    def test_json_object_instead_of_array_raises(self):
        with pytest.raises(ValueError, match="Could not parse"):
            parse_planner_output('{"title": "not an array"}')


# ---------------------------------------------------------------------------
# Creator parser
# ---------------------------------------------------------------------------
class TestParseCreatorOutput:
    def test_clean_json(self):
        data = {
            "title": "Coroutines",
            "objectives": ["Learn async"],
            "explanation": "Async is cool",
            "code_examples": [{"language": "python", "code": "print(1)"}],
            "quiz_questions": [],
            "audio_url": None,
            "image_url": None,
        }
        result = parse_creator_output(json.dumps(data))
        assert result["title"] == "Coroutines"
        assert len(result["code_examples"]) == 1

    def test_markdown_fenced(self):
        data = {"title": "Test", "explanation": "text"}
        raw = f"```json\n{json.dumps(data)}\n```"
        result = parse_creator_output(raw)
        assert result["title"] == "Test"

    def test_embedded_in_text(self):
        data = {"title": "Test", "explanation": "text"}
        raw = f"Here is the lesson:\n{json.dumps(data)}\nEnd."
        result = parse_creator_output(raw)
        assert result["title"] == "Test"

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not parse"):
            parse_creator_output("not json")

    def test_array_instead_of_object_raises(self):
        with pytest.raises(ValueError, match="Could not parse"):
            parse_creator_output("[1, 2, 3]")


# ---------------------------------------------------------------------------
# Validator parser
# ---------------------------------------------------------------------------
class TestParseValidatorOutput:
    def test_clean_json(self):
        data = {
            "lesson_index": 0,
            "results": [
                {"index": 0, "passed": True, "error": None, "output": "ok"},
                {"index": 1, "passed": False, "error": "NameError", "output": ""},
            ],
            "all_passed": False,
        }
        result = parse_validator_output(json.dumps(data))
        assert result["lesson_index"] == 0
        assert len(result["results"]) == 2
        assert result["results"][1]["passed"] is False

    def test_markdown_fenced(self):
        data = {"lesson_index": 0, "results": [], "all_passed": True}
        raw = f"```\n{json.dumps(data)}\n```"
        result = parse_validator_output(raw)
        assert result["all_passed"] is True

    def test_embedded_in_text(self):
        data = {"lesson_index": 1, "results": [], "all_passed": True}
        raw = f"Validation complete:\n{json.dumps(data)}"
        result = parse_validator_output(raw)
        assert result["lesson_index"] == 1

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not parse"):
            parse_validator_output("totally broken")


# ---------------------------------------------------------------------------
# Fixer parser
# ---------------------------------------------------------------------------
class TestParseFixerOutput:
    def test_clean_json(self):
        data = {
            "fixed_code": "print('fixed')",
            "explanation": "Added quotes",
            "passed": True,
            "attempts": 1,
        }
        result = parse_fixer_output(json.dumps(data))
        assert result["fixed_code"] == "print('fixed')"
        assert result["passed"] is True
        assert result["attempts"] == 1

    def test_markdown_fenced(self):
        data = {"fixed_code": "x = 1", "explanation": "ok", "passed": True, "attempts": 2}
        raw = f"```json\n{json.dumps(data)}\n```"
        result = parse_fixer_output(raw)
        assert result["passed"] is True

    def test_embedded_in_text(self):
        data = {"fixed_code": "x = 1", "explanation": "ok", "passed": False, "attempts": 3}
        raw = f"I fixed the code:\n{json.dumps(data)}\nDone."
        result = parse_fixer_output(raw)
        assert result["passed"] is False
        assert result["attempts"] == 3

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not parse"):
            parse_fixer_output("not valid json")
