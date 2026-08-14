import { useRef, useState } from "react";

import { analysePdfApplication, analyseTextApplication } from "./api/analysis";
import { parseCv } from "./api/cv";
import { generateTailoringSuggestions, rewriteBullet } from "./api/tailoring";
import { CvPreview } from "./CvPreview";
import type { AnalysisResponse, TailoringResponse } from "./types/analysis";
import type { StructuredCv } from "./types/cv";

import "./App.css";

type CvInputMode = "text" | "pdf";

function App() {
  const [cvInputMode, setCvInputMode] = useState<CvInputMode>("pdf");

  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(
    null,
  );

  const [structuredCv, setStructuredCv] = useState<StructuredCv | null>(null);

  const [originalStructuredCv, setOriginalStructuredCv] =
    useState<StructuredCv | null>(null);

  const [parserMessage, setParserMessage] = useState<string | null>(null);

  const [parserMessageIsError, setParserMessageIsError] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tailoringResult, setTailoringResult] =
    useState<TailoringResponse | null>(null);

  const [isTailoring, setIsTailoring] = useState(false);

  const [tailoringError, setTailoringError] = useState<string | null>(null);

  const [useSuggestedHeadline, setUseSuggestedHeadline] = useState(false);

  const [useSuggestedSummary, setUseSuggestedSummary] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resultsRef = useRef<HTMLElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setAnalysisResult(null);
    setStructuredCv(null);
    setOriginalStructuredCv(null);
    setParserMessage(null);
    setParserMessageIsError(false);
    resetTailoring();
  }

  function removeFile(): void {
    setSelectedFile(null);
    setAnalysisResult(null);
    setStructuredCv(null);
    setOriginalStructuredCv(null);
    setParserMessage(null);
    setParserMessageIsError(false);
    resetTailoring();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetTailoring(): void {
    setTailoringResult(null);
    setTailoringError(null);
    setUseSuggestedHeadline(false);
    setUseSuggestedSummary(false);
  }

  function resetResults(): void {
    setAnalysisResult(null);
    setStructuredCv(null);
    setOriginalStructuredCv(null);
    setParserMessage(null);
    setParserMessageIsError(false);
    resetTailoring();
  }

  async function handleAnalyse(): Promise<void> {
    setErrorMessage(null);
    setAnalysisResult(null);
    setStructuredCv(null);
    setOriginalStructuredCv(null);
    setParserMessage(null);
    setParserMessageIsError(false);
    resetTailoring();

    if (jobDescription.trim().length < 20) {
      setErrorMessage(
        "Please enter a job description containing at least 20 characters.",
      );
      return;
    }

    if (cvInputMode === "text" && cvText.trim().length < 20) {
      setErrorMessage(
        "Please enter CV text containing at least 20 characters.",
      );
      return;
    }

    if (cvInputMode === "pdf" && !selectedFile) {
      setErrorMessage("Please upload a PDF CV.");
      return;
    }

    try {
      setIsLoading(true);

      if (cvInputMode === "text") {
        const result = await analyseTextApplication({
          cvText,
          jobDescription,
        });

        setAnalysisResult(result);

        try {
          const parsedCv = await parseCv({
            cvText,
            jobDescription,
          });

          setStructuredCv(parsedCv);
          setOriginalStructuredCv(parsedCv);
          setParserMessage(null);
          setParserMessageIsError(false);
        } catch (error) {
          console.error("Structured CV parsing failed:", error);

          setStructuredCv(null);
          setOriginalStructuredCv(null);
          setParserMessage(
            "We analysed your application, but could not build the editable CV preview from this CV text.",
          );
          setParserMessageIsError(true);
        }
      } else {
        const result = await analysePdfApplication(
          selectedFile as File,
          jobDescription,
        );

        setAnalysisResult(result);
        setParserMessage(
          "Structured CV preview is available for pasted CV text. PDF uploads can still be analysed below.",
        );
        setParserMessageIsError(false);
      }

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The application could not be analysed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateTailoring(): Promise<void> {
    setTailoringError(null);
    setUseSuggestedHeadline(false);
    setUseSuggestedSummary(false);

    try {
      setIsTailoring(true);

      const result = await generateTailoringSuggestions({
        cvText,
        jobDescription,
      });

      setTailoringResult(result);
    } catch (error) {
      setTailoringError(
        error instanceof Error
          ? error.message
          : "AI tailoring suggestions could not be generated.",
      );
    } finally {
      setIsTailoring(false);
    }
  }

  function useTailoredHeadline(): void {
    if (!tailoringResult) {
      return;
    }

    setStructuredCv((currentCv) =>
      currentCv ? { ...currentCv, headline: tailoringResult.headline } : null,
    );
    setUseSuggestedHeadline(true);
  }

  function keepOriginalHeadline(): void {
    setStructuredCv((currentCv) =>
      currentCv
        ? { ...currentCv, headline: originalStructuredCv?.headline ?? null }
        : null,
    );
    setUseSuggestedHeadline(false);
  }

  function useTailoredSummary(): void {
    if (!tailoringResult) {
      return;
    }

    setStructuredCv((currentCv) =>
      currentCv ? { ...currentCv, summary: tailoringResult.summary } : null,
    );
    setUseSuggestedSummary(true);
  }

  function keepOriginalSummary(): void {
    setStructuredCv((currentCv) =>
      currentCv
        ? { ...currentCv, summary: originalStructuredCv?.summary ?? null }
        : null,
    );
    setUseSuggestedSummary(false);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <h1>Analyse your application</h1>

        <p>
          Paste your CV and job description to reveal your match score, ATS
          readiness, skill gaps, and writing issues in seconds.
        </p>
      </section>

      <section className="workspace">
        <div className="input-grid">
          <section className="input-panel">
            <div className="section-heading-row input-panel-header">
              <h2>Your CV</h2>

              <div className="input-toggle" aria-label="Choose CV input method">
                <button
                  type="button"
                  className={cvInputMode === "text" ? "active" : ""}
                  onClick={() => {
                    setCvInputMode("text");
                    resetResults();
                  }}
                >
                  Paste Text
                </button>

                <button
                  type="button"
                  className={cvInputMode === "pdf" ? "active" : ""}
                  onClick={() => {
                    setCvInputMode("pdf");
                    resetResults();
                  }}
                >
                  Upload PDF
                </button>
              </div>
            </div>

            {cvInputMode === "pdf" ? (
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  hidden
                />

                <div className="upload-icon" aria-hidden="true">
                  ▤
                </div>

                {selectedFile ? (
                  <>
                    <p className="upload-file-name">{selectedFile.name}</p>

                    <p className="upload-helper">Click to replace</p>

                    <button
                      type="button"
                      className="remove-file-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFile();
                      }}
                    >
                      × Remove
                    </button>
                  </>
                ) : (
                  <>
                    <p className="upload-file-name">Upload your CV as a PDF</p>

                    <p className="upload-helper">
                      Click to browse or drag your file here
                    </p>

                    <p className="upload-limit">Maximum file size: 5 MB</p>
                  </>
                )}
              </div>
            ) : (
              <textarea
                className="large-textarea"
                value={cvText}
                onChange={(event) => {
                  setCvText(event.target.value);
                  resetResults();
                }}
                placeholder="Paste your CV text here..."
                aria-label="CV text"
              />
            )}
          </section>

          <section className="input-panel">
            <div className="section-heading-row input-panel-header">
              <h2>Job Description</h2>
            </div>

            <textarea
              className="large-textarea"
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                resetResults();
              }}
              placeholder="Paste the complete job description here..."
              aria-label="Job description"
            />
          </section>
        </div>

        <button
          type="button"
          className="analyse-button"
          onClick={handleAnalyse}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner" aria-hidden="true" />
              Analysing your application...
            </>
          ) : (
            "Analyse Application"
          )}
        </button>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
      </section>

      {analysisResult && (
        <section ref={resultsRef} className="results-section">
          <div className="analysis-success">
            <div className="analysis-success-icon" aria-hidden="true">
              ✓
            </div>

            <div>
              <strong>Analysis complete</strong>

              <p>
                Your CV has been compared with the job description. Review your
                results below.
              </p>
            </div>
          </div>

          <div className="score-grid">
            <article className="score-card score-card-wide">
              <div
                className="score-circle"
                style={
                  {
                    "--score": `${analysisResult.match_score * 3.6}deg`,
                  } as React.CSSProperties
                }
              >
                <div className="score-circle-inner">
                  <span>{analysisResult.match_score}%</span>
                </div>
              </div>

              <p>Job Match</p>

              <div
                className="score-circle"
                style={
                  {
                    "--score": `${analysisResult.ats_readiness_score * 3.6}deg`,
                  } as React.CSSProperties
                }
              >
                <div className="score-circle-inner">
                  <span>{analysisResult.ats_readiness_score}%</span>
                </div>
              </div>

              <p>ATS Ready</p>
            </article>

            <article className="metric-card">
              <p>Matched Skills</p>

              <strong>{analysisResult.matching_skills.length}</strong>
            </article>

            <article className="metric-card">
              <p>Missing Skills</p>

              <strong className="error-text">
                {analysisResult.missing_skills.length}
              </strong>
            </article>
          </div>

          <section className="score-breakdown-card">
            <div className="score-breakdown-header">
              <div>
                <p className="score-breakdown-eyebrow">Score Breakdown</p>

                <h2>How your match score was calculated</h2>
              </div>

              <span className="score-breakdown-total">
                {analysisResult.match_score}%
              </span>
            </div>

            <div className="score-breakdown-list">
              {[
                {
                  label: "Technical Skills",
                  value: analysisResult.score_breakdown.technical_skills,
                },
                {
                  label: "Experience Relevance",
                  value: analysisResult.score_breakdown.experience_relevance,
                },
                {
                  label: "Role Alignment",
                  value: analysisResult.score_breakdown.role_alignment,
                },
                {
                  label: "Education & Qualifications",
                  value:
                    analysisResult.score_breakdown.education_qualifications,
                },
                {
                  label: "Location & Eligibility",
                  value: analysisResult.score_breakdown.location_eligibility,
                },
              ].map(({ label, value }) => (
                <div className="score-breakdown-row" key={label}>
                  <div className="score-breakdown-row-top">
                    <div>
                      <strong>{label}</strong>

                      <span>Weight {value.weight}%</span>
                    </div>

                    <strong className="criterion-score">
                      {value.score === null
                        ? "Not enough information"
                        : `${value.score}%`}
                    </strong>
                  </div>

                  <div
                    className={`criterion-progress ${
                      value.score === null ? "unknown" : ""
                    }`}
                    aria-label={`${label} score`}
                  >
                    <div
                      className="criterion-progress-fill"
                      style={{
                        width: `${value.score ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {cvInputMode === "text" && (
            <section className="ai-tailoring-card">
              <div className="ai-tailoring-header">
                <div>
                  <h2>Tailor your CV for this role</h2>

                  <p className="ai-tailoring-description">
                    Generate a job-specific headline and professional summary
                    using only information already present in your CV.
                  </p>
                </div>

                {!tailoringResult && (
                  <button
                    type="button"
                    className="ai-tailoring-button"
                    onClick={handleGenerateTailoring}
                    disabled={isTailoring}
                  >
                    {isTailoring ? (
                      <>
                        <span className="loading-spinner" aria-hidden="true" />
                        Tailoring your CV...
                      </>
                    ) : (
                      "Tailor my CV with AI"
                    )}
                  </button>
                )}
              </div>

              {tailoringError && (
                <p className="form-error" role="alert">
                  {tailoringError}
                </p>
              )}

              {tailoringResult && (
                <div className="ai-suggestions">
                  <article className="ai-suggestion-card">
                    <div className="ai-suggestion-title">
                      <div>
                        <span>Suggested headline</span>

                        <h3>{tailoringResult.headline}</h3>
                      </div>

                      {useSuggestedHeadline && (
                        <span className="accepted-badge">✓ Accepted</span>
                      )}
                    </div>

                    <div className="ai-suggestion-actions">
                      <button
                        type="button"
                        className={
                          useSuggestedHeadline
                            ? "suggestion-button secondary"
                            : "suggestion-button"
                        }
                        onClick={useTailoredHeadline}
                      >
                        Use suggestion
                      </button>

                      <button
                        type="button"
                        className="suggestion-button secondary"
                        onClick={keepOriginalHeadline}
                      >
                        Keep original
                      </button>
                    </div>
                  </article>

                  <article className="ai-suggestion-card">
                    <div className="ai-suggestion-title">
                      <div>
                        <span>Suggested professional summary</span>

                        <p className="suggested-summary">
                          {tailoringResult.summary}
                        </p>
                      </div>

                      {useSuggestedSummary && (
                        <span className="accepted-badge">✓ Accepted</span>
                      )}
                    </div>

                    <div className="ai-suggestion-actions">
                      <button
                        type="button"
                        className={
                          useSuggestedSummary
                            ? "suggestion-button secondary"
                            : "suggestion-button"
                        }
                        onClick={useTailoredSummary}
                      >
                        Use suggestion
                      </button>

                      <button
                        type="button"
                        className="suggestion-button secondary"
                        onClick={keepOriginalSummary}
                      >
                        Keep original
                      </button>
                    </div>
                  </article>

                  <button
                    type="button"
                    className="regenerate-button"
                    onClick={handleGenerateTailoring}
                    disabled={isTailoring}
                  >
                    {isTailoring
                      ? "Regenerating..."
                      : "↻ Generate another version"}
                  </button>
                </div>
              )}
            </section>
          )}

          {structuredCv ? (
            <CvPreview
              cv={structuredCv}
              key={`${structuredCv.headline ?? ""}:${structuredCv.summary ?? ""}`}
              onRewriteBullet={async ({ bullet, cvContext }) => {
                const result = await rewriteBullet({
                  bullet,
                  cvContext,
                  jobDescription,
                });

                return result.rewrittenBullet;
              }}
            />
          ) : (
            <section
              className="cv-preview-empty"
              role={parserMessageIsError ? "alert" : "status"}
            >
              <h2>Structured CV preview unavailable</h2>

              <p>
                {parserMessage ??
                  "No editable CV preview is available for this analysis."}
              </p>
            </section>
          )}
          <div className="result-panels">
            <details open>
              <summary>
                <span>Matching Skills</span>

                <small>{analysisResult.matching_skills.length}</small>
              </summary>

              <div className="panel-content tag-list">
                {analysisResult.matching_skills.length > 0 ? (
                  analysisResult.matching_skills.map((skill) => (
                    <span className="skill-tag" key={skill}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <p>No matching skills detected.</p>
                )}
              </div>
            </details>

            <details open>
              <summary>
                <span>Missing Skills</span>

                <small>{analysisResult.missing_skills.length}</small>
              </summary>

              <div className="panel-content tag-list">
                {analysisResult.missing_skills.length > 0 ? (
                  analysisResult.missing_skills.map((skill) => (
                    <span className="skill-tag missing" key={skill}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <p>No missing skills detected. Great coverage!</p>
                )}
              </div>
            </details>

            <details>
              <summary>
                <span>Vague Phrases</span>

                <small>{analysisResult.vague_phrases.length}</small>
              </summary>

              <div className="panel-content">
                {analysisResult.vague_phrases.length > 0 ? (
                  <ul className="issue-list">
                    {analysisResult.vague_phrases.map((phrase) => (
                      <li key={phrase}>{phrase}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No vague phrases detected.</p>
                )}
              </div>
            </details>

            <details>
              <summary>
                <span>Repeated Words</span>

                <small>
                  {Object.keys(analysisResult.repeated_words).length}
                </small>
              </summary>

              <div className="panel-content">
                {Object.keys(analysisResult.repeated_words).length > 0 ? (
                  <ul className="issue-list">
                    {Object.entries(analysisResult.repeated_words).map(
                      ([word, count]) => (
                        <li key={word}>
                          {word}: {count} times
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p>No problematic repetitions detected.</p>
                )}
              </div>
            </details>

            <details>
              <summary>
                <span>Bullet Issues</span>

                <small>{analysisResult.bullet_issues.length}</small>
              </summary>

              <div className="panel-content">
                {analysisResult.bullet_issues.length > 0 ? (
                  <div className="issue-group">
                    {analysisResult.bullet_issues.map((item) => (
                      <article className="issue-card" key={item.bullet}>
                        <strong>{item.bullet}</strong>

                        <ul className="issue-list">
                          {item.issues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No bullet issues detected.</p>
                )}
              </div>
            </details>

            <details>
              <summary>
                <span>ATS Issues</span>

                <small>{analysisResult.ats_issues.length}</small>
              </summary>

              <div className="panel-content">
                {analysisResult.ats_issues.length > 0 ? (
                  <div className="issue-group">
                    {analysisResult.ats_issues.map((issue, index) => (
                      <article
                        className={`issue-card severity-${issue.severity}`}
                        key={`${issue.category}-${index}`}
                      >
                        <strong>{issue.category}</strong>

                        <p>{issue.message}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No ATS issues detected.</p>
                )}
              </div>
            </details>

            <details>
              <summary>
                <span>Passed Checks</span>

                <small>{analysisResult.ats_passed_checks.length}</small>
              </summary>

              <div className="panel-content">
                {analysisResult.ats_passed_checks.length > 0 ? (
                  <ul className="issue-list passed-list">
                    {analysisResult.ats_passed_checks.map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No passed checks returned.</p>
                )}
              </div>
            </details>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
