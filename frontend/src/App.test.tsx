import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import App from "./App";
import { analysePdfApplication, analyseTextApplication } from "./api/analysis";
import { parseCv } from "./api/cv";
import { generateTailoringSuggestions, rewriteBullet } from "./api/tailoring";
import type { AnalysisResponse } from "./types/analysis";
import type { StructuredCv } from "./types/cv";

vi.mock("./api/analysis", () => ({
  analyseTextApplication: vi.fn(),
  analysePdfApplication: vi.fn(),
}));

vi.mock("./api/cv", () => ({
  parseCv: vi.fn(),
}));

vi.mock("./api/tailoring", () => ({
  generateTailoringSuggestions: vi.fn(),
  rewriteBullet: vi.fn(),
}));

const mockedAnalyseTextApplication = vi.mocked(analyseTextApplication);

const mockedAnalysePdfApplication = vi.mocked(analysePdfApplication);

const mockedParseCv = vi.mocked(parseCv);

const mockedGenerateTailoringSuggestions = vi.mocked(
  generateTailoringSuggestions,
);

const mockedRewriteBullet = vi.mocked(rewriteBullet);

const successfulAnalysis: AnalysisResponse = {
  matching_skills: ["fastapi", "postgresql", "python", "react"],
  missing_skills: ["aws", "docker"],
  vague_phrases: ["responsible for"],
  repeated_words: {
    developed: 3,
    python: 4,
  },
  bullet_issues: [
    {
      bullet: "Responsible for frontend tasks.",
      issues: [
        "Bullet does not start with a strong action verb",
        "Bullet does not include measurable impact",
      ],
    },
  ],
  ats_readiness_score: 85,
  ats_issues: [
    {
      category: "contact",
      severity: "medium",
      message: "No phone number was detected.",
    },
  ],
  ats_passed_checks: [
    "Email address detected",
    "Experience section detected",
    "Education section detected",
    "Skills section detected",
  ],
  match_score: 67,
  score_breakdown: {
    technical_skills: {
      score: 75,
      weight: 45,
    },
    experience_relevance: {
      score: 70,
      weight: 25,
    },
    role_alignment: {
      score: 85,
      weight: 15,
    },
    education_qualifications: {
      score: 100,
      weight: 10,
    },
    location_eligibility: {
      score: null,
      weight: 5,
    },
  },
};

const successfulTailoring = {
  headline: "Software Engineering Graduate | React & FastAPI",
  summary:
    "Software Engineering graduate with hands-on experience developing " +
    "full-stack applications using React, TypeScript and FastAPI. " +
    "Built a RAG workflow that reduced manual document review by 60% " +
    "and contributed to web platforms using PostgreSQL. Brings practical " +
    "frontend, backend and API integration experience and aims to grow " +
    "in a full-stack engineering role.",
};

const regeneratedTailoring = {
  headline: "Full-Stack Engineering Graduate | React & TypeScript",
  summary:
    "Software Engineering graduate with practical experience building " +
    "full-stack web applications using React, TypeScript, FastAPI and " +
    "PostgreSQL. Developed a RAG workflow that reduced manual review by " +
    "60%. Combines frontend, backend and API integration experience with " +
    "a focus on contributing to reliable web products and growing as a " +
    "full-stack developer.",
};

const successfulStructuredCv: StructuredCv = {
  personalInfo: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "+33 7 49 14 96 78",
    location: "Paris, France",
    linkedin: null,
    github: null,
    portfolio: null,
    photoUrl: null,
  },
  headline: "Software Engineering Graduate",
  summary: "Software Engineering graduate with React and FastAPI experience.",
  experience: [],
  education: [],
  projects: [],
  skillGroups: [],
  awards: [],
  certifications: [],
  languages: [],
};

