import type { Cue } from "@/lib/store";
import { safeSet, ui } from "@/lib/store";

/**
 * Optional interface sound: four short, quiet cues synthesised with the Web Audio API.
 * Off by default. The AudioContext is created only inside a user gesture.
 * No background music, and nothing plays on pointer movement or scrolling.
 */
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let lastAt = 0;
let voices = 0;

const NOTES: Record<Cue, { f: number; at: number; dur: number; level: number }[]> = {
  tick: [{ f: 1568, at: 0, dur: 0.05, level: 0.035 }],
  open: [
    { f: 659.3, at: 0, dur: 0.18, level: 0.05 },
    { f: 987.8, at: 0.07, dur: 0.24, level: 0.045 },
  ],
  close: [
    { f: 987.8, at: 0, dur: 0.16, level: 0.04 },
    { f: 659.3, at: 0.06, dur: 0.22, level: 0.035 },
  ],
  success: [
    { f: 880, at: 0, dur: 0.14, level: 0.05 },
    { f: 1318.5, at: 0.08, dur: 0.22, level: 0.045 },
  ],
};

function tone(f: number, t: number, dur: number, level: number) {
  if (!ctx || !out || voices > 8) return;
  voices++;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.006);
  g.gain.setTargetAtTime(0, t + 0.01, dur / 3.5);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur * 1.8);
  o.onended = () => {
    g.disconnect();
    voices = Math.max(0, voices - 1);
  };
}

export function play(kind: Cue) {
  if (!ctx || ui.get().soundState !== "on" || ctx.state !== "running") return;
  const now = ctx.currentTime;
  if (now - lastAt < 0.1) return; // cooldown: no pile-ups
  lastAt = now;
  NOTES[kind].forEach((n) => tone(n.f, now + 0.005 + n.at, n.dur, n.level));
}

/** Must be called from a user gesture. */
export function enableSound() {
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    ui.set({ soundState: "blocked" });
    return;
  }
  ui.set({ soundState: "starting" });
  try {
    if (!ctx) {
      ctx = new AC({ latencyHint: "interactive" });
      out = ctx.createGain();
      out.gain.value = 0.8;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      out.connect(limiter).connect(ctx.destination);
    }
  } catch {
    ui.set({ soundState: "blocked" });
    return;
  }
  const c = ctx;
  Promise.race([c.resume(), new Promise((r) => setTimeout(r, 1200))])
    .then(() => {
      if (c.state === "running") {
        ui.set({ soundState: "on", soundPref: true });
        safeSet("ab.sound", "on");
        play("success");
      } else ui.set({ soundState: "blocked" });
    })
    .catch(() => ui.set({ soundState: "blocked" }));
}

export function disableSound() {
  ui.set({ soundState: "off", soundPref: false });
  safeSet("ab.sound", "off");
  ctx?.suspend().catch(() => undefined);
}

export function toggleSound() {
  const s = ui.get().soundState;
  if (s === "on") disableSound();
  else if (s !== "starting") enableSound();
}

export function onVisibility(hidden: boolean) {
  if (!ctx) return;
  if (hidden) ctx.suspend().catch(() => undefined);
  else if (ui.get().soundState === "on") ctx.resume().catch(() => ui.set({ soundState: "blocked" }));
}

export function audioStats() {
  return { state: ctx?.state ?? "none", soundState: ui.get().soundState, voices };
}
