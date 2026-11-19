"use client";

import { useEffect, useId, useRef, useState } from "react";
import { setVolume, toggleSound } from "@/lib/audio/sound";
import { ui, useStore, type SoundState } from "@/lib/store";

export function SoundButtonLabel({ state, enableText }: { state: SoundState; enableText?: string }) {
  const text =
    state === "on"
      ? "Sound on"
      : state === "starting"
        ? "Starting sound…"
        : state === "blocked"
          ? "Sound blocked · retry"
          : state === "waiting"
            ? "Resume sound"
            : enableText ?? "Sound off";
  return (
    <>
      <span className="eq" data-on={state === "on"} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="mag">{text}</span>
    </>
  );
}

export function SoundControl() {
  const state = useStore(ui, (s) => s.soundState, "off");
  const volume = useStore(ui, (s) => s.volume, 0.7);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "on") setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="sound-dock" ref={wrap}>
      {open ? (
        <div className="volume-pop" id={panelId}>
          <label>
            <span className="mono">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-valuetext={`${Math.round(volume * 100)} percent`}
            />
          </label>
        </div>
      ) : null}
      <button
        type="button"
        className="pill sound-btn"
        data-magnetic
        aria-pressed={state === "on"}
        aria-label={state === "on" ? "Sound on. Turn sound off" : undefined}
        onClick={toggleSound}
      >
        <SoundButtonLabel state={state} />
      </button>
      {state === "on" ? (
        <button
          type="button"
          className="pill vol-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          title="Volume"
        >
          <span className="sr-only">Volume</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 8 H20 M4 16 H20" />
            <circle cx="9" cy="8" r="2.2" fill="currentColor" />
            <circle cx="15" cy="16" r="2.2" fill="currentColor" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
