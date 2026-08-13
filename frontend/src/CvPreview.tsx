import type { ReactNode } from "react";

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

function contactItems(cv: StructuredCv): string[] {
  return [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.github,
    cv.personalInfo.portfolio,
  ].filter((item): item is string => Boolean(item));
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

function ExperienceEntry({ item }: { item: ExperienceItem }) {
  const dateRange = formatDateRange(item.dates);

  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>{item.jobTitle}</h4>
          <p>{item.company}</p>
        </div>

        {dateRange && <span>{dateRange}</span>}
      </div>

      {item.location && <p className="cv-preview-meta">{item.location}</p>}

      {item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function EducationEntry({ item }: { item: EducationItem }) {
  const dateRange = formatDateRange(item.dates);

  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>{item.degree}</h4>
          <p>{item.institution}</p>
        </div>

        {dateRange && <span>{dateRange}</span>}
      </div>

      {(item.fieldOfStudy || item.location || item.description) && (
        <p className="cv-preview-meta">
          {[item.fieldOfStudy, item.location, item.description]
            .filter(Boolean)
            .join(" | ")}
        </p>
      )}

      {item.details.length > 0 && (
        <ul>
          {item.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ProjectEntry({ item }: { item: ProjectItem }) {
  const dateRange = formatDateRange(item.dates);

  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>{item.name}</h4>
          {(item.subtitle || item.organization) && (
            <p>
              {[item.subtitle, item.organization].filter(Boolean).join(" | ")}
            </p>
          )}
        </div>

        {dateRange && <span>{dateRange}</span>}
      </div>

      {(item.location || item.url) && (
        <p className="cv-preview-meta">
          {[item.location, item.url].filter(Boolean).join(" | ")}
        </p>
      )}

      {item.description && <p>{item.description}</p>}

      {item.technologies.length > 0 && (
        <p className="cv-preview-meta">{item.technologies.join(" | ")}</p>
      )}

      {item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function SkillGroupEntry({ item }: { item: SkillGroup }) {
  return (
    <p className="cv-preview-compact-line">
      <strong>{item.category}</strong>
      <span>{item.skills.join(", ")}</span>
    </p>
  );
}

function LanguageEntry({ item }: { item: LanguageItem }) {
  const certification =
    item.certification && item.score
      ? `${item.certification} ${item.score}`
      : item.certification;

  return (
    <p className="cv-preview-compact-line">
      <strong>{item.language}</strong>
      <span>{[item.proficiency, certification].filter(Boolean).join(" | ")}</span>
    </p>
  );
}

function AwardEntry({ item }: { item: AwardItem }) {
  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>{item.title}</h4>
          {item.organization && <p>{item.organization}</p>}
        </div>

        {item.date && <span>{item.date}</span>}
      </div>

      {(item.placement || item.description) && (
        <p className="cv-preview-meta">
          {[item.placement, item.description].filter(Boolean).join(" | ")}
        </p>
      )}

      {item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function CertificationEntry({ item }: { item: CertificationItem }) {
  return (
    <article className="cv-preview-entry">
      <div className="cv-preview-entry-heading">
        <div>
          <h4>{item.name}</h4>
          {item.issuer && <p>{item.issuer}</p>}
        </div>

        {item.date && <span>{item.date}</span>}
      </div>

      {(item.credentialId || item.url) && (
        <p className="cv-preview-meta">
          {[item.credentialId, item.url].filter(Boolean).join(" | ")}
        </p>
      )}
    </article>
  );
}

export function CvPreview({ cv }: CvPreviewProps) {
  const contacts = contactItems(cv);
  const useSecondPage = shouldUseSecondPage(cv);
  const secondarySections = (
    <div className="cv-preview-columns">
      <div>
        {hasAnyContent(cv.education) && (
          <CvSection title="Education">
            <div className="cv-preview-entry-list">
              {cv.education.map((item, index) => (
                <EducationEntry
                  item={item}
                  key={`${item.institution}-${item.degree}-${index}`}
                />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(cv.projects) && (
          <CvSection title="Projects">
            <div className="cv-preview-entry-list">
              {cv.projects.map((item, index) => (
                <ProjectEntry item={item} key={`${item.name}-${index}`} />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(cv.awards) && (
          <CvSection title="Awards">
            <div className="cv-preview-entry-list">
              {cv.awards.map((item, index) => (
                <AwardEntry item={item} key={`${item.title}-${index}`} />
              ))}
            </div>
          </CvSection>
        )}
      </div>

      <aside>
        {hasAnyContent(cv.skillGroups) && (
          <CvSection title="Skills">
            <div className="cv-preview-compact-list">
              {cv.skillGroups.map((item) => (
                <SkillGroupEntry item={item} key={item.category} />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(cv.languages) && (
          <CvSection title="Languages">
            <div className="cv-preview-compact-list">
              {cv.languages.map((item) => (
                <LanguageEntry item={item} key={item.language} />
              ))}
            </div>
          </CvSection>
        )}

        {hasAnyContent(cv.certifications) && (
          <CvSection title="Certifications">
            <div className="cv-preview-entry-list">
              {cv.certifications.map((item, index) => (
                <CertificationEntry item={item} key={`${item.name}-${index}`} />
              ))}
            </div>
          </CvSection>
        )}
      </aside>
    </div>
  );

  return (
    <section
      className={`cv-preview-shell ${
        useSecondPage ? "cv-preview-shell-paged" : ""
      }`}
      aria-label="CV preview"
    >
      <article className="cv-preview-page">
        <header className="cv-preview-header">
          <div>
            <h2>{cv.personalInfo.fullName ?? "Untitled CV"}</h2>
            {cv.headline && <p>{cv.headline}</p>}
          </div>

          {contacts.length > 0 && (
            <ul aria-label="Contact details">
              {contacts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </header>

        {cv.summary && (
          <CvSection title="Profile">
            <p>{cv.summary}</p>
          </CvSection>
        )}

        {hasAnyContent(cv.experience) && (
          <CvSection title="Experience">
            <div className="cv-preview-entry-list">
              {cv.experience.map((item, index) => (
                <ExperienceEntry
                  item={item}
                  key={`${item.company}-${item.jobTitle}-${index}`}
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
    </section>
  );
}
