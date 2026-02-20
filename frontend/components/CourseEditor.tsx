"use client";

import { useState } from "react";
import { useCourseStream } from "@/hooks/useCourseStream";
import { useCopilotActions } from "@/hooks/useCopilotActions";
import GenerateForm from "./GenerateForm";
import AgentStatusPanel from "./AgentStatusPanel";
import CourseOutline from "./CourseOutline";
import LessonViewer from "./LessonViewer";

export default function CourseEditor() {
  const { agentStatus, course, setCourse, isGenerating, error, startStream } = useCourseStream();
  const [selectedLesson, setSelectedLesson] = useState(0);

  // Register CopilotKit state + actions at the top level (NEVER in child components)
  useCopilotActions(course, startStream, isGenerating);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="text-xl font-bold text-gray-900">LearnForge</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            AI-Verified Courses
          </span>
        </div>
        <GenerateForm onGenerate={startStream} isGenerating={isGenerating} />
        <AgentStatusPanel agentStatus={agentStatus} isGenerating={isGenerating} />
        {error && (
          <div className="mt-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Content */}
      {course ? (
        <div className="flex flex-1 overflow-hidden">
          <CourseOutline
            course={course}
            selectedLesson={selectedLesson}
            onSelectLesson={setSelectedLesson}
          />
          {course.lessons[selectedLesson] && (
            <LessonViewer
              lesson={course.lessons[selectedLesson]}
              lessonIndex={selectedLesson}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          {isGenerating ? (
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">&#x1F9EA;</div>
              <p>Generating your verified course...</p>
              <p className="text-sm mt-1">Watch the agents work above</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-4">&#x1F393;</div>
              <p>Enter a topic above to generate a verified micro-course</p>
              <p className="text-sm mt-1">Every code example is tested before you see it</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
