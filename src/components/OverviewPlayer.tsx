"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { credits, OVERVIEW_DURATION, overviewBeats, person, projects, type ProjectSlug } from "@/content/portfolio";
import { overviewAudio, toggleSound } from "@/lib/audio/sound";
import { C, drawIcon, drawMark, drawPreview, fonts, STILL_T } from "@/lib/previews";
import { sfx, ui, useStore } from "@/lib/store";
import { onTick } from "@/lib/ticker";
import { SoundButtonLabel } from "./SoundControl";
import { useModal } from "./useModal";

const FADE = 0.45;

function beatAt(t: number) {
  const i = overviewBeats.findIndex((b) => t >= b.start && t < b.end);
  return i < 0 ? overviewBeats.length - 1 : i;
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, i: number, local: number, still: boolean) {
  const beat = overviewBeats[i];
  const f = fonts();
  const u = Math.min(w, h) / 20;
  ctx.fillStyle = C.canvas;
  ctx.fillRect(0, 0, w, h);
  // low horizon glow shared by all beats
  const g = ctx.createRadialGradient(w / 2, h * 0.95, 0, w / 2, h * 0.95, w * 0.6);
  g.addColorStop(0, "rgba(255,175,118,0.10)");
  g.addColorStop(1, "rgba(255,175,118,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (beat.scene === "mark" || beat.scene === "contact") {
    const size = h * (beat.scene === "mark" ? 0.46 : 0.26);
    const appear = still ? 1 : Math.min(1, local / 1.2);
    ctx.globalAlpha = appear;
    drawMark(ctx, w / 2 - size / 2, h * (beat.scene === "mark" ? 0.14 : 0.12), size, C.warm, 1.5, u * 0.8);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    if (beat.scene === "mark") {
      ctx.fillStyle = C.warm;
      ctx.font = `600 ${u * 1.5}px ${f.sans}`;
      ctx.fillText(person.name, w / 2, h * 0.76);
      ctx.fillStyle = C.muted;
      ctx.font = `400 ${u * 0.8}px ${f.sans}`;
      ctx.fillText(person.headline, w / 2, h * 0.84);
    } else {
      ctx.fillStyle = C.muted;
      ctx.font = `500 ${u * 0.6}px ${f.mono}`;
      ctx.fillText("SAY HELLO", w / 2, h * 0.58);
      ctx.fillStyle = C.warm;
      ctx.font = `600 ${u * 1.3}px ${f.sans}`;
      ctx.fillText(person.email, w / 2, h * 0.68, w * 0.9);
      ctx.fillStyle = C.muted;
      ctx.font = `400 ${u * 0.7}px ${f.sans}`;
      ctx.fillText(person.location, w / 2, h * 0.76);
    }
    ctx.textAlign = "start";
    return;
  }

  const slug = beat.scene as ProjectSlug;
  const project = projects.find((p) => p.slug === slug)!;
  const fw = w * 0.62;
  const fh = h * 0.7;
  const fx = w * 0.33;
  const fy = h * 0.15;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect?.(fx, fy, fw, fh, u * 0.6);
  ctx.clip();
  ctx.translate(fx, fy);
  // draw the preview into the frame
  const tmp = scratch(fw, fh);
  drawPreview(slug, tmp.ctx, tmp.canvas.width, tmp.canvas.height, still ? STILL_T[slug] : local + 0.3);
  ctx.drawImage(tmp.canvas, 0, 0, fw, fh);
  ctx.restore();
  ctx.fillStyle = C.ember;
  drawIcon(ctx, project.icon, w * 0.05, h * 0.2, u * 1.6, C.ember, 1.6);
  ctx.fillStyle = C.warm;
  ctx.font = `600 ${u * 1.15}px ${f.sans}`;
  wrapText(ctx, project.title, w * 0.05, h * 0.38, w * 0.25, u * 1.35);
  ctx.fillStyle = C.muted;
  ctx.font = `500 ${u * 0.5}px ${f.mono}`;
  wrapText(ctx, project.status.toUpperCase(), w * 0.05, h * 0.62, w * 0.25, u * 0.75);
  ctx.fillStyle = C.sage;
  ctx.fillText(project.mediaLabel.toUpperCase(), w * 0.05, h * 0.86);
}

let scratchCanvas: HTMLCanvasElement | null = null;
function scratch(w: number, h: number) {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  const cw = Math.max(2, Math.round(w));
  const ch = Math.max(2, Math.round(h));
  if (scratchCanvas.width !== cw || scratchCanvas.height !== ch) {
    scratchCanvas.width = cw;
    scratchCanvas.height = ch;
  }
  return { canvas: scratchCanvas, ctx: scratchCanvas.getContext("2d")! };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  });
  if (line) ctx.fillText(line, x, yy);
}

const fmt = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

