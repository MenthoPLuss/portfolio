"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/content/portfolio";
import { drawPreview, resetFontCache, STILL_T } from "@/lib/previews";
import { live, ui, useStore } from "@/lib/store";
import { onTick } from "@/lib/ticker";

const HOLD = 3.6;
const XFADE = 0.6;

/** Project frames cycling inside the monogram's larger bay. */
export function HeroAperture() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [idx, setIdx] = useState(0);
  const reduce = useStore(ui, (s) => s.reduceMotion, false);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const off1 = document.createElement("canvas");
    const off2 = document.createElement("canvas");
    let t = 0;
    let since = 1;
    let shown = 0;
    const draw = () => {
      const w = cv.width;
      const h = cv.height;
      const total = HOLD * projects.length;
      const still = ui.get().reduceMotion;
      const cycleT = still ? 0 : t % total;
      const i = Math.floor(cycleT / HOLD);
      const local = cycleT - i * HOLD;
      const a = projects[i].slug;
      [off1, off2].forEach((c) => {
        if (c.width !== w || c.height !== h) {
          c.width = w;
          c.height = h;
        }
      });
      drawPreview(a, off1.getContext("2d")!, w, h, still ? STILL_T[a] : STILL_T[a] - 1 + local);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off1, 0, 0);
      if (!still && local > HOLD - XFADE) {
        const b = projects[(i + 1) % projects.length].slug;
        drawPreview(b, off2.getContext("2d")!, w, h, STILL_T[b] - 1);
        ctx.globalAlpha = (local - (HOLD - XFADE)) / XFADE;
        ctx.drawImage(off2, 0, 0);
        ctx.globalAlpha = 1;
      }
      const label = !still && local > HOLD - XFADE / 2 ? (i + 1) % projects.length : i;
      if (label !== shown) {
        shown = label;
        setIdx(label);
      }
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(2, Math.round(r.width * dpr));
      cv.height = Math.max(2, Math.round(r.height * dpr));
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      resetFontCache();
      draw();
    });
    const off = onTick((dt) => {
      const s = ui.get();
      if (s.reduceMotion || s.overviewOpen || s.caseSlug || live.heroP > 0.7 || document.hidden) return;
      t += dt;
      since += dt;
      if (since < 1 / 30) return;
      since = 0;
      draw();
    });
    let lastReduce = ui.get().reduceMotion;
    const unsub = ui.subscribe(() => {
      const r = ui.get().reduceMotion;
      if (r !== lastReduce) {
        lastReduce = r;
        draw();
      }
    });
    return () => {
      cancelled = true;
      off();
      ro.disconnect();
      unsub();
    };
  }, []);

  return (
    <>
      <canvas ref={ref} className="aperture-canvas" aria-hidden="true" />
      <span className="aperture-label mono" aria-hidden="true">
        {reduce ? projects[0].title : projects[idx].title}
      </span>
    </>
  );
}
