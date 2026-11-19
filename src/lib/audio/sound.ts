import type { AudioEngine, Cue, Section } from "./engine";
import { live, safeSet, ui } from "@/lib/store";

/**
 * Owns the single AudioContext for the whole visit. The context is created and
 * resumed only inside a user gesture; the engine module itself loads lazily.
 */
let ctx: AudioContext | null = null;
let engine: AudioEngine | null = null;
let enginePromise: Promise<AudioEngine> | null = null;
let attempt = 0;

function getEngine(c: AudioContext) {
  if (!enginePromise) {
    enginePromise = import("./engine").then((m) => {
      engine = new m.AudioEngine(c);
      engine.onAccent = (v) => {
        live.accent = Math.max(live.accent, v * 0.6);
      };
      return engine;
    });
  }
  return enginePromise;
}

/** Must be called synchronously from a user gesture (click, keydown, pointerdown). */
export function enableSound() {
  const state = ui.get().soundState;
  if (state === "on" || state === "starting") return;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    ui.set({ soundState: "blocked" });
    return;
  }
  ui.set({ soundState: "starting" });
  const my = ++attempt;
  try {
    if (!ctx || ctx.state === "closed") ctx = new AC({ latencyHint: "interactive" });
  } catch {
    ui.set({ soundState: "blocked" });
    return;
  }
  const c = ctx;
  const resumed = c.resume().catch(() => undefined);
  const timeout = new Promise((r) => setTimeout(r, 1500));
  Promise.all([getEngine(c), Promise.race([resumed, timeout])])
    .then(([eng]) => {
      if (my !== attempt) return;
      if (c.state === "running") {
        eng.setVolume(ui.get().volume);
        eng.setEnabled(true);
        if (ui.get().overviewOpen) eng.overviewStart();
        ui.set({ soundState: "on", soundPref: true });
        safeSet("ab.sound", "on");
      } else {
        ui.set({ soundState: "blocked" });
      }
    })
    .catch(() => {
      if (my === attempt) ui.set({ soundState: "blocked" });
    });
}

export function disableSound() {
  attempt++;
  ui.set({ soundState: "off", soundPref: false });
  safeSet("ab.sound", "off");
  if (engine) engine.setEnabled(false);
  const c = ctx;
  if (c) {
    window.setTimeout(() => {
      if (ui.get().soundState === "off" && c.state === "running") c.suspend().catch(() => undefined);
    }, 400);
  }
}

export function toggleSound() {
  const s = ui.get().soundState;
  if (s === "on") disableSound();
  else if (s !== "starting") enableSound();
}

export function setVolume(v: number) {
  ui.set({ volume: v });
  safeSet("ab.volume", v.toFixed(2));
  engine?.setVolume(v);
}

export function soundEngine(): AudioEngine | null {
  return ui.get().soundState === "on" ? engine : null;
}

export function cue(kind: Cue) {
  soundEngine()?.cue(kind);
}

export function setSection(s: Section) {
  engine?.setSection(s);
}

export function overviewAudio(action: "start" | "pause" | "resume" | "stop") {
  if (!engine) return;
  if (action === "start") engine.overviewStart();
  else if (action === "pause") engine.overviewPause(true);
  else if (action === "resume") engine.overviewPause(false);
  else engine.overviewStop();
}

export async function onHidden() {
  if (engine && ctx && ctx.state === "running") await engine.suspendForHidden();
}

export async function onVisible() {
  if (!engine || ui.get().soundState !== "on") return;
  const ok = await engine.resumeAfterVisible();
  if (!ok) ui.set({ soundState: "blocked" });
}

export function audioStats() {
  return engine ? engine.stats() : { state: ctx?.state ?? "none", enabled: false };
}
