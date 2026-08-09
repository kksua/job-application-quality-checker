import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import App from "./App";
import { analysePdfApplication, analyseTextApplication } from "./api/analysis";
import type { AnalysisResponse } from "./types/analysis";

vi.mock("./api/analysis", () => ({
  analyseTextApplication: vi.fn(),
  analysePdfApplication: vi.fn(),
}));

const mockedAnalyseTextApplication = vi.mocked(analyseTextApplication);

const mockedAnalysePdfApplication = vi.mocked(analysePdfApplication);

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

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  test("starts in PDF mode without calling the PDF API", () => {
    render(<App />);

    expect(screen.getByText(/upload your cv as a pdf/i)).toBeInTheDocument();

    expect(mockedAnalysePdfApplication).not.toHaveBeenCalled();
  });
});
