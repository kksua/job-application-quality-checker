import type { BulletRewriteResponse, TailoringResponse } from "../types/analysis";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

interface TailoringRequest {
  cvText: string;
  jobDescription: string;
}

interface BulletRewriteRequest {
  bullet: string;
  cvContext: string;
  jobDescription: string;
}

export async function generateTailoringSuggestions({
  cvText,
  jobDescription,
}: TailoringRequest): Promise<TailoringResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tailoring`, {
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

export async function rewriteBullet({
  bullet,
  cvContext,
  jobDescription,
}: BulletRewriteRequest): Promise<BulletRewriteResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tailoring/bullet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bullet,
      cv_context: cvContext,
      job_description: jobDescription,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.detail ?? "AI bullet rewrite could not be generated.",
    );
  }

  const data = (await response.json()) as { rewritten_bullet: string };

  return {
    rewrittenBullet: data.rewritten_bullet,
  };
}
