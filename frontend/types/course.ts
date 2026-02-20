// TypeScript types mirroring backend Pydantic models — SCHEMA LOCKED
// DO NOT change field names without updating backend/models.py

export type ValidationStatus = "pass" | "fixed" | "fail" | "pending";

export interface CodeExample {
  language: string;
  code: string;
  original_code?: string; // populated when validation_status is "fixed"
  validation_status: ValidationStatus;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

export interface LessonPlan {
  title: string;
  objectives: string[];
  content_outline: string;
}

export interface Lesson {
  title: string;
  objectives: string[];
  explanation: string;
  code_examples: CodeExample[];
  quiz_questions: QuizQuestion[];
  audio_url: string | null;
  image_url: string | null;
  validation_status: ValidationStatus;
}

export interface Course {
  id: string;
  topic: string;
  difficulty: string;
  lessons: Lesson[];
  status: "generating" | "complete" | "error";
}

// Validation models
export interface SnippetResult {
  index: number;
  passed: boolean;
  error: string | null;
  output: string;
}

export interface ValidationResult {
  lesson_index: number;
  results: SnippetResult[];
  all_passed: boolean;
}

// SSE event types
export interface AgentEvent {
  agent: string;
  status: string;
  data: Record<string, unknown>;
}

export interface AgentStatus {
  [agent: string]: {
    status: string;
    data: Record<string, unknown>;
  };
}
