import { useSyncExternalStore } from "react";

type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  /** Set without notifying: only for seeding before first client render. */
  seed(patch: Partial<T>): void;
  subscribe(l: Listener): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch) {
      let changed = false;
      for (const k in patch) {
        if (!Object.is(state[k as keyof T], patch[k as keyof T])) changed = true;
      }
      if (!changed) return;
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    seed(patch) {
      state = { ...state, ...patch };
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export function useStore<T extends object, S>(store: Store<T>, select: (s: T) => S, serverValue?: S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => (serverValue !== undefined ? serverValue : select(store.get())),
  );
}

export type SoundState = "off" | "starting" | "on" | "blocked" | "waiting";

export interface UIState {
  /** Visitor's stored wish for sound. Default false on first visit. */
  soundPref: boolean;
  /** Actual audio state as reported by the engine. */
  soundState: SoundState;
  volume: number;
  motionPref: "system" | "reduce" | "full";
  reduceMotion: boolean;
  glActive: boolean;
  loaderDone: boolean;
  overviewOpen: boolean;
  caseSlug: string | null;
  menuOpen: boolean;
}

export const ui = createStore<UIState>({
  soundPref: false,
  soundState: "off",
  volume: 0.7,
  motionPref: "system",
  reduceMotion: false,
  glActive: false,
  loaderDone: false,
  overviewOpen: false,
  caseSlug: null,
  menuOpen: false,
});

/** Non-reactive per-frame values written by the motion system and read by scene and audio. */
export const live = {
  pointer: { x: 0, y: 0, nx: 0.5, ny: 0.5, speed: 0, inside: false, fine: false, lastMove: 0 },
  scroll: { y: 0, v: 0, absV: 0 },
  heroP: 0,
  /** 0 above the contact section, 1 when it fills the view. */
  contactP: 0,
  section: "top",
  /** Musical accent 0..1, decays. Drives a gentle bloom shimmer. */
  accent: 0,
  /** Monotonic flag: jumps (hash, resize, restore) suppress velocity for a few frames. */
  suppressFrames: 0,
};

export function suppressVelocity(frames = 4) {
  live.suppressFrames = Math.max(live.suppressFrames, frames);
}

export function safeGet(key: string, storage: "local" | "session" = "local"): string | null {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string, storage: "local" | "session" = "local") {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
}

export function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Sound cue request. Handled by the audio bridge only when sound is on. */
export function sfx(kind: string) {
  emit("ab:sfx", kind);
}
