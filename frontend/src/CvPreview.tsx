import { Fragment, useState, type ReactNode } from "react";

import type {
  AwardItem,
  CertificationItem,
  DateRange,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  SkillGroup,
  StructuredCv,
} from "./types/cv";

interface CvPreviewProps {
  cv: StructuredCv;
  onRewriteBullet?: (request: BulletRewriteRequest) => Promise<string>;
}

interface BulletRewriteRequest {
  bullet: string;
  cvContext: string;
}

interface EditableTextProps {
  className?: string;
  editMode: boolean;
  onChange: (value: string) => void;
  value: string | null;
}

type ContactKey =
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "github"
  | "portfolio";

interface ContactItem {
  key: ContactKey;
  value: string;
}

interface ActiveBulletRewrite {
  bulletId: string;
  error: string | null;
  isLoading: boolean;
  originalBullet: string;
  rewrittenBullet: string | null;
}

interface BulletRewriteTarget {
  bullet: string;
  bulletId: string;
  entryContext: string;
}

interface DiffWord {
  status: "same" | "added" | "removed";
  value: string;
}

function formatDateRange(dates: DateRange): string | null {
  if (!dates.startDate) {
    return null;
  }

  if (!dates.endDate) {
    return dates.startDate;
  }

  return `${dates.startDate} - ${dates.endDate}`;
}

function parseDateRangeValue(value: string): DateRange {
  const [startDate, endDate] = value.split(" - ", 2);

  return {
    startDate: startDate.trim() || null,
    endDate: endDate?.trim() || null,
  };
}

function EditableText({
  className,
  editMode,
  onChange,
  value,
}: EditableTextProps) {
  if (!editMode) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      className={`cv-preview-editable ${className ?? ""}`}
      contentEditable
      onBlur={(event) => onChange(event.currentTarget.textContent ?? "")}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      suppressContentEditableWarning
    >
      {value}
    </span>
  );
}

function contactItems(cv: StructuredCv): ContactItem[] {
  return [
    { key: "email", value: cv.personalInfo.email },
    { key: "phone", value: cv.personalInfo.phone },
    { key: "location", value: cv.personalInfo.location },
    { key: "linkedin", value: cv.personalInfo.linkedin },
    { key: "github", value: cv.personalInfo.github },
    { key: "portfolio", value: cv.personalInfo.portfolio },
  ].filter((item): item is ContactItem => Boolean(item.value));
}

function hasAnyContent(items: unknown[]): boolean {
  return items.length > 0;
}

function cvContentWeight(cv: StructuredCv): number {
  return (
    cv.experience.length * 3 +
    cv.education.length * 2 +
    cv.projects.length * 3 +
    cv.skillGroups.length +
    cv.languages.length +
    cv.awards.length * 2 +
    cv.certifications.length * 2
  );
}

function shouldUseSecondPage(cv: StructuredCv): boolean {
  return cvContentWeight(cv) >= 14;
}

function compactLines(lines: Array<string | null | undefined>): string {
  return lines.filter(Boolean).join("\n");
}

function buildExperienceContext(item: ExperienceItem): string {
  return compactLines([
    `Experience: ${item.jobTitle} at ${item.company}`,
    item.location ? `Location: ${item.location}` : null,
    formatDateRange(item.dates) ? `Dates: ${formatDateRange(item.dates)}` : null,
    item.bullets.length > 0 ? `Bullets: ${item.bullets.join(" | ")}` : null,
  ]);
}

function buildProjectContext(item: ProjectItem): string {
  return compactLines([
    `Project: ${item.name}`,
    item.subtitle ? `Subtitle: ${item.subtitle}` : null,
    item.organization ? `Organization: ${item.organization}` : null,
    item.description ? `Description: ${item.description}` : null,
    item.technologies.length > 0
      ? `Technologies: ${item.technologies.join(", ")}`
      : null,
    item.bullets.length > 0 ? `Bullets: ${item.bullets.join(" | ")}` : null,
  ]);
}

