import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCourse, getCourse, getStreamUrl } from "@/lib/api";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("generateCourse", () => {
  it("sends POST request with topic and difficulty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ courseId: "abc-123" }),
    });

    const result = await generateCourse("Python async", "beginner");
    expect(result.courseId).toBe("abc-123");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/course/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "Python async", difficulty: "beginner" }),
      })
    );
  });

  it("uses intermediate as default difficulty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ courseId: "def-456" }),
    });

    await generateCourse("Rust");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.difficulty).toBe("intermediate");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(generateCourse("bad")).rejects.toThrow("Generate failed: 500");
  });
});

describe("getCourse", () => {
  it("fetches course by id", async () => {
    const mockCourse = { id: "abc", topic: "Python", lessons: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourse,
    });

    const result = await getCourse("abc");
    expect(result).toEqual(mockCourse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/course/abc")
    );
  });

  it("throws on 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(getCourse("missing")).rejects.toThrow("Fetch course failed: 404");
  });
});

describe("getStreamUrl", () => {
  it("returns correct stream URL", () => {
    const url = getStreamUrl("course-123");
    expect(url).toContain("/course/course-123/stream");
  });
});
