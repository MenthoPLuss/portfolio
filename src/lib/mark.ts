/**
 * AB monogram geometry on a 32-unit grid.
 * A: diagonal ascent + short crossbar. Shared upright. B: two open curved bays.
 * The larger lower bay frames the moving project preview (see APERTURE).
 * The same strings feed the favicon, loader, wordmark, hero, canvas previews and overview end frame.
 */
export const MARK_PATHS = [
  "M3 28 L12.5 4", // A diagonal ascent
  "M6.4 19.5 H12.5", // A short crossbar
  "M12.5 4 V28", // shared upright
  "M12.5 4 H18 C21.6 4 23.4 6.1 23.4 8.6 C23.4 11.1 21.6 13 18.6 13", // B upper bay, open
  "M15.6 15.6 H21.2 C26.4 15.6 29.4 18.6 29.4 22 C29.4 25.4 26.4 28 21.2 28 H12.5", // B lower bay, open at top-left
] as const;

export const MARK_STROKE = 1.5;
/**
 * Favicon simplification, checked at 16 px: the crossbar is dropped and the bays are
 * tightened so they stay open at small sizes. Used by src/app/icon.svg (stroke 3.4).
 */
export const MARK_PATHS_SMALL = [
  "M3.5 28 L13 4",
  "M13 4 V28",
  "M13 4 H18.5 C21.6 4 23 5.9 23 8.2 C23 10.5 21.6 12.2 19 12.2",
  "M16.8 15.8 H21 C26 15.8 28.8 18.6 28.8 22 C28.8 25.4 26 28 21 28 H13",
] as const;
export const MARK_STROKE_SMALL = 3.4;

/** Rounded rectangle inside the lower bay, in grid units. */
export const APERTURE = { x: 14.3, y: 17.5, w: 12.4, h: 8.8, r: 1.6 };

/** Icon geometry on a 24-unit grid, ~1.6 stroke, round joins. */
export const ICON_PATHS: Record<string, { paths: string[]; circles?: [number, number, number][] }> = {
  route: {
    paths: ["M7.3 19 H10.5 C12.4 19 13 17.6 13 15.6 V8.4 C13 6.4 13.6 5 15.6 5 H16.7"],
    circles: [[5, 19, 2.2], [19, 5, 2.2]],
  },
  shield: {
    paths: ["M12 3.2 L19 6 V11.6 C19 16 16 19.2 12 20.8 C8 19.2 5 16 5 11.6 V6 Z", "M8.9 12.1 L11.1 14.4 L15.3 9.8"],
  },
  pages: {
    paths: ["M8.5 4.5 H14.5 L19 9 V17.5", "M5 7.5 H11.5 L15.5 11.5 V20.5 H5 Z", "M11.5 7.5 V11.5 H15.5", "M7.5 15 H12.5", "M7.5 17.8 H10.5"],
  },
  plug: {
    paths: ["M9.2 3.5 V7.8", "M14.8 3.5 V7.8", "M6.5 7.8 H17.5 V11.3 C17.5 14.4 15 16.8 12 16.8 C9 16.8 6.5 14.4 6.5 11.3 Z", "M12 16.8 V20.5"],
  },
  people: {
    paths: ["M3.8 19.5 C4.3 16.4 6.3 14.6 9 14.6 C11.7 14.6 13.7 16.4 14.2 19.5", "M13.6 13.9 C14.2 13.7 14.8 13.6 15.5 13.6 C18 13.6 19.8 15.3 20.3 18.2"],
    circles: [[9, 9.4, 3], [15.6, 8.6, 2.4]],
  },
  sports: {
    paths: ["M4 12 H20", "M12 4 C9.6 6.2 8.4 9 8.4 12 C8.4 15 9.6 17.8 12 20", "M12 4 C14.4 6.2 15.6 9 15.6 12 C15.6 15 14.4 17.8 12 20"],
    circles: [[12, 12, 8]],
  },
};
