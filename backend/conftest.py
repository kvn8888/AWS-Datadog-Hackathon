"""Root conftest — mocks external SDKs before any backend imports."""

import sys
import os
import types
from unittest.mock import MagicMock

# Add backend/ to Python path so `from models import ...` works
sys.path.insert(0, os.path.dirname(__file__))

# ---------------------------------------------------------------------------
# Mock strands SDK (not installed locally — needs Bedrock credentials)
# ---------------------------------------------------------------------------
_strands = types.ModuleType("strands")
_strands.tool = lambda fn: fn  # @tool decorator = passthrough
_strands.Agent = MagicMock  # Agent class = callable MagicMock
sys.modules["strands"] = _strands

# ---------------------------------------------------------------------------
# Mock ag_ui_strands (CopilotKit bridge — optional dependency)
# ---------------------------------------------------------------------------
sys.modules["ag_ui_strands"] = MagicMock()

# ---------------------------------------------------------------------------
# Mock Datadog packages (optional observability)
# ---------------------------------------------------------------------------
sys.modules["ddtrace"] = MagicMock()
sys.modules["ddtrace.llmobs"] = MagicMock()
sys.modules["datadog"] = MagicMock()

# ---------------------------------------------------------------------------
# Mock OpenTelemetry (optional)
# ---------------------------------------------------------------------------
for mod in [
    "opentelemetry",
    "opentelemetry.api",
    "opentelemetry.sdk",
    "opentelemetry.exporter",
]:
    sys.modules.setdefault(mod, MagicMock())

# ---------------------------------------------------------------------------
# Mock boto3 (AWS SDK — optional)
# ---------------------------------------------------------------------------
sys.modules.setdefault("boto3", MagicMock())
