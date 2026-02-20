"""Pydantic models for LearnForge — SCHEMA LOCKED (Phase 2, 02-01).

Both backend agents and frontend TypeScript types derive from these models.
DO NOT change field names without updating frontend/types/course.ts.
"""

from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class ValidationStatus(str, Enum):
    PASS = "pass"
    FIXED = "fixed"
    FAIL = "fail"
    PENDING = "pending"


# ---------------------------------------------------------------------------
# Course content models
# ---------------------------------------------------------------------------
class CodeExample(BaseModel):
    language: str = "python"
    code: str
    original_code: str | None = None  # populated when validation_status is FIXED
    validation_status: ValidationStatus = ValidationStatus.PENDING


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int


class LessonPlan(BaseModel):
    """Output of the Planner agent — one per lesson."""
    title: str
    objectives: list[str]
    content_outline: str


class Lesson(BaseModel):
    """Output of the Creator agent, enriched by Validator/Fixer."""
    title: str
    objectives: list[str] = Field(default_factory=list)
    explanation: str = ""
    code_examples: list[CodeExample] = Field(default_factory=list)
    quiz_questions: list[QuizQuestion] = Field(default_factory=list)
    audio_url: str | None = None
    image_url: str | None = None
    validation_status: ValidationStatus = ValidationStatus.PENDING


class Course(BaseModel):
    """Top-level course object stored in memory and sent to frontend."""
    id: str
    topic: str
    difficulty: str = "intermediate"
    lessons: list[Lesson] = Field(default_factory=list)
    status: Literal["generating", "complete", "error"] = "generating"


# ---------------------------------------------------------------------------
# Validation models (Validator + Fixer agents)
# ---------------------------------------------------------------------------
class SnippetResult(BaseModel):
    """Result of validating a single code snippet."""
    index: int
    passed: bool
    error: str | None = None
    output: str = ""


class ValidationResult(BaseModel):
    """Output of the Validator agent for one lesson."""
    lesson_index: int
    results: list[SnippetResult] = Field(default_factory=list)
    all_passed: bool = False


# ---------------------------------------------------------------------------
# API request/response models
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"


class GenerateResponse(BaseModel):
    courseId: str


class RegenerateRequest(BaseModel):
    instruction: str = "Improve this lesson"


class TestCodeRequest(BaseModel):
    code: str
    language: str = "python"


class TestCodeResponse(BaseModel):
    passed: bool
    error: str | None = None
    output: str = ""
