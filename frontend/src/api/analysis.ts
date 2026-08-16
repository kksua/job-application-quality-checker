import type { AnalysisResponse } from "../types/analysis";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

interface TextAnalysisRequest {
  cvText: string;
  jobDescription: string;
}

async function parseResponse(response: Response): Promise<AnalysisResponse> {
  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);

    if (
      typeof errorBody === "object" &&
      errorBody !== null &&
      "detail" in errorBody
    ) {
      const detail = errorBody.detail;

      if (typeof detail === "string") {
        throw new Error(detail);
      }
    }

    throw new Error("The application could not be analysed.");
  }

  return response.json() as Promise<AnalysisResponse>;
}

export async function analyseTextApplication({
  cvText,
  jobDescription,
}: TextAnalysisRequest): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cv_text: cvText,
      job_description: jobDescription,
    }),
  });

  return parseResponse(response);
}

export async function analysePdfApplication(
  cvFile: File,
  jobDescription: string,
): Promise<AnalysisResponse> {
  const formData = new FormData();

  formData.append("cv_file", cvFile);
  formData.append("job_description", jobDescription);

  const response = await fetch(`${API_BASE_URL}/api/analysis/pdf`, {
    method: "POST",
    body: formData,
  });

  return parseResponse(response);
}
