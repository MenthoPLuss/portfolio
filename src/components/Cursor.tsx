"use client";

import { useEffect, useRef } from "react";
import { ui } from "@/lib/store";
import { animate, damp } from "@/lib/motion/frame";

/**
 * Contextual cursor for fine pointers. The native cursor is never hidden, so
 * text selection and link affordances behave normally. A small follower shows
 * a label only where an action is genuinely available (elements with data-cursor).
 * Its animation loop runs only while it is catching up with the pointer.
 */
export function Cursor() {
  const el = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    const text = label.current;
    if (!node || !text) return;
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const forced = window.matchMedia("(forced-colors: active)");
    let enabled = false;
    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;
    let stop: (() => void) | null = null;

    const evaluate = () => {
      enabled = fine.matches && !forced.matches && !ui.get().reduceMotion;
      document.documentElement.classList.toggle("has-cursor", enabled);
      if (!enabled) node.dataset.show = "false";
    };

    const run = () => {
      if (stop) return;
      stop = animate((dt) => {
        cx = damp(cx, x, 0.06, dt);
        cy = damp(cy, y, 0.06, dt);
        node.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        const moving = Math.abs(cx - x) > 0.3 || Math.abs(cy - y) > 0.3;
        if (!moving) stop = null;
        return moving;
      });
    };

    const onMove = (e: PointerEvent) => {
      if (!enabled || e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (node.dataset.show !== "true") {
        cx = x;
        cy = y;
      }
      const target = (e.target as Element | null)?.closest?.<HTMLElement>("[data-cursor]");
      const want = target?.dataset.cursor ?? "";
      if (text.textContent !== want) text.textContent = want;
      node.dataset.show = want ? "true" : "false";
      run();
    };
    const onLeave = () => {
      node.dataset.show = "false";
    };

    evaluate();
    fine.addEventListener("change", evaluate);
    forced.addEventListener("change", evaluate);
    const unsub = ui.subscribe(evaluate);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      stop?.();
      unsub();
      fine.removeEventListener("change", evaluate);
      forced.removeEventListener("change", evaluate);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div ref={el} className="cursor" data-show="false" aria-hidden="true">
      <span ref={label} className="cursor-label" />
    </div>
  );
}
