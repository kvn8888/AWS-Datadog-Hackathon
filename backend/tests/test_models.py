"""Tests for Pydantic models — validates schema correctness and defaults."""

import pytest
from pydantic import ValidationError
from models import (
    ValidationStatus,
    CodeExample,
    QuizQuestion,
    LessonPlan,
    Lesson,
    Course,
    SnippetResult,
    ValidationResult,
    GenerateRequest,
    GenerateResponse,
    RegenerateRequest,
    TestCodeRequest,
    TestCodeResponse,
)


# ---------------------------------------------------------------------------
# ValidationStatus enum
# ---------------------------------------------------------------------------
class TestValidationStatus:
    def test_pass_value(self):
        assert ValidationStatus.PASS.value == "pass"

    def test_fixed_value(self):
        assert ValidationStatus.FIXED.value == "fixed"

    def test_fail_value(self):
        assert ValidationStatus.FAIL.value == "fail"

    def test_pending_value(self):
        assert ValidationStatus.PENDING.value == "pending"

    def test_from_string(self):
        assert ValidationStatus("pass") == ValidationStatus.PASS

    def test_invalid_raises(self):
        with pytest.raises(ValueError):
            ValidationStatus("invalid")


# ---------------------------------------------------------------------------
# CodeExample
# ---------------------------------------------------------------------------
class TestCodeExample:
    def test_minimal(self):
        ex = CodeExample(code="x = 1")
        assert ex.language == "python"
        assert ex.code == "x = 1"
        assert ex.original_code is None
        assert ex.validation_status == ValidationStatus.PENDING

    def test_full(self):
        ex = CodeExample(
            language="javascript",
            code="console.log(1)",
            original_code="console.log(x)",
            validation_status=ValidationStatus.FIXED,
        )
        assert ex.language == "javascript"
        assert ex.original_code == "console.log(x)"
        assert ex.validation_status == ValidationStatus.FIXED

    def test_missing_code_raises(self):
        with pytest.raises(ValidationError):
            CodeExample()


# ---------------------------------------------------------------------------
# QuizQuestion
# ---------------------------------------------------------------------------
class TestQuizQuestion:
    def test_creation(self):
        q = QuizQuestion(
            question="What is 1+1?",
            options=["1", "2", "3", "4"],
            correct_index=1,
        )
        assert q.question == "What is 1+1?"
        assert len(q.options) == 4
        assert q.correct_index == 1

    def test_missing_fields_raises(self):
        with pytest.raises(ValidationError):
            QuizQuestion(question="test")


# ---------------------------------------------------------------------------
# LessonPlan
# ---------------------------------------------------------------------------
class TestLessonPlan:
    def test_creation(self, sample_lesson_plan):
        assert sample_lesson_plan.title == "Variables and Types"
        assert len(sample_lesson_plan.objectives) == 2
        assert "Cover int" in sample_lesson_plan.content_outline

    def test_missing_title_raises(self):
        with pytest.raises(ValidationError):
            LessonPlan(objectives=["test"], content_outline="test")


# ---------------------------------------------------------------------------
# Lesson
# ---------------------------------------------------------------------------
class TestLesson:
    def test_minimal(self):
        lesson = Lesson(title="Test")
        assert lesson.title == "Test"
        assert lesson.objectives == []
        assert lesson.explanation == ""
        assert lesson.code_examples == []
        assert lesson.quiz_questions == []
        assert lesson.audio_url is None
        assert lesson.image_url is None
        assert lesson.validation_status == ValidationStatus.PENDING

    def test_full(self, sample_lesson):
        assert sample_lesson.title == "Hello World"
        assert len(sample_lesson.code_examples) == 1
        assert len(sample_lesson.quiz_questions) == 1
        assert sample_lesson.validation_status == ValidationStatus.PASS


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------
class TestCourse:
    def test_minimal(self):
        c = Course(id="abc", topic="Python")
        assert c.id == "abc"
        assert c.difficulty == "intermediate"
        assert c.lessons == []
        assert c.status == "generating"

    def test_full(self, sample_course):
        assert sample_course.id == "test-123"
        assert sample_course.topic == "Python Basics"
        assert sample_course.status == "complete"
        assert len(sample_course.lessons) == 1

    def test_invalid_status_raises(self):
        with pytest.raises(ValidationError):
            Course(id="x", topic="y", status="invalid")

    def test_serialization_roundtrip(self, sample_course):
        data = sample_course.model_dump()
        restored = Course(**data)
        assert restored.id == sample_course.id
        assert restored.lessons[0].title == sample_course.lessons[0].title


# ---------------------------------------------------------------------------
# SnippetResult
# ---------------------------------------------------------------------------
class TestSnippetResult:
    def test_passing(self):
        r = SnippetResult(index=0, passed=True, output="ok")
        assert r.passed is True
        assert r.error is None

    def test_failing(self):
        r = SnippetResult(index=1, passed=False, error="NameError")
        assert r.passed is False
        assert r.error == "NameError"


# ---------------------------------------------------------------------------
# ValidationResult
# ---------------------------------------------------------------------------
class TestValidationResult:
    def test_creation(self, sample_validation_result):
        assert sample_validation_result.lesson_index == 0
        assert len(sample_validation_result.results) == 2
        assert sample_validation_result.all_passed is False

    def test_defaults(self):
        vr = ValidationResult(lesson_index=0)
        assert vr.results == []
        assert vr.all_passed is False


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------
class TestAPIModels:
    def test_generate_request_defaults(self):
        req = GenerateRequest(topic="Python")
        assert req.difficulty == "intermediate"

    def test_generate_request_custom(self):
        req = GenerateRequest(topic="Rust", difficulty="advanced")
        assert req.topic == "Rust"
        assert req.difficulty == "advanced"

    def test_generate_response(self):
        resp = GenerateResponse(courseId="abc-123")
        assert resp.courseId == "abc-123"

    def test_regenerate_request_default(self):
        req = RegenerateRequest()
        assert req.instruction == "Improve this lesson"

    def test_regenerate_request_custom(self):
        req = RegenerateRequest(instruction="Add more examples")
        assert req.instruction == "Add more examples"

    def test_test_code_request_defaults(self):
        req = TestCodeRequest(code="print(1)")
        assert req.language == "python"

    def test_test_code_response_passing(self):
        resp = TestCodeResponse(passed=True, output="1")
        assert resp.passed is True
        assert resp.error is None

    def test_test_code_response_failing(self):
        resp = TestCodeResponse(passed=False, error="SyntaxError")
        assert resp.passed is False
