"""Datadog observability setup — LLM traces + custom metrics.

ddtrace auto-instruments Bedrock via botocore patch.
Strands auto-exports OTLP traces via OTEL_EXPORTER_OTLP_ENDPOINT env var.
Custom statsd metrics track validation pass rates and generation timing.
"""

import os
import time
from contextlib import contextmanager


def init_observability():
    """Initialize Datadog tracing and LLM Observability.

    Call this BEFORE any agent or Bedrock calls.
    """
    dd_api_key = os.getenv("DD_API_KEY")
    if not dd_api_key:
        print("WARNING: DD_API_KEY not set, Datadog observability disabled")
        return

    try:
        from ddtrace import tracer, patch
        from ddtrace.llmobs import LLMObs

        # Auto-instrument Bedrock SDK calls
        patch(botocore=True)

        # Enable LLM Observability — try with agentless first, fall back for older ddtrace
        try:
            LLMObs.enable(
                ml_app="learnforge",
                api_key=dd_api_key,
                site=os.getenv("DD_SITE", "datadoghq.com"),
                agentless=True,
            )
        except TypeError:
            LLMObs.enable(
                ml_app="learnforge",
                api_key=dd_api_key,
                site=os.getenv("DD_SITE", "datadoghq.com"),
            )

        print("Datadog LLM Observability enabled")
    except ImportError:
        print("WARNING: ddtrace not installed, Datadog observability disabled")
    except Exception as e:
        print(f"WARNING: Datadog init failed: {e}")


def _get_statsd():
    """Lazy-load statsd client."""
    try:
        from datadog import statsd
        return statsd
    except ImportError:
        return None


def track_course_generated(topic: str, elapsed: float, lesson_count: int):
    """Track a completed course generation."""
    s = _get_statsd()
    if not s:
        return
    s.increment("learnforge.course.generated", tags=[f"topic:{topic}"])
    s.histogram("learnforge.course.generation_time_seconds", elapsed)
    s.histogram("learnforge.course.lesson_count", lesson_count)


def track_validation(total_checks: int, failures: int, fixes: int):
    """Track validation results across a course."""
    s = _get_statsd()
    if not s:
        return
    s.increment("learnforge.validation.total_checks", value=total_checks)
    s.increment("learnforge.validation.first_pass_failures", value=failures)
    s.increment("learnforge.validation.fixes_applied", value=fixes)
    if total_checks > 0:
        pass_rate = (total_checks - failures) / total_checks
        s.gauge("learnforge.validation.first_pass_rate", pass_rate)


def track_agent_call(agent_name: str, elapsed: float, success: bool):
    """Track an individual agent call."""
    s = _get_statsd()
    if not s:
        return
    tags = [f"agent:{agent_name}", f"success:{success}"]
    s.increment("learnforge.agent.calls", tags=tags)
    s.histogram("learnforge.agent.duration_seconds", elapsed, tags=tags)


@contextmanager
def track_timing(metric_name: str, tags: list[str] | None = None):
    """Context manager to track timing of a block."""
    start = time.time()
    try:
        yield
    finally:
        elapsed = time.time() - start
        s = _get_statsd()
        if s:
            s.histogram(metric_name, elapsed, tags=tags or [])
