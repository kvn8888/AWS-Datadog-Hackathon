"use client";

import type { Course } from "@/types/course";
import ValidationBadge from "./ValidationBadge";

interface Props {
  course: Course;
  selectedLesson: number;
  onSelectLesson: (index: number) => void;
}

export default function CourseOutline({ course, selectedLesson, onSelectLesson }: Props) {
  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
      <h2 className="font-bold text-lg mb-1">{course.topic}</h2>
      <p className="text-xs text-gray-500 mb-4 capitalize">{course.difficulty}</p>
      <nav>
        <ul className="space-y-1">
          {course.lessons.map((lesson, i) => (
            <li key={i}>
              <button
                onClick={() => onSelectLesson(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedLesson === i
                    ? "bg-blue-100 text-blue-800 font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {i + 1}. {lesson.title}
                  </span>
                  <ValidationBadge status={lesson.validation_status} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
