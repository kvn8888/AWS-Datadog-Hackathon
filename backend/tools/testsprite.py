"""TestSprite tool wrapper for code validation.

Two scenarios pre-written since TestSprite API behavior is unknown:
- Scenario A: Direct code execution (TestSprite runs code and returns pass/fail)
- Scenario B: Test generation (TestSprite generates tests, we run them locally)

The active scenario is selected via TESTSPRITE_MODE env var.
Falls back to local subprocess execution if no API key is set.
"""

import os
import subprocess
import tempfile
import httpx
from strands import tool

TESTSPRITE_API_KEY = os.getenv("TESTSPRITE_API_KEY", "")
TESTSPRITE_BASE_URL = os.getenv("TESTSPRITE_BASE_URL", "https://api.testsprite.com")
TESTSPRITE_MODE = os.getenv("TESTSPRITE_MODE", "local")  # "execute", "generate", or "local"


def _run_code_locally(code: str, language: str) -> dict:
    """Execute code in a restricted subprocess as fallback."""
    if language != "python":
        return {"passed": False, "error": f"Local execution only supports Python, got {language}", "output": ""}

    try:
        with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
            f.write(code)
            fname = f.name

        result = subprocess.run(
            ["python3", fname],
            capture_output=True,
            timeout=10,
            text=True,
        )
        os.unlink(fname)

        return {
            "passed": result.returncode == 0,
            "error": result.stderr.strip() if result.returncode != 0 else None,
            "output": result.stdout.strip(),
        }
    except subprocess.TimeoutExpired:
        return {"passed": False, "error": "Execution timed out (10s limit)", "output": ""}
    except Exception as e:
        return {"passed": False, "error": str(e), "output": ""}


def _scenario_a_execute(code: str, language: str) -> dict:
    """Scenario A: TestSprite executes code directly and returns pass/fail."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{TESTSPRITE_BASE_URL}/execute",
                headers={"Authorization": f"Bearer {TESTSPRITE_API_KEY}"},
                json={"code": code, "language": language},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"TestSprite execute error: {e}, falling back to local")
        return _run_code_locally(code, language)


def _scenario_b_generate(code: str, language: str) -> dict:
    """Scenario B: TestSprite generates test cases, we execute them locally."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{TESTSPRITE_BASE_URL}/generate-tests",
                headers={"Authorization": f"Bearer {TESTSPRITE_API_KEY}"},
                json={"code": code, "language": language},
            )
            resp.raise_for_status()
            tests = resp.json().get("tests", [])

        if not tests:
            return {"passed": True, "error": None, "output": "No tests generated"}

        # Combine code + tests and run locally
        combined = code + "\n\n" + "\n".join(tests)
        return _run_code_locally(combined, language)
    except Exception as e:
        print(f"TestSprite generate error: {e}, falling back to local")
        return _run_code_locally(code, language)


@tool
def run_testsprite(code: str, language: str = "python") -> dict:
    """Validate a code example using TestSprite or local execution.

    Args:
        code: The code snippet to validate
        language: Programming language (default: python)

    Returns:
        Dict with keys: passed (bool), error (str|None), output (str)
    """
    if TESTSPRITE_MODE == "execute" and TESTSPRITE_API_KEY:
        return _scenario_a_execute(code, language)
    elif TESTSPRITE_MODE == "generate" and TESTSPRITE_API_KEY:
        return _scenario_b_generate(code, language)
    else:
        # Default: local subprocess execution
        return _run_code_locally(code, language)
