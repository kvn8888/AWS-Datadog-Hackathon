"use client";

import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import type { Course } from "@/types/course";
import { generateCourse } from "@/lib/api";

/**
 * Single hook for ALL CopilotKit state and action registrations.
 * Called ONCE at the top-level CourseEditor — never in child components.
 */
export function useCopilotActions(
  course: Course | null,
  onGenerate: (courseId: string) => void,
  isGenerating: boolean,
) {
  // Share course state with CopilotKit sidebar
  useCopilotReadable({
    description: "The current course being viewed, including all lessons, code examples, validation status, and audio/image URLs",
    value: course ? JSON.stringify(course) : "No course generated yet",
  });

  // Action: Generate a new course
  useCopilotAction({
    name: "generateCourse",
    description: "Generate a new verified micro-course on a programming topic",
    parameters: [
      {
        name: "topic",
        type: "string",
        description: "The programming topic to create a course about",
        required: true,
      },
      {
        name: "difficulty",
        type: "string",
        description: "Difficulty level: beginner, intermediate, or advanced",
        required: false,
      },
    ],
    handler: async ({ topic, difficulty }) => {
      if (isGenerating) return "A course is already being generated. Please wait.";
      try {
        const { courseId } = await generateCourse(topic, difficulty || "intermediate");
        onGenerate(courseId);
        return `Started generating a course on "${topic}". Watch the agent status panel for progress.`;
      } catch (e) {
        return `Failed to start generation: ${e}`;
      }
    },
  });

  // Action: Regenerate a specific lesson
  useCopilotAction({
    name: "regenerateLesson",
    description: "Regenerate a specific lesson in the current course with custom instructions",
    parameters: [
      {
        name: "lessonNumber",
        type: "number",
        description: "The lesson number to regenerate (1-based)",
        required: true,
      },
      {
        name: "instruction",
        type: "string",
        description: "Instructions for how to change the lesson (e.g., 'make it simpler', 'add more examples')",
        required: true,
      },
    ],
    handler: async ({ lessonNumber, instruction }) => {
      if (!course) return "No course loaded. Generate a course first.";
      const lessonIndex = (lessonNumber as number) - 1;
      if (lessonIndex < 0 || lessonIndex >= course.lessons.length) {
        return `Invalid lesson number. Course has ${course.lessons.length} lessons.`;
      }
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(
          `${backendUrl}/course/${course.id}/lesson/${lessonIndex}/regenerate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instruction }),
          }
        );
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return `Regenerating lesson ${lessonNumber}: "${course.lessons[lessonIndex].title}" with instruction: "${instruction}"`;
      } catch (e) {
        return `Failed to regenerate lesson: ${e}`;
      }
    },
  });
}
