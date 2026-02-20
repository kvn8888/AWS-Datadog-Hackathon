"use client";

import { useState } from "react";
import { generateCourse } from "@/lib/api";

interface Props {
  onGenerate: (courseId: string) => void;
  isGenerating: boolean;
}

export default function GenerateForm({ onGenerate, isGenerating }: Props) {
  const [topic, setTopic] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;
    const { courseId } = await generateCourse(topic.trim());
    onGenerate(courseId);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a topic (e.g., Python async programming)"
        disabled={isGenerating}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!topic.trim() || isGenerating}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isGenerating ? "Generating..." : "Generate Course"}
      </button>
    </form>
  );
}