export function OverviewPlayer() {
  const open = useStore(ui, (s) => s.overviewOpen, false);
  const reduce = useStore(ui, (s) => s.reduceMotion, false);
  const soundState = useStore(ui, (s) => s.soundState, "off");
  const panel = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const playBtn = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [showCredits, setShowCredits] = useState(false);
  const timeRef = useRef(0);
  const playingRef = useRef(true);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    overviewAudio("stop");
    sfx("overviewClose");
    ui.set({ overviewOpen: false });
    const target = returnFocus.current;
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  }, []);

  useModal(open, panel, close, playBtn);

  // open/close lifecycle
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.querySelector<HTMLElement>("[data-overview-trigger]");
    timeRef.current = 0;
    playingRef.current = true;
    setTime(0);
    setPlaying(true);
    setShowCredits(false);
    sfx("overviewOpen");
    overviewAudio("start");
  }, [open]);

  // timeline on the shared clock
  useEffect(() => {
    if (!open) return;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let lastShown = -1;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(2, Math.round(r.width * dpr));
      cv.height = Math.max(2, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const off = onTick((dt) => {
      if (playingRef.current) {
        timeRef.current = Math.min(OVERVIEW_DURATION, timeRef.current + dt);
        if (timeRef.current >= OVERVIEW_DURATION) {
          playingRef.current = false;
          setPlaying(false);
          overviewAudio("pause");
        }
      }
      const t = timeRef.current;
      const still = ui.get().reduceMotion;
      const i = beatAt(Math.min(t, OVERVIEW_DURATION - 0.001));
      const b = overviewBeats[i];
      const local = t - b.start;
      drawScene(ctx, cv.width, cv.height, i, local, still);
      // crossfade from the previous beat
      if (!still && i > 0 && local < FADE) {
        ctx.globalAlpha = 1 - local / FADE;
        const prev = overviewBeats[i - 1];
        drawScene(ctx, cv.width, cv.height, i - 1, prev.end - prev.start, false);
        ctx.globalAlpha = 1;
      }
      const shown = Math.floor(t * 4) / 4;
      if (shown !== lastShown) {
        lastShown = shown;
        setTime(t);
      }
    });
    return () => {
      off();
      ro.disconnect();
    };
  }, [open]);

  if (!open) return null;

  const i = beatAt(Math.min(time, OVERVIEW_DURATION - 0.001));
  const ended = time >= OVERVIEW_DURATION;

  const togglePlay = () => {
    if (ended) {
      timeRef.current = 0;
      setTime(0);
    }
    const next = !playingRef.current || ended;
    playingRef.current = next;
    setPlaying(next);
    overviewAudio(next ? "resume" : "pause");
  };
  const restart = () => {
    timeRef.current = 0;
    setTime(0);
    playingRef.current = true;
    setPlaying(true);
    overviewAudio("resume");
  };

  return (
    <div className="overview-layer" data-modal-layer>
      <div
        ref={panel}
        className="overview-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overview-title"
      >
        <div className="overview-bar">
          <h2 id="overview-title" className="mono">
            Overview · {person.name}
          </h2>
          <button type="button" className="pill" onClick={close}>
            Close<span className="sr-only"> overview</span>
          </button>
        </div>
        <div className="overview-stage">
          <canvas ref={canvas} aria-hidden="true" />
        </div>
        <p className="overview-caption" aria-live="polite">
          {overviewBeats[i].caption}
        </p>
        <div className="overview-progress" aria-hidden="true">
          {overviewBeats.map((b) => (
            <span key={b.start} style={{ flexGrow: b.end - b.start }}>
              <i
                style={{
                  transform: `scaleX(${Math.min(1, Math.max(0, (time - b.start) / (b.end - b.start)))})`,
                }}
              />
            </span>
          ))}
        </div>
        <div className="overview-controls">
          <button ref={playBtn} type="button" className="pill" onClick={togglePlay}>
            {ended ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="pill" onClick={restart}>
            Restart
          </button>
          <button type="button" className="pill" onClick={toggleSound} aria-pressed={soundState === "on"}>
            <SoundButtonLabel state={soundState} />
          </button>
          <button
            type="button"
            className="pill"
            aria-expanded={showCredits}
            aria-controls="overview-credits"
            onClick={() => {
              setShowCredits((s) => !s);
              sfx(showCredits ? "creditsClose" : "creditsOpen");
            }}
          >
            Credits
          </button>
          <span className="mono small muted overview-time" aria-label={`${Math.floor(time)} of ${OVERVIEW_DURATION} seconds`}>
            {fmt(time)} / {fmt(OVERVIEW_DURATION)}
          </span>
        </div>
        {reduce ? <p className="small muted">Reduced motion: scenes change without animation.</p> : null}
        <div id="overview-credits" className="overview-credits" hidden={!showCredits}>
          <ul>
            {credits.map((c) => (
              <li key={c.what}>
                <strong>{c.what}</strong> · {c.who} · <span className="muted">{c.license}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
