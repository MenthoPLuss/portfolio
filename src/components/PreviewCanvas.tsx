"use client";

import { useEffect, useRef } from "react";
import type { ProjectSlug } from "@/content/portfolio";
import { drawPreview, resetFontCache, STILL_T } from "@/lib/previews";
import { onTick } from "@/lib/ticker";
import { ui } from "@/lib/store";
import { registerMedia, unregisterMedia, type MediaEntry } from "@/lib/mediaRegistry";

interface Props {
  slug: ProjectSlug;
  paused?: boolean;
  /** Mirror this canvas into the WebGL gallery layer. */
  gl?: boolean;
  className?: string;
  maxDpr?: number;
}

/** Animated, code-drawn preview. Draws only while visible, at most ~30 fps. */
export function PreviewCanvas({ slug, paused = false, gl = false, className, maxDpr = 1.5 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    redrawRef.current();
  }, [paused]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let visible = false;
    let t = STILL_T[slug];
    let sinceDraw = 1;
    let entry: MediaEntry | null = null;
    const poster = gl ? (canvas.closest("[data-gl-media]") as HTMLElement | null) : null;
    if (poster) entry = registerMedia(slug, canvas, poster);

    const draw = () => {
      if (!w || !h) return;
      drawPreview(slug, ctx, w, h, t);
      if (entry) entry.version++;
    };
    redrawRef.current = () => {
      if (ui.get().reduceMotion) t = STILL_T[slug];
      draw();
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const nw = Math.max(2, Math.round(r.width * dpr));
      const nh = Math.max(2, Math.round(r.height * dpr));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      canvas.width = w;
      canvas.height = h;
      if (entry) entry.sizeVersion++;
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      resetFontCache();
      draw();
    });

    const unsubUi = ui.subscribe(() => redrawRef.current());

    const off = onTick((dt) => {
      if (!visible || pausedRef.current || ui.get().reduceMotion) return;
      t += dt;
      sinceDraw += dt;
      if (sinceDraw < 1 / 30) return;
      sinceDraw = 0;
      draw();
    });

    return () => {
      cancelled = true;
      off();
      ro.disconnect();
      io.disconnect();
      unsubUi();
      if (entry) unregisterMedia(entry);
    };
  }, [slug, gl, maxDpr]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
