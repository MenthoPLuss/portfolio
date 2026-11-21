"use client";

import { safeSet, ui, useStore } from "@/lib/store";

/** Persistent motion setting, separate from sound. Defaults to the system preference. */
export function MotionToggle({ className }: { className?: string }) {
  const reduce = useStore(ui, (s) => s.reduceMotion, false);
  return (
    <button
      type="button"
      className={`toggle motion-toggle ${className ?? ""}`}
      aria-pressed={reduce}
      onClick={() => {
        const next = reduce ? "full" : "reduce";
        safeSet("ab.motion", next);
        ui.set({ motionPref: next });
      }}
    >
      <span className="dot" aria-hidden="true" />
      Reduce motion
    </button>
  );
}
