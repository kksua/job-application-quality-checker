import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { exportPreviewPdf } from "./cvExport";
import {
  paginateCvSections,
  type CvSectionId,
  type SectionPlacement,
} from "./cvPagination";
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
  onCvChange: (cv: StructuredCv) => void;
  controlsHost?: HTMLDivElement | null;
  onRewriteBullet?: (request: BulletRewriteRequest) => Promise<string>;
}

function projectBulletsFromEditor(value: string): string[] {
  const safeValue = safeRichHtml(value);
  const doc = new DOMParser().parseFromString(safeValue, "text/html");
  if (doc.body.querySelector("ol")) {
    return [safeValue];
  }
  return formattedTextLines(safeValue);
}

function listTypeForBullets(bullets: string[]): ListStyle {
  return bullets.some((bullet) => /<ol(\s|>)/i.test(bullet))
    ? "number"
    : "bullet";
}

function moveEntry<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const reordered = [...items];
  const [entry] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, entry);
  return reordered;
}

interface CvEntryDragState {
  collectionId: string;
  index: number;
}

function CvEditorItemActions({
  index,
  onDelete,
}: {
  index: number;
  onDelete: () => void;
}) {
  return (
    <div
      className="cv-editor-item-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        aria-label={`Delete item ${index + 1}`}
        className="cv-editor-item-delete"
        onClick={(event) => {
          event.preventDefault();
          onDelete();
        }}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M4 6h12M8 6V4h4v2m3 0-.7 10H5.7L5 6m3 3v4m4-4v4" />
        </svg>
      </button>
    </div>
  );
}

