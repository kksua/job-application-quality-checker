import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import App from "./App";
import { CvPreview } from "./CvPreview";
import { paginateCvSections } from "./cvPagination";
import { analysePdfApplication, analyseTextApplication } from "./api/analysis";
import { parseCv } from "./api/cv";
import {
  converseAboutCv,
  generateTailoringSuggestions,
} from "./api/tailoring";
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
  converseAboutCv: vi.fn(),
  generateTailoringSuggestions: vi.fn(),
  rewriteBullet: vi.fn(),
}));

const mockedAnalyseTextApplication = vi.mocked(analyseTextApplication);

const mockedAnalysePdfApplication = vi.mocked(analysePdfApplication);

const mockedParseCv = vi.mocked(parseCv);

const mockedGenerateTailoringSuggestions = vi.mocked(
  generateTailoringSuggestions,
);

const mockedConverseAboutCv = vi.mocked(converseAboutCv);

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

const weirdStructuredCv = {
  personalInfo: {
    fullName: "Long URL Candidate",
    email: "long@example.com",
    phone: null,
    location: null,
    linkedin:
      "https://www.linkedin.com/in/this-is-an-extremely-long-profile-url-that-should-wrap-without-breaking-the-a4-preview-layout",
    github: null,
    portfolio:
      "https://portfolio.example.com/projects/some-very-long-project-slug-that-keeps-going-and-going-and-should-not-overflow-the-page",
    photoUrl: null,
  },
  headline:
    "Full-Stack Software Engineering Graduate With A Very Long Headline Covering React TypeScript FastAPI PostgreSQL Cloud APIs Automation Developer Experience And Product Delivery",
  summary: "Builds full-stack applications and parser tooling.",
  experience: [
    {
      company: "Duplicate Company",
      jobTitle: "Software Engineer",
      location: "Paris, France",
      dates: {
        startDate: "2025",
        endDate: null,
      },
      bullets: Array.from(
        { length: 18 },
        () =>
          "Built the same repeated bullet with a veryveryveryveryverylongtoken that must wrap correctly.",
      ),
    },
    {
      company: "Duplicate Company",
      jobTitle: "Software Engineer",
      location: "Paris, France",
      dates: {
        startDate: "2025",
        endDate: null,
      },
      bullets: null,
    },
  ],
  education: null,
  projects: [
    {
      name: "Duplicate Project",
      subtitle: null,
      organization: null,
      location: null,
      dates: {
        startDate: "2026",
        endDate: null,
      },
      description: null,
      bullets: ["Repeated project bullet.", "Repeated project bullet."],
      technologies: ["React", "React"],
      url: "https://github.com/example/really-really-really-long-repository-name-that-needs-wrapping",
    },
    {
      name: "Duplicate Project",
      subtitle: null,
      organization: null,
      location: null,
      dates: {
        startDate: "2026",
        endDate: null,
      },
      description: null,
      bullets: ["Repeated project bullet."],
      technologies: null,
      url: null,
    },
  ],
  skillGroups: [
    {
      category: "Tools",
      skills: ["Docker", "Docker"],
    },
    {
      category: "Tools",
      skills: null,
    },
  ],
  awards: [],
  certifications: [],
  languages: [],
} as unknown as StructuredCv;

