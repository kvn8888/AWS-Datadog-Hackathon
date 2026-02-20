import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GenerateForm from "@/components/GenerateForm";

// Mock the API module
vi.mock("@/lib/api", () => ({
  generateCourse: vi.fn().mockResolvedValue({ courseId: "mock-id" }),
}));

describe("GenerateForm", () => {
  const mockOnGenerate = vi.fn();

  beforeEach(() => {
    mockOnGenerate.mockReset();
  });

  it("renders input and button", () => {
    render(<GenerateForm onGenerate={mockOnGenerate} isGenerating={false} />);
    expect(screen.getByPlaceholderText(/enter a topic/i)).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Generate Course");
  });

  it("disables input and button when generating", () => {
    render(<GenerateForm onGenerate={mockOnGenerate} isGenerating={true} />);
    expect(screen.getByPlaceholderText(/enter a topic/i)).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent("Generating...");
  });

  it("disables button when input is empty", () => {
    render(<GenerateForm onGenerate={mockOnGenerate} isGenerating={false} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("enables button when topic is entered", () => {
    render(<GenerateForm onGenerate={mockOnGenerate} isGenerating={false} />);
    fireEvent.change(screen.getByPlaceholderText(/enter a topic/i), {
      target: { value: "Python async" },
    });
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
