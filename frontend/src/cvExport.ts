const EXPORT_CSS = `
@page {
  size: A4;
  margin: 0;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #ffffff;
}

body {
  color: #1f2430;
  font-family: Georgia, "Times New Roman", serif;
}

.cv-export-pages {
  display: grid;
  gap: 0;
}

.cv-preview-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  min-height: 0;
  margin: 0;
  padding: 15.35mm 16.95mm;
  color: #1f2430;
  background: #ffffff;
  box-shadow: none;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.92rem;
  line-height: 1.48;
  page-break-after: always;
  break-after: page;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: normal;
}

.cv-preview-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.cv-preview-page-number {
  position: absolute;
  right: 6mm;
  bottom: 4mm;
  color: #687082;
  font: 9pt Arial, Helvetica, sans-serif;
}

.cv-preview-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 0.45fr);
  gap: 34px;
  padding-bottom: 24px;
  border-bottom: 2px solid #202434;
}

.cv-preview-header h2 {
  margin: 0;
  color: #111522;
  font-size: 2.45rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.cv-preview-header p {
  margin: 12px 0 0;
  color: #4b5263;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.cv-preview-header ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  color: #4b5263;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.74rem;
  line-height: 1.35;
  list-style: none;
  overflow-wrap: anywhere;
}

.cv-preview-section {
  margin-top: 24px;
}

.cv-preview-section h3 {
  margin: 0 0 12px;
  padding-bottom: 7px;
  color: #111522;
  border-bottom: 1px solid #c9ced8;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.cv-preview-section p {
  margin: 0;
}

.cv-preview-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.48fr) minmax(210px, 0.72fr);
  gap: 42px;
}

.cv-preview-main,
.cv-preview-sidebar {
  display: grid;
  align-content: start;
  gap: 0;
  min-width: 0;
}

.cv-preview-sidebar {
  padding-left: 8%;
  border-left: 1px solid #d2d2d2;
}

.cv-export-pages[data-template="minimal"] .cv-preview-columns {
  display: grid;
}

.cv-preview-entry-list {
  display: grid;
  gap: 16px;
}

.cv-preview-entry {
  min-width: 0;
}

.cv-preview-entry-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
}

.cv-preview-entry-heading h4 {
  margin: 0;
  color: #111522;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.96rem;
  line-height: 1.28;
  overflow-wrap: anywhere;
}

.cv-preview-entry-heading p {
  margin-top: 2px;
  color: #4b5263;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}

.cv-preview-entry-heading span {
  flex: 0 0 auto;
  max-width: 160px;
  color: #687082;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.72rem;
  line-height: 1.35;
  text-align: right;
  overflow-wrap: anywhere;
}

.cv-preview-meta {
  margin-top: 5px !important;
  color: #687082;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.76rem;
  overflow-wrap: anywhere;
}

.cv-preview-entry > p:not(.cv-preview-meta) {
  margin-top: 8px;
}

.cv-preview-entry ul {
  display: grid;
  gap: 4px;
  margin: 9px 0 0;
  padding-left: 18px;
}

.cv-preview-entry li {
  padding-left: 2px;
  overflow-wrap: anywhere;
}

.cv-preview-bullet-row {
  display: block;
}

.cv-preview-editable {
  display: inline;
  min-width: 1ch;
  outline: 0;
}

.cv-preview-link {
  color: inherit;
  text-decoration: none;
}

.cv-preview-compact-list {
  display: grid;
  gap: 11px;
}

.cv-preview-compact-line {
  display: grid;
  gap: 3px;
  color: #4b5263;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}

.cv-preview-compact-line strong {
  color: #111522;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.cv-preview-pages-dense .cv-preview-page {
  padding: 12.7mm 14.82mm;
  font-size: 0.84rem;
  line-height: 1.38;
}

.cv-preview-pages-dense .cv-preview-header {
  gap: 24px;
  padding-bottom: 18px;
}

.cv-preview-pages-dense .cv-preview-header h2 {
  font-size: 2rem;
}

.cv-preview-pages-dense .cv-preview-section {
  margin-top: 18px;
}

.cv-preview-pages-dense .cv-preview-section h3 {
  margin-bottom: 9px;
  padding-bottom: 5px;
}

.cv-preview-pages-dense .cv-preview-entry-list {
  gap: 11px;
}

.cv-preview-pages-dense .cv-preview-entry ul {
  gap: 2px;
  margin-top: 6px;
}

.cv-preview-pages-dense .cv-preview-columns {
  gap: 30px;
}

.cv-export-pages[data-template="modern"] .cv-preview-page {
  font-family: Arial, Helvetica, sans-serif;
}

.cv-export-pages[data-template="modern"] .cv-preview-header {
  border-bottom-color: #28779a;
}

.cv-export-pages[data-template="modern"] .cv-preview-section h3 {
  color: #246a88;
  border-bottom: 2px solid #78b6c7;
}

.cv-export-pages[data-template="minimal"] .cv-preview-header {
  border-bottom: 1px solid #a7a7a7;
}

.cv-export-pages[data-template="minimal"] .cv-preview-header h2 {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.cv-export-pages[data-template="minimal"] .cv-preview-section h3 {
  color: #292929;
  border-bottom: 0;
  letter-spacing: 0.1em;
}

.cv-export-pages[data-template="executive"] .cv-preview-page {
  background: #fcfbf8;
}

.cv-export-pages[data-template="executive"] .cv-preview-header {
  padding: 22px;
  color: #fff;
  background: #24334c;
  border: 0;
}

.cv-export-pages[data-template="executive"] .cv-preview-header h2,
.cv-export-pages[data-template="executive"] .cv-preview-header p,
.cv-export-pages[data-template="executive"] .cv-preview-header ul {
  color: #fff;
}

.cv-export-pages[data-template="executive"] .cv-preview-section h3 {
  color: #24334c;
  border-bottom: 2px solid #c8a86b;
}

.cv-export-pages[data-template="creative"] .cv-preview-header {
  padding-left: 22px;
  border-bottom: 0;
  border-left: 6px solid #9360a7;
}

.cv-export-pages[data-template="creative"] .cv-preview-header h2,
.cv-export-pages[data-template="creative"] .cv-preview-section h3 {
  color: #75468b;
}

.cv-export-pages[data-template="creative"] .cv-preview-section h3 {
  border-bottom-color: #d4b8de;
}

.cv-export-pages[data-template="compact"] .cv-preview-page {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.86rem;
  line-height: 1.35;
}

.cv-export-pages[data-template="compact"] .cv-preview-header {
  gap: 22px;
  padding-bottom: 16px;
  border-bottom-color: #398a79;
}

.cv-export-pages[data-template="compact"] .cv-preview-section {
  margin-top: 16px;
}

.cv-export-pages[data-template="compact"] .cv-preview-section h3 {
  color: #276b5e;
  margin-bottom: 8px;
  padding-bottom: 4px;
}

.cv-export-pages[data-template="compact"].cv-preview-pages-dense
  .cv-preview-page {
  padding: 10mm 12mm;
  font-size: 0.78rem;
  line-height: 1.25;
}

.cv-preview-columns,
.cv-preview-columns * {
  line-height: var(--cv-line-spacing, 1.4) !important;
}

.cv-layout-section {
  min-width: 0;
}

.cv-export-pages[data-template="classic"] .cv-preview-header {
  grid-template-columns: 1fr;
}

.cv-export-pages[data-template="classic"] .cv-preview-header ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.cv-export-pages[data-template="modern"] .cv-preview-page {
  font-family: Arial, Helvetica, sans-serif;
}

.cv-export-pages[data-template="modern"] .cv-preview-header {
  grid-template-columns: 1fr;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid #777;
}

.cv-export-pages[data-template="modern"] .cv-preview-header ul,
.cv-export-pages[data-template="creative"] .cv-preview-header ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.cv-export-pages[data-template="modern"] .cv-preview-sidebar {
  padding: 10px 0 10px 12px;
  border-left: 2px solid #b9b9b9;
}

.cv-export-pages[data-template="minimal"] .cv-preview-columns {
  display: grid;
}

.cv-export-pages[data-template="minimal"] .cv-layout-section {
  break-inside: avoid;
}

.cv-export-pages[data-template="minimal"] .cv-preview-section h3 {
  padding: 0 0 5px;
  border-bottom: 1px solid #555;
}

.cv-export-pages[data-template="executive"] .cv-preview-header {
  grid-template-columns: minmax(0, 1fr) minmax(150px, 0.5fr);
  padding: 0 0 14px;
  color: #1f2430;
  background: #fff;
  border-bottom: 3px double #555;
}

.cv-export-pages[data-template="executive"] .cv-preview-header h2 {
  color: #111522;
  font-variant: small-caps;
}

.cv-export-pages[data-template="executive"] .cv-preview-header p,
.cv-export-pages[data-template="executive"] .cv-preview-header ul {
  color: #4b5263;
}

.cv-export-pages[data-template="executive"] .cv-preview-sidebar {
  padding: 10px 10px 10px 0;
  border-left: 0;
  border-top: 1px solid #888;
}

.cv-export-pages[data-template="creative"] .cv-preview-header {
  display: block;
  padding: 0 0 18px;
}

.cv-export-pages[data-template="creative"] .cv-preview-header ul {
  margin-top: 12px;
}

.cv-export-pages[data-template="creative"] .cv-preview-section h3 {
  padding: 5px 8px;
  color: #111522;
  border: 1px solid #555;
}

.cv-export-pages[data-template="compact"] .cv-preview-header {
  grid-template-columns: minmax(0, 1fr) minmax(130px, 0.55fr);
  gap: 18px;
  padding-bottom: 12px;
  border-bottom-color: #777;
}

.cv-export-pages[data-template="compact"] .cv-preview-columns {
  column-gap: 4%;
}

.cv-export-pages[data-template="compact"] .cv-preview-sidebar {
  padding-left: 6%;
  border-left: 1px solid #aaa;
}

.cv-export-pages[data-template] .cv-preview-header h2,
.cv-export-pages[data-template] .cv-preview-section h3 {
  color: #111522;
}

.cv-export-pages[data-template="modern"] .cv-preview-header,
.cv-export-pages[data-template="modern"] .cv-preview-section h3 {
  border-color: #777;
}

.cv-export-pages[data-template] .cv-preview-header h2,
.cv-export-pages[data-template] .cv-preview-section h3 {
  color: #111522;
}

.cv-layout-section.wide {
  padding: 8px 10px;
  border: 1px solid #d2d2d2;
}

.cv-bullet-ai-button,
.cv-bullet-rewrite-panel,
.cv-rich-text-toolbar {
  display: none !important;
}

.cv-rich-text-editor {
  display: contents;
}
`;