function CvEditorSkillChips({
  category,
  onChange,
  skills,
}: {
  category: string;
  onChange: (skills: string[]) => void;
  skills: string[];
}) {
  const [newSkill, setNewSkill] = useState("");
  const [draggedSkill, setDraggedSkill] = useState<number | null>(null);

  function moveSkill(fromIndex: number, toIndex: number): void {
    onChange(moveEntry(skills, fromIndex, toIndex));
  }

  function addSkill(): void {
    const skill = newSkill.trim();
    if (!skill) return;
    onChange([...skills, skill]);
    setNewSkill("");
  }

  return (
    <div className="cv-editor-skill-field">
      <span className="cv-editor-skill-label">Skills</span>
      <div className="cv-editor-skill-chips">
        {skills.map((skill, index) => (
          <span
            className="cv-editor-skill-chip"
            draggable
            key={`${skill}-${index}`}
            onDragEnd={() => setDraggedSkill(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedSkill(index)}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedSkill !== null) moveSkill(draggedSkill, index);
              setDraggedSkill(null);
            }}
          >
            <span>{skill}</span>
            <button
              aria-label={`Delete skill ${skill}`}
              onClick={() => onChange(skills.filter((_, itemIndex) => itemIndex !== index))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="cv-editor-add-skill">
        <input
          aria-label={`Add a skill to ${category}`}
          onChange={(event) => setNewSkill(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder="Add a skill"
          value={newSkill}
        />
        <button
          aria-label={`Add skill to ${category}`}
          onClick={addSkill}
          type="button"
        >
          Add
        </button>
      </div>
    </div>
  );
}

const CV_TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
  { id: "executive", label: "Executive" },
  { id: "creative", label: "Creative" },
  { id: "compact", label: "Compact" },
] as const;

type CvTemplate = (typeof CV_TEMPLATES)[number]["id"];

const CV_SECTIONS: Array<{ id: CvSectionId; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "languages", label: "Languages" },
  { id: "awards", label: "Awards" },
  { id: "certifications", label: "Certifications" },
];
const SECTION_LABELS = Object.fromEntries(
  CV_SECTIONS.map(({ id, label }) => [id, label]),
) as Record<CvSectionId, string>;

const TEMPLATES_WITH_SIDEBAR = new Set<CvTemplate>([
  "modern",
  "executive",
  "creative",
  "compact",
]);

function defaultSectionPlacements(
  template: CvTemplate,
): Record<CvSectionId, SectionPlacement> {
  const useSidebar = TEMPLATES_WITH_SIDEBAR.has(template);
  const sidebarSections: CvSectionId[] = [
    "skills",
    "languages",
    "certifications",
    "awards",
  ];

  return Object.fromEntries(
    CV_SECTIONS.map(({ id }) => [
      id,
      useSidebar && sidebarSections.includes(id) ? "sidebar" : "main",
    ]),
  ) as Record<CvSectionId, SectionPlacement>;
}

interface BulletRewriteRequest {
  bullet: string;
  cvContext: string;
}

interface EditableTextProps {
  ariaLabel?: string;
  className?: string;
  defaultList?: ListStyle;
  editMode: boolean;
  onChange: (value: string) => void;
  showListMarkers?: boolean;
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
  value: string | null;
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

const LINK_PATTERN = /(https?:\/\/[^\s|]+|www\.[^\s|]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

function linkHref(value: string): string {
  if (value.includes("@") && !value.toLowerCase().startsWith("http")) {
    return `mailto:${value}`;
  }

  if (value.toLowerCase().startsWith("www.")) {
    return `https://${value}`;
  }

  return value;
}

function LinkifiedText({
  className,
  value,
}: {
  className?: string;
  value: string | null;
}) {
  if (!value) {
    return <span className={className}>{value}</span>;
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  value.replace(LINK_PATTERN, (match, _captured: string, offset: number) => {
    if (offset > lastIndex) {
      parts.push(value.slice(lastIndex, offset));
    }

    parts.push(
      <a
        className="cv-preview-link"
        href={linkHref(match)}
        key={`${match}-${offset}`}
        rel="noreferrer"
        target="_blank"
      >
        {match}
      </a>,
    );
    lastIndex = offset + match.length;

    return match;
  });

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

// Coerces malformed parser fields into safe strings for rendering.
function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function textOrFallback(value: unknown, fallback: string): string {
  return textOrNull(value) ?? fallback;
}

function listOfText(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => textOrNull(item))
        .filter((item): item is string => item !== null)
    : [];
}

function listOfObjects<T>(value: unknown, mapper: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(mapper) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeDates(value: unknown): DateRange {
  const source = record(value);

  return {
    startDate: textOrNull(source.startDate),
    endDate: textOrNull(source.endDate),
  };
}

// Shields the preview from partial or weird parser output without changing backend schemas.
function normalizeStructuredCv(cv: StructuredCv): StructuredCv {
  const source = record(cv);
  const personalInfo = record(source.personalInfo);

  return {
    personalInfo: {
      fullName: textOrNull(personalInfo.fullName),
      email: textOrNull(personalInfo.email),
      phone: textOrNull(personalInfo.phone),
      location: textOrNull(personalInfo.location),
      linkedin: textOrNull(personalInfo.linkedin),
      github: textOrNull(personalInfo.github),
      portfolio: textOrNull(personalInfo.portfolio),
      photoUrl: textOrNull(personalInfo.photoUrl),
    },
    headline: textOrNull(source.headline),
    summary: textOrNull(source.summary),
    experience: listOfObjects(source.experience, (item) => {
      const entry = record(item);

      return {
        company: textOrFallback(entry.company, "Unknown company"),
        jobTitle: textOrFallback(entry.jobTitle, "Untitled role"),
        location: textOrNull(entry.location),
        dates: normalizeDates(entry.dates),
        bullets: listOfText(entry.bullets),
      };
    }),
    education: listOfObjects(source.education, (item) => {
      const entry = record(item);

      return {
        institution: textOrFallback(entry.institution, "Unknown institution"),
        degree: textOrFallback(entry.degree, "Untitled education"),
        fieldOfStudy: textOrNull(entry.fieldOfStudy),
        location: textOrNull(entry.location),
        dates: normalizeDates(entry.dates),
        description: textOrNull(entry.description),
        details: listOfText(entry.details),
      };
    }),
    projects: listOfObjects(source.projects, (item) => {
      const entry = record(item);

      return {
        name: textOrFallback(entry.name, "Untitled project"),
        subtitle: textOrNull(entry.subtitle),
        organization: textOrNull(entry.organization),
        location: textOrNull(entry.location),
        dates: normalizeDates(entry.dates),
        description: textOrNull(entry.description),
        bullets: listOfText(entry.bullets),
        technologies: listOfText(entry.technologies),
        url: textOrNull(entry.url),
      };
    }),
    skillGroups: listOfObjects(source.skillGroups, (item) => {
      const entry = record(item);

      return {
        category: textOrFallback(entry.category, "Skills"),
        skills: listOfText(entry.skills),
      };
    }),
    awards: listOfObjects(source.awards, (item) => {
      const entry = record(item);

      return {
        title: textOrFallback(entry.title, "Untitled award"),
        organization: textOrNull(entry.organization),
        date: textOrNull(entry.date),
        placement: textOrNull(entry.placement),
        description: textOrNull(entry.description),
        bullets: listOfText(entry.bullets),
      };
    }),
    certifications: listOfObjects(source.certifications, (item) => {
      const entry = record(item);

      return {
        name: textOrFallback(entry.name, "Untitled certification"),
        issuer: textOrNull(entry.issuer),
        date: textOrNull(entry.date),
        credentialId: textOrNull(entry.credentialId),
        url: textOrNull(entry.url),
      };
    }),
    languages: listOfObjects(source.languages, (item) => {
      const entry = record(item);

      return {
        language: textOrFallback(entry.language, "Language"),
        proficiency: textOrNull(entry.proficiency),
        certification: textOrNull(entry.certification),
        score: textOrNull(entry.score),
      };
    }),
  };
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

type TextAlignment = "left" | "center" | "right" | "justify";
type ListStyle = "none" | "bullet" | "number";

interface TextFormat {
  alignment: TextAlignment;
  bold: boolean;
  italic: boolean;
  list: ListStyle;
}

type EditorUndoState =
  | { type: "cv"; value: StructuredCv }
  | {
      type: "delete";
      value: { cv: StructuredCv; hiddenSections: CvSectionId[] };
    }
  | { type: "hidden"; value: CvSectionId[] }
  | { type: "order"; value: CvSectionId[] }
  | { type: "titles"; value: Record<CvSectionId, string> }
  | { type: "wide"; value: CvSectionId[] }
  | { type: "template"; value: CvTemplate }
  | {
      type: "design";
      value: { sidebarWidth: number; fontSize: number; lineSpacing: number };
    }
  | {
      type: "placements";
      value: Record<CvSectionId, SectionPlacement>;
    };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textFormat(value: string): TextFormat {
  return {
    alignment: value.match(/text-align:\s*(center|right|justify)/)?.[1] as
      | TextAlignment
      | undefined ?? "left",
    bold: /<(strong|b)(\s|>)/i.test(value),
    italic: /<(em|i)(\s|>)/i.test(value),
    list: /<ol(\s|>)/i.test(value)
      ? "number"
      : /<ul(\s|>)/i.test(value)
        ? "bullet"
        : "none",
  };
}

function plainText(value: string): string {
  if (!/<[a-z][\s\S]*>/i.test(value)) return value;
  const doc = new DOMParser().parseFromString(value, "text/html");
  const lines: string[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      lines.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === "LI") {
      lines.push(`${node.textContent ?? ""}\n`);
      return;
    }
    if (node.tagName === "BR") {
      lines.push("\n");
      return;
    }
    Array.from(node.childNodes).forEach(visit);
    if (["P", "DIV"].includes(node.tagName)) lines.push("\n");
  };
  Array.from(doc.body.childNodes).forEach(visit);
  return lines.join("").replace(/\n{2,}/g, "\n").trim();
}

function formattedTextLines(value: string): string[] {
  if (!/<[a-z][\s\S]*>/i.test(value)) {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const doc = new DOMParser().parseFromString(value, "text/html");
  const firstList = doc.body.querySelector("ul, ol");
  let listAlignment: string | undefined;
  let ancestor = firstList?.parentElement ?? null;
  while (ancestor && ancestor !== doc.body && !listAlignment) {
    listAlignment = ancestor
      .getAttribute("style")
      ?.match(/text-align:\s*(left|center|right|justify)/i)?.[1]
      .toLowerCase();
    ancestor = ancestor.parentElement;
  }
  const listItems = Array.from(doc.body.querySelectorAll("li"));
  if (listItems.length > 0) {
    return listItems
      .map((item) => {
        const line = safeRichHtml(item.innerHTML);
        return listAlignment
          ? `<div style="text-align:${listAlignment}">${line}</div>`
          : line;
      })
      .filter((line) => plainText(line).trim());
  }

  const alignedContainer =
    doc.body.children.length === 1 &&
    doc.body.firstElementChild?.tagName === "DIV"
      ? doc.body.firstElementChild
      : null;
  const alignment = alignedContainer
    ?.getAttribute("style")
    ?.match(/text-align:\s*(left|center|right|justify)/i)?.[1]
    .toLowerCase();
  const content = alignedContainer?.innerHTML ?? doc.body.innerHTML;
  const lines = content
    .split(/<br\s*\/?>/i)
    .map((line) => safeRichHtml(line))
    .filter((line) => plainText(line).trim());

  return alignment
    ? lines.map((line) => `<div style="text-align:${alignment}">${line}</div>`)
    : lines;
}

function formattedText(value: string, format: TextFormat): string {
  const lines = plainText(value).split(/\r?\n/);
  const formatLine = (line: string) => {
    let html = escapeHtml(line);
    if (format.bold) html = `<strong>${html}</strong>`;
    if (format.italic) html = `<em>${html}</em>`;
    return html;
  };
  let html = lines
    .map(formatLine)
    .filter((line) => line !== "")
    .join("<br>");
  if (format.list !== "none") {
    const items = lines.filter((line) => line.trim());
    const tag = format.list === "number" ? "ol" : "ul";
    html = `<${tag}>${items.map((line) => `<li>${formatLine(line)}</li>`).join("")}</${tag}>`;
  }
  if (format.alignment !== "left") {
    html = `<div style="text-align:${format.alignment}">${html}</div>`;
  }
  return html;
}

function safeRichHtml(value: string): string {
  const doc = new DOMParser().parseFromString(value, "text/html");
  const allowed = new Set(["B", "STRONG", "I", "EM", "UL", "OL", "LI", "BR", "DIV"]);
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
    if (!(node instanceof Element)) return "";
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.tagName)) return "";
    const content = Array.from(node.childNodes).map(clean).join("");
    if (!allowed.has(node.tagName)) return content;
    const alignment = node
      .getAttribute("style")
      ?.match(/text-align:\s*(left|center|right|justify)/i)?.[1]
      .toLowerCase();
    const style =
      node.tagName === "DIV" && alignment
        ? ` style="text-align:${alignment}"`
        : "";
    return `<${node.tagName.toLowerCase()}${style}>${content}</${node.tagName.toLowerCase()}>`;
  };
  return Array.from(doc.body.childNodes).map(clean).join("");
}

function EditableText({
  ariaLabel,
  className,
  defaultList = "none",
  showListMarkers = false,
  editMode,
  onChange,
  value,
}: EditableTextProps) {
  if (!editMode) {
    if (value && /<[a-z][\s\S]*>/i.test(value)) {
      return (
        <span
          className={className}
          dangerouslySetInnerHTML={{ __html: safeRichHtml(value) }}
        />
      );
    }
    return <LinkifiedText className={className} value={value} />;
  }

  const currentValue = value ?? "";
  const detectedFormat = textFormat(currentValue);
  const format: TextFormat = {
    ...detectedFormat,
    list:
      detectedFormat.list === "none" ? defaultList : detectedFormat.list,
  };
  const editorValue = plainText(currentValue)
    .split(/\r?\n/)
    .map((line, index) => {
      if (!showListMarkers || !line.trim()) return line;
      if (format.list === "number") return `${index + 1}. ${line}`;
      if (format.list === "bullet") return `• ${line}`;
      return line;
    })
    .join("\n");
  const changeFormat = (nextFormat: Partial<TextFormat>) =>
    onChange(
      formattedText(currentValue, {
        ...format,
        ...nextFormat,
      }),
    );

  return (
    <span className="cv-rich-text-editor">
      <span className="cv-rich-text-toolbar" aria-label="Text formatting">
        <button
          aria-label="Bold text"
          aria-pressed={format.bold}
          onClick={() => changeFormat({ bold: !format.bold })}
          type="button"
        >
          B
        </button>
        <button
          aria-label="Italic text"
          aria-pressed={format.italic}
          onClick={() => changeFormat({ italic: !format.italic })}
          type="button"
        >
          <i>I</i>
        </button>
        {(["left", "center", "right", "justify"] as const).map((alignment) => (
          <button
            aria-label={`Align ${alignment}`}
            aria-pressed={format.alignment === alignment}
            key={alignment}
            onClick={() => changeFormat({ alignment })}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 18 18">
              {alignment === "left" ? (
                <>
                  <path d="M2 3h14M2 7h10M2 11h14M2 15h10" />
                </>
              ) : alignment === "center" ? (
                <>
                  <path d="M2 3h14M4 7h10M2 11h14M4 15h10" />
                </>
              ) : alignment === "right" ? (
                <>
                  <path d="M2 3h14M6 7h10M2 11h14M6 15h10" />
                </>
              ) : (
                <>
                  <path d="M2 3h14M2 7h14M2 11h14M2 15h14" />
                </>
              )}
            </svg>
          </button>
        ))}
        <button
          aria-label="Bulleted list"
          aria-pressed={format.list === "bullet"}
          onClick={() =>
            changeFormat({
              list: format.list === "bullet" ? "none" : "bullet",
            })
          }
          type="button"
        >
          • List
        </button>
        <button
          aria-label="Numbered list"
          aria-pressed={format.list === "number"}
          onClick={() =>
            changeFormat({
              list: format.list === "number" ? "none" : "number",
            })
          }
          type="button"
        >
          1. List
        </button>
      </span>
      <textarea
        className={`cv-preview-editable ${className ?? ""}`}
        aria-label={ariaLabel ?? "CV text field"}
        data-export-html={safeRichHtml(currentValue)}
        onChange={(event) => {
          const cleanValue = showListMarkers
            ? event.target.value
                .split(/\r?\n/)
                .map((line) =>
                  line.replace(/^\s*(?:[•*-]|\d+[.)])\s*/, ""),
                )
                .join("\n")
            : event.target.value;
          onChange(formattedText(cleanValue, format));
        }}
        rows={Math.max(3, Math.min(8, editorValue.split("\n").length))}
        value={editorValue}
      />
    </span>
  );
}

function contactItems(
  cv: StructuredCv,
  includeEmpty: boolean,
): ContactItem[] {
  const items: ContactItem[] = [
    { key: "email", value: cv.personalInfo.email },
    { key: "phone", value: cv.personalInfo.phone },
    { key: "location", value: cv.personalInfo.location },
    { key: "linkedin", value: cv.personalInfo.linkedin },
    { key: "github", value: cv.personalInfo.github },
    { key: "portfolio", value: cv.personalInfo.portfolio },
  ];

  return includeEmpty ? items : items.filter((item) => Boolean(item.value));
}

function hasAnyContent(items: unknown[]): boolean {
  return items.length > 0;
}

function cvContentWeight(cv: StructuredCv): number {
  return (
    cv.experience.length * 3 +
    cv.experience.reduce((total, item) => total + item.bullets.length, 0) +
    cv.education.length * 2 +
    cv.projects.length * 3 +
    cv.projects.reduce((total, item) => total + item.bullets.length, 0) +
    cv.skillGroups.length +
    cv.languages.length +
    cv.awards.length * 2 +
    cv.certifications.length * 2
  );
}

// Tightens dense CVs while keeping the A4 page dimensions unchanged.
function shouldUseDenseLayout(cv: StructuredCv): boolean {
  return cvContentWeight(cv) >= 28;
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

function CvEditorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string | null;
}) {
  const plainValue = plainText(value ?? "");
  const multiline =
    plainValue.includes("\n") ||
    /description|profile text|one per line/i.test(label);

  return (
    <label className="cv-editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          rows={Math.max(3, plainValue.split(/\r?\n/).length)}
          value={plainValue}
        />
      ) : (
        <input
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={plainValue}
        />
      )}
    </label>
  );
}

