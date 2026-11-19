/**
 * The single animation clock. Every per-frame consumer (motion, scene, cursor,
 * previews, audio parameter updates, overview) subscribes here.
 */
type TickFn = (dt: number, t: number) => void;
interface Sub { fn: TickFn; priority: number }

const subs: Sub[] = [];
let raf = 0;
let last = 0;

function frame(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  const t = now / 1000;
  for (let i = 0; i < subs.length; i++) {
    try {
      subs[i].fn(dt, t);
    } catch (err) {
      console.error("[ticker]", err);
    }
  }
  raf = subs.length ? requestAnimationFrame(frame) : 0;
}

/** Lower priority runs first. Motion = -10, scene = 10, audio = 20. */
export function onTick(fn: TickFn, priority = 0): () => void {
  const sub = { fn, priority };
  subs.push(sub);
  subs.sort((a, b) => a.priority - b.priority);
  if (!raf && typeof window !== "undefined") {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return () => {
    const i = subs.indexOf(sub);
    if (i >= 0) subs.splice(i, 1);
    if (!subs.length && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Frame-rate independent damping toward target with time constant tau seconds. */
export const damp = (cur: number, target: number, tau: number, dt: number) => target + (cur - target) * Math.exp(-dt / Math.max(1e-4, tau));
