import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentStatusPanel from "@/components/AgentStatusPanel";
import type { AgentStatus } from "@/types/course";

describe("AgentStatusPanel", () => {
  it("renders nothing when not generating and no status", () => {
    const { container } = render(
      <AgentStatusPanel agentStatus={{}} isGenerating={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all four agent slots when generating", () => {
    render(
      <AgentStatusPanel agentStatus={{}} isGenerating={true} />
    );
    expect(screen.getByText("planner")).toBeInTheDocument();
    expect(screen.getByText("creator")).toBeInTheDocument();
    expect(screen.getByText("validator")).toBeInTheDocument();
    expect(screen.getByText("fixer")).toBeInTheDocument();
  });

  it("shows running status for active agent", () => {
    const status: AgentStatus = {
      planner: { status: "running", data: {} },
    };
    render(<AgentStatusPanel agentStatus={status} isGenerating={true} />);
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("shows done status for completed agent", () => {
    const status: AgentStatus = {
      planner: { status: "done", data: {} },
    };
    render(<AgentStatusPanel agentStatus={status} isGenerating={true} />);
    expect(screen.getByText("done")).toBeInTheDocument();
  });
});
