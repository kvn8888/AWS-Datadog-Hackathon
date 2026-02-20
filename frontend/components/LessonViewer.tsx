"use client";

import { useState } from "react";
import type { Lesson, ValidationStatus } from "@/types/course";
import ValidationBadge from "./ValidationBadge";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Props {
  lesson: Lesson;
  lessonIndex: number;
}

export default function LessonViewer({ lesson, lessonIndex }: Props) {
  const [testResults, setTestResults] = useState<Record<number, { passed: boolean; error?: string; loading: boolean }>>({});

  const handleTestCode = async (code: string, language: string, index: number) => {
    setTestResults((prev) => ({ ...prev, [index]: { passed: false, loading: true } }));
    try {
      const res = await fetch(`${BACKEND_URL}/course/test-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [index]: { passed: data.passed, error: data.error, loading: false },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [index]: { passed: false, error: "Request failed", loading: false },
      }));
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">
            Lesson {lessonIndex + 1}: {lesson.title}
          </h2>
          <ValidationBadge status={lesson.validation_status} />
        </div>

        {/* Objectives */}
        {lesson.objectives.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Learning Objectives
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {lesson.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Concept Visual */}
        {lesson.image_url && (
          <div className="mb-6">
            <img
              src={lesson.image_url}
              alt={`Concept visual for ${lesson.title}`}
              className="rounded-lg border border-gray-200 max-w-full"
            />
          </div>
        )}

        {/* Explanation */}
        {lesson.explanation && (
          <div className="mb-6 prose prose-gray max-w-none">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {lesson.explanation}
            </p>
          </div>
        )}

        {/* Code Examples */}
        {lesson.code_examples.map((example, i) => (
          <div key={i} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono text-gray-500">{example.language}</span>
              <div className="flex items-center gap-2">
                {/* On-demand test button */}
                <button
                  onClick={() => handleTestCode(example.code, example.language, i)}
                  disabled={testResults[i]?.loading}
                  className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 border border-indigo-200"
                >
                  {testResults[i]?.loading ? "Testing..." : "Test This Code"}
                </button>
                {/* Test result badge */}
                {testResults[i] && !testResults[i].loading && (
                  <ValidationBadge status={testResults[i].passed ? "pass" : "fail"} />
                )}
                {/* Original validation badge */}
                <ValidationBadge status={example.validation_status} />
              </div>
            </div>

            {/* Test error output */}
            {testResults[i] && !testResults[i].loading && testResults[i].error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-mono">
                {testResults[i].error}
              </div>
            )}

            {/* Show original code for FIXED examples */}
            {example.original_code && (
              <div className="mb-2">
                <span className="text-xs text-red-500 font-semibold">BEFORE (failed):</span>
                <pre className="mt-1 p-4 bg-red-50 border border-red-200 rounded-lg overflow-x-auto text-sm">
                  <code>{example.original_code}</code>
                </pre>
              </div>
            )}

            <div>
              {example.original_code && (
                <span className="text-xs text-green-600 font-semibold">AFTER (fixed):</span>
              )}
              <pre className="mt-1 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                <code>{example.code}</code>
              </pre>
            </div>
          </div>
        ))}

        {/* Audio Player */}
        {lesson.audio_url && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Narration
            </h3>
            <audio controls className="w-full">
              <source src={lesson.audio_url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Quiz */}
        {lesson.quiz_questions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Quiz
            </h3>
            {lesson.quiz_questions.map((q, i) => (
              <div key={i} className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="font-medium mb-2">{q.question}</p>
                <ul className="space-y-1">
                  {q.options.map((opt, j) => (
                    <li key={j} className="text-sm text-gray-700">
                      <span className="font-mono text-gray-400 mr-2">
                        {String.fromCharCode(65 + j)}.
                      </span>
                      {opt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
