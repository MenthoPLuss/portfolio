import type { ProjectSlug } from "@/content/portfolio";

/** Gallery posters that the WebGL layer mirrors as bendable planes. */
export interface MediaEntry {
  id: number;
  slug: ProjectSlug;
  canvas: HTMLCanvasElement;
  poster: HTMLElement;
  /** Bumped whenever the canvas is redrawn. */
  version: number;
  /** Bumped whenever the canvas is resized. */
  sizeVersion: number;
}

let nextId = 1;
export const media = new Map<number, MediaEntry>();

export function registerMedia(slug: ProjectSlug, canvas: HTMLCanvasElement, poster: HTMLElement): MediaEntry {
  const entry: MediaEntry = { id: nextId++, slug, canvas, poster, version: 0, sizeVersion: 0 };
  media.set(entry.id, entry);
  return entry;
}

export function unregisterMedia(entry: MediaEntry) {
  media.delete(entry.id);
}
