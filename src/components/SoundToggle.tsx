"use client";

import { toggleSound } from "@/lib/audio/cues";
import { ui, useStore } from "@/lib/store";

const LABEL = {
  off: "Sound off",
  starting: "Sound…",
  on: "Sound on",
  blocked: "Sound blocked · retry",
  waiting: "Resume sound",
} as const;

/** The single, obvious mute control. Interface cues only, off by default. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const state = useStore(ui, (s) => s.soundState, "off");
  return (
    <button type="button" className={`sound-toggle ${className}`} aria-pressed={state === "on"} onClick={toggleSound}>
      <span className="sound-dot" data-on={state === "on"} aria-hidden="true" />
      {LABEL[state]}
    </button>
  );
}
