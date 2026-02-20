// Backend API client — single place to change the backend URL

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function generateCourse(topic: string, difficulty: string = "intermediate") {
  const res = await fetch(`${BACKEND_URL}/course/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, difficulty }),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
  return res.json() as Promise<{ courseId: string }>;
}

export async function getCourse(courseId: string) {
  const res = await fetch(`${BACKEND_URL}/course/${courseId}`);
  if (!res.ok) throw new Error(`Fetch course failed: ${res.status}`);
  return res.json();
}

export function getStreamUrl(courseId: string) {
  return `${BACKEND_URL}/course/${courseId}/stream`;
}