const structuredCvWithBullets: StructuredCv = {
  ...successfulStructuredCv,
  experience: [
    {
      company: "Nova Digital",
      jobTitle: "Frontend Developer Intern",
      location: "Paris, France",
      dates: {
        startDate: "January 2025",
        endDate: "June 2025",
      },
      bullets: ["Responsible for frontend tasks."],
    },
  ],
  projects: [
    {
      name: "AI Resume Checker",
      subtitle: "Full-stack CV analysis application",
      organization: null,
      location: null,
      dates: {
        startDate: "March 2026",
        endDate: null,
      },
      description: null,
      bullets: ["Built parser features."],
      technologies: ["React", "FastAPI"],
      url: null,
    },
  ],
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedParseCv.mockResolvedValue(successfulStructuredCv);
  });

  // Checks that the main application form and primary controls render.
  test("renders the main application form", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /analyse your application/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /your cv/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /job description/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    ).toBeInTheDocument();
  });

  // Checks that the user can switch from PDF upload to pasted CV text.
  test("switches from PDF upload to CV text input", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText(/upload your cv as a pdf/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    expect(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(/upload your cv as a pdf/i),
    ).not.toBeInTheDocument();
  });

  // Checks validation when no job description is provided.
  test("shows validation when the job description is empty", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter a job description containing at least 20 characters.",
    );
  });

  // Checks validation when pasted CV text does not meet the minimum length.
  test("shows validation when pasted CV text is too short", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are looking for a Python and FastAPI developer.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Python",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter CV text containing at least 20 characters.",
    );
  });

  // Checks that pasted CV text is submitted and analysis results render.
  test("submits pasted CV text and displays analysis results", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Python developer with FastAPI, React and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We need a Python developer with FastAPI, React, Docker and AWS.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    expect(mockedAnalyseTextApplication).toHaveBeenCalledWith({
      cvText: "Python developer with FastAPI, React and PostgreSQL experience.",
      jobDescription:
        "We need a Python developer with FastAPI, React, Docker and AWS.",
    });

    const matchScores = await screen.findAllByText("67%");

    expect(matchScores.length).toBeGreaterThanOrEqual(2);

    const eightyFiveScores = screen.getAllByText("85%");

    expect(eightyFiveScores.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Analysis complete")).toBeInTheDocument();

    expect(screen.getByText("Technical Skills")).toBeInTheDocument();

    expect(screen.getByText("Experience Relevance")).toBeInTheDocument();

    expect(screen.getByText("Role Alignment")).toBeInTheDocument();

    expect(screen.getByText("Education & Qualifications")).toBeInTheDocument();

    expect(screen.getByText("Location & Eligibility")).toBeInTheDocument();

    expect(screen.getByText("Not enough information")).toBeInTheDocument();

    expect(screen.getByText("Matched Skills")).toBeInTheDocument();

    expect(screen.getByText("fastapi")).toBeInTheDocument();

    expect(screen.getByText("docker")).toBeInTheDocument();
  });

  // Checks that backend analysis errors are shown to the user.
  test("shows an API error message", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockRejectedValue(
      new Error("The backend is unavailable."),
    );

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Python developer with FastAPI and React experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We need a Python developer with FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The backend is unavailable.",
    );
  });

  // Checks that the app starts in PDF mode without calling the PDF API.
  test("starts in PDF mode without calling the PDF API", () => {
    render(<App />);

    expect(screen.getByText(/upload your cv as a pdf/i)).toBeInTheDocument();

    expect(mockedAnalysePdfApplication).not.toHaveBeenCalled();
  });

  // Checks that the AI tailoring button appears after text analysis.
  test("shows AI tailoring after text analysis", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    expect(
      await screen.findByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    ).toBeInTheDocument();
  });

  // Checks that a successful AI call renders the headline and summary.
  test("renders AI headline and summary after successful tailoring", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    mockedGenerateTailoringSuggestions.mockResolvedValueOnce(
      successfulTailoring,
    );

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    );

    expect(
      await screen.findByText(successfulTailoring.headline),
    ).toBeInTheDocument();

    expect(screen.getByText(successfulTailoring.summary)).toBeInTheDocument();

    expect(mockedGenerateTailoringSuggestions).toHaveBeenCalledWith({
      cvText:
        "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
      jobDescription:
        "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    });
  });

  // Checks that headline and summary suggestions update the CV preview.
  test("applies and restores AI suggestions in the CV preview", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    mockedGenerateTailoringSuggestions.mockResolvedValueOnce(
      successfulTailoring,
    );

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    );

    let preview = screen.getByRole("region", {
      name: /cv preview/i,
    });

    expect(preview).toHaveTextContent(successfulStructuredCv.headline ?? "");
    expect(preview).toHaveTextContent(successfulStructuredCv.summary ?? "");

    const useButtons = await screen.findAllByRole("button", {
      name: /use suggestion/i,
    });

    await user.click(useButtons[0]);

    expect(screen.getByText(/accepted/i)).toBeInTheDocument();
    preview = screen.getByRole("region", {
      name: /cv preview/i,
    });
    expect(preview).toHaveTextContent(successfulTailoring.headline);

    const keepButtons = screen.getAllByRole("button", {
      name: /keep original/i,
    });

    await user.click(keepButtons[0]);

    expect(screen.queryByText(/accepted/i)).not.toBeInTheDocument();
    preview = screen.getByRole("region", {
      name: /cv preview/i,
    });
    expect(preview).toHaveTextContent(successfulStructuredCv.headline ?? "");

    await user.click(useButtons[1]);

    preview = screen.getByRole("region", {
      name: /cv preview/i,
    });
    expect(within(preview).getByText(successfulTailoring.summary)).toBeVisible();

    await user.click(keepButtons[1]);

    preview = screen.getByRole("region", {
      name: /cv preview/i,
    });
    expect(
      within(preview).getByText(successfulStructuredCv.summary ?? ""),
    ).toBeVisible();
  });

  // Checks that edit-mode bullet rewriting updates the selected CV bullet.
  test("rewrites and accepts an experience bullet in edit mode", async () => {
    const user = userEvent.setup();
    const jobDescription =
      "We are hiring a frontend developer with React and TypeScript experience for dashboard products.";

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);
    mockedParseCv.mockResolvedValueOnce(structuredCvWithBullets);
    mockedRewriteBullet.mockResolvedValueOnce({
      rewrittenBullet:
        "Built React frontend features for internal dashboard workflows.",
    });

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Frontend developer with React and TypeScript dashboard experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      jobDescription,
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await screen.findByRole("region", {
      name: /cv preview/i,
    });

    await user.click(
      screen.getByRole("button", {
        name: /^edit$/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /rewrite bullet: responsible for frontend tasks/i,
      }),
    );

    expect(mockedRewriteBullet).toHaveBeenCalledWith({
      bullet: "Responsible for frontend tasks.",
      cvContext: expect.stringContaining(
        "Experience: Frontend Developer Intern at Nova Digital",
      ),
      jobDescription,
    });

    const preview = screen.getByRole("region", {
      name: /cv preview/i,
    });

    expect(preview).toHaveTextContent("dashboard workflows");

    await user.click(
      screen.getByRole("button", {
        name: /accept rewritten bullet/i,
      }),
    );

    expect(preview).toHaveTextContent(
      "Built React frontend features for internal dashboard workflows.",
    );
  });

  // Checks that the CV preview can export the structured CV as a PDF.
  test("exports the structured CV as a PDF", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await screen.findByRole("region", {
      name: /cv preview/i,
    });

    await user.click(
      screen.getByRole("button", {
        name: /export pdf/i,
      }),
    );

    const exportFrame = document.querySelector("iframe");

    expect(exportFrame?.contentDocument?.body.innerHTML).toContain(
      "cv-preview-page",
    );
  });

  // Checks that requesting another version calls AI again and updates the output.
  test("regenerates AI tailoring suggestions", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    mockedGenerateTailoringSuggestions
      .mockResolvedValueOnce(successfulTailoring)
      .mockResolvedValueOnce(regeneratedTailoring);

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    );

    expect(
      await screen.findByText(successfulTailoring.headline),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /generate another version/i,
      }),
    );

    expect(
      await screen.findByText(regeneratedTailoring.headline),
    ).toBeInTheDocument();

    expect(mockedGenerateTailoringSuggestions).toHaveBeenCalledTimes(2);
  });

  // Checks that AI tailoring errors are displayed without breaking analysis results.
  test("shows an error when AI tailoring fails", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    mockedGenerateTailoringSuggestions.mockRejectedValueOnce(
      new Error("AI tailoring suggestions could not be generated."),
    );

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /cv text/i,
      }),
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI tailoring suggestions could not be generated.",
    );

    expect(screen.getByText("Analysis complete")).toBeInTheDocument();
  });

  // Checks that changing the CV removes stale AI suggestions and analysis state.
  test("resets AI suggestions when CV text changes", async () => {
    const user = userEvent.setup();

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);

    mockedGenerateTailoringSuggestions.mockResolvedValueOnce(
      successfulTailoring,
    );

    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: /paste text/i,
      }),
    );

    const cvTextarea = screen.getByRole("textbox", {
      name: /cv text/i,
    });

    await user.type(
      cvTextarea,
      "Software Engineering graduate with React, TypeScript, FastAPI and PostgreSQL experience.",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /job description/i,
      }),
      "We are hiring a Junior Full-Stack Developer with React, TypeScript and FastAPI experience.",
    );

    await user.click(
      screen.getByRole("button", {
        name: /analyse application/i,
      }),
    );

    await user.click(
      await screen.findByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    );

    expect(
      await screen.findByText(successfulTailoring.headline),
    ).toBeInTheDocument();

    await user.type(cvTextarea, " Updated");

    expect(
      screen.queryByText(successfulTailoring.headline),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    ).not.toBeInTheDocument();
  });

  // Checks that AI tailoring remains hidden when the app is in PDF mode.
  test("does not show AI tailoring in PDF mode", async () => {
    render(<App />);

    expect(screen.getByText(/upload your cv as a pdf/i)).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /tailor my cv with ai/i,
      }),
    ).not.toBeInTheDocument();
  });
});
