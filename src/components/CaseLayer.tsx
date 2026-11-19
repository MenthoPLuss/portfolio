"use client";

import { useEffect, useRef, useState } from "react";
import { projects, type ProjectSlug } from "@/content/portfolio";
import { adoptDirectCase, closeCase, onPopState, openCase, runPendingRestore } from "@/lib/cases";
import { ui, useStore } from "@/lib/store";
import { ProjectIcon } from "./Marks";
import { PreviewCanvas } from "./PreviewCanvas";
import { useModal } from "./useModal";

let seeded = false;

export function CaseLayer({ initialSlug }: { initialSlug: string | null }) {
  if (typeof window !== "undefined" && initialSlug && !seeded) {
    seeded = true;
    ui.seed({ caseSlug: initialSlug });
  }
  const stored = useStore(ui, (s) => s.caseSlug, initialSlug);
  const slug = stored;
  const project = slug ? projects.find((p) => p.slug === slug) : null;
  const panel = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduce = useStore(ui, (s) => s.reduceMotion, false);
  const [paused, setPaused] = useState(false);

  // direct entry + history wiring
  useEffect(() => {
    let raf = 0;
    if (initialSlug) {
      // Wait for Next.js to stamp its router state on the current entry, so the
      // entries we add stay inside the app router (no full reload on Back/Forward).
      let tries = 0;
      const adopt = () => {
        const state = window.history.state as { __NA?: unknown } | null;
        // The router patches history.pushState in a parent effect that runs after ours.
        const patched = Object.prototype.hasOwnProperty.call(window.history, "pushState");
        if ((state?.__NA && patched) || tries++ > 90) adoptDirectCase(initialSlug);
        else raf = requestAnimationFrame(adopt);
      };
      adopt();
    }
    window.addEventListener("popstate", onPopState);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("popstate", onPopState);
    };
  }, [initialSlug]);

  useModal(!!project, panel, closeCase, titleRef);

  // closed: restore scroll and focus after the dialog and inert state are gone
  useEffect(() => {
    if (!slug) runPendingRestore();
  }, [slug]);

  // new case: start at the top of the sheet
  useEffect(() => {
    if (!slug) return;
    panel.current?.scrollTo({ top: 0 });
    setPaused(false);
    titleRef.current?.focus({ preventScroll: true });
  }, [slug]);

  if (!project) return null;

  const idx = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(idx + 1) % projects.length];

  return (
    <div className="case-layer" data-open="true" data-modal-layer>
      <div className="case-backdrop" onClick={closeCase} aria-hidden="true" />
      <div
        ref={panel}
        className="case-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
        aria-describedby="case-summary"
      >
        <div className="case-bar">
          <span className="mono case-kicker">
            <ProjectIcon name={project.icon} className="icon-sm" /> Case study {idx + 1} of {projects.length}
          </span>
          <button type="button" className="pill case-close" onClick={closeCase} data-magnetic>
            <span className="mag">
              Close<span className="sr-only"> {project.title} case study</span>
            </span>
          </button>
        </div>

        <header className="case-head">
          <p className="mono case-status">{project.status}</p>
          <h2 id="case-title" ref={titleRef} tabIndex={-1}>
            {project.title}
          </h2>
          <p id="case-summary" className="case-summary">
            {project.summary}
          </p>
        </header>

        <figure className="case-media">
          <div className="case-media-frame">
            <PreviewCanvas slug={project.slug as ProjectSlug} paused={paused} maxDpr={2} />
            <span className="badge mono">{project.mediaLabel}</span>
            {!reduce ? (
              <button type="button" className="pill poster-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
                {paused ? "Play" : "Pause"}
                <span className="sr-only"> {project.title} preview</span>
              </button>
            ) : null}
          </div>
          <figcaption>{project.mediaDescription}</figcaption>
        </figure>

        <div className="case-body">
          {project.sections.map((s) => (
            <section key={s.heading} className="case-section">
              <h3>{s.heading}</h3>
              <div>
                {s.body.map((para) => (
                  <p key={para.slice(0, 40)}>{para}</p>
                ))}
              </div>
            </section>
          ))}

          {project.stack ? (
            <section className="case-section">
              <h3>Stack</h3>
              <div>
                <p>{project.stack.join(" · ")}</p>
                {project.stackNote ? <p className="small muted">{project.stackNote}</p> : null}
              </div>
            </section>
          ) : null}

          {project.links.length ? (
            <section className="case-section">
              <h3>Links</h3>
              <ul className="case-links">
                {project.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                      <span aria-hidden="true"> ↗</span>
                    </a>
                    {l.note ? <span className="small muted"> {l.note}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {project.credit ? <p className="small muted case-credit">Credit: {project.credit}.</p> : null}
        </div>

        <footer className="case-foot">
          <a
            href={`/work/${next.slug}`}
            className="case-next"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              openCase(next.slug);
            }}
          >
            <span className="mono small muted">Next case</span>
            <span className="case-next-title">
              <ProjectIcon name={next.icon} className="icon-sm" /> {next.title}
            </span>
          </a>
          <button type="button" className="pill" onClick={closeCase}>
            Back to projects
          </button>
        </footer>
      </div>
    </div>
  );
}