function CvEditorRichField({
  defaultList,
  label,
  onChange,
  showListMarkers,
  value,
}: {
  defaultList?: ListStyle;
  label: string;
  onChange: (value: string) => void;
  showListMarkers?: boolean;
  value: string | null;
}) {
  return (
    <label className="cv-editor-field cv-editor-rich-field">
      <span>{label}</span>
      <EditableText
        ariaLabel={label}
        defaultList={defaultList}
        editMode
        onChange={onChange}
        showListMarkers={showListMarkers}
        value={value}
      />
    </label>
  );
}

function CvEditorBulletList({
  bullets,
  label,
  onChange,
  preserveListType = false,
}: {
  bullets: string[];
  label: string;
  onChange: (bullets: string[]) => void;
  preserveListType?: boolean;
}) {
  return (
    <fieldset className="cv-editor-description">
      <legend>{label}</legend>
      <CvEditorRichField
        label={`${label} bullets`}
        defaultList={listTypeForBullets(bullets)}
        onChange={(value) =>
          onChange(
            preserveListType
              ? projectBulletsFromEditor(value)
              : formattedTextLines(value),
          )
        }
        showListMarkers
        value={bullets.join("\n")}
      />
    </fieldset>
  );
}

function CvEditorEntryCard({
  ariaLabel,
  children,
  collectionId,
  draggedEntryRef,
  index,
  metadata,
  onDelete,
  onMove,
  subtitle,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  collectionId: string;
  draggedEntryRef: RefObject<CvEntryDragState | null>;
  index: number;
  metadata: string;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  subtitle: string;
  title: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function startEntryDrag(event: DragEvent<HTMLElement>): void {
    draggedEntryRef.current = { collectionId, index };
    setIsDragging(true);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${collectionId}:${index}`);
    const dragImage =
      event.currentTarget.closest("summary") ??
      event.currentTarget.closest(".cv-editor-entry-card");
    if (dragImage) {
      event.dataTransfer.setDragImage(
        dragImage,
        event.nativeEvent.offsetX,
        event.nativeEvent.offsetY,
      );
    }
  }

  function dropEntry(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    event.stopPropagation();
    const [sourceCollection, sourceIndexValue] = event.dataTransfer
      .getData("text/plain")
      .split(":");
    const draggedEntry = draggedEntryRef.current;
    const fromIndex =
      sourceCollection === collectionId
        ? Number(sourceIndexValue)
        : draggedEntry?.collectionId === collectionId
          ? draggedEntry.index
          : -1;
    if (fromIndex >= 0 && fromIndex !== index) {
      onMove(fromIndex, index);
    }
    draggedEntryRef.current = null;
    setIsDragging(false);
  }

  function endEntryDrag(): void {
    draggedEntryRef.current = null;
    setIsDragging(false);
  }

  return (
    <details
      className={`cv-editor-entry-card ${isDragging ? "dragging" : ""}`}
      data-drag-key={`${collectionId}:${index}`}
      draggable
      onDragEnd={endEntryDrag}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragStart={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest(
            "input, textarea, button:not(.cv-editor-item-drag), [contenteditable='true'], .cv-rich-text-editor",
          )
        ) {
          event.preventDefault();
          return;
        }
        startEntryDrag(event);
      }}
      onDrop={dropEntry}
    >
      <summary
        aria-label={ariaLabel}
        data-drag-key={`${collectionId}:${index}`}
        draggable
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDragStart={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("button:not(.cv-editor-item-drag)")
          ) {
            event.preventDefault();
            return;
          }
          startEntryDrag(event);
        }}
        onDrop={dropEntry}
        onDragEnd={endEntryDrag}
        role="button"
      >
        <button
          aria-label={`Drag item ${index + 1}`}
          className="cv-editor-item-drag"
          draggable
          onClick={(event) => event.preventDefault()}
          onDragEnd={endEntryDrag}
          onDragStart={startEntryDrag}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 16 20">
            {[3, 8, 13].map((x) =>
              [4, 8, 12].map((y) => (
                <circle cx={x} cy={y} key={`${x}-${y}`} r="1.5" />
              )),
            )}
          </svg>
        </button>
        <span className="cv-editor-entry-summary-copy">
          <strong>{title || "Untitled entry"}</strong>
          <span>
            {[subtitle, metadata].filter(Boolean).join(" · ") || "Add details"}
          </span>
        </span>
        <CvEditorItemActions
          index={index}
          onDelete={onDelete}
        />
        <span className="cv-editor-entry-menu" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="cv-editor-entry-card-body">{children}</div>
    </details>
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
              editMode={false}
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

        {(dateRange || editMode) && (
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({ ...item, dates: parseDateRangeValue(value) })
            }
            value={dateRange}
          />
        )}
      </div>

      {(item.location || editMode) && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, location: value })}
            value={item.location}
          />
        </p>
      )}

      {item.bullets.length === 1 && /<ol(\s|>)/i.test(item.bullets[0]) ? (
        <div className="cv-preview-numbered-list">
          <EditableText
            editMode={false}
            onChange={() => undefined}
            value={item.bullets[0]}
          />
        </div>
      ) : item.bullets.length > 0 ? (
        <ul>
          {item.bullets.map((bullet, index) => (
            <li key={`experience-bullet-${entryIndex}-${index}`}>
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
      ) : null}
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

        {(dateRange || editMode) && (
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({ ...item, dates: parseDateRangeValue(value) })
            }
            value={dateRange}
          />
        )}
      </div>

      {(item.fieldOfStudy || item.location || item.description || editMode) && (
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
            <li key={`education-detail-${index}`}>
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

function projectUrlHref(value: string): string | undefined {
  try {
    const url = new URL(
      value.match(/^https?:\/\//i) ? value : `https://${value}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function ProjectEntry({
  activeRewrite,
  editMode,
  item,
  linkTitle,
  onAcceptRewrite,
  onChange,
  onGenerateRewrite,
  onRejectRewrite,
  projectIndex,
}: {
  activeRewrite: ActiveBulletRewrite | null;
  editMode: boolean;
  item: ProjectItem;
  linkTitle: boolean;
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
            {linkTitle && item.url ? (
              <a
                href={projectUrlHref(item.url)}
                rel="noreferrer"
                target="_blank"
              >
                <EditableText
                  editMode={editMode}
                  onChange={(value) => onChange({ ...item, name: value })}
                  value={item.name}
                />
              </a>
            ) : (
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, name: value })}
                value={item.name}
              />
            )}
          </h4>
          {(item.subtitle || item.organization || editMode) && (
            <p>
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, subtitle: value })}
                value={item.subtitle}
              />
            </p>
          )}
        </div>

        {(dateRange || editMode) && (
          <EditableText
            editMode={editMode}
            onChange={(value) =>
              onChange({ ...item, dates: parseDateRangeValue(value) })
            }

            value={dateRange}
          />
        )}
      </div>

      {(item.location || (item.url && !linkTitle) || editMode) && (
        <p className="cv-preview-meta">
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, url: value })}
            value={[item.location, linkTitle ? null : item.url]
              .filter(Boolean)
              .join(" | ")}
          />
        </p>
      )}

      {(item.description || editMode) && (
        <p>
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, description: value })}
            value={item.description}
          />
        </p>
      )}

      {(item.technologies.length > 0 || editMode) && (
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

      {item.bullets.length === 1 &&
      /<ol(\s|>)/i.test(item.bullets[0]) ? (
        <div className="cv-preview-numbered-list">
          <EditableText
            editMode={false}
            onChange={() => undefined}
            value={item.bullets[0]}
          />
        </div>
      ) : item.bullets.length > 0 ? (
        <ul>
          {item.bullets.map((bullet, index) => (
            <li key={`project-bullet-${projectIndex}-${index}`}>
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
      ) : null}
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
          {(item.organization || editMode) && (
            <p>
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, organization: value })}
                value={item.organization}
              />
            </p>
          )}
        </div>

        {(item.date || editMode) && (
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, date: value })}
            value={item.date}
          />
        )}
      </div>

      {(item.placement || item.description || editMode) && (
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
            <li key={`award-bullet-${index}`}>
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
          {(item.issuer || editMode) && (
            <p>
              <EditableText
                editMode={editMode}
                onChange={(value) => onChange({ ...item, issuer: value })}
                value={item.issuer}
              />
            </p>
          )}
        </div>

        {(item.date || editMode) && (
          <EditableText
            editMode={editMode}
            onChange={(value) => onChange({ ...item, date: value })}
            value={item.date}
          />
        )}
      </div>

      {(item.credentialId || item.url || editMode) && (
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

export function CvPreview({
  cv,
  onCvChange,
  controlsHost = null,
  onRewriteBullet,
}: CvPreviewProps) {
  const editableCv = useMemo(() => normalizeStructuredCv(cv), [cv]);
  const [template, setTemplate] = useState<CvTemplate>("classic");
  const [editMode, setEditMode] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(
    CV_SECTIONS.map(({ id }) => id),
  );
  const [expandedSections, setExpandedSections] = useState<CvSectionId[]>([]);
  const [draggedSection, setDraggedSection] = useState<CvSectionId | null>(null);
  const [openSectionMenu, setOpenSectionMenu] = useState<CvSectionId | null>(null);
  const [sectionTitles, setSectionTitles] = useState(SECTION_LABELS);
  const [hiddenSections, setHiddenSections] = useState<CvSectionId[]>([]);
  const [sectionPlacements, setSectionPlacements] = useState(() =>
    defaultSectionPlacements("classic"),
  );
  const [wideSections, setWideSections] = useState<CvSectionId[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(30);
  const [fontSize, setFontSize] = useState(12);
  const [lineSpacing, setLineSpacing] = useState(1.4);
  const [undoStack, setUndoStack] = useState<EditorUndoState[]>([]);
  const [sectionHeights, setSectionHeights] = useState<
    Partial<Record<CvSectionId, number>>
  >({});
  const [pageBodyHeight, setPageBodyHeight] = useState(760);
  const [activeRewrite, setActiveRewrite] =
    useState<ActiveBulletRewrite | null>(null);
  const [linkedProjectTitles, setLinkedProjectTitles] = useState<number[]>([]);
  const previewPagesRef = useRef<HTMLDivElement | null>(null);
  const sectionControlsRef = useRef<HTMLDivElement | null>(null);
  const draggedEntryRef = useRef<CvEntryDragState | null>(null);
  const contacts = contactItems(editableCv, false);
  const useDenseLayout = shouldUseDenseLayout(editableCv);
  const populatedSections = new Set<CvSectionId>();
  if (editableCv.summary) populatedSections.add("profile");
  if (hasAnyContent(editableCv.experience))
    populatedSections.add("experience");
  if (hasAnyContent(editableCv.education)) populatedSections.add("education");
  if (hasAnyContent(editableCv.projects)) populatedSections.add("projects");
  if (hasAnyContent(editableCv.skillGroups)) populatedSections.add("skills");
  if (hasAnyContent(editableCv.languages)) populatedSections.add("languages");
  if (hasAnyContent(editableCv.awards)) populatedSections.add("awards");
  if (hasAnyContent(editableCv.certifications))
    populatedSections.add("certifications");
  const usesSidebar = CV_SECTIONS.some(
    ({ id }) =>
      populatedSections.has(id) &&
      sectionPlacements[id] === "sidebar" &&
      !hiddenSections.includes(id),
  );

  useEffect(() => {
    if (!openSectionMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const openMenu = sectionControlsRef.current?.querySelector(
        `.cv-section-more[data-section-id="${openSectionMenu}"]`,
      );
      if (!openMenu?.contains(target)) {
        setOpenSectionMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openSectionMenu]);

  function selectTemplate(nextTemplate: CvTemplate): void {
    setUndoStack((current) => [
      ...current.slice(-49),
      { type: "template", value: template },
      { type: "placements", value: sectionPlacements },
    ]);
    setTemplate(nextTemplate);
    setSectionPlacements(defaultSectionPlacements(nextTemplate));
  }

  function reorderSection(draggedId: CvSectionId, targetId: CvSectionId): void {
    if (draggedId === targetId) return;
    setUndoStack((current) => [
      ...current.slice(-49),
      { type: "order", value: sectionOrder },
    ]);
    setSectionOrder((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(draggedId);
      const toIndex = next.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return current;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedId);
      return next;
    });
  }

  function toggleSectionExpanded(sectionId: CvSectionId): void {
    setExpandedSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  }

  function toggleSection(sectionId: CvSectionId): void {
    setUndoStack((current) => [
      ...current.slice(-49),
      { type: "hidden", value: hiddenSections },
    ]);
    setHiddenSections((current) =>
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId],
    );
  }

  function toggleSectionVisibility(sectionId: CvSectionId): void {
    toggleSection(sectionId);
  }

  function toggleSectionPlacement(sectionId: CvSectionId): void {
    setUndoStack((current) => [
      ...current.slice(-49),
      { type: "placements", value: sectionPlacements },
    ]);
    setSectionPlacements((current) => ({
      ...current,
      [sectionId]: current[sectionId] === "sidebar" ? "main" : "sidebar",
    }));
  }

  useLayoutEffect(() => {
    const pages = previewPagesRef.current;
    if (!pages) {
      return;
    }

    const updateMeasurements = () => {
      const page = pages.querySelector<HTMLElement>(".cv-preview-page");
      const header = page?.querySelector<HTMLElement>(".cv-preview-header");
      if (!page || !header) return;
      const pageStyle = window.getComputedStyle(page);
      const contentHeight =
        page.clientHeight -
        Number.parseFloat(pageStyle.paddingTop) -
        Number.parseFloat(pageStyle.paddingBottom) -
        header.getBoundingClientRect().height -
        24;
      setPageBodyHeight((current) =>
        Math.abs(current - contentHeight) > 2 ? contentHeight : current,
      );

      const nextHeights: Partial<Record<CvSectionId, number>> = {};
      pages
        .querySelectorAll<HTMLElement>(".cv-layout-section[data-section]")
        .forEach((element) => {
          const sectionId = element.dataset.section as CvSectionId;
          const height = element.getBoundingClientRect().height;
          nextHeights[sectionId] = Math.max(nextHeights[sectionId] ?? 0, height);
        });
      setSectionHeights((current) => {
        const changed = CV_SECTIONS.some(
          ({ id }) =>
            Math.abs((current[id] ?? 0) - (nextHeights[id] ?? 0)) > 2,
        );
        return changed ? nextHeights : current;
      });
    };

    updateMeasurements();
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(pages);
    pages.querySelectorAll(".cv-preview-page, .cv-preview-header, .cv-layout-section")
      .forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [
    activeRewrite,
    editableCv,
    editMode,
    fontSize,
    hiddenSections,
    lineSpacing,
    pageBodyHeight,
    sectionHeights,
    sectionOrder,
    sectionPlacements,
    sectionTitles,
    sidebarWidth,
    template,
    useDenseLayout,
    wideSections,
  ]);

  function updateCv(nextCv: StructuredCv): void {
    if (JSON.stringify(nextCv) !== JSON.stringify(editableCv)) {
      setUndoStack((current) => [
        ...current.slice(-49),
        { type: "cv", value: editableCv },
      ]);
    }
    onCvChange(nextCv);
  }

  function recordDesignUndo(): void {
    setUndoStack((current) => [
      ...current.slice(-49),
      {
        type: "design",
        value: { sidebarWidth, fontSize, lineSpacing },
      },
    ]);
  }

  function undoLastChange(): void {
    const previous = undoStack.at(-1);
    if (!previous) return;
    switch (previous.type) {
      case "cv":
        onCvChange(previous.value);
        break;
      case "delete":
        onCvChange(previous.value.cv);
        setHiddenSections(previous.value.hiddenSections);
        break;
      case "hidden":
        setHiddenSections(previous.value);
        break;
      case "order":
        setSectionOrder(previous.value);
        break;
      case "titles":
        setSectionTitles(previous.value);
        break;
      case "wide":
        setWideSections(previous.value);
        break;
      case "template":
        setTemplate(previous.value);
        break;
      case "design":
        setSidebarWidth(previous.value.sidebarWidth);
        setFontSize(previous.value.fontSize);
        setLineSpacing(previous.value.lineSpacing);
        break;
      case "placements":
        setSectionPlacements(previous.value);
        break;
    }
    setUndoStack((current) => current.slice(0, -1));
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

  const sectionContent: Record<CvSectionId, ReactNode> = {
    profile: editableCv.summary && (
      <CvSection title={sectionTitles.profile}>
        <p>
          <EditableText
            editMode={false}
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
    ),
    experience: hasAnyContent(editableCv.experience) && (
      <CvSection title={sectionTitles.experience}>
        <div className="cv-preview-entry-list">
          {editableCv.experience.map((item, index) => (
            <ExperienceEntry
              activeRewrite={activeRewrite}
              entryIndex={index}
              editMode={false}
              item={item}
              key={`experience-${index}`}
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
    ),
    education: hasAnyContent(editableCv.education) && (
      <CvSection title={sectionTitles.education}>
        <div className="cv-preview-entry-list">
          {editableCv.education.map((item, index) => (
            <EducationEntry
              editMode={false}
              item={item}
              key={`education-${index}`}
              onChange={(nextItem) => {
                const education = [...editableCv.education];
                education[index] = nextItem;
                updateCv({ ...editableCv, education });
              }}
            />
          ))}
        </div>
      </CvSection>
    ),
    projects: hasAnyContent(editableCv.projects) && (
      <CvSection title={sectionTitles.projects}>
        <div className="cv-preview-entry-list">
          {editableCv.projects.map((item, index) => (
            <ProjectEntry
              activeRewrite={activeRewrite}
              editMode={false}
              item={item}
              linkTitle={linkedProjectTitles.includes(index)}
              key={`project-${index}`}
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
    ),
    skills: hasAnyContent(editableCv.skillGroups) && (
      <CvSection title={sectionTitles.skills}>
        <div className="cv-preview-compact-list">
          {editableCv.skillGroups.map((item, index) => (
            <SkillGroupEntry
              editMode={false}
              item={item}
              key={`skill-group-${index}`}
              onChange={(nextItem) => {
                const skillGroups = [...editableCv.skillGroups];
                skillGroups[index] = nextItem;
                updateCv({ ...editableCv, skillGroups });
              }}
            />
          ))}
        </div>
      </CvSection>
    ),
    languages: hasAnyContent(editableCv.languages) && (
      <CvSection title={sectionTitles.languages}>
        <div className="cv-preview-compact-list">
          {editableCv.languages.map((item, index) => (
            <LanguageEntry
              editMode={false}
              item={item}
              key={`language-${index}`}
              onChange={(nextItem) => {
                const languages = [...editableCv.languages];
                languages[index] = nextItem;
                updateCv({ ...editableCv, languages });
              }}
            />
          ))}
        </div>
      </CvSection>
    ),
    awards: hasAnyContent(editableCv.awards) && (
      <CvSection title={sectionTitles.awards}>
        <div className="cv-preview-entry-list">
          {editableCv.awards.map((item, index) => (
            <AwardEntry
              editMode={false}
              item={item}
              key={`award-${index}`}
              onChange={(nextItem) => {
                const awards = [...editableCv.awards];
                awards[index] = nextItem;
                updateCv({ ...editableCv, awards });
              }}
            />
          ))}
        </div>
      </CvSection>
    ),
    certifications: hasAnyContent(editableCv.certifications) && (
      <CvSection title={sectionTitles.certifications}>
        <div className="cv-preview-entry-list">
          {editableCv.certifications.map((item, index) => (
            <CertificationEntry
              editMode={false}
              item={item}
              key={`certification-${index}`}
              onChange={(nextItem) => {
                const certifications = [...editableCv.certifications];
                certifications[index] = nextItem;
                updateCv({ ...editableCv, certifications });
              }}
            />
          ))}
        </div>
      </CvSection>
    ),
  };

  function renderSectionEditor(sectionId: CvSectionId): ReactNode {
    switch (sectionId) {
      case "profile":
        return (
          <>
            <CvEditorField
              label="Full name"
              onChange={(fullName) =>
                updateCv({
                  ...editableCv,
                  personalInfo: { ...editableCv.personalInfo, fullName },
                })
              }
              value={editableCv.personalInfo.fullName}
            />
            <CvEditorField
              label="Headline"
              onChange={(headline) => updateCv({ ...editableCv, headline })}
              value={editableCv.headline}
            />
            <CvEditorRichField
              label="Profile text"
              onChange={(summary) => updateCv({ ...editableCv, summary })}
              value={editableCv.summary}
            />
            {(
              [
                ["email", "Email"],
                ["phone", "Phone"],
                ["location", "Location"],
                ["linkedin", "LinkedIn"],
                ["github", "GitHub"],
                ["portfolio", "Portfolio"],
              ] as const
            ).map(([key, label]) => (
              <CvEditorField
                key={key}
                label={label}
                onChange={(value) =>
                  updateCv({
                    ...editableCv,
                    personalInfo: {
                      ...editableCv.personalInfo,
                      [key]: value,
                    },
                  })
                }
                value={editableCv.personalInfo[key]}
              />
            ))}
          </>
        );
      case "experience":
        return (
          <>
            {editableCv.experience.map((item, index) => (
              <CvEditorEntryCard
                ariaLabel={`Edit Experience entry ${index + 1}`}
                collectionId="experience"
                draggedEntryRef={draggedEntryRef}
                index={index}
                key={`experience-${index}`}
                metadata={[item.location, formatDateRange(item.dates)]
                  .filter(Boolean)
                  .join(" · ")}
                onDelete={() => updateCv({
                  ...editableCv,
                  experience: editableCv.experience.filter((_, itemIndex) => itemIndex !== index),
                })}
                onMove={(from, to) => updateCv({
                  ...editableCv,
                  experience: moveEntry(editableCv.experience, from, to),
                })}
                subtitle={item.company}
                title={item.jobTitle}
              >
                <div className="cv-editor-entry-fields">
              <CvEditorField
                label="Role"
                onChange={(jobTitle) => {
                  const experience = [...editableCv.experience];
                  experience[index] = { ...item, jobTitle };
                  updateCv({ ...editableCv, experience });
                }}
                value={item.jobTitle}
              />
              <CvEditorField
                label="Company"
                onChange={(company) => {
                  const experience = [...editableCv.experience];
                  experience[index] = { ...item, company };
                  updateCv({ ...editableCv, experience });
                }}
                value={item.company}
              />
              <CvEditorField
                label="Location"
                onChange={(location) => {
                  const experience = [...editableCv.experience];
                  experience[index] = { ...item, location };
                  updateCv({ ...editableCv, experience });
                }}
                value={item.location}
              />
              <CvEditorField
                label="Dates (start - end)"
                onChange={(value) => {
                  const experience = [...editableCv.experience];
                  experience[index] = {
                    ...item,
                    dates: parseDateRangeValue(plainText(value)),
                  };
                  updateCv({ ...editableCv, experience });
                }}
                value={formatDateRange(item.dates)}
              />
              <CvEditorBulletList
                bullets={item.bullets}
                label="Description"
                onChange={(bullets) => {
                  const experience = [...editableCv.experience];
                  experience[index] = { ...item, bullets };
                  updateCv({ ...editableCv, experience });
                }}
                preserveListType
              />
                </div>
              </CvEditorEntryCard>
            ))}
            <button
              className="cv-editor-add-item"
              onClick={() => updateCv({
                ...editableCv,
                experience: [...editableCv.experience, {
                  company: "", jobTitle: "", location: null,
                  dates: { startDate: null, endDate: null }, bullets: [],
                }],
              })}
              type="button"
            >+ Add experience</button>
          </>
        );
      case "education":
        return (
          <>
            {editableCv.education.map((item, index) => (
          <CvEditorEntryCard
            ariaLabel={`Edit Education entry ${index + 1}`}
            collectionId="education"
            draggedEntryRef={draggedEntryRef}
            index={index}
            key={`education-${index}`}
            metadata={[item.location, formatDateRange(item.dates)].filter(Boolean).join(" · ")}
            onDelete={() => updateCv({ ...editableCv, education: editableCv.education.filter((_, itemIndex) => itemIndex !== index) })}
            onMove={(from, to) => updateCv({ ...editableCv, education: moveEntry(editableCv.education, from, to) })}
            subtitle={item.institution}
            title={item.degree}
          >
          <div className="cv-editor-entry-fields">
            <CvEditorField
              label="Degree"
              onChange={(degree) => {
                const education = [...editableCv.education];
                education[index] = { ...item, degree };
                updateCv({ ...editableCv, education });
              }}
              value={item.degree}
            />
            <CvEditorField
              label="Institution"
              onChange={(institution) => {
                const education = [...editableCv.education];
                education[index] = { ...item, institution };
                updateCv({ ...editableCv, education });
              }}
              value={item.institution}
            />
            <CvEditorField
              label="Field of study"
              onChange={(fieldOfStudy) => {
                const education = [...editableCv.education];
                education[index] = { ...item, fieldOfStudy };
                updateCv({ ...editableCv, education });
              }}
              value={item.fieldOfStudy}
            />
            <CvEditorField
              label="Location"
              onChange={(location) => {
                const education = [...editableCv.education];
                education[index] = { ...item, location };
                updateCv({ ...editableCv, education });
              }}
              value={item.location}
            />
            <CvEditorField
              label="Dates (start - end)"
              onChange={(value) => {
                const education = [...editableCv.education];
                education[index] = {
                  ...item,
                  dates: parseDateRangeValue(plainText(value)),
                };
                updateCv({ ...editableCv, education });
              }}
              value={formatDateRange(item.dates)}
            />
            <CvEditorField
              label="Description"
              onChange={(description) => {
                const education = [...editableCv.education];
                education[index] = { ...item, description };
                updateCv({ ...editableCv, education });
              }}
              value={item.description}
            />
            {item.details.map((detail, detailIndex) => (
              <CvEditorField
                key={`education-${index}-detail-${detailIndex}`}
                label={`Detail ${detailIndex + 1}`}
                onChange={(value) => {
                  const education = [...editableCv.education];
                  const details = [...item.details];
                  details[detailIndex] = value;
                  education[index] = { ...item, details };
                  updateCv({ ...editableCv, education });
                }}
                value={detail}
              />
            ))}
          </div>
          </CvEditorEntryCard>
            ))}
            <button className="cv-editor-add-item" onClick={() => updateCv({
              ...editableCv,
              education: [...editableCv.education, {
                institution: "", degree: "", fieldOfStudy: null, location: null,
                dates: { startDate: null, endDate: null }, description: null, details: [],
              }],
            })} type="button">+ Add education</button>
          </>
        );
      case "projects":
        return (
          <>
            {editableCv.projects.map((item, index) => (
          <CvEditorEntryCard
            ariaLabel={`Edit Project entry ${index + 1}`}
            collectionId="projects"
            draggedEntryRef={draggedEntryRef}
            index={index}
            key={`project-${index}`}
            metadata={[item.organization, item.location, formatDateRange(item.dates)].filter(Boolean).join(" · ")}
            onDelete={() => {
                updateCv({ ...editableCv, projects: editableCv.projects.filter((_, itemIndex) => itemIndex !== index) });
                setLinkedProjectTitles((current) => current.filter((projectIndex) => projectIndex !== index).map((projectIndex) => projectIndex > index ? projectIndex - 1 : projectIndex));
              }}
            onMove={(from, to) => {
                updateCv({ ...editableCv, projects: moveEntry(editableCv.projects, from, to) });
                setLinkedProjectTitles((current) => {
                  const reordered = moveEntry(editableCv.projects.map((_, projectIndex) => current.includes(projectIndex)), from, to);
                  return reordered.flatMap((isLinked, projectIndex) => isLinked ? [projectIndex] : []);
                });
              }}
            subtitle={item.subtitle ?? ""}
            title={item.name}
          >
          <div className="cv-editor-entry-fields">
            <CvEditorField
              label="Project name"
              onChange={(name) => {
                const projects = [...editableCv.projects];
                projects[index] = { ...item, name };
                updateCv({ ...editableCv, projects });
              }}
              value={item.name}
            />
            <label className="cv-editor-toggle">
              <input
                checked={linkedProjectTitles.includes(index)}
                onChange={(event) => setLinkedProjectTitles((current) =>
                  event.target.checked
                    ? [...current, index]
                    : current.filter((projectIndex) => projectIndex !== index),
                )}
                type="checkbox"
              />
              Link title to project URL
            </label>
            <CvEditorField
              label="Subtitle"
              onChange={(subtitle) => {
                const projects = [...editableCv.projects];
                projects[index] = { ...item, subtitle };
                updateCv({ ...editableCv, projects });
              }}
              value={item.subtitle}
            />
            <CvEditorField
              label="Organization"
              onChange={(organization) => {
                const projects = [...editableCv.projects];
                projects[index] = { ...item, organization };
                updateCv({ ...editableCv, projects });
              }}
              value={item.organization}
            />
            <CvEditorField
              label="Location"
              onChange={(location) => {
                const projects = [...editableCv.projects];
                projects[index] = { ...item, location };
                updateCv({ ...editableCv, projects });
              }}
              value={item.location}
            />
            <CvEditorField
              label="Dates (start - end)"
              onChange={(value) => {
                const projects = [...editableCv.projects];
                projects[index] = {
                  ...item,
                  dates: parseDateRangeValue(plainText(value)),
                };
                updateCv({ ...editableCv, projects });
              }}
              value={formatDateRange(item.dates)}
            />
            <CvEditorField
              label="Project URL"
              onChange={(url) => {
                const projects = [...editableCv.projects];
                projects[index] = { ...item, url };
                updateCv({ ...editableCv, projects });
              }}
              value={item.url}
            />
            <CvEditorBulletList
              bullets={[...(item.description ? [item.description] : []), ...item.bullets]}
              label="Description"
              onChange={(bullets) => {
                const projects = [...editableCv.projects];
                projects[index] = { ...item, description: null, bullets };
                updateCv({ ...editableCv, projects });
              }}
              preserveListType
            />
            <CvEditorField
              label="Technologies (one per line)"
              onChange={(value) => {
                const projects = [...editableCv.projects];
                projects[index] = {
                  ...item,
                  technologies: plainText(value)
                    .split(/\r?\n/)
                    .filter((technology) => technology.trim()),
                };
                updateCv({ ...editableCv, projects });
              }}
              value={item.technologies.join("\n")}
            />
          </div>
          </CvEditorEntryCard>
            ))}
            <button className="cv-editor-add-item" onClick={() => updateCv({
              ...editableCv,
              projects: [...editableCv.projects, {
                name: "", subtitle: null, organization: null, location: null,
                dates: { startDate: null, endDate: null }, description: null,
                bullets: [], technologies: [], url: null,
              }],
            })} type="button">+ Add project</button>
          </>
        );
      case "skills":
        return (
          <>
            {editableCv.skillGroups.map((item, index) => (
          <CvEditorEntryCard
            ariaLabel={`Edit Skill category ${index + 1}`}
            collectionId="skills"
            draggedEntryRef={draggedEntryRef}
            index={index}
            key={`skill-${index}`}
            metadata={item.skills.join(" · ")}
            onDelete={() => updateCv({ ...editableCv, skillGroups: editableCv.skillGroups.filter((_, itemIndex) => itemIndex !== index) })}
            onMove={(from, to) => updateCv({ ...editableCv, skillGroups: moveEntry(editableCv.skillGroups, from, to) })}
            subtitle={`${item.skills.length} ${item.skills.length === 1 ? "skill" : "skills"}`}
            title={item.category}
          >
          <div className="cv-editor-entry-fields">
            <CvEditorField
              label="Skill category"
              onChange={(category) => {
                const skillGroups = [...editableCv.skillGroups];
                skillGroups[index] = { ...item, category };
                updateCv({ ...editableCv, skillGroups });
              }}
              value={item.category}
            />
            <CvEditorSkillChips
              category={item.category}
              onChange={(skills) => {
                const skillGroups = [...editableCv.skillGroups];
                skillGroups[index] = { ...item, skills };
                updateCv({ ...editableCv, skillGroups });
              }}
              skills={item.skills}
            />
          </div>
          </CvEditorEntryCard>
            ))}
            <button className="cv-editor-add-item" onClick={() => updateCv({
              ...editableCv,
              skillGroups: [...editableCv.skillGroups, { category: "Skills", skills: [] }],
            })} type="button">+ Add skill category</button>
          </>
        );
      case "languages":
        return (
          <>
            {editableCv.languages.map((item, index) => (
          <CvEditorEntryCard
            ariaLabel={`Edit Language entry ${index + 1}`}
            collectionId="languages"
            draggedEntryRef={draggedEntryRef}
            index={index}
            key={`language-${index}`}
            metadata={[item.certification, item.score].filter(Boolean).join(" · ")}
            onDelete={() => updateCv({ ...editableCv, languages: editableCv.languages.filter((_, itemIndex) => itemIndex !== index) })}
            onMove={(from, to) => updateCv({ ...editableCv, languages: moveEntry(editableCv.languages, from, to) })}
            subtitle={item.proficiency ?? ""}
            title={item.language}
          >
          <div className="cv-editor-entry-fields">
            <CvEditorField
              label="Language"
              onChange={(language) => {
                const languages = [...editableCv.languages];
                languages[index] = { ...item, language };
                updateCv({ ...editableCv, languages });
              }}
              value={item.language}
            />
            <CvEditorField
              label="Proficiency"
              onChange={(proficiency) => {
                const languages = [...editableCv.languages];
                languages[index] = { ...item, proficiency };
                updateCv({ ...editableCv, languages });
              }}
              value={item.proficiency}
            />
            <CvEditorField
              label="Certification or level"
              onChange={(certification) => {
                const languages = [...editableCv.languages];
                languages[index] = { ...item, certification };
                updateCv({ ...editableCv, languages });
              }}
              value={item.certification}
            />
            <CvEditorField
              label="Score"
              onChange={(score) => {
                const languages = [...editableCv.languages];
                languages[index] = { ...item, score };
                updateCv({ ...editableCv, languages });
              }}
              value={item.score}
            />
          </div>
          </CvEditorEntryCard>
            ))}
            <button className="cv-editor-add-item" onClick={() => updateCv({
              ...editableCv,
              languages: [...editableCv.languages, {
                language: "", proficiency: null, certification: null, score: null,
              }],
            })} type="button">+ Add language</button>
          </>
        );
      case "awards":
        return (
          <>
            {editableCv.awards.map((item, index) => (
          <CvEditorEntryCard
            ariaLabel={`Edit Award entry ${index + 1}`}
            collectionId="awards"
            draggedEntryRef={draggedEntryRef}
            index={index}
            key={`award-${index}`}
            metadata={[item.date, item.placement].filter(Boolean).join(" · ")}
            onDelete={() => updateCv({ ...editableCv, awards: editableCv.awards.filter((_, itemIndex) => itemIndex !== index) })}
            onMove={(from, to) => updateCv({ ...editableCv, awards: moveEntry(editableCv.awards, from, to) })}
            subtitle={item.organization ?? ""}
            title={item.title}
          >
          <div className="cv-editor-entry-fields">
            <CvEditorField
              label="Award title"
              onChange={(title) => {
                const awards = [...editableCv.awards];
                awards[index] = { ...item, title };
                updateCv({ ...editableCv, awards });
              }}
              value={item.title}
            />
            <CvEditorField
              label="Description"
              onChange={(description) => {
                const awards = [...editableCv.awards];
                awards[index] = { ...item, description };
                updateCv({ ...editableCv, awards });
              }}
              value={item.description}
            />
            <CvEditorField
              label="Organization"
              onChange={(organization) => {
                const awards = [...editableCv.awards];
                awards[index] = { ...item, organization };
                updateCv({ ...editableCv, awards });
              }}
              value={item.organization}
            />
            <CvEditorField
              label="Date"
              onChange={(date) => {
                const awards = [...editableCv.awards];
                awards[index] = { ...item, date };
                updateCv({ ...editableCv, awards });
              }}
              value={item.date}
            />
            <CvEditorField
              label="Placement"
              onChange={(placement) => {
                const awards = [...editableCv.awards];
                awards[index] = { ...item, placement };
                updateCv({ ...editableCv, awards });
              }}
              value={item.placement}
            />
            {item.bullets.map((bullet, bulletIndex) => (
              <CvEditorField
                key={`award-${index}-bullet-${bulletIndex}`}
                label={`Bullet ${bulletIndex + 1}`}
                onChange={(value) => {
                  const awards = [...editableCv.awards];
                  const bullets = [...item.bullets];
                  bullets[bulletIndex] = value;
                  awards[index] = { ...item, bullets };
                  updateCv({ ...editableCv, awards });
                }}
                value={bullet}
              />
            ))}
          </div>
          </CvEditorEntryCard>
            ))}
            <button className="cv-editor-add-item" onClick={() => updateCv({
              ...editableCv,
              awards: [...editableCv.awards, {
                title: "", organization: null, date: null, placement: null,
                description: null, bullets: [],
              }],
            })} type="button">+ Add award</button>
          </>
        );
      case "certifications":
        return (
          <>
            {editableCv.certifications.map((item, index) => (
          <CvEditorEntryCard
            ariaLabel={`Edit Certification entry ${index + 1}`}
            collectionId="certifications"
            draggedEntryRef={draggedEntryRef}
            index={index}
            key={`certification-${index}`}
            metadata={[item.date, item.credentialId].filter(Boolean).join(" · ")}
            onDelete={() => updateCv({ ...editableCv, certifications: editableCv.certifications.filter((_, itemIndex) => itemIndex !== index) })}
            onMove={(from, to) => updateCv({ ...editableCv, certifications: moveEntry(editableCv.certifications, from, to) })}
            subtitle={item.issuer ?? ""}
            title={item.name}
          >
          <div className="cv-editor-entry-fields">
            <CvEditorField
              label="Certification"
              onChange={(name) => {
                const certifications = [...editableCv.certifications];
                certifications[index] = { ...item, name };
                updateCv({ ...editableCv, certifications });
              }}
              value={item.name}
            />
            <CvEditorField
              label="Issuer"
              onChange={(issuer) => {
                const certifications = [...editableCv.certifications];
                certifications[index] = { ...item, issuer };
                updateCv({ ...editableCv, certifications });
              }}
              value={item.issuer}
            />
            <CvEditorField
              label="Date"
              onChange={(date) => {
                const certifications = [...editableCv.certifications];
                certifications[index] = { ...item, date };
                updateCv({ ...editableCv, certifications });
              }}
              value={item.date}
            />
            <CvEditorField
              label="Credential ID"
              onChange={(credentialId) => {
                const certifications = [...editableCv.certifications];
                certifications[index] = { ...item, credentialId };
                updateCv({ ...editableCv, certifications });
              }}
              value={item.credentialId}
            />
            <CvEditorField
              label="Credential URL"
              onChange={(url) => {
                const certifications = [...editableCv.certifications];
                certifications[index] = { ...item, url };
                updateCv({ ...editableCv, certifications });
              }}
              value={item.url}
            />
          </div>
          </CvEditorEntryCard>
            ))}
            <button className="cv-editor-add-item" onClick={() => updateCv({
              ...editableCv,
              certifications: [...editableCv.certifications, {
                name: "", issuer: null, date: null, credentialId: null, url: null,
              }],
            })} type="button">+ Add certification</button>
          </>
        );
    }
  }

  const pageSections = paginateCvSections({
    sectionOrder,
    availableSections: CV_SECTIONS.filter(
      ({ id }) => Boolean(sectionContent[id]),
    ).map(({ id }) => id),
    hiddenSections,
    placements: sectionPlacements,
    wideSections,
    sectionHeights,
    pageBodyHeight,
    usesSidebar,
  });

  function renderSection(sectionId: CvSectionId): ReactNode {
    const content = sectionContent[sectionId];
    if (!content) return null;
    return (
      <div
        className={`cv-layout-section ${
          wideSections.includes(sectionId) ? "wide" : ""
        }`}
        data-placement={sectionPlacements[sectionId]}
        data-section={sectionId}
        key={sectionId}
      >
        {content}
      </div>
    );
  }

  function deleteSection(sectionId: CvSectionId): void {
    if (
      !window.confirm(
        `Delete the ${sectionTitles[sectionId]} section from this CV?`,
      )
    ) {
      return;
    }
    setUndoStack((current) => [
      ...current.slice(-49),
      {
        type: "delete",
        value: { cv: editableCv, hiddenSections },
      },
    ]);
    setHiddenSections((current) => [...current, sectionId]);
    const nextCv: StructuredCv = { ...editableCv };
    switch (sectionId) {
      case "profile":
        nextCv.summary = null;
        break;
      case "experience":
        nextCv.experience = [];
        break;
      case "education":
        nextCv.education = [];
        break;
      case "projects":
        nextCv.projects = [];
        break;
      case "skills":
        nextCv.skillGroups = [];
        break;
      case "languages":
        nextCv.languages = [];
        break;
      case "awards":
        nextCv.awards = [];
        break;
      case "certifications":
        nextCv.certifications = [];
        break;
    }
    onCvChange(nextCv);
  }

  return (
    <section className="cv-preview-shell" aria-label="CV preview">
      {controlsHost &&
        createPortal(
        editMode ? (
        <fieldset className="cv-layout-controls">
          <legend>Layout and design</legend>
          <div className="cv-editor-toolbar-actions">
            <button
              onClick={() => setEditMode(false)}
              type="button"
            >
              Save changes
            </button>
            <button
              aria-label="Undo last CV edit"
              disabled={undoStack.length === 0}
              onClick={undoLastChange}
              type="button"
            >
              ↶ Undo
            </button>
          </div>
          <label>
            Sidebar width
            <input
              aria-label="Sidebar width"
              max="42"
              min="22"
              onChange={(event) => {
                recordDesignUndo();
                setSidebarWidth(Number(event.target.value));
              }}
              type="range"
              value={sidebarWidth}
            />
            <output>{sidebarWidth}%</output>
          </label>
          <label>
            Text size
            <input
              aria-label="Text size"
              max="12"
              min="8"
              onChange={(event) => {
                recordDesignUndo();
                setFontSize(Number(event.target.value));
              }}
              type="range"
              value={fontSize}
            />
            <output>{fontSize} pt</output>
          </label>
          <label>
            Line spacing
            <input
              aria-label="Line spacing"
              max="2"
              min="1"
              onChange={(event) => {
                recordDesignUndo();
                setLineSpacing(Number(event.target.value));
              }}
              step="0.1"
              type="range"
              value={lineSpacing}
            />
            <output>{lineSpacing.toFixed(1)}</output>
          </label>
          <fieldset className="cv-template-picker">
            <legend>Choose a CV template</legend>
            <div className="cv-template-options">
              {CV_TEMPLATES.map((item) => (
                <button
                  aria-pressed={template === item.id}
                  className={`cv-template-option ${
                    template === item.id ? "selected" : ""
                  }`}
                  key={item.id}
                  onClick={() => selectTemplate(item.id)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`cv-template-swatch cv-template-swatch-${item.id}`}
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="cv-section-controls" ref={sectionControlsRef}>
            {sectionOrder.map((sectionId) => (
              <div
                className={`cv-section-control ${
                  draggedSection === sectionId ? "dragging" : ""
                }`}
                draggable
                key={sectionId}
                onDragStart={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest(
                      "input, textarea, button:not(.cv-section-drag-handle), summary",
                    )
                  ) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", sectionId);
                  setDraggedSection(sectionId);
                }}
                onDragEnd={() => setDraggedSection(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedSection) {
                    reorderSection(draggedSection, sectionId);
                  }
                  setDraggedSection(null);
                }}
              >
                <div className="cv-section-control-header">
                  <button
                    aria-label={`Drag to reorder ${sectionTitles[sectionId]}`}
                    className="cv-section-drag-handle"
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 20">
                      {[3, 8, 13].map((x) =>
                        [4, 10, 16].map((y) => (
                          <circle cx={x} cy={y} key={`${x}-${y}`} r="1.5" />
                        )),
                      )}
                    </svg>
                  </button>
                  <input
                    aria-label={`Rename ${sectionTitles[sectionId]} section`}
                    onChange={(event) => {
                      setUndoStack((current) => [
                        ...current.slice(-49),
                        { type: "titles", value: sectionTitles },
                      ]);
                      setSectionTitles((current) => ({
                        ...current,
                        [sectionId]: event.target.value,
                      }));
                    }}
                    value={sectionTitles[sectionId]}
                  />
                  <span className="cv-section-item-count">
                    {sectionId === "profile"
                      ? Number(Boolean(editableCv.summary))
                      : sectionId === "experience"
                        ? editableCv.experience.length
                        : sectionId === "education"
                          ? editableCv.education.length
                          : sectionId === "projects"
                            ? editableCv.projects.length
                            : sectionId === "skills"
                              ? editableCv.skillGroups.length
                              : sectionId === "languages"
                                ? editableCv.languages.length
                                : sectionId === "awards"
                                  ? editableCv.awards.length
                                  : editableCv.certifications.length}
                  </span>
                  <button
                    aria-label={`${hiddenSections.includes(sectionId) ? "Show" : "Hide"} ${sectionTitles[sectionId]}`}
                    aria-pressed={!hiddenSections.includes(sectionId)}
                    className="cv-section-visibility"
                    onClick={() => toggleSectionVisibility(sectionId)}
                    type="button"
                  >
                    {hiddenSections.includes(sectionId) ? "◯" : "◉"}
                  </button>
                  <button
                    aria-label={`${expandedSections.includes(sectionId) ? "Collapse" : "Expand"} ${sectionTitles[sectionId]} items`}
                    aria-expanded={expandedSections.includes(sectionId)}
                    className={`cv-section-expand ${
                      expandedSections.includes(sectionId) ? "expanded" : ""
                    }`}
                    onClick={() => toggleSectionExpanded(sectionId)}
                    type="button"
                  >
                    <span aria-hidden="true">⌄</span>
                  </button>
                  <div
                    className="cv-section-more"
                    data-section-id={sectionId}
                  >
                    <button
                      aria-label={`More ${sectionTitles[sectionId]} options`}
                      aria-expanded={openSectionMenu === sectionId}
                      aria-haspopup="menu"
                      onClick={() =>
                        setOpenSectionMenu((current) =>
                          current === sectionId ? null : sectionId,
                        )
                      }
                      type="button"
                    >
                      ···
                    </button>
                    {openSectionMenu === sectionId && (
                      <div className="cv-section-more-menu" role="menu">
                        <button
                          role="menuitem"
                          aria-label={`Move ${sectionTitles[sectionId]} to sidebar`}
                          disabled={sectionPlacements[sectionId] === "sidebar"}
                          onClick={() => {
                            toggleSectionPlacement(sectionId);
                            setOpenSectionMenu(null);
                          }}
                          type="button"
                        >
                          Move to sidebar
                        </button>
                        <button
                          role="menuitem"
                          aria-label={`Delete ${sectionTitles[sectionId]} section`}
                          onClick={() => {
                            setOpenSectionMenu(null);
                            deleteSection(sectionId);
                          }}
                          type="button"
                        >
                          Delete section
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {expandedSections.includes(sectionId) && (
                  <div className="cv-section-editor-fields">
                    {renderSectionEditor(sectionId)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </fieldset>
        ) : (
          <button
            className="cv-editor-entry-button"
            onClick={() => setEditMode(true)}
            type="button"
          >
            Edit CV and layout
          </button>
        ),
        controlsHost,
      )}

      <div
        ref={previewPagesRef}
        data-template={template}
        className={`cv-preview-pages ${useDenseLayout ? "cv-preview-pages-dense" : ""}`}
        aria-label="CV pages"
      >
        {pageSections.map((sections, pageIndex) => (
          <article
            aria-label={`CV page ${pageIndex + 1}`}
            className="cv-preview-page"
            key={`cv-page-${pageIndex}`}
          >
            <div className="cv-preview-content">
            <header className="cv-preview-header">
              <div>
                <h2>
                  <EditableText
                    editMode={false}
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
                      editMode={false}
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
                        editMode={false}
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

            <div
              className="cv-preview-columns"
              style={{
                gridTemplateColumns: usesSidebar
                  ? `minmax(0, ${100 - sidebarWidth}fr) minmax(0, ${sidebarWidth}fr)`
                  : "minmax(0, 1fr)",
                zoom: fontSize / 12,
                "--cv-line-spacing": lineSpacing,
              } as CSSProperties}
            >
              <div className="cv-preview-main">
                {sections.main.map(renderSection)}
              </div>
              {usesSidebar && (
                <aside className="cv-preview-sidebar">
                  {sections.sidebar.map(renderSection)}
                </aside>
              )}
            </div>
            {pageSections.length > 1 && (
              <footer className="cv-preview-page-number">
                Page {pageIndex + 1} of {pageSections.length}
              </footer>
            )}
          </div>
          </article>
        ))}
      </div>

      <div className="cv-preview-actions">
        <button
          type="button"
          onClick={() => {
            if (previewPagesRef.current) {
              exportPreviewPdf(previewPagesRef.current);
            }
          }}
        >
          Export PDF
        </button>
      </div>
    </section>
  );
}
