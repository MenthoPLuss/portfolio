"use client";

import { useEffect } from "react";
import { audioStats, cue, enableSound, onHidden, onVisible, setSection, soundEngine } from "@/lib/audio/sound";
import type { Cue, Section } from "@/lib/audio/engine";
import { live, ui } from "@/lib/store";
import { onTick } from "@/lib/ticker";

const ELIGIBLE = 'a[href], button:not([disabled]), [role="button"], summary, input[type="range"]';
const SECTION_HOLD = 0.5; // seconds a section must be stable before the mix follows

export function AudioBridge() {
  useEffect(() => {
    // Remembered preference: resume on the first permitted gesture.
    let gestureCleanup = () => {};
    if (ui.get().soundPref && ui.get().soundState === "off") {
      ui.set({ soundState: "waiting" });
      const onGesture = (e: Event) => {
        if (e instanceof KeyboardEvent && (e.key === "Escape" || e.key === "Tab" || e.metaKey || e.ctrlKey || e.altKey)) return;
        gestureCleanup();
        if (ui.get().soundState === "waiting" || ui.get().soundState === "blocked") enableSound();
      };
      window.addEventListener("pointerdown", onGesture, true);
      window.addEventListener("keydown", onGesture, true);
      gestureCleanup = () => {
        window.removeEventListener("pointerdown", onGesture, true);
        window.removeEventListener("keydown", onGesture, true);
        gestureCleanup = () => {};
      };
    }

    const onSfx = (e: Event) => cue((e as CustomEvent<Cue>).detail);
    window.addEventListener("ab:sfx", onSfx);

    // Hover ticks, deduplicated on the nearest eligible control.
    let current: Element | null = null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest?.(ELIGIBLE) ?? null;
      if (el === current) return;
      const prev = current;
      current = el;
      if (el) cue("enter");
      else if (prev) cue("exit");
    };
    document.addEventListener("pointerover", onOver);

    const onVis = () => {
      if (document.hidden) void onHidden();
      else void onVisible();
    };
    document.addEventListener("visibilitychange", onVis);

    let pending: Section = "top";
    let applied: Section = "top";
    let since = 0;
    let clock = 0;
    const off = onTick((dt) => {
      clock += dt;
      const eng = soundEngine();
      if (!eng) return;
      const s = ui.get();
      const candidate = (s.caseSlug ? "case" : live.section) as Section;
      if (candidate !== pending) {
        pending = candidate;
        since = clock;
      }
      if (pending !== applied && clock - since >= (pending === "case" ? 0 : SECTION_HOLD)) {
        applied = pending;
        setSection(applied);
      }
      eng.frame({ pointer: live.pointer, scrollAbsV: live.scroll.absV });
    }, 20);

    (window as unknown as { __abAudio?: () => unknown }).__abAudio = audioStats;

    return () => {
      gestureCleanup();
      off();
      window.removeEventListener("ab:sfx", onSfx);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
