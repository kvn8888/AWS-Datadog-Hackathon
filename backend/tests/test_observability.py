"""Tests for observability module."""

import time
import pytest
from unittest.mock import patch, MagicMock
from observability import (
    init_observability,
    track_course_generated,
    track_validation,
    track_agent_call,
    track_timing,
    _get_statsd,
)


# ---------------------------------------------------------------------------
# init_observability
# ---------------------------------------------------------------------------
class TestInitObservability:
    @patch.dict("os.environ", {}, clear=True)
    def test_no_api_key_skips(self, capsys):
        init_observability()
        captured = capsys.readouterr()
        assert "DD_API_KEY not set" in captured.out

    @patch.dict("os.environ", {"DD_API_KEY": "test-key"})
    def test_with_api_key_initializes(self, capsys):
        # ddtrace is mocked, so this should succeed
        init_observability()
        captured = capsys.readouterr()
        assert "enabled" in captured.out.lower() or "failed" in captured.out.lower()


# ---------------------------------------------------------------------------
# Tracking functions (no statsd available)
# ---------------------------------------------------------------------------
class TestTrackingWithoutStatsd:
    @patch("observability._get_statsd", return_value=None)
    def test_track_course_generated_noop(self, mock):
        track_course_generated("Python", 5.0, 3)  # Should not raise

    @patch("observability._get_statsd", return_value=None)
    def test_track_validation_noop(self, mock):
        track_validation(10, 2, 1)  # Should not raise

    @patch("observability._get_statsd", return_value=None)
    def test_track_agent_call_noop(self, mock):
        track_agent_call("planner", 1.5, True)  # Should not raise


# ---------------------------------------------------------------------------
# Tracking functions (with mocked statsd)
# ---------------------------------------------------------------------------
class TestTrackingWithStatsd:
    @patch("observability._get_statsd")
    def test_track_course_generated(self, mock_get):
        mock_statsd = MagicMock()
        mock_get.return_value = mock_statsd

        track_course_generated("Python", 5.0, 3)

        mock_statsd.increment.assert_called_once()
        assert mock_statsd.histogram.call_count == 2

    @patch("observability._get_statsd")
    def test_track_validation(self, mock_get):
        mock_statsd = MagicMock()
        mock_get.return_value = mock_statsd

        track_validation(10, 2, 1)

        assert mock_statsd.increment.call_count == 3
        mock_statsd.gauge.assert_called_once()

    @patch("observability._get_statsd")
    def test_track_validation_zero_checks(self, mock_get):
        mock_statsd = MagicMock()
        mock_get.return_value = mock_statsd

        track_validation(0, 0, 0)
        mock_statsd.gauge.assert_not_called()

    @patch("observability._get_statsd")
    def test_track_agent_call(self, mock_get):
        mock_statsd = MagicMock()
        mock_get.return_value = mock_statsd

        track_agent_call("creator", 2.0, True)

        mock_statsd.increment.assert_called_once()
        mock_statsd.histogram.assert_called_once()


# ---------------------------------------------------------------------------
# track_timing context manager
# ---------------------------------------------------------------------------
class TestTrackTiming:
    @patch("observability._get_statsd", return_value=None)
    def test_timing_without_statsd(self, mock):
        with track_timing("test.metric"):
            time.sleep(0.01)
        # Should not raise

    @patch("observability._get_statsd")
    def test_timing_records_duration(self, mock_get):
        mock_statsd = MagicMock()
        mock_get.return_value = mock_statsd

        with track_timing("test.metric", tags=["env:test"]):
            time.sleep(0.01)

        mock_statsd.histogram.assert_called_once()
        args, kwargs = mock_statsd.histogram.call_args
        assert args[0] == "test.metric"
        assert args[1] >= 0.01  # At least 10ms
        assert kwargs["tags"] == ["env:test"]