describe("App", () => {
  test("paginates overflowing sections without moving the sidebar under main content", () => {
    const pages = paginateCvSections({
      sectionOrder: ["profile", "skills", "experience"],
      availableSections: ["profile", "skills", "experience"],
      hiddenSections: [],
      placements: {
        profile: "main",
        experience: "main",
        education: "main",
        projects: "main",
        skills: "sidebar",
        languages: "main",
        awards: "main",
        certifications: "main",
      },
      wideSections: [],
      sectionHeights: {
        profile: 360,
        skills: 480,
        experience: 240,
      },
      pageBodyHeight: 500,
      usesSidebar: true,
    });

    expect(pages).toEqual([
      { main: ["profile"], sidebar: ["skills"] },
      { main: ["experience"], sidebar: [] },
    ]);
  });

  test("edits CV section layout and design in the preview", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    render(
      <CvPreview
        controlsHost={controlsHost}
        cv={successfulStructuredCv}
        onCvChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Edit CV and layout" }),
    );

    const preview = screen.getByRole("region", { name: /cv preview/i });
    expect(preview.querySelector('[data-section="profile"]')).toBeInTheDocument();
    const pages = preview.querySelector(".cv-preview-pages") as HTMLElement;
    expect(window.getComputedStyle(pages).display).toBe("flex");
    expect(window.getComputedStyle(pages).overflowX).toBe("auto");
    const a4Page = preview.querySelector(".cv-preview-page") as HTMLElement;
    expect(window.getComputedStyle(a4Page).width).toBe("210mm");
    expect(window.getComputedStyle(a4Page).height).toBe("297mm");

    await user.click(
      within(controlsHost).getByRole("button", {
        name: "More Profile options",
      }),
    );
    expect(
      within(controlsHost).getAllByRole("menuitem"),
    ).toHaveLength(2);
    fireEvent.pointerDown(document.body);
    expect(within(controlsHost).queryByRole("menu")).not.toBeInTheDocument();
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "More Profile options",
      }),
    );
    await user.click(
      within(controlsHost).getByRole("menuitem", {
        name: "Move Profile to sidebar",
      }),
    );
    expect(
      preview.querySelector('[data-section="profile"]'),
    ).toHaveAttribute("data-placement", "sidebar");
    expect(
      preview
        .querySelector('[data-section="profile"]')
        ?.closest(".cv-preview-sidebar"),
    ).toBeInTheDocument();

    await user.click(
      within(controlsHost).getByRole("button", { name: "Hide Profile" }),
    );
    expect(preview.querySelector('[data-section="profile"]')).not.toBeInTheDocument();
    await user.click(
      within(controlsHost).getByRole("button", { name: "Show Profile" }),
    );
    expect(preview.querySelector('[data-section="profile"]')).toBeInTheDocument();

    const profileRow = within(controlsHost)
      .getByRole("textbox", { name: "Rename Profile section" })
      .closest(".cv-section-control") as HTMLElement;
    const experienceRow = within(controlsHost)
      .getByRole("textbox", { name: "Rename Experience section" })
      .closest(".cv-section-control") as HTMLElement;
    const dataTransfer = {
      effectAllowed: "none",
      setData: vi.fn(),
    };
    fireEvent.dragStart(profileRow, { dataTransfer });
    fireEvent.drop(experienceRow, { dataTransfer });
    expect(
      Array.from(
        controlsHost.querySelectorAll<HTMLInputElement>(
          'input[aria-label^="Rename"]',
        ),
      )
        .slice(0, 2)
        .map((input) => input.value),
    ).toEqual(["Experience", "Profile"]);
    await user.click(
      within(controlsHost).getByRole("button", { name: "Undo last CV edit" }),
    );
    expect(
      Array.from(
        controlsHost.querySelectorAll<HTMLInputElement>(
          'input[aria-label^="Rename"]',
        ),
      )
        .slice(0, 2)
        .map((input) => input.value),
    ).toEqual(["Profile", "Experience"]);

    fireEvent.change(screen.getByRole("slider", { name: "Sidebar width" }), {
      target: { value: "36" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Text size" }), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Line spacing" }), {
      target: { value: "1.7" },
    });

    const sectionLayout = preview.querySelector(
      ".cv-preview-columns",
    ) as HTMLElement;
    expect(sectionLayout.style.gridTemplateColumns).toBe(
      "minmax(0, 64fr) minmax(0, 36fr)",
    );
    expect(sectionLayout.style.zoom).toBe(String(10 / 12));
    expect(sectionLayout.style.getPropertyValue("--cv-line-spacing")).toBe(
      "1.7",
    );
    controlsHost.remove();
  });

  test("formats, renames, deletes, and undoes section edits", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let currentCv = structuredCvWithBullets;
    const { rerender } = render(
      <CvPreview
        controlsHost={controlsHost}
        cv={currentCv}
        onCvChange={onCvChange}
      />,
    );
    const rerenderWithLatestCv = () => {
      currentCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
      rerender(
        <CvPreview
          controlsHost={controlsHost}
          cv={currentCv}
          onCvChange={onCvChange}
        />,
      );
    };
    await user.click(
      screen.getByRole("button", { name: "Edit CV and layout" }),
    );
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Experience items",
      }),
    );
    expect(
      within(controlsHost).queryByRole("button", { name: /Move item .* (up|down)/ }),
    ).not.toBeInTheDocument();
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Edit Experience entry 1",
      }),
    );
    const summaryField = within(controlsHost).getByRole("textbox", {
      name: "Description bullets",
    });
    const toolbar = summaryField.closest(".cv-rich-text-editor") as HTMLElement;
    expect(
      within(toolbar).getAllByRole("button", { name: /^Align / }),
    ).toHaveLength(4);
    expect(
      within(controlsHost)
        .getByRole("textbox", { name: "Role" })
        .closest(".cv-rich-text-editor"),
    ).toBeNull();
    await user.click(within(toolbar).getByRole("button", { name: "Bold text" }));
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: [
          expect.objectContaining({
            bullets: ["<strong>Responsible for frontend tasks.</strong>"],
          }),
        ],
      }),
    );
    rerenderWithLatestCv();
    const refreshedToolbar = within(controlsHost)
      .getByRole("textbox", { name: "Description bullets" })
      .closest(".cv-rich-text-editor") as HTMLElement;
    await user.click(
      within(refreshedToolbar).getByRole("button", { name: "Italic text" }),
    );
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: [
          expect.objectContaining({
            bullets: ["<em><strong>Responsible for frontend tasks.</strong></em>"],
          }),
        ],
      }),
    );
    rerenderWithLatestCv();
    const italicToolbar = within(controlsHost)
      .getByRole("textbox", { name: "Description bullets" })
      .closest(".cv-rich-text-editor") as HTMLElement;
    await user.click(
      within(italicToolbar).getByRole("button", { name: "Align justify" }),
    );
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: [
          expect.objectContaining({
            bullets: ['<div style="text-align:justify"><em><strong>Responsible for frontend tasks.</strong></em></div>'],
          }),
        ],
      }),
    );
    rerenderWithLatestCv();
    const justifiedToolbar = within(controlsHost)
      .getByRole("textbox", { name: "Description bullets" })
      .closest(".cv-rich-text-editor") as HTMLElement;
    expect(
      within(justifiedToolbar).getByRole("button", { name: "Align justify" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(
      within(controlsHost).getByRole("button", { name: "Undo last CV edit" }),
    );
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: [
          expect.objectContaining({
            bullets: ["<em><strong>Responsible for frontend tasks.</strong></em>"],
          }),
        ],
      }),
    );
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Profile items",
      }),
    );
    const profileText = within(controlsHost).getByRole("textbox", {
      name: "Profile text",
    });
    const profileToolbar = profileText.closest(
      ".cv-rich-text-editor",
    ) as HTMLElement;
    expect(
      within(profileToolbar).getByRole("button", { name: "Bold text" }),
    ).toBeInTheDocument();
    expect(
      within(profileToolbar).getByRole("button", { name: "Align justify" }),
    ).toBeInTheDocument();
    await user.click(
      within(profileToolbar).getByRole("button", { name: "Bold text" }),
    );
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        summary: `<strong>${structuredCvWithBullets.summary}</strong>`,
      }),
    );

    const renameField = within(controlsHost).getByRole("textbox", {
      name: "Rename Profile section",
    });
    fireEvent.change(renameField, { target: { value: "About me" } });
    expect(
      screen.getByRole("heading", { name: "About me" }),
    ).toBeInTheDocument();
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "More About me options",
      }),
    );
    await user.click(
      within(controlsHost).getByRole("menuitem", {
        name: "Delete About me section",
      }),
    );
    expect(window.confirm).toHaveBeenCalled();
    expect(
      screen.getByRole("region", { name: /cv preview/i }).querySelector(
        '[data-section="profile"]',
      ),
    ).not.toBeInTheDocument();
    await user.click(
      within(controlsHost).getByRole("button", { name: "Undo last CV edit" }),
    );
    expect(
      screen.getByRole("region", { name: /cv preview/i }).querySelector(
        '[data-section="profile"]',
      ),
    ).toBeInTheDocument();
    controlsHost.remove();
  });

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

  // Checks that structured parser failures are visible without blocking results.
  test("shows a structured CV parser failure message", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);
    mockedParseCv.mockRejectedValueOnce(
      new Error("The structured parser failed."),
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

    expect(await screen.findByText("Analysis complete")).toBeInTheDocument();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We analysed your application, but could not build the editable CV preview from this CV text.",
    );

    expect(
      screen.queryByRole("region", {
        name: /cv preview/i,
      }),
    ).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  // Checks messy parser output does not crash or create duplicate-key warnings.
  test("handles long CV content and weird parser output in the preview", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);
    mockedParseCv.mockResolvedValueOnce(weirdStructuredCv);

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

    const preview = await screen.findByRole("region", {
      name: /cv preview/i,
    });

    expect(preview).toHaveTextContent("Long URL Candidate");
    expect(preview).toHaveTextContent(
      "this-is-an-extremely-long-profile-url",
    );
    expect(
      within(preview).getByRole("link", {
        name: /long@example\.com/i,
      }),
    ).toHaveAttribute("href", "mailto:long@example.com");
    expect(
      within(preview).getByRole("link", {
        name: /this-is-an-extremely-long-profile-url/i,
      }),
    ).toHaveAttribute("href", weirdStructuredCv.personalInfo.linkedin);
    expect(
      within(preview).getByRole("link", {
        name: /portfolio\.example\.com/i,
      }),
    ).toHaveAttribute("href", weirdStructuredCv.personalInfo.portfolio);
    expect(preview.querySelector(".cv-preview-pages-dense")).not.toBeNull();
    expect(preview.querySelectorAll(".cv-preview-page")).toHaveLength(1);
    expect(preview).toHaveTextContent(
      "Built the same repeated bullet with a veryveryveryveryverylongtoken that must wrap correctly.",
    );
    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        String(call[0]).includes("Encountered two children with the same key"),
      ),
    ).toBe(false);

    consoleErrorSpy.mockRestore();
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

  // Checks that experience entries open individually and update their bullets.
  test("edits experience bullets from the section editor", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const cvWithTwoExperienceEntries = {
      ...structuredCvWithBullets,
      experience: [
        {
          ...structuredCvWithBullets.experience[0],
          bullets: [
            ...structuredCvWithBullets.experience[0].bullets,
            "Collaborated with product designers.",
          ],
        },
        {
          ...structuredCvWithBullets.experience[0],
          jobTitle: "Senior Frontend Developer",
        },
      ],
    };
    render(
      <CvPreview
        controlsHost={controlsHost}
        cv={cvWithTwoExperienceEntries}
        onCvChange={onCvChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Experience items",
      }),
    );
    expect(
      within(controlsHost).getAllByRole("button", {
        name: /^Edit Experience entry \d+$/,
      }),
    ).toHaveLength(2);
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Edit Experience entry 1",
      }),
    );
    const firstExperienceCard = controlsHost.querySelector(
      ".cv-editor-entry-card",
    ) as HTMLElement;
    const bulletField = within(firstExperienceCard).getByRole("textbox", {
      name: "Description bullets",
    });
    expect(bulletField).toHaveValue(
      "• Responsible for frontend tasks.\n• Collaborated with product designers.",
    );
    fireEvent.change(bulletField, {
      target: {
        value:
          "Built React frontend features for dashboard workflows.\nWorked with product designers.",
      },
    });

    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: expect.arrayContaining([
          expect.objectContaining({
            bullets: [
              "Built React frontend features for dashboard workflows.",
              "Worked with product designers.",
            ],
          }),
        ]),
      }),
    );
    controlsHost.remove();
  });

  test("keeps project bullets together and previews ordered lists", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const { rerender } = render(
      <CvPreview
        controlsHost={controlsHost}
        cv={structuredCvWithBullets}
        onCvChange={onCvChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Projects items",
      }),
    );
    const bulletsField = within(controlsHost).getByRole("textbox", {
      name: "Description bullets",
    });
    expect(bulletsField).toHaveValue("• Built parser features.");
    const numberedButton = within(
      bulletsField.closest(".cv-rich-text-editor") as HTMLElement,
    ).getByRole("button", { name: "Numbered list" });
    await user.click(numberedButton);

    const numberedCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
    expect(numberedCv.projects[0].bullets).toEqual([
      "<ol><li>Built parser features.</li></ol>",
    ]);
    rerender(
      <CvPreview
        controlsHost={controlsHost}
        cv={numberedCv}
        onCvChange={onCvChange}
      />,
    );
    const numberedBulletsField = within(controlsHost).getByRole("textbox", {
      name: "Description bullets",
    });
    expect(numberedBulletsField).toHaveValue("1. Built parser features.");
    fireEvent.change(numberedBulletsField, {
      target: {
        value:
          "1. Improved parser features.\n2. Added ATS scoring.",
      },
    });
    const updatedNumberedCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
    expect(updatedNumberedCv.projects[0].bullets).toEqual([
      "<ol><li>Improved parser features.</li><li>Added ATS scoring.</li></ol>",
    ]);
    rerender(
      <CvPreview
        controlsHost={controlsHost}
        cv={updatedNumberedCv}
        onCvChange={onCvChange}
      />,
    );
    const preview = screen.getByRole("region", { name: /cv preview/i });
    const previewNumberedList = preview.querySelector(
      ".cv-preview-numbered-list ol",
    );
    expect(previewNumberedList).toHaveTextContent(
      "Improved parser features.Added ATS scoring.",
    );
    expect(previewNumberedList?.querySelectorAll("li")).toHaveLength(2);
    controlsHost.remove();
  });

  test("adds and removes experience entries from the section editor", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const { rerender } = render(
      <CvPreview
        controlsHost={controlsHost}
        cv={structuredCvWithBullets}
        onCvChange={onCvChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Experience items",
      }),
    );
    await user.click(
      within(controlsHost).getByRole("button", { name: "+ Add experience" }),
    );
    const addedCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
    expect(addedCv.experience).toHaveLength(2);
    rerender(
      <CvPreview
        controlsHost={controlsHost}
        cv={addedCv}
        onCvChange={onCvChange}
      />,
    );
    await user.click(
      within(controlsHost).getByRole("button", { name: "Delete item 2" }),
    );
    expect(onCvChange.mock.lastCall?.[0].experience).toHaveLength(1);
    controlsHost.remove();
  });

  test("reorders projects by dragging their collapsed summary rows", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const cv: StructuredCv = {
      ...structuredCvWithBullets,
      projects: [
        ...structuredCvWithBullets.projects,
        {
          ...structuredCvWithBullets.projects[0],
          name: "Portfolio Website",
        },
      ],
    };
    render(
      <CvPreview controlsHost={controlsHost} cv={cv} onCvChange={onCvChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Projects items",
      }),
    );
    const cards = controlsHost.querySelectorAll(".cv-editor-entry-card");
    const summaries = controlsHost.querySelectorAll(
      ".cv-editor-entry-card > summary[draggable=true]",
    );
    expect(cards).toHaveLength(2);
    expect(summaries).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("draggable", "true");
    expect(cards[0].querySelector(".cv-editor-entry-card-body"))
      .not.toHaveAttribute("draggable", "true");
    expect(cards[0].querySelector(".cv-editor-item-drag"))
      .toHaveAttribute("draggable", "true");
    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      getData: vi.fn(() => "projects:0"),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };
    fireEvent.dragStart(summaries[0], { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "projects:0");
    expect(dataTransfer.setDragImage).toHaveBeenCalled();
    fireEvent.dragOver(summaries[1], { dataTransfer });
    expect(dataTransfer.dropEffect).toBe("move");
    fireEvent.drop(summaries[1], { dataTransfer });
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projects: [
          expect.objectContaining({ name: "Portfolio Website" }),
          expect.objectContaining({ name: "AI Resume Checker" }),
        ],
      }),
    );
    controlsHost.remove();
  });

  test("reorders section items when dropped on an expanded card body", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const cv: StructuredCv = {
      ...structuredCvWithBullets,
      experience: [
        ...structuredCvWithBullets.experience,
        {
          ...structuredCvWithBullets.experience[0],
          jobTitle: "Second Role",
        },
      ],
    };
    render(
      <CvPreview controlsHost={controlsHost} cv={cv} onCvChange={onCvChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Experience items",
      }),
    );
    const cards = controlsHost.querySelectorAll(
      ".cv-editor-entry-card[draggable=true]",
    );
    const bodies = controlsHost.querySelectorAll(".cv-editor-entry-card-body");
    expect(cards).toHaveLength(2);
    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      getData: vi.fn(() => "experience:0"),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };
    fireEvent.dragStart(cards[0], { dataTransfer });
    expect(cards[0]).toHaveClass("dragging");
    fireEvent.dragOver(bodies[1], { dataTransfer });
    expect(dataTransfer.dropEffect).toBe("move");
    fireEvent.drop(bodies[1], { dataTransfer });
    expect(onCvChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: [
          expect.objectContaining({ jobTitle: "Second Role" }),
          expect.objectContaining({
            jobTitle: structuredCvWithBullets.experience[0].jobTitle,
          }),
        ],
      }),
    );
    fireEvent.dragEnd(cards[0], { dataTransfer });
    expect(cards[0]).not.toHaveClass("dragging");
    controlsHost.remove();
  });

  test("reorders collapsed rows independently in every CV entry section", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const cv: StructuredCv = {
      ...structuredCvWithBullets,
      experience: [
        ...structuredCvWithBullets.experience,
        { ...structuredCvWithBullets.experience[0], jobTitle: "Role Two" },
      ],
      education: [
        {
          ...structuredCvWithBullets.education[0],
          degree: "Degree One",
          institution: "School One",
        },
        {
          ...structuredCvWithBullets.education[0],
          degree: "Degree Two",
          institution: "School Two",
        },
      ],
      projects: [
        ...structuredCvWithBullets.projects,
        { ...structuredCvWithBullets.projects[0], name: "Project Two" },
      ],
      skillGroups: [
        { category: "Skills One", skills: ["React"] },
        { category: "Skills Two", skills: ["TypeScript"] },
      ],
      languages: [
        { language: "Language One", proficiency: null, certification: null, score: null },
        { language: "Language Two", proficiency: null, certification: null, score: null },
      ],
      awards: [
        {
          title: "Award One", organization: null, date: null, placement: null,
          description: null, bullets: [],
        },
        {
          title: "Award Two", organization: null, date: null, placement: null,
          description: null, bullets: [],
        },
      ],
      certifications: [
        { name: "Certificate One", issuer: null, date: null, credentialId: null, url: null },
        { name: "Certificate Two", issuer: null, date: null, credentialId: null, url: null },
      ],
    };
    const { unmount } = render(
      <CvPreview controlsHost={controlsHost} cv={cv} onCvChange={onCvChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    const sections: Array<{
      id: string;
      label: string;
      firstValue: (cv: StructuredCv) => string;
      expected: string;
    }> = [
      { id: "experience", label: "Experience", firstValue: (value) => value.experience[0].jobTitle, expected: "Role Two" },
      { id: "education", label: "Education", firstValue: (value) => value.education[0].degree, expected: "Degree Two" },
      { id: "projects", label: "Projects", firstValue: (value) => value.projects[0].name, expected: "Project Two" },
      { id: "skills", label: "Skills", firstValue: (value) => value.skillGroups[0].category, expected: "Skills Two" },
      { id: "languages", label: "Languages", firstValue: (value) => value.languages[0].language, expected: "Language Two" },
      { id: "awards", label: "Awards", firstValue: (value) => value.awards[0].title, expected: "Award Two" },
      { id: "certifications", label: "Certifications", firstValue: (value) => value.certifications[0].name, expected: "Certificate Two" },
    ];
    let transferData = "";
    const dataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      getData: () => transferData,
      setData: (_type: string, value: string) => {
        transferData = value;
      },
      setDragImage: vi.fn(),
    };

    for (const section of sections) {
      await user.click(
        within(controlsHost).getByRole("button", {
          name: `Expand ${section.label} items`,
        }),
      );
      const source = controlsHost.querySelector(
        `summary[data-drag-key="${section.id}:0"]`,
      );
      const target = controlsHost.querySelector(
        `summary[data-drag-key="${section.id}:1"]`,
      );
      expect(source).not.toBeNull();
      expect(target).not.toBeNull();
      fireEvent.dragStart(source as HTMLElement, { dataTransfer });
      fireEvent.dragOver(target as HTMLElement, { dataTransfer });
      fireEvent.drop(target as HTMLElement, { dataTransfer });
      expect(section.firstValue(onCvChange.mock.lastCall?.[0] as StructuredCv))
        .toBe(section.expected);
    }

    unmount();
    controlsHost.remove();
  });

  test("supports editable skill chips and linked project titles", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const cv: StructuredCv = {
      ...structuredCvWithBullets,
      projects: [
        { ...structuredCvWithBullets.projects[0], url: "https://example.com" },
      ],
      skillGroups: [{ category: "Technical", skills: ["React"] }],
    };
    const { rerender } = render(
      <CvPreview controlsHost={controlsHost} cv={cv} onCvChange={onCvChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", { name: "Expand Skills items" }),
    );
    expect(
      controlsHost.querySelector(".cv-editor-entry-card"),
    ).not.toHaveAttribute("open");
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "+ Add skill category",
      }),
    );
    const categoryCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
    expect(categoryCv.skillGroups).toHaveLength(2);
    rerender(
      <CvPreview
        controlsHost={controlsHost}
        cv={categoryCv}
        onCvChange={onCvChange}
      />,
    );
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Edit Skill category 1",
      }),
    );
    const skillInput = within(controlsHost).getByRole("textbox", {
      name: "Add a skill to Technical",
    });
    await user.type(skillInput, "TypeScript");
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Add skill to Technical",
      }),
    );
    const updatedCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
    expect(updatedCv.skillGroups[0].skills).toEqual(["React", "TypeScript"]);
    rerender(
      <CvPreview
        controlsHost={controlsHost}
        cv={updatedCv}
        onCvChange={onCvChange}
      />,
    );
    expect(
      within(controlsHost).getByRole("button", {
        name: "Delete skill TypeScript",
      }),
    ).toBeInTheDocument();
    expect(
      within(controlsHost).getByText("TypeScript").closest("[draggable=true]"),
    ).not.toBeNull();

    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Projects items",
      }),
    );
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Edit Project entry 1",
      }),
    );
    await user.click(
      within(controlsHost).getByRole("checkbox", {
        name: "Link title to project URL",
      }),
    );
    expect(
      screen.getByRole("link", { name: "AI Resume Checker" }),
    ).toHaveAttribute("href", "https://example.com/");
    expect(screen.queryByText("https://example.com")).not.toBeInTheDocument();
    controlsHost.remove();
  });

  test("keeps numbered experience descriptions as ordered lists in the preview", async () => {
    const user = userEvent.setup();
    const controlsHost = document.createElement("div");
    document.body.append(controlsHost);
    const onCvChange = vi.fn();
    const { rerender } = render(
      <CvPreview
        controlsHost={controlsHost}
        cv={structuredCvWithBullets}
        onCvChange={onCvChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit CV and layout" }));
    await user.click(
      within(controlsHost).getByRole("button", {
        name: "Expand Experience items",
      }),
    );
    const field = within(controlsHost).getByRole("textbox", {
      name: "Description bullets",
    });
    await user.click(
      within(field.closest(".cv-rich-text-editor") as HTMLElement).getByRole(
        "button",
        { name: "Numbered list" },
      ),
    );
    const numberedCv = onCvChange.mock.lastCall?.[0] as StructuredCv;
    expect(numberedCv.experience[0].bullets).toEqual([
      "<ol><li>Responsible for frontend tasks.</li></ol>",
    ]);
    rerender(
      <CvPreview
        controlsHost={controlsHost}
        cv={numberedCv}
        onCvChange={onCvChange}
      />,
    );
    expect(
      screen.getByRole("region", { name: /cv preview/i }).querySelector(
        ".cv-preview-numbered-list ol",
      ),
    ).toHaveTextContent("Responsible for frontend tasks.");
    controlsHost.remove();
  });

  test("updates the live CV from conversation suggestions", async () => {
    const user = userEvent.setup();
    const jobDescription =
      "We are hiring a software engineer with React and FastAPI experience.";
    const updatedCv = {
      ...successfulStructuredCv,
      summary: "A concise software engineering summary focused on React.",
    };

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);
    mockedConverseAboutCv.mockResolvedValueOnce({
      reply: "I made the summary more concise and highlighted React.",
      cv: updatedCv,
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));
    await user.type(
      screen.getByRole("textbox", { name: /cv text/i }),
      "Software engineer with React and FastAPI experience.",
    );
    await user.type(
      screen.getByRole("textbox", { name: /job description/i }),
      jobDescription,
    );
    await user.click(
      screen.getByRole("button", { name: /analyse application/i }),
    );

    const preview = await screen.findByRole("region", { name: /cv preview/i });
    const editor = screen.getByRole("region", {
      name: /cv editing conversation/i,
    });
    expect(within(editor).getByText(/hi, i’m emma/i)).toBeInTheDocument();
    expect(
      within(editor).getByText(/job matching, and safe cv edits only/i),
    ).toBeInTheDocument();
    expect(editor.querySelector(".cv-conversation-messages")).toHaveStyle({
      overflowY: "auto",
    });

    await user.click(
      screen.getByRole("button", { name: "Edit CV and layout" }),
    );
    expect(preview.querySelector('[contenteditable="true"]')).toBeNull();
    expect(preview.querySelectorAll("textarea, input").length).toBe(0);
    expect(
      preview.querySelectorAll("textarea.cv-preview-editable").length,
    ).toBe(0);
    await user.click(
      screen.getByRole("button", { name: "Expand Profile items" }),
    );
    const summaryField = screen.getByRole("textbox", { name: /profile text/i });
    await user.clear(summaryField);
    await user.type(summaryField, "Software engineer with hands-on React work.");

    await user.type(
      within(editor).getByRole("textbox", { name: /your cv edit request/i }),
      "Make my summary more concise and highlight React.",
    );
    await user.click(
      within(editor).getByRole("button", { name: /send suggestion/i }),
    );

    expect(
      within(preview).getByText("Software engineer with hands-on React work."),
    ).toBeVisible();
    expect(
      await within(editor).findByText(
        "I made the summary more concise and highlighted React.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(editor).getByRole("button", {
        name: /apply suggested cv changes/i,
      }),
    );
    expect(
      within(preview).getByText(updatedCv.summary),
    ).toBeVisible();
    expect(mockedConverseAboutCv).toHaveBeenCalledWith({
      cv: {
        ...successfulStructuredCv,
        summary: "Software engineer with hands-on React work.",
      },
      jobDescription,
      messages: [
        {
          role: "user",
          content: "Make my summary more concise and highlight React.",
        },
      ],
    });
  });

  test("does not show apply controls for unchanged conversation responses", async () => {
    const user = userEvent.setup();
    const jobDescription =
      "We are hiring a software engineer with React and FastAPI experience.";

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);
    mockedConverseAboutCv.mockResolvedValueOnce({
      reply: (
        "I can only help with this CV, its job-match quality, and safe "
        + "structure-preserving edits. I left the CV unchanged."
      ),
      cv: successfulStructuredCv,
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));
    await user.type(
      screen.getByRole("textbox", { name: /cv text/i }),
      "Software engineer with React and FastAPI experience.",
    );
    await user.type(
      screen.getByRole("textbox", { name: /job description/i }),
      jobDescription,
    );
    await user.click(
      screen.getByRole("button", { name: /analyse application/i }),
    );

    const editor = await screen.findByRole("region", {
      name: /cv editing conversation/i,
    });
    await user.type(
      within(editor).getByRole("textbox", { name: /your cv edit request/i }),
      "Tell me a joke.",
    );
    await user.click(
      within(editor).getByRole("button", { name: /send suggestion/i }),
    );

    expect(
      await within(editor).findByText(/i can only help with this cv/i),
    ).toBeInTheDocument();
    expect(
      within(editor).queryByText(/suggested update/i),
    ).not.toBeInTheDocument();
    expect(
      within(editor).queryByRole("button", {
        name: /apply suggested cv changes/i,
      }),
    ).not.toBeInTheDocument();
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
      screen.getByRole("button", { name: "Edit CV and layout" }),
    );
    const templateButtons = screen.getAllByRole("button", {
      name: /^(classic|modern|minimal|executive|creative|compact)$/i,
    });
    expect(templateButtons).toHaveLength(6);
    await user.click(
      screen.getByRole("button", {
        name: /executive/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /export pdf/i,
      }),
    );

    const preview = screen.getByRole("region", { name: /cv preview/i });
    expect(preview.querySelectorAll(".cv-preview-page")).toHaveLength(1);
    expect(preview.querySelector(".cv-preview-pages")).toHaveAttribute(
      "data-template",
      "executive",
    );
    const exportFrame = document.querySelector("iframe");

    expect(exportFrame?.contentDocument?.body.innerHTML).toContain(
      "cv-preview-page",
    );
    expect(exportFrame?.contentDocument?.body.innerHTML).toContain(
      'data-template="executive"',
    );
    expect(exportFrame?.contentDocument?.body.innerHTML).toContain(
      'href="mailto:jane@example.com"',
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

  // Checks that stale parser messages are cleared after input changes.
  test("clears parser messages when CV text changes", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    mockedAnalyseTextApplication.mockResolvedValue(successfulAnalysis);
    mockedParseCv.mockRejectedValueOnce(
      new Error("The structured parser failed."),
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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not build the editable CV preview",
    );

    await user.type(cvTextarea, " Updated");

    expect(
      screen.queryByText(/could not build the editable cv preview/i),
    ).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
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
