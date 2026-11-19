import { createStore } from "./store";

/** Real progress over a small critical asset set. Failures count as settled. */
export const loaderState = createStore<{ expected: string[]; done: string[] }>({ expected: [], done: [] });

export function expectTasks(names: string[]) {
  const s = loaderState.get();
  const expected = Array.from(new Set([...s.expected, ...names]));
  loaderState.set({ expected });
}

export function completeTask(name: string) {
  const s = loaderState.get();
  if (s.done.includes(name)) return;
  loaderState.set({ done: [...s.done, name] });
}

let glCache: boolean | null = null;
export function webglAvailable() {
  if (glCache === null) glCache = detectWebgl();
  return glCache;
}

function detectWebgl() {
  try {
    if (new URLSearchParams(window.location.search).get("gl") === "0") return false;
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export const SCENE_TASKS = ["scene-module", "terrain", "first-frame"];
