"""Tests for TestSprite tool wrapper."""

import pytest
from unittest.mock import patch, MagicMock
from tools.testsprite import _run_code_locally, run_testsprite


# ---------------------------------------------------------------------------
# _run_code_locally
# ---------------------------------------------------------------------------
class TestRunCodeLocally:
    def test_valid_python_passes(self):
        result = _run_code_locally("print('hello')", "python")
        assert result["passed"] is True
        assert result["output"] == "hello"
        assert result["error"] is None

    def test_python_with_computation(self):
        result = _run_code_locally("print(2 + 3)", "python")
        assert result["passed"] is True
        assert result["output"] == "5"

    def test_failing_python(self):
        result = _run_code_locally("raise ValueError('boom')", "python")
        assert result["passed"] is False
        assert "ValueError" in result["error"]

    def test_syntax_error(self):
        result = _run_code_locally("def foo(", "python")
        assert result["passed"] is False
        assert "SyntaxError" in result["error"]

    def test_non_python_language(self):
        result = _run_code_locally("console.log(1)", "javascript")
        assert result["passed"] is False
        assert "only supports Python" in result["error"]

    def test_multiline_code(self):
        code = "x = 10\ny = 20\nprint(x + y)"
        result = _run_code_locally(code, "python")
        assert result["passed"] is True
        assert result["output"] == "30"

    def test_import_works(self):
        code = "import json\nprint(json.dumps({'a': 1}))"
        result = _run_code_locally(code, "python")
        assert result["passed"] is True
        assert '"a": 1' in result["output"]

    def test_empty_output(self):
        result = _run_code_locally("x = 1", "python")
        assert result["passed"] is True
        assert result["output"] == ""


# ---------------------------------------------------------------------------
# run_testsprite (routing)
# ---------------------------------------------------------------------------
class TestRunTestsprite:
    @patch("tools.testsprite.TESTSPRITE_MODE", "local")
    def test_routes_to_local(self):
        result = run_testsprite("print('routed')", "python")
        assert result["passed"] is True
        assert result["output"] == "routed"

    @patch("tools.testsprite.TESTSPRITE_MODE", "execute")
    @patch("tools.testsprite.TESTSPRITE_API_KEY", "")
    def test_no_api_key_falls_to_local(self):
        result = run_testsprite("print('fallback')", "python")
        assert result["passed"] is True
        assert result["output"] == "fallback"

    @patch("tools.testsprite.TESTSPRITE_MODE", "execute")
    @patch("tools.testsprite.TESTSPRITE_API_KEY", "test-key")
    @patch("tools.testsprite._scenario_a_execute")
    def test_execute_mode_with_key(self, mock_exec):
        mock_exec.return_value = {"passed": True, "error": None, "output": "ok"}
        result = run_testsprite("code", "python")
        mock_exec.assert_called_once_with("code", "python")
        assert result["passed"] is True

    @patch("tools.testsprite.TESTSPRITE_MODE", "generate")
    @patch("tools.testsprite.TESTSPRITE_API_KEY", "test-key")
    @patch("tools.testsprite._scenario_b_generate")
    def test_generate_mode_with_key(self, mock_gen):
        mock_gen.return_value = {"passed": True, "error": None, "output": "ok"}
        result = run_testsprite("code", "python")
        mock_gen.assert_called_once_with("code", "python")
