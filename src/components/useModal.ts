"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Modal plumbing shared by the case dialog and the overview player:
 * one scroll owner, inert page, focus trap, Escape to close.
 */
export function useModal(
  open: boolean,
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const page = document.getElementById("page");
    openCount++;
    root.classList.add("modal-open");
    page?.setAttribute("inert", "");
    const t = requestAnimationFrame(() => {
      (initialFocus?.current ?? panel.current)?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (!panel.current) return;
      // only the top-most modal reacts
      const layers = document.querySelectorAll("[data-modal-layer]");
      const top = layers[layers.length - 1];
      if (top && !top.contains(panel.current)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active && panel.current.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("keydown", onKey);
      openCount--;
      if (openCount <= 0) {
        openCount = 0;
        root.classList.remove("modal-open");
        page?.removeAttribute("inert");
      }
    };
  }, [open, panel, onClose, initialFocus]);
}
