import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CourseOutline from "@/components/CourseOutline";
import type { Course } from "@/types/course";

const mockCourse: Course = {
  id: "test-1",
  topic: "Python Basics",
  difficulty: "beginner",
  status: "complete",
  lessons: [
    {
      title: "Variables",
      objectives: ["Understand variables"],
      explanation: "Variables store data.",
      code_examples: [],
      quiz_questions: [],
      audio_url: null,
      image_url: null,
      validation_status: "pass",
    },
    {
      title: "Functions",
      objectives: ["Write functions"],
      explanation: "Functions encapsulate logic.",
      code_examples: [],
      quiz_questions: [],
      audio_url: null,
      image_url: null,
      validation_status: "fixed",
    },
  ],
};

describe("CourseOutline", () => {
  it("renders course topic and difficulty", () => {
    render(
      <CourseOutline course={mockCourse} selectedLesson={0} onSelectLesson={() => {}} />
    );
    expect(screen.getByText("Python Basics")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  it("renders all lesson titles", () => {
    render(
      <CourseOutline course={mockCourse} selectedLesson={0} onSelectLesson={() => {}} />
    );
    expect(screen.getByText(/Variables/)).toBeInTheDocument();
    expect(screen.getByText(/Functions/)).toBeInTheDocument();
  });

  it("renders validation badges for each lesson", () => {
    render(
      <CourseOutline course={mockCourse} selectedLesson={0} onSelectLesson={() => {}} />
    );
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.getByText("FIXED")).toBeInTheDocument();
  });

  it("calls onSelectLesson when a lesson is clicked", () => {
    const mockSelect = vi.fn();
    render(
      <CourseOutline course={mockCourse} selectedLesson={0} onSelectLesson={mockSelect} />
    );
    fireEvent.click(screen.getByText(/Functions/));
    expect(mockSelect).toHaveBeenCalledWith(1);
  });

  it("highlights selected lesson", () => {
    const { container } = render(
      <CourseOutline course={mockCourse} selectedLesson={0} onSelectLesson={() => {}} />
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons[0].className).toContain("blue");
  });
});
