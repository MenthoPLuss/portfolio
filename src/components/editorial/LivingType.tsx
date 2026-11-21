"use client";

import { useEffect, useRef } from "react";
import { editorial } from "@/content/portfolio";
import { animate, damp } from "@/lib/motion/frame";

const BASE_WGHT = 380;
const PEAK_WGHT = 640;
const RADIUS = 140; // px of influence around the pointer

function Word({ text }: { text: string }) {
  return (
    <span className="lt-word">
      {Array.from(text).map((c, i) => (
        <span key={i} className="lt-g">
          {c}
        </span>
      ))}
    </span>
  );
}

function Line({ words, i, children }: { words?: string; i: number; children?: React.ReactNode }) {
  return (
    <span className="lt-line" style={{ ["--i" as string]: i }}>
      <span className="lt-inner">
        {words?.split(" ").map((w, k, all) => (
          <span key={k}>
            <Word text={w} />
            {k < all.length - 1 ? " " : null}
          </span>
        ))}
        {children}
      </span>
    </span>
  );
}

/** Does the loaded display face respond to the weight axis? Measured, not assumed. */
function hasWeightAxis(el: HTMLElement) {
  const probe = document.createElement("span");
  probe.textContent = "Mhuman";
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:inherit;font-size:100px;`;
  el.appendChild(probe);
  probe.style.fontVariationSettings = `"wght" 200`;
  const a = probe.getBoundingClientRect().width;
  probe.style.fontVariationSettings = `"wght" 800`;
  const b = probe.getBoundingClientRect().width;
  probe.remove();
  return Math.abs(a - b) > 2;
}

/**
 * The signature headline. The reveal is pure CSS, so it works before hydration.
 * On fine pointers, glyphs near the cursor gain weight (or lift slightly when the
 * face has no weight axis). Glyph boxes are width-locked first, so nothing reflows.
 */
export function LivingType() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const html = document.documentElement;
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)");
    if (!fine.matches || html.classList.contains("reduce")) return;

    const glyphs = Array.from(root.querySelectorAll<HTMLElement>(".lt-g"));
    let centers: { x: number; y: number }[] = [];
    let current = glyphs.map(() => 0);
    let target = glyphs.map(() => 0);
    let axis = false;
    let ready = false;
    let stop: (() => void) | null = null;

    const measure = () => {
      glyphs.forEach((g) => {
        g.style.width = "";
      });
      const sx = window.scrollX;
      const sy = window.scrollY;
      centers = glyphs.map((g) => {
        const r = g.getBoundingClientRect();
        g.style.width = `${r.width}px`;
        return { x: r.left + r.width / 2 + sx, y: r.top + r.height / 2 + sy };
      });
    };

    const apply = () => {
      glyphs.forEach((g, i) => {
        const v = current[i];
        if (axis) g.style.fontVariationSettings = `"wght" ${Math.round(BASE_WGHT + (PEAK_WGHT - BASE_WGHT) * v)}`;
        else g.style.transform = v > 0.001 ? `translateY(${(-0.035 * v).toFixed(4)}em)` : "";
      });
    };

    const run = () => {
      if (stop) return;
      stop = animate((dt) => {
        let moving = false;
        for (let i = 0; i < current.length; i++) {
          current[i] = damp(current[i], target[i], 0.12, dt);
          if (Math.abs(current[i] - target[i]) > 0.002) moving = true;
          else current[i] = target[i];
        }
        apply();
        if (!moving) stop = null;
        return moving;
      });
    };

    const onMove = (e: PointerEvent) => {
      if (!ready || e.pointerType !== "mouse") return;
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      target = centers.map((c) => {
        const d = Math.hypot(c.x - x, (c.y - y) * 1.4);
        return d > RADIUS * 2 ? 0 : Math.exp(-(d * d) / (2 * RADIUS * RADIUS));
      });
      run();
    };
    const onLeave = () => {
      target = target.map(() => 0);
      run();
    };

    const hero = root.closest("section") ?? root;
    let cancelled = false;
    // Wait for fonts and for the entrance reveal to finish before locking glyph widths.
    const start = window.setTimeout(() => {
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (cancelled) return;
        axis = hasWeightAxis(root);
        root.dataset.living = axis ? "axis" : "lift";
        measure();
        current = glyphs.map(() => 0);
        target = glyphs.map(() => 0);
        ready = true;
      });
    }, 1300);
    const onResize = () => {
      if (!ready) return;
      measure();
    };

    hero.addEventListener("pointermove", onMove as EventListener, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      stop?.();
      hero.removeEventListener("pointermove", onMove as EventListener);
      hero.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      glyphs.forEach((g) => {
        g.style.width = "";
        g.style.fontVariationSettings = "";
        g.style.transform = "";
      });
    };
  }, []);

  const [l1, l2] = editorial.heroLines;
  return (
    <h1 id="hero-title" className="hero-title">
      <span className="sr-only">{`${l1} ${l2} ${editorial.heroAccentWord}.`}</span>
      <span ref={ref} className="lt" aria-hidden="true">
        <Line words={l1} i={0} />
        <Line words={l2} i={1} />
        <Line i={2}>
          <span className="lt-accent">
            <Word text={editorial.heroAccentWord} />
          </span>
          <span className="lt-dot">.</span>
        </Line>
      </span>
    </h1>
  );
}
