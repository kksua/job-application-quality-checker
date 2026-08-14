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
  width: 210mm;
  min-height: 297mm;
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
}

.cv-preview-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.cv-preview-page-continuation {
  padding-top: 14.29mm;
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
}

.cv-preview-header p {
  margin: 12px 0 0;
  color: #4b5263;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
}

.cv-preview-entry-heading p {
  margin-top: 2px;
  color: #4b5263;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.82rem;
}

.cv-preview-entry-heading span {
  flex: 0 0 auto;
  max-width: 160px;
  color: #687082;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.72rem;
  line-height: 1.35;
  text-align: right;
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
}

.cv-preview-bullet-row {
  display: block;
}

.cv-preview-editable {
  display: inline;
  min-width: 1ch;
  outline: 0;
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
}

.cv-preview-compact-line strong {
  color: #111522;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cv-bullet-ai-button,
.cv-bullet-rewrite-panel {
  display: none !important;
}
`;

function cleanPreviewElement(previewElement: HTMLElement): HTMLElement {
  const clone = previewElement.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(".cv-bullet-ai-button, .cv-bullet-rewrite-panel").forEach(
    (element) => element.remove(),
  );
  clone.querySelectorAll("[contenteditable]").forEach((element) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("suppresscontenteditablewarning");
  });
  clone.className = "cv-export-pages";

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