function buildCvRewriteContext(
  cv: StructuredCv,
  entryContext: string,
): string {
  return compactLines([
    cv.headline ? `Headline: ${cv.headline}` : null,
    cv.summary ? `Summary: ${cv.summary}` : null,
    cv.skillGroups.length > 0
      ? `Skills: ${cv.skillGroups
          .map((group) => `${group.category}: ${group.skills.join(", ")}`)
          .join(" | ")}`
      : null,
    entryContext,
  ]);
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function diffWords(originalValue: string, rewrittenValue: string): DiffWord[] {
  const originalWords = words(originalValue);
  const rewrittenWords = words(rewrittenValue);
  const table = Array.from({ length: originalWords.length + 1 }, () =>
    Array.from({ length: rewrittenWords.length + 1 }, () => 0),
  );

  for (let originalIndex = 1; originalIndex <= originalWords.length; originalIndex += 1) {
    for (let rewrittenIndex = 1; rewrittenIndex <= rewrittenWords.length; rewrittenIndex += 1) {
      if (originalWords[originalIndex - 1] === rewrittenWords[rewrittenIndex - 1]) {
        table[originalIndex][rewrittenIndex] =
          table[originalIndex - 1][rewrittenIndex - 1] + 1;
      } else {
        table[originalIndex][rewrittenIndex] = Math.max(
          table[originalIndex - 1][rewrittenIndex],
          table[originalIndex][rewrittenIndex - 1],
        );
      }
    }
  }

  const changes: DiffWord[] = [];
  let originalIndex = originalWords.length;
  let rewrittenIndex = rewrittenWords.length;

  while (originalIndex > 0 || rewrittenIndex > 0) {
    if (
      originalIndex > 0 &&
      rewrittenIndex > 0 &&
      originalWords[originalIndex - 1] === rewrittenWords[rewrittenIndex - 1]
    ) {
      changes.unshift({
        status: "same",
        value: rewrittenWords[rewrittenIndex - 1],
      });
      originalIndex -= 1;
      rewrittenIndex -= 1;
    } else if (
      rewrittenIndex > 0 &&
      (originalIndex === 0 ||
        table[originalIndex][rewrittenIndex - 1] >=
          table[originalIndex - 1][rewrittenIndex])
    ) {
      changes.unshift({
        status: "added",
        value: rewrittenWords[rewrittenIndex - 1],
      });
      rewrittenIndex -= 1;
    } else if (originalIndex > 0) {
      changes.unshift({
        status: "removed",
        value: originalWords[originalIndex - 1],
      });
      originalIndex -= 1;
    }
  }

  return changes;
}

function CvSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="cv-preview-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function BulletDiff({
  originalBullet,
  rewrittenBullet,
}: {
  originalBullet: string;
  rewrittenBullet: string;
}) {
  const changes = diffWords(originalBullet, rewrittenBullet);

  return (
    <div className="cv-bullet-diff" aria-label="Bullet rewrite changes">
      {changes.map((change, index) => (
        <Fragment key={`${change.value}-${change.status}-${index}`}>
          <span
            className={
              change.status === "same"
                ? undefined
                : `cv-bullet-diff-${change.status}`
            }
          >
            {change.value}
          </span>
          {index < changes.length - 1 ? " " : null}
        </Fragment>
      ))}
    </div>
  );
}

