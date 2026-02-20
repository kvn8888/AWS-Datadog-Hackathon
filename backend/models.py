"""Pydantic models for LearnForge. Schema locked in Phase 2 (02-01)."""

from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum


class ValidationStatus(str, Enum):
    PASS = "pass"
    FIXED = "fixed"
    FAIL = "fail"
    PENDING = "pending"


class CodeExample(BaseModel):
    language: str = "python"
    code: str
    original_code: str | None = None  # populated when status is FIXED


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int


class Lesson(BaseModel):
    title: str
    objectives: list[str] = Field(default_factory=list)
    explanation: str = ""
    code_examples: list[CodeExample] = Field(default_factory=list)
    quiz_questions: list[QuizQuestion] = Field(default_factory=list)
    audio_url: str | None = None
    image_url: str | None = None
    validation_status: ValidationStatus = ValidationStatus.PENDING


class LessonPlan(BaseModel):
    title: str
    objectives: list[str]
    content_outline: str


class Course(BaseModel):
    id: str
    topic: str
    difficulty: str = "intermediate"
    lessons: list[Lesson] = Field(default_factory=list)
    status: Literal["generating", "complete", "error"] = "generating"


class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"


class RegenerateRequest(BaseModel):
    instruction: str = "Improve this lesson"
