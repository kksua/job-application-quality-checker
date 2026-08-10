import type { TailoringResponse } from "../types/analysis";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

interface TailoringRequest {
  cvText: string;
  jobDescription: string;
}

export async function generateTailoringSuggestions({
  cvText,
  jobDescription,
}: TailoringRequest): Promise<TailoringResponse> {
  const response = await fetch(`${API_BASE_URL}/tailoring`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cv_text: cvText,
      job_description: jobDescription,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ?? "AI tailoring suggestions could not be generated.",
    );
  }

  return response.json() as Promise<TailoringResponse>;
}
