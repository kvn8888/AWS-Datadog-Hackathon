// TypeScript types mirroring backend Pydantic models

export type ValidationStatus = "pass" | "fixed" | "fail" | "pending";

export interface CodeExample {
  language: string;
  code: string;
  original_code?: string; // populated when status is "fixed"
  validation_status?: ValidationStatus;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
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
