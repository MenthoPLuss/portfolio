import { useSyncExternalStore } from "react";

type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  /** Set without notifying: only for seeding before the first client render. */
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
  soundPref: boolean;
  soundState: SoundState;
  motionPref: "system" | "reduce" | "full";
  reduceMotion: boolean;
  caseSlug: string | null;
  menuOpen: boolean;
}

export const ui = createStore<UIState>({
  soundPref: false,
  soundState: "off",
  motionPref: "system",
  reduceMotion: false,
  caseSlug: null,
  menuOpen: false,
});

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
}

export type Cue = "tick" | "open" | "close" | "success";

/** Interface sound request. Silent unless the visitor has turned sound on. */
export function sfx(kind: Cue) {
  window.dispatchEvent(new CustomEvent("ab:sfx", { detail: kind }));
}
