"""Tests for FastAPI endpoints."""

import asyncio
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app, _courses, MOCK_COURSE


@pytest.fixture(autouse=True)
def clear_courses():
    """Clean course store between tests."""
    _courses.clear()
    yield
    _courses.clear()


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "learnforge"
        assert "pipeline" in data


# ---------------------------------------------------------------------------
# Generate endpoint
# ---------------------------------------------------------------------------
class TestGenerateEndpoint:
    def test_returns_course_id(self, client):
        resp = client.post(
            "/course/generate",
            json={"topic": "Python Basics", "difficulty": "beginner"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "courseId" in data
        assert isinstance(data["courseId"], str)
        assert len(data["courseId"]) > 0

    def test_default_difficulty(self, client):
        resp = client.post("/course/generate", json={"topic": "Rust"})
        assert resp.status_code == 200

    def test_missing_topic_fails(self, client):
        resp = client.post("/course/generate", json={})
        assert resp.status_code == 422  # Pydantic validation error


# ---------------------------------------------------------------------------
# Get course endpoint
# ---------------------------------------------------------------------------
class TestGetCourseEndpoint:
    def test_missing_course_404(self, client):
        resp = client.get("/course/nonexistent")
        assert resp.status_code == 404

    def test_returns_course_data(self, client):
        # Store a mock course directly
        _courses["test-id"] = {
            **MOCK_COURSE,
            "id": "test-id",
            "topic": "Test",
            "difficulty": "beginner",
        }
        resp = client.get("/course/test-id")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "test-id"
        assert "lessons" in data


# ---------------------------------------------------------------------------
# Test code endpoint
# ---------------------------------------------------------------------------
class TestTestCodeEndpoint:
    def test_valid_python(self, client):
        resp = client.post(
            "/course/test-code",
            json={"code": "print('hello')", "language": "python"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["passed"] is True

    def test_failing_python(self, client):
        resp = client.post(
            "/course/test-code",
            json={"code": "raise Exception('boom')", "language": "python"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["passed"] is False
        assert data["error"] is not None

    def test_default_language(self, client):
        resp = client.post(
            "/course/test-code",
            json={"code": "print(42)"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["passed"] is True


# ---------------------------------------------------------------------------
# Stream endpoint
# ---------------------------------------------------------------------------
class TestStreamEndpoint:
    def test_stream_returns_event_stream(self, client):
        # First generate a course to create a queue
        gen_resp = client.post(
            "/course/generate",
            json={"topic": "Test", "difficulty": "beginner"},
        )
        course_id = gen_resp.json()["courseId"]

        # Stream endpoint should return event-stream content type
        with client.stream("GET", f"/course/{course_id}/stream") as resp:
            assert resp.headers["content-type"].startswith("text/event-stream")
            # Read at least one event (mock pipeline emits events)
            for line in resp.iter_lines():
                if line:
                    assert "data:" in line.lower() or line.startswith("data:")
                    break
