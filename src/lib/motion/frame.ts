/**
 * On-demand animation frames. A loop runs only while its step returns true,
 * so nothing renders while the page is idle.
 */
export function animate(step: (dt: number) => boolean): () => void {
  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (step(dt)) raf = requestAnimationFrame(frame);
    else raf = 0;
  };
  raf = requestAnimationFrame(frame);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}

/** Frame-rate independent approach toward a target with time constant tau (seconds). */
export const damp = (cur: number, target: number, tau: number, dt: number) => target + (cur - target) * Math.exp(-dt / Math.max(1e-4, tau));

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
