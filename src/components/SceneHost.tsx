"use client";

import { useEffect, useRef } from "react";
import { ui } from "@/lib/store";
import { completeTask, SCENE_TASKS, webglAvailable } from "@/lib/loader";
import type { SceneHandle } from "@/lib/scene/scene";

/** Lazily starts the single WebGL scene; falls back to the static DOM poster otherwise. */
export function SceneHost() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let handle: SceneHandle | null = null;
    let starting = false;
    let failed = false;
    let disposed = false;
    const root = document.documentElement;

    const settleAll = () => SCENE_TASKS.forEach(completeTask);

    const stop = () => {
      handle?.dispose();
      handle = null;
      root.classList.remove("gl");
      ui.set({ glActive: false });
    };

    const start = async () => {
      if (handle || starting || failed || disposed) return;
      if (ui.get().reduceMotion || !webglAvailable()) {
        settleAll();
        return;
      }
      starting = true;
      try {
        const mod = await import("@/lib/scene/scene");
        completeTask("scene-module");
        if (disposed || ui.get().reduceMotion || !ref.current) {
          starting = false;
          settleAll();
          return;
        }
        handle = mod.createScene(ref.current, {
          mobile: window.matchMedia("(max-width: 720px), (pointer: coarse)").matches,
          onStep: (step) => {
            completeTask(step);
            if (step === "first-frame") {
              root.classList.add("gl");
              ui.set({ glActive: true });
            }
          },
          onLost: () => {
            failed = true;
            stop();
          },
        });
      } catch (err) {
        console.warn("[scene] falling back to static poster", err);
        failed = true;
        stop();
        settleAll();
      } finally {
        starting = false;
      }
    };

    const sync = () => {
      if (ui.get().reduceMotion) {
        if (handle) stop();
      } else void start();
    };
    // Give the text and poster the first frames.
    const id = window.setTimeout(sync, 30);
    const unsub = ui.subscribe(sync);
    return () => {
      disposed = true;
      window.clearTimeout(id);
      unsub();
      stop();
    };
  }, []);

  return <canvas ref={ref} className="scene-canvas" aria-hidden="true" />;
}
