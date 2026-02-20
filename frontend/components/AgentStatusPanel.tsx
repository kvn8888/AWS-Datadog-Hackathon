"use client";

import type { AgentStatus } from "@/types/course";

const AGENTS = ["planner", "creator", "validator", "fixer"];

const STATUS_COLORS: Record<string, string> = {
  running: "bg-yellow-100 text-yellow-800 border-yellow-300",
  done: "bg-green-100 text-green-800 border-green-300",
  error: "bg-red-100 text-red-800 border-red-300",
  idle: "bg-gray-100 text-gray-500 border-gray-200",
};

interface Props {
  agentStatus: AgentStatus;
  isGenerating: boolean;
}

export default function AgentStatusPanel({ agentStatus, isGenerating }: Props) {
  if (!isGenerating && Object.keys(agentStatus).length === 0) return null;

  return (
    <div className="flex gap-2 my-4">
      {AGENTS.map((agent) => {
        const info = agentStatus[agent];
        const status = info?.status || "idle";
        const colors = STATUS_COLORS[status] || STATUS_COLORS.idle;

        return (
          <div
            key={agent}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize ${colors}`}
          >
            <div className="flex items-center gap-1">
              {status === "running" && (
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              )}
              {agent}
            </div>
            <div className="text-xs mt-1 opacity-75">
              {status === "idle" ? "Waiting" : status}
            </div>
          </div>
        );
      })}
    </div>
  );
}
