"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { EvidenceTerm as Term } from "@/content/portfolio";
import { interceptCaseClick } from "@/lib/cases";
import { ProjectIcon } from "./Marks";

/**
 * Inline evidence: hover or keyboard focus reveals an anchored capsule;
 * touch uses the button as a labelled disclosure. Escape or an outside tap dismisses it.
 * The essential fact stays in the visible prose.
 */
export function EvidenceTerm({ term }: { term: Term }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const capsule = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        setPinned(false);
        wrap.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // keep the capsule inside the viewport
  useLayoutEffect(() => {
    const el = capsule.current;
    if (!open || !el) return;
    el.style.setProperty("--shift", "0px");
    const r = el.getBoundingClientRect();
    const margin = 16;
    let shift = 0;
    if (r.right > window.innerWidth - margin) shift = window.innerWidth - margin - r.right;
    if (r.left + shift < margin) shift = margin - r.left;
    el.style.setProperty("--shift", `${shift}px`);
  }, [open]);

  const isCase = term.href.startsWith("/work/");

  return (
    <span
      ref={wrap}
      className="term-wrap"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(hoverTimer.current);
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse" || pinned) return;
        hoverTimer.current = window.setTimeout(() => setOpen(false), 160);
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setPinned(false);
        }
      }}
    >
      <button
        type="button"
        className="term"
        aria-expanded={open}
        aria-controls={id}
        onFocus={() => setOpen(true)}
        onClick={() => {
          if (open && pinned) {
            setOpen(false);
            setPinned(false);
          } else {
            setOpen(true);
            setPinned(true);
          }
        }}
      >
        {term.text}
      </button>
      <span ref={capsule} id={id} className="capsule" data-open={open} hidden={!open}>
        <ProjectIcon name={term.icon} className="capsule-icon" />
        <span className="capsule-text">
          {term.capsule}{" "}
          <a
            href={term.href}
            onClick={(e) => {
              setOpen(false);
              setPinned(false);
              if (isCase) interceptCaseClick(e, term.href.slice(6));
            }}
          >
            {term.linkLabel}
          </a>
        </span>
      </span>
    </span>
  );
}
