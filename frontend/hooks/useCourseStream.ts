"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentEvent, AgentStatus, Course } from "@/types/course";
import { getStreamUrl, getCourse } from "@/lib/api";

export function useCourseStream() {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});
  const [course, setCourse] = useState<Course | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback((id: string) => {
    setCourseId(id);
    setIsGenerating(true);
    setError(null);
    setAgentStatus({});
    setCourse(null);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    const es = new EventSource(getStreamUrl(courseId));

    es.onmessage = async (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      setAgentStatus((prev) => ({
        ...prev,
        [event.agent]: { status: event.status, data: event.data },
      }));

      if (event.status === "complete") {
        es.close();
        // Fetch the completed course
        try {
          const data = await getCourse(courseId);
          setCourse(data as Course);
        } catch {
          setError("Failed to fetch completed course");
        }
        setIsGenerating(false);
      }

      if (event.status === "error") {
        es.close();
        setError(String(event.data?.message || "Generation failed"));
        setIsGenerating(false);
      }
    };

    es.onerror = () => {
      es.close();
      setError("Connection to server lost");
      setIsGenerating(false);
    };

    return () => es.close();
  }, [courseId]);

  return { agentStatus, course, setCourse, isGenerating, error, startStream };
}
