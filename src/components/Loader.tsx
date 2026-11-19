"use client";

import { useEffect, useRef, useState } from "react";
import { Monogram } from "./Marks";
import { completeTask, expectTasks, loaderState, SCENE_TASKS, webglAvailable } from "@/lib/loader";
import { safeGet, safeSet, ui, useStore } from "@/lib/store";
import { SoundButtonLabel } from "./SoundControl";
import { toggleSound } from "@/lib/audio/sound";

const WARM_CAP = 1500;
const ENTER_AFTER = 2000;
const FAILSAFE = 6000;

export function Loader({ skip }: { skip: boolean }) {
  const [phase, setPhase] = useState<"loading" | "leaving" | "gone">(skip ? "gone" : "loading");
  const [showEnter, setShowEnter] = useState(false);
  const progress = useStore(loaderState, (s) => {
    if (!s.expected.length) return -1;
    return Math.round((s.done.filter((d) => s.expected.includes(d)).length / s.expected.length) * 100);
  }, -1);
  const soundState = useStore(ui, (s) => s.soundState, "off");
  const finishRef = useRef<() => void>(() => {});
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const page = document.getElementById("page");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      root.classList.add("loaded");
      page?.removeAttribute("inert");
      ui.set({ loaderDone: true });
      setPhase("leaving");
      window.setTimeout(() => setPhase("gone"), 650);
    };
    finishRef.current = finish;
    if (skip) {
      // Deep link: no loader at all, just mark the page ready.
      finished = true;
      root.classList.add("loaded");
      ui.set({ loaderDone: true });
      return;
    }
    page?.setAttribute("inert", "");
    const warm = safeGet("ab.warm", "session") === "1";
    safeSet("ab.warm", "1", "session");

    const reduce = root.classList.contains("reduce");
    expectTasks(["fonts", "previews", ...(!reduce && webglAvailable() ? SCENE_TASKS : [])]);

    const fontTimeout = window.setTimeout(() => completeTask("fonts"), 2500);
    (document.fonts?.ready ?? Promise.resolve()).then(() => completeTask("fonts"), () => completeTask("fonts"));
    requestAnimationFrame(() => requestAnimationFrame(() => completeTask("previews")));

    const check = () => {
      const s = loaderState.get();
      if (s.expected.length && s.expected.every((n) => s.done.includes(n))) window.setTimeout(finish, warm ? 150 : 350);
    };
    const unsub = loaderState.subscribe(check);
    check();

    const timers = [
      window.setTimeout(finish, FAILSAFE),
      warm ? window.setTimeout(finish, WARM_CAP) : window.setTimeout(() => setShowEnter(true), ENTER_AFTER),
    ];
    return () => {
      unsub();
      window.clearTimeout(fontTimeout);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [skip]);

  if (phase === "gone") return null;

  const pct = progress < 0 ? null : progress;

  return (
    <div className="loader" data-phase={phase} aria-labelledby="loader-label">
      <div className="loader-top">
        <span id="loader-label" className="loader-label mono">
          Loading
        </span>
        <span className="loader-pct mono" role="status" aria-live="polite">
          {pct === null ? <span className="loader-indet" aria-label="Loading" /> : `${pct}%`}
        </span>
      </div>
      <div className="loader-center">
        <Monogram className="loader-mark" />
        <div className="loader-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${(pct ?? 0) / 100})` }} />
        </div>
        <button type="button" className="pill loader-sound" onClick={toggleSound} aria-pressed={soundState === "on"}>
          <SoundButtonLabel state={soundState} enableText="Enable sound" />
        </button>
      </div>
      <div className="loader-foot">
        <p>
          <strong>Asimangkan Boro</strong> · Software developer from Assam
        </p>
        <nav aria-label="Skip the intro">
          <a href="#work" onClick={() => finishRef.current()}>
            Skip to projects
          </a>
          <a href="/resume">View résumé</a>
          {showEnter ? (
            <button ref={enterRef} type="button" className="pill" onClick={() => finishRef.current()}>
              Enter now
            </button>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
