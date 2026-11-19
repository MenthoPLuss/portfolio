"use client";

import { useState } from "react";
import type { Project } from "@/content/portfolio";
import { interceptCaseClick } from "@/lib/cases";
import { ui, useStore } from "@/lib/store";
import { PreviewCanvas } from "./PreviewCanvas";

/** DOM poster: always holds the media, label and controls. WebGL mirrors it as a bendable plane. */
export function ProjectPoster({ project }: { project: Project }) {
  const [paused, setPaused] = useState(false);
  const reduce = useStore(ui, (s) => s.reduceMotion, false);
  return (
    <div className="poster" data-gl-media={project.slug} data-cursor="media">
      <PreviewCanvas slug={project.slug} paused={paused} gl className="poster-canvas" />
      <a
        className="poster-link"
        href={`/work/${project.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        onClick={(e) => {
          const article = e.currentTarget.closest("article");
          const link = article ? article.querySelector<HTMLElement>("[data-case-link]") : null;
          interceptCaseClick(e, project.slug, link);
        }}
      />
      <span className="badge mono">{project.mediaLabel}</span>
      {!reduce ? (
        <button type="button" className="pill poster-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
          {paused ? "Play" : "Pause"}
          <span className="sr-only"> {project.title} preview</span>
        </button>
      ) : null}
    </div>
  );
}
