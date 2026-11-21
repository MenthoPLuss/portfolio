"use client";

import { useEffect } from "react";
import { audioStats, enableSound, onVisibility, play } from "@/lib/audio/cues";
import { safeGet, ui, type Cue } from "@/lib/store";

/**
 * Event-driven page behaviour, with no animation loop:
 * motion preference, scroll-in reveals, the header's scrolled state and the sound bridge.
 */
export function PageSystems() {
  // Motion preference: system by default, persistent override from the Reduce motion control.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stored = safeGet("ab.motion");
    const pref = stored === "reduce" || stored === "full" ? stored : "system";
    const compute = () => {
      const s = ui.get();
      return s.motionPref === "reduce" || (s.motionPref === "system" && mq.matches);
    };
    ui.set({ motionPref: pref, soundPref: safeGet("ab.sound") === "on" });
    const sync = () => {
      const reduce = compute();
      if (reduce !== ui.get().reduceMotion) ui.set({ reduceMotion: reduce });
      root.classList.toggle("reduce", reduce);
      root.classList.toggle("motion", !reduce);
    };
    sync();
    mq.addEventListener("change", sync);
    const unsub = ui.subscribe(sync);
    return () => {
      mq.removeEventListener("change", sync);
      unsub();
    };
  }, []);

  // Reveals: each element enters once, using the variant named in data-reveal.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Header state, updated on scroll events only.
  useEffect(() => {
    let raf = 0;
    let was = false;
    const update = () => {
      raf = 0;
      const now = window.scrollY > 8;
      if (now !== was) {
        was = now;
        document.documentElement.classList.toggle("scrolled", now);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Sound bridge: cues are requested as events and play only when sound is on.
  useEffect(() => {
    let cleanupGesture = () => {};
    if (safeGet("ab.sound") === "on") {
      ui.set({ soundState: "waiting" });
      const onGesture = (e: Event) => {
        if (e instanceof KeyboardEvent && (e.key === "Tab" || e.key === "Escape" || e.metaKey || e.ctrlKey || e.altKey)) return;
        cleanupGesture();
        const s = ui.get().soundState;
        if (s === "waiting" || s === "blocked") enableSound();
      };
      window.addEventListener("pointerdown", onGesture, true);
      window.addEventListener("keydown", onGesture, true);
      cleanupGesture = () => {
        window.removeEventListener("pointerdown", onGesture, true);
        window.removeEventListener("keydown", onGesture, true);
        cleanupGesture = () => {};
      };
    }
    const onCue = (e: Event) => play((e as CustomEvent<Cue>).detail);
    const onVis = () => onVisibility(document.hidden);
    window.addEventListener("ab:sfx", onCue);
    document.addEventListener("visibilitychange", onVis);
    (window as unknown as { __abAudio?: () => unknown }).__abAudio = audioStats;
    return () => {
      cleanupGesture();
      window.removeEventListener("ab:sfx", onCue);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
