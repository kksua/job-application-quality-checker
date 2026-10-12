export type CvSectionId =
  | "profile"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "languages"
  | "awards"
  | "certifications";

export type SectionPlacement = "main" | "sidebar";

export interface CvPageSections {
  main: CvSectionId[];
  sidebar: CvSectionId[];
}

interface CvPaginationInput {
  sectionOrder: CvSectionId[];
  availableSections: CvSectionId[];
  hiddenSections: CvSectionId[];
  placements: Record<CvSectionId, SectionPlacement>;
  wideSections: CvSectionId[];
  sectionHeights: Partial<Record<CvSectionId, number>>;
  pageBodyHeight: number;
  usesSidebar: boolean;
}

export function paginateCvSections({
  sectionOrder,
  availableSections,
  hiddenSections,
  placements,
  wideSections,
  sectionHeights,
  pageBodyHeight,
  usesSidebar,
}: CvPaginationInput): CvPageSections[] {
  const pages: CvPageSections[] = [];
  const usedHeights: { main: number[]; sidebar: number[] } = {
    main: [],
    sidebar: [],
  };
  sectionOrder
    .filter(
      (sectionId) =>
        availableSections.includes(sectionId) &&
        !hiddenSections.includes(sectionId),
    )
    .forEach((sectionId) => {
      const column =
        placements[sectionId] === "sidebar" &&
        usesSidebar &&
        !wideSections.includes(sectionId)
          ? "sidebar"
          : "main";
      let pageIndex = Math.max(0, usedHeights[column].length - 1);
      usedHeights[column][pageIndex] ??= 0;
      const sectionHeight = sectionHeights[sectionId] ?? 0;
      if (
        usedHeights[column][pageIndex] > 0 &&
        usedHeights[column][pageIndex] + sectionHeight > pageBodyHeight
      ) {
        pageIndex += 1;
        usedHeights[column][pageIndex] = 0;
      }
      usedHeights[column][pageIndex] += sectionHeight;
      pages[pageIndex] ??= { main: [], sidebar: [] };
      pages[pageIndex][column].push(sectionId);
    });
  return pages.length > 0 ? pages : [{ main: [], sidebar: [] }];
}
