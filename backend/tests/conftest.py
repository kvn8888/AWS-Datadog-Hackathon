"""Shared fixtures for backend tests."""

import pytest
from models import (
    Course, Lesson, CodeExample, QuizQuestion,
    ValidationStatus, LessonPlan, SnippetResult,
    ValidationResult,
)


@pytest.fixture
def sample_code_example():
    return CodeExample(
        language="python",
        code="print('hello')",
        validation_status=ValidationStatus.PASS,
    )


@pytest.fixture
def sample_quiz():
    return QuizQuestion(
        question="What does print() do?",
        options=["Outputs text", "Reads input", "Deletes files", "None of the above"],
        correct_index=0,
    )


@pytest.fixture
def sample_lesson(sample_code_example, sample_quiz):
    return Lesson(
        title="Hello World",
        objectives=["Write your first program"],
        explanation="This lesson covers the basics.",
        code_examples=[sample_code_example],
        quiz_questions=[sample_quiz],
        validation_status=ValidationStatus.PASS,
    )


@pytest.fixture
def sample_course(sample_lesson):
    return Course(
        id="test-123",
        topic="Python Basics",
        difficulty="beginner",
        lessons=[sample_lesson],
        status="complete",
    )


@pytest.fixture
def sample_lesson_plan():
    return LessonPlan(
        title="Variables and Types",
        objectives=["Understand variables", "Use basic types"],
        content_outline="Cover int, str, float with examples",
    )


@pytest.fixture
def sample_validation_result():
    return ValidationResult(
        lesson_index=0,
        results=[
            SnippetResult(index=0, passed=True, output="hello"),
            SnippetResult(index=1, passed=False, error="NameError: x"),
        ],
        all_passed=False,
    )
