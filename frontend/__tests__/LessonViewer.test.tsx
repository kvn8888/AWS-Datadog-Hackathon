import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LessonViewer from "@/components/LessonViewer";
import type { Lesson } from "@/types/course";

// Mock fetch for test code button
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const baseLessonProps: Lesson = {
  title: "Understanding Coroutines",
  objectives: ["Define coroutines", "Write async functions"],
  explanation: "A coroutine is a special function that can pause and resume.",
  code_examples: [
    {
      language: "python",
      code: "import asyncio\n\nasync def hello():\n    print('Hello')",
      validation_status: "pass",
    },
  ],
  quiz_questions: [
    {
      question: "What keyword makes a coroutine?",
      options: ["async", "await", "yield", "return"],
      correct_index: 0,
    },
  ],
  audio_url: null,
  image_url: null,
  validation_status: "pass",
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("LessonViewer", () => {
  it("renders lesson title with index", () => {
    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    expect(screen.getByText(/Lesson 1.*Understanding Coroutines/)).toBeInTheDocument();
  });

  it("renders learning objectives", () => {
    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    expect(screen.getByText("Define coroutines")).toBeInTheDocument();
    expect(screen.getByText("Write async functions")).toBeInTheDocument();
  });

  it("renders explanation text", () => {
    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    expect(screen.getByText(/coroutine is a special function/)).toBeInTheDocument();
  });

  it("renders code examples", () => {
    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    expect(screen.getByText(/import asyncio/)).toBeInTheDocument();
  });

  it("renders quiz questions", () => {
    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    expect(screen.getByText("What keyword makes a coroutine?")).toBeInTheDocument();
    expect(screen.getByText("async")).toBeInTheDocument();
  });

  it("renders Test This Code button", () => {
    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    expect(screen.getByText("Test This Code")).toBeInTheDocument();
  });

  it("shows Testing... while testing code", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LessonViewer lesson={baseLessonProps} lessonIndex={0} />);
    fireEvent.click(screen.getByText("Test This Code"));

    await waitFor(() => {
      expect(screen.getByText("Testing...")).toBeInTheDocument();
    });
  });

  it("shows BEFORE/AFTER for fixed code examples", () => {
    const fixedLesson: Lesson = {
      ...baseLessonProps,
      code_examples: [
        {
          language: "python",
          code: "x = 1\nprint(x)",
          original_code: "print(x)",
          validation_status: "fixed",
        },
      ],
    };
    render(<LessonViewer lesson={fixedLesson} lessonIndex={0} />);
    expect(screen.getByText(/BEFORE/)).toBeInTheDocument();
    expect(screen.getByText(/AFTER/)).toBeInTheDocument();
  });

  it("renders audio player when audio_url is present", () => {
    const lessonWithAudio: Lesson = {
      ...baseLessonProps,
      audio_url: "https://example.com/audio.mp3",
    };
    render(<LessonViewer lesson={lessonWithAudio} lessonIndex={0} />);
    expect(screen.getByText("Narration")).toBeInTheDocument();
  });

  it("renders image when image_url is present", () => {
    const lessonWithImage: Lesson = {
      ...baseLessonProps,
      image_url: "https://example.com/img.png",
    };
    render(<LessonViewer lesson={lessonWithImage} lessonIndex={0} />);
    const img = screen.getByAltText(/Concept visual/);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.png");
  });

  it("hides sections when data is empty", () => {
    const minimalLesson: Lesson = {
      title: "Minimal",
      objectives: [],
      explanation: "",
      code_examples: [],
      quiz_questions: [],
      audio_url: null,
      image_url: null,
      validation_status: "pending",
    };
    render(<LessonViewer lesson={minimalLesson} lessonIndex={0} />);
    expect(screen.queryByText("Learning Objectives")).not.toBeInTheDocument();
    expect(screen.queryByText("Quiz")).not.toBeInTheDocument();
    expect(screen.queryByText("Narration")).not.toBeInTheDocument();
  });
});