function BulletRewritePanel({
  activeRewrite,
  onAccept,
  onReject,
}: {
  activeRewrite: ActiveBulletRewrite;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="cv-bullet-rewrite-panel">
      {activeRewrite.isLoading && (
        <p className="cv-bullet-rewrite-status">Rewriting bullet...</p>
      )}

      {activeRewrite.error && (
        <p className="cv-bullet-rewrite-error">{activeRewrite.error}</p>
      )}

      {activeRewrite.rewrittenBullet && (
        <div className="cv-bullet-rewrite-suggestion">
          <BulletDiff
            originalBullet={activeRewrite.originalBullet}
            rewrittenBullet={activeRewrite.rewrittenBullet}
          />

          <div className="cv-bullet-rewrite-actions">
            <button
              aria-label="Accept rewritten bullet"
              onClick={onAccept}
              type="button"
            >
              ✓
            </button>

            <button
              aria-label="Reject rewritten bullet"
              onClick={onReject}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExperienceEntry({
  activeRewrite,
  entryIndex,
  editMode,
  item,
  onAcceptRewrite,
  onChange,
  onGenerateRewrite,
  onRejectRewrite,
}: {
  activeRewrite: ActiveBulletRewrite | null;
  entryIndex: number;
  editMode: boolean;
  item: ExperienceItem;
  onAcceptRewrite: (bulletId: string, rewrittenBullet: string) => void;
  onChange: (item: ExperienceItem) => void;
  onGenerateRewrite: (target: BulletRewriteTarget) => void;
  onRejectRewrite: () => void;
}) {
  const dateRange = formatDateRange(item.dates);
  const entryContext = buildExperienceContext(item);

  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, jobTitle: value })}
              value={item.jobTitle}
            />
          </h4>

          <p>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, company: value })}
              value={item.company}
            />
          </p>
        </div>

        {dateRange && (
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({ ...item, dates: parseDateRangeValue(value) })
            }
            value={dateRange}
          />
        )}
      </div>

      {item.location && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, location: value })}
            value={item.location}
          />
        </p>
      )}

      {item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`}>
              <div className="cv-preview-bullet-row">
                <EditableText
                  editMode={editMode}
                  onChange={(value) => {
                    const bullets = [...item.bullets];
                    bullets[index] = value;
                    onChange({ ...item, bullets });
                  }}
                  value={bullet}
                />

                {editMode && (
                  <button
                    aria-label={`Rewrite bullet: ${bullet}`}
                    className="cv-bullet-ai-button"
                    onClick={() =>
                      onGenerateRewrite({
                        bullet,
                        bulletId: `experience-${entryIndex}-${index}`,
                        entryContext,
                      })
                    }
                    type="button"
                  >
                    ✦
                  </button>
                )}
              </div>

              {editMode &&
                activeRewrite?.bulletId === `experience-${entryIndex}-${index}` && (
                  <BulletRewritePanel
                    activeRewrite={activeRewrite}
                    onAccept={() => {
                      if (!activeRewrite.rewrittenBullet) {
                        return;
                      }

                      const bullets = [...item.bullets];
                      bullets[index] = activeRewrite.rewrittenBullet;
                      onChange({ ...item, bullets });
                      onAcceptRewrite(
                        `experience-${entryIndex}-${index}`,
                        activeRewrite.rewrittenBullet,
                      );
                    }}
                    onReject={onRejectRewrite}
                  />
                )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function EducationEntry({
  editMode,
  item,
  onChange,
}: {
  editMode: boolean;
  item: EducationItem;
  onChange: (item: EducationItem) => void;
}) {
  const dateRange = formatDateRange(item.dates);

  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, degree: value })}
              value={item.degree}
            />
          </h4>

          <p>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, institution: value })}
              value={item.institution}
            />
          </p>
        </div>

        {dateRange && (
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({ ...item, dates: parseDateRangeValue(value) })
            }
            value={dateRange}
          />
        )}
      </div>

      {(item.fieldOfStudy || item.location || item.description) && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, description: value })}
            value={
              [item.fieldOfStudy, item.location, item.description]
                .filter(Boolean)
                .join(" | ") || null
            }
          />
        </p>
      )}

      {item.details.length > 0 && (
        <ul>
          {item.details.map((detail, index) => (
            <li key={`${detail}-${index}`}>
              <EditableText
                editMode={editMode}
                onChange={(value) => {
                  const details = [...item.details];
                  details[index] = value;
                  onChange({ ...item, details });
                }}
                value={detail}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ProjectEntry({
  activeRewrite,
  editMode,
  item,
  onAcceptRewrite,
  onChange,
  onGenerateRewrite,
  onRejectRewrite,
  projectIndex,
}: {
  activeRewrite: ActiveBulletRewrite | null;
  editMode: boolean;
  item: ProjectItem;
  onAcceptRewrite: (bulletId: string, rewrittenBullet: string) => void;
  onChange: (item: ProjectItem) => void;
  onGenerateRewrite: (target: BulletRewriteTarget) => void;
  onRejectRewrite: () => void;
  projectIndex: number;
}) {
  const dateRange = formatDateRange(item.dates);
  const entryContext = buildProjectContext(item);

  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, name: value })}
              value={item.name}
            />
          </h4>
          {(item.subtitle || item.organization) && (
            <p>
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, subtitle: value })}
                value={item.subtitle}
              />
            </p>
          )}
        </div>

        {dateRange && (
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({ ...item, dates: parseDateRangeValue(value) })
            }
            value={dateRange}
          />
        )}
      </div>

      {(item.location || item.url) && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, url: value })}
            value={[item.location, item.url].filter(Boolean).join(" | ")}
          />
        </p>
      )}

      {item.description && (
        <p>
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, description: value })}
            value={item.description}
          />
        </p>
      )}

      {item.technologies.length > 0 && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({
                ...item,
                technologies: value
                  .split("|")
                  .map((technology) => technology.trim())
                  .filter(Boolean),
              })
            }
            value={item.technologies.join(" | ")}
          />
        </p>
      )}

      {item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`}>
              <div className="cv-preview-bullet-row">
                <EditableText
                  editMode={editMode}
                  onChange={(value) => {
                    const bullets = [...item.bullets];
                    bullets[index] = value;
                    onChange({ ...item, bullets });
                  }}
                  value={bullet}
                />

                {editMode && (
                  <button
                    aria-label={`Rewrite bullet: ${bullet}`}
                    className="cv-bullet-ai-button"
                    onClick={() =>
                      onGenerateRewrite({
                        bullet,
                        bulletId: `project-${projectIndex}-${index}`,
                        entryContext,
                      })
                    }
                    type="button"
                  >
                    ✦
                  </button>
                )}
              </div>

              {editMode &&
                activeRewrite?.bulletId === `project-${projectIndex}-${index}` && (
                  <BulletRewritePanel
                    activeRewrite={activeRewrite}
                    onAccept={() => {
                      if (!activeRewrite.rewrittenBullet) {
                        return;
                      }

                      const bullets = [...item.bullets];
                      bullets[index] = activeRewrite.rewrittenBullet;
                      onChange({ ...item, bullets });
                      onAcceptRewrite(
                        `project-${projectIndex}-${index}`,
                        activeRewrite.rewrittenBullet,
                      );
                    }}
                    onReject={onRejectRewrite}
                  />
                )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function SkillGroupEntry({
  editMode,
  item,
  onChange,
}: {
  editMode: boolean;
  item: SkillGroup;
  onChange: (item: SkillGroup) => void;
}) {
  return (
    <p className="cv-preview-compact-line">
      <strong>
        <EditableText
          editMode={editMode}
          onChange={(value) => onChange({ ...item, category: value })}
          value={item.category}
        />
      </strong>
      <EditableText
        editMode={editMode}
        onChange={(value) =>
          onChange({
            ...item,
            skills: value
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          })
        }
        value={item.skills.join(", ")}
      />
    </p>
  );
}

function LanguageEntry({
  editMode,
  item,
  onChange,
}: {
  editMode: boolean;
  item: LanguageItem;
  onChange: (item: LanguageItem) => void;
}) {
  const certification =
    item.certification && item.score
      ? `${item.certification} ${item.score}`
      : item.certification;

  return (
    <p className="cv-preview-compact-line">
      <strong>
        <EditableText
          editMode={editMode}
          onChange={(value) => onChange({ ...item, language: value })}
          value={item.language}
        />
      </strong>
      <EditableText
        editMode={editMode}
        onChange={(value) => onChange({ ...item, proficiency: value })}
        value={[item.proficiency, certification].filter(Boolean).join(" | ")}
      />
    </p>
  );
}

function AwardEntry({
  editMode,
  item,
  onChange,
}: {
  editMode: boolean;
  item: AwardItem;
  onChange: (item: AwardItem) => void;
}) {
  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, title: value })}
              value={item.title}
            />
          </h4>
          {item.organization && (
            <p>
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, organization: value })}
                value={item.organization}
              />
            </p>
          )}
        </div>

        {item.date && (
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, date: value })}
            value={item.date}
          />
        )}
      </div>

      {(item.placement || item.description) && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, description: value })}
            value={[item.placement, item.description].filter(Boolean).join(" | ")}
          />
        </p>
      )}

      {item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`}>
              <EditableText
                editMode={editMode}
                onChange={(value) => {
                  const bullets = [...item.bullets];
                  bullets[index] = value;
                  onChange({ ...item, bullets });
                }}
                value={bullet}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function CertificationEntry({
  editMode,
  item,
  onChange,
}: {
  editMode: boolean;
  item: CertificationItem;
  onChange: (item: CertificationItem) => void;
}) {
  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>
            <EditableText
              editMode={editMode}
              onChange={(value) => onChange({ ...item, name: value })}
              value={item.name}
            />
          </h4>
          {item.issuer && (
            <p>
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, issuer: value })}
                value={item.issuer}
              />
            </p>
          )}
        </div>

        {item.date && (
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, date: value })}
            value={item.date}
          />
        )}
      </div>

      {(item.credentialId || item.url) && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, credentialId: value })}
            value={[item.credentialId, item.url].filter(Boolean).join(" | ")}
          />
        </p>
      )}
    </article>
  );
}

export function CvPreview({ cv, onRewriteBullet }: CvPreviewProps) {
  const [editableCv, setEditableCv] = useState(cv);
  const [editMode, setEditMode] = useState(false);
  const [activeRewrite, setActiveRewrite] =
    useState<ActiveBulletRewrite | null>(null);
  const contacts = contactItems(editableCv);
  const useSecondPage = shouldUseSecondPage(editableCv);

  function updateCv(nextCv: StructuredCv): void {
    setEditableCv(nextCv);
  }

  async function generateRewrite(target: BulletRewriteTarget): Promise<void> {
    if (!onRewriteBullet) {
      return;
    }

    setActiveRewrite({
      bulletId: target.bulletId,
      error: null,
      isLoading: true,
      originalBullet: target.bullet,
      rewrittenBullet: null,
    });

    try {
      const rewrittenBullet = await onRewriteBullet({
        bullet: target.bullet,
        cvContext: buildCvRewriteContext(editableCv, target.entryContext),
      });

      setActiveRewrite({
        bulletId: target.bulletId,
        error: null,
        isLoading: false,
        originalBullet: target.bullet,
        rewrittenBullet,
      });
    } catch (error) {
      setActiveRewrite({
        bulletId: target.bulletId,
        error:
          error instanceof Error
            ? error.message
            : "AI bullet rewrite could not be generated.",
        isLoading: false,
        originalBullet: target.bullet,
        rewrittenBullet: null,
      });
    }
  }

  function clearRewrite(): void {
    setActiveRewrite(null);
  }

  const secondarySections = (
    <div className="cv-preview-columns">
      <div>
        {hasAnyContent(editableCv.education) && (
          <CvSection title="Education">
            <div className="cv-preview-entry-list">
              {editableCv.education.map((item, index) => (
                <EducationEntry
                  editMode={editMode}
                  item={item}
                  key={`${item.institution}-${item.degree}-${index}`}
                  onChange={(nextItem) => {
                    const education = [...editableCv.education];
                    education[index] = nextItem;
                    updateCv({ ...editableCv, education });
                  }}
                />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(editableCv.projects) && (
          <CvSection title="Projects">
            <div className="cv-preview-entry-list">
              {editableCv.projects.map((item, index) => (
                <ProjectEntry
                  activeRewrite={activeRewrite}
                  editMode={editMode}
                  item={item}
                  key={`${item.name}-${index}`}
                  onAcceptRewrite={clearRewrite}
                  onChange={(nextItem) => {
                    const projects = [...editableCv.projects];
                    projects[index] = nextItem;
                    updateCv({ ...editableCv, projects });
                  }}
                  onGenerateRewrite={generateRewrite}
                  onRejectRewrite={clearRewrite}
                  projectIndex={index}
                />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(editableCv.awards) && (
          <CvSection title="Awards">
            <div className="cv-preview-entry-list">
              {editableCv.awards.map((item, index) => (
                <AwardEntry
                  editMode={editMode}
                  item={item}
                  key={`${item.title}-${index}`}
                  onChange={(nextItem) => {
                    const awards = [...editableCv.awards];
                    awards[index] = nextItem;
                    updateCv({ ...editableCv, awards });
                  }}
                />
              ))}
            </div>
          </CvSection>
        )}
      </div>

      <aside>
        {hasAnyContent(editableCv.skillGroups) && (
          <CvSection title="Skills">
            <div className="cv-preview-compact-list">
              {editableCv.skillGroups.map((item, index) => (
                <SkillGroupEntry
                  editMode={editMode}
                  item={item}
                  key={`${item.category}-${index}`}
                  onChange={(nextItem) => {
                    const skillGroups = [...editableCv.skillGroups];
                    skillGroups[index] = nextItem;
                    updateCv({ ...editableCv, skillGroups });
                  }}
                />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(editableCv.languages) && (
          <CvSection title="Languages">
            <div className="cv-preview-compact-list">
              {editableCv.languages.map((item, index) => (
                <LanguageEntry
                  editMode={editMode}
                  item={item}
                  key={`${item.language}-${index}`}
                  onChange={(nextItem) => {
                    const languages = [...editableCv.languages];
                    languages[index] = nextItem;
                    updateCv({ ...editableCv, languages });
                  }}
                />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(editableCv.certifications) && (
          <CvSection title="Certifications">
            <div className="cv-preview-entry-list">
              {editableCv.certifications.map((item, index) => (
                <CertificationEntry
                  editMode={editMode}
                  item={item}
                  key={`${item.name}-${index}`}
                  onChange={(nextItem) => {
                    const certifications = [...editableCv.certifications];
                    certifications[index] = nextItem;
                    updateCv({ ...editableCv, certifications });
                  }}
                />
              ))}
            </div>
          </CvSection>
        )}
      </aside>
    </div>
  );

  return (
    <section className="cv-preview-shell" aria-label="CV preview">
      <div
        className={`cv-preview-pages ${
          useSecondPage ? "cv-preview-pages-paged" : ""
        }`}
      >
        <article className="cv-preview-page">
          <header className="cv-preview-header">
            <div>
              <h2>
                <EditableText
                  editMode={editMode}
                  onChange={(value) =>
                    updateCv({
                      ...editableCv,
                      personalInfo: {
                        ...editableCv.personalInfo,
                        fullName: value,
                      },
                    })
                  }
                  value={editableCv.personalInfo.fullName ?? "Untitled CV"}
                />
              </h2>
              {editableCv.headline && (
                <p>
                  <EditableText
                    editMode={editMode}
                    onChange={(value) =>
                      updateCv({
                        ...editableCv,
                        headline: value,
                      })
                    }
                    value={editableCv.headline}
                  />
                </p>
              )}
            </div>

            {contacts.length > 0 && (
              <ul aria-label="Contact details">
                {contacts.map((item) => (
                  <li key={item.key}>
                    <EditableText
                      editMode={editMode}
                      onChange={(value) =>
                        updateCv({
                          ...editableCv,
                          personalInfo: {
                            ...editableCv.personalInfo,
                            [item.key]: value,
                          },
                        })
                      }
                      value={item.value}
                    />
                  </li>
                ))}
              </ul>
            )}
          </header>

          {editableCv.summary && (
            <CvSection title="Profile">
              <p>
                <EditableText
                  editMode={editMode}
                  onChange={(value) =>
                    updateCv({
                      ...editableCv,
                      summary: value,
                    })
                  }
                  value={editableCv.summary}
                />
              </p>
            </CvSection>
          )}

          {hasAnyContent(editableCv.experience) && (
            <CvSection title="Experience">
              <div className="cv-preview-entry-list">
                {editableCv.experience.map((item, index) => (
                  <ExperienceEntry
                    activeRewrite={activeRewrite}
                    entryIndex={index}
                    editMode={editMode}
                    item={item}
                    key={`${item.company}-${item.jobTitle}-${index}`}
                    onAcceptRewrite={clearRewrite}
                    onChange={(nextItem) => {
                      const experience = [...editableCv.experience];
                      experience[index] = nextItem;
                      updateCv({ ...editableCv, experience });
                    }}
                    onGenerateRewrite={generateRewrite}
                    onRejectRewrite={clearRewrite}
                  />
                ))}
              </div>
            </CvSection>
          )}

          {!useSecondPage && secondarySections}
        </article>

        {useSecondPage && (
          <article className="cv-preview-page cv-preview-page-continuation">
            {secondarySections}
          </article>
        )}
      </div>

      <div className="cv-preview-actions">
        <button
          type="button"
          onClick={() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }

            setEditMode((currentValue) => !currentValue);
          }}
        >
          {editMode ? "Save changes" : "Edit"}
        </button>
      </div>
    </section>
  );
}
