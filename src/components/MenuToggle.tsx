"use client";

import { useEffect } from "react";
import { ui, useStore } from "@/lib/store";

/** Compact menu for small screens. The nav itself is server-rendered. */
export function MenuToggle() {
  const open = useStore(ui, (s) => s.menuOpen, false);
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ui.set({ menuOpen: false });
        document.querySelector<HTMLButtonElement>(".menu-btn")?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest("#site-nav a")) ui.set({ menuOpen: false });
      else if (!t.closest("#site-nav") && !t.closest(".menu-btn")) ui.set({ menuOpen: false });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);
  return (
    <button
      type="button"
      className="pill menu-btn"
      aria-expanded={open}
      aria-controls="site-nav"
      onClick={() => ui.set({ menuOpen: !open })}
    >
      {open ? "Close" : "Menu"}
    </button>
  );
}