// Clones only the printable CV pages and strips edit-only controls before export.
function cleanPreviewElement(previewElement: HTMLElement): HTMLElement {
  const clone = previewElement.cloneNode(true) as HTMLElement;
  const originalTextareas =
    previewElement.querySelectorAll<HTMLTextAreaElement>(
      "textarea.cv-preview-editable",
    );
  const clonedTextareas =
    clone.querySelectorAll<HTMLTextAreaElement>(
      "textarea.cv-preview-editable",
    );

  clone.querySelectorAll(".cv-bullet-ai-button, .cv-bullet-rewrite-panel").forEach(
    (element) => element.remove(),
  );
  clonedTextareas.forEach((textarea, index) => {
      const text = document.createElement("span");
      text.className = textarea.className;
      const html = originalTextareas[index]?.dataset.exportHtml;
      if (html && /<[a-z][\s\S]*>/i.test(html)) {
        text.innerHTML = html;
      } else {
        const value =
          originalTextareas[index]?.value ?? textarea.value;
        const linkPattern =
          /(https?:\/\/[^\s|]+|www\.[^\s|]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
        let lastIndex = 0;
        value.replace(linkPattern, (match, _capture: string, offset: number) => {
          text.append(document.createTextNode(value.slice(lastIndex, offset)));
          const anchor = document.createElement("a");
          anchor.href = match.includes("@")
            ? `mailto:${match}`
            : match.toLowerCase().startsWith("www.")
              ? `https://${match}`
              : match;
          anchor.textContent = match;
          anchor.rel = "noreferrer";
          anchor.target = "_blank";
          text.append(anchor);
          lastIndex = offset + match.length;
          return match;
        });
        text.append(document.createTextNode(value.slice(lastIndex)));
      }
      textarea.replaceWith(text);
  });
  clone.querySelectorAll("[contenteditable]").forEach((element) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("suppresscontenteditablewarning");
  });
  clone.className = [
    "cv-export-pages",
    previewElement.classList.contains("cv-preview-pages-dense")
      ? "cv-preview-pages-dense"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  clone.dataset.template = previewElement.dataset.template ?? "classic";

  return clone;
}

function exportHtml(previewElement: HTMLElement): string {
  const previewClone = cleanPreviewElement(previewElement);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CV Export</title>
    <style>${EXPORT_CSS}</style>
  </head>
  <body>${previewClone.outerHTML}</body>
</html>`;
}

// Prints the same A4 preview markup from an isolated iframe so exported PDFs match the UI.
export function exportPreviewPdf(previewElement: HTMLElement): void {
  const frame = document.createElement("iframe");

  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.append(frame);

  const printWindow = frame.contentWindow;

  if (!printWindow) {
    frame.remove();
    throw new Error("The PDF export frame could not be created.");
  }

  printWindow.document.open();
  printWindow.document.write(exportHtml(previewElement));
  printWindow.document.close();
  printWindow.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}
