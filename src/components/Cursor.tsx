"use client";

import { useEffect, useRef } from "react";
import { live, ui } from "@/lib/store";
import { damp, onTick } from "@/lib/ticker";

const ACTIONABLE = 'a[href], button, [role="button"], summary, label, input[type="range"]';
const TEXTY = "p, h1, h2, h3, h4, li, dd, dt, figcaption, blockquote, .selectable";
const MAG_MAX = 4;

/**
 * Fine-pointer cursor: a small high-contrast dot and an eased ring over actionable media.
 * The real pointer remains the hit target; the native text cursor shows over prose.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const forced = window.matchMedia("(forced-colors: active)");
    let enabled = false;
    let mode: "dot" | "action" | "media" | "text" | "hidden" = "hidden";
    let rx = 0;
    let ry = 0;
    let magEl: HTMLElement | null = null;

    const resetMag = () => {
      const inner = magEl?.querySelector<HTMLElement>(".mag");
      if (inner) inner.style.transform = "";
      magEl = null;
    };

    const evaluate = () => {
      const want = fine.matches && !forced.matches && !ui.get().reduceMotion;
      if (want === enabled) return;
      enabled = want;
      root.classList.toggle("cursor", enabled);
      if (!enabled) resetMag();
    };

    const onOver = (e: PointerEvent) => {
      if (!enabled || e.pointerType !== "mouse") return;
      const t = e.target as Element;
      if (t.closest("[data-cursor=media]") && !t.closest("button")) mode = "media";
      else if (t.closest(ACTIONABLE)) mode = "action";
      else if (t.closest(TEXTY)) mode = "text";
      else mode = "dot";
      const mag = t.closest<HTMLElement>("[data-magnetic]");
      if (mag !== magEl) {
        resetMag();
        magEl = mag;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!enabled || e.pointerType !== "mouse") return;
      if (dot.current) dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (magEl) {
        const r = magEl.getBoundingClientRect();
        const dx = Math.max(-MAG_MAX, Math.min(MAG_MAX, (e.clientX - (r.left + r.width / 2)) * 0.12));
        const dy = Math.max(-MAG_MAX, Math.min(MAG_MAX, (e.clientY - (r.top + r.height / 2)) * 0.18));
        const inner = magEl.querySelector<HTMLElement>(".mag");
        if (inner) inner.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      }
    };
    const onLeave = () => {
      mode = "hidden";
      resetMag();
    };

    evaluate();
    fine.addEventListener("change", evaluate);
    forced.addEventListener("change", evaluate);
    const unsub = ui.subscribe(evaluate);
    document.addEventListener("pointerover", onOver);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    const off = onTick((dt) => {
      if (!enabled) return;
      const p = live.pointer;
      const shown = p.inside ? mode : "hidden";
      rx = damp(rx, p.x, 0.07, dt);
      ry = damp(ry, p.y, 0.07, dt);
      if (Math.abs(rx - p.x) > 300 || Math.abs(ry - p.y) > 300) {
        rx = p.x;
        ry = p.y;
      }
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
        ring.current.dataset.mode = shown;
      }
      if (dot.current) dot.current.dataset.mode = shown;
    }, 5);

    return () => {
      off();
      unsub();
      resetMag();
      root.classList.remove("cursor");
      fine.removeEventListener("change", evaluate);
      forced.removeEventListener("change", evaluate);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" data-mode="hidden" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" data-mode="hidden" />
    </>
  );
}
