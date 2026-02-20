"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import CourseEditor from "@/components/CourseEditor";

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar
        defaultOpen={false}
        labels={{
          title: "LearnForge AI",
          initial: "I can help you generate and customize verified coding courses. Try: \"Generate a course on Python async programming\"",
        }}
      >
        <div className="h-screen flex flex-col">
          <CourseEditor />
        </div>
      </CopilotSidebar>
    </CopilotKit>
  );
}
