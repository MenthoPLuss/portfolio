"use client";

import { useEffect } from "react";
import { live, safeGet, suppressVelocity, ui } from "@/lib/store";
import { clamp, damp, onTick, smooth } from "@/lib/ticker";

const SECTIONS = ["top", "about", "work", "skills", "experience", "education", "contact"];

function applyMotionClasses(reduce: boolean) {
  const root = document.documentElement;
  root.classList.toggle("reduce", reduce);
  root.classList.toggle("motion", !reduce);
}

/**
 * Owns the per-frame page state: scroll velocity, pointer, hero descent progress,
 * active section and preferences. Everything downstream reads `live` or `ui`.
 */
export function MotionSystem() {
  useEffect(() => {
    // ---- preferences
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const storedMotion = safeGet("ab.motion");
    const motionPref = storedMotion === "reduce" || storedMotion === "full" ? storedMotion : "system";
    const vol = parseFloat(safeGet("ab.volume") ?? "");
    ui.set({
      motionPref,
      reduceMotion: motionPref === "reduce" || (motionPref === "system" && mq.matches),
      soundPref: safeGet("ab.sound") === "on",
      volume: Number.isFinite(vol) ? clamp(vol) : 0.7,
    });
    const syncMotion = () => {
      const s = ui.get();
      const reduce = s.motionPref === "reduce" || (s.motionPref === "system" && mq.matches);
      if (reduce !== s.reduceMotion) ui.set({ reduceMotion: reduce });
      applyMotionClasses(reduce);
    };
    syncMotion();
    mq.addEventListener("change", syncMotion);
    const unsubUi = ui.subscribe(syncMotion);

    // ---- pointer
    const p = live.pointer;
    const onMove = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      p.nx = e.clientX / window.innerWidth;
      p.ny = e.clientY / window.innerHeight;
      p.inside = true;
      p.fine = e.pointerType === "mouse" || e.pointerType === "pen";
      p.lastMove = performance.now();
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) p.inside = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    const onBlur = () => (p.inside = false);
    window.addEventListener("blur", onBlur);

    // ---- jumps that must not read as fast scrolling
    const onJump = () => suppressVelocity(6);
    window.addEventListener("hashchange", onJump);
    window.addEventListener("resize", onJump);
    window.addEventListener("pageshow", onJump);
    window.addEventListener("popstate", onJump);
    const onVis = () => suppressVelocity(6);
    document.addEventListener("visibilitychange", onVis);

    // ---- reveal-on-enter, one understated entrance per group
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    // ---- per-frame
    const hero = document.getElementById("top");
    const contact = document.getElementById("contact");
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav]"));
    let lastY = window.scrollY;
    let lastPX = p.x;
    let lastPY = p.y;
    let sectionTimer = 0;
    let wasScrolled = false;
    const heroVars: Record<string, string> = {};

    const setVar = (el: HTMLElement, name: string, value: string) => {
      if (heroVars[name] === value) return;
      heroVars[name] = value;
      el.style.setProperty(name, value);
    };

    const off = onTick((dt) => {
      // scroll velocity with spike clamping
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      let raw = dt > 0 ? dy / dt : 0;
      if (live.suppressFrames > 0) {
        live.suppressFrames--;
        raw = 0;
      } else if (Math.abs(dy) > window.innerHeight * 0.9) {
        raw = 0; // anchor jump or restoration, not a gesture
      }
      raw = clamp(raw, -9000, 9000);
      live.scroll.y = y;
      const scrolled = y > 24;
      if (scrolled !== wasScrolled) {
        wasScrolled = scrolled;
        document.documentElement.classList.toggle("scrolled", scrolled);
      }
      live.scroll.v = damp(live.scroll.v, raw, 0.06, dt);
      live.scroll.absV = Math.abs(live.scroll.v);

      // pointer speed (px/s), decays when idle
      const pd = Math.hypot(p.x - lastPX, p.y - lastPY);
      lastPX = p.x;
      lastPY = p.y;
      const pRaw = dt > 0 ? Math.min(6000, pd / dt) : 0;
      p.speed = damp(p.speed, p.inside ? pRaw : 0, pRaw > p.speed ? 0.05 : 0.18, dt);

      // hero descent
      const vh = window.innerHeight;
      if (hero) {
        const r = hero.getBoundingClientRect();
        const travel = Math.max(1, r.height - vh);
        const hp = ui.get().reduceMotion ? 0 : clamp(-r.top / travel);
        live.heroP = hp;
        const s1 = smooth(0, 0.25, hp);
        const s2 = smooth(0.25, 0.65, hp);
        const s3 = smooth(0.65, 1, hp);
        const markY = -(0.04 * s1 + 0.3 * s2) * vh;
        setVar(hero, "--mark-y", `${markY.toFixed(1)}px`);
        setVar(hero, "--mark-s", (1 + 0.05 * s1).toFixed(4));
        setVar(hero, "--mark-o", (1 - smooth(0.38, 0.66, hp)).toFixed(3));
        setVar(hero, "--copy-o", (1 - s2).toFixed(3));
        setVar(hero, "--copy-y", `${(-36 * s2).toFixed(1)}px`);
        setVar(hero, "--intro-o", s3.toFixed(3));
        setVar(hero, "--intro-y", `${(36 * (1 - s3)).toFixed(1)}px`);
        setVar(hero, "--cue-o", (1 - smooth(0.01, 0.1, hp)).toFixed(3));
        hero.toggleAttribute("data-copy-hidden", s2 > 0.98);
        hero.toggleAttribute("data-intro-hidden", s3 < 0.02);
      }
      if (contact) {
        const r = contact.getBoundingClientRect();
        live.contactP = clamp(1 - r.top / vh);
      }

      // active section (throttled)
      sectionTimer += dt;
      if (sectionTimer > 0.1) {
        sectionTimer = 0;
        let active = "top";
        for (const id of SECTIONS) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= vh * 0.45) active = id;
        }
        if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) active = "contact";
        if (active !== live.section) {
          live.section = active;
          navLinks.forEach((a) => {
            const id = a.getAttribute("href")?.slice(1);
            const navActive = id === active || (id === "skills" && (active === "experience" || active === "education"));
            if (navActive) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        }
      }

      live.accent = damp(live.accent, 0, 0.6, dt);
    }, -10);

    return () => {
      off();
      io.disconnect();
      mq.removeEventListener("change", syncMotion);
      unsubUi();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("hashchange", onJump);
      window.removeEventListener("resize", onJump);
      window.removeEventListener("pageshow", onJump);
      window.removeEventListener("popstate", onJump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
