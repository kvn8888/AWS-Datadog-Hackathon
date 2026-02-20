import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ValidationBadge from "@/components/ValidationBadge";
import type { ValidationStatus } from "@/types/course";

describe("ValidationBadge", () => {
  it("renders PASS badge", () => {
    render(<ValidationBadge status="pass" />);
    expect(screen.getByText("PASS")).toBeInTheDocument();
  });

  it("renders FIXED badge", () => {
    render(<ValidationBadge status="fixed" />);
    expect(screen.getByText("FIXED")).toBeInTheDocument();
  });

  it("renders FAIL badge", () => {
    render(<ValidationBadge status="fail" />);
    expect(screen.getByText("FAIL")).toBeInTheDocument();
  });

  it("renders PENDING badge", () => {
    render(<ValidationBadge status="pending" />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("applies green styles for PASS", () => {
    const { container } = render(<ValidationBadge status="pass" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("green");
  });

  it("applies amber styles for FIXED", () => {
    const { container } = render(<ValidationBadge status="fixed" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("amber");
  });

  it("applies red styles for FAIL", () => {
    const { container } = render(<ValidationBadge status="fail" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("red");
  });
});
