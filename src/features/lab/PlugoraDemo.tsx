"use client";

import { useReducer } from "react";
import { chargers, YOU } from "./data/chargers";
import { sfx } from "@/lib/store";
import { DemoFrame } from "./DemoFrame";
import "./lab.css";

type Phase = "browse" | "slot" | "confirmed";
type State = { charger: string | null; slot: string | null; phase: Phase };
type Action = { type: "charger"; id: string } | { type: "slot"; time: string } | { type: "book" } | { type: "reset" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "charger":
      return { charger: a.id, slot: null, phase: "slot" };
    case "slot":
      return { ...s, slot: a.time };
    case "book":
      return s.charger && s.slot ? { ...s, phase: "confirmed" } : s;
    case "reset":
      return { charger: null, slot: null, phase: "browse" };
  }
}

const distance = (x: number, y: number) => (Math.hypot(x - YOU.x, y - YOU.y) / 40).toFixed(1);

export default function PlugoraDemo({ idPrefix }: { idPrefix: string }) {
  const [s, dispatch] = useReducer(reducer, { charger: null, slot: null, phase: "browse" });
  const charger = chargers.find((c) => c.id === s.charger) ?? null;

  const status =
    s.phase === "confirmed" && charger
      ? `Simulated booking confirmed: ${charger.name} at ${s.slot}. Nothing was reserved.`
      : charger
        ? `${charger.name} selected. ${charger.slots.filter((x) => x.open).length} sample slots open.`
        : "Choose a sample charger on the map or from the list.";

  return (
    <DemoFrame
      className="plug"
      label="Plugora charger booking concept simulation"
      note="Concept simulation with sample chargers. Nothing is reserved, no payment is taken and availability is not live."
      status={status}
      statusId={`${idPrefix}-status`}
    >
      <div className="plug-layout">
        <div className="plug-map">
          <svg viewBox="0 0 100 76" aria-hidden="true">
            <rect width="100" height="76" className="plug-ground" />
            <g className="plug-streets">
              <path d="M-5 30 H105" />
              <path d="M-5 66 C30 60 60 70 105 62" />
              <path d="M30 -5 V81" />
              <path d="M70 -5 C68 25 74 45 72 81" />
              <path d="M-5 8 C40 12 60 4 105 8" />
            </g>
            <path d="M88 -5 C80 30 96 50 86 81" className="plug-river" />
            {charger ? <line x1={YOU.x} y1={YOU.y} x2={charger.x} y2={charger.y} className="plug-line" /> : null}
            <g className="plug-you">
              <circle cx={YOU.x} cy={YOU.y} r={3.2} />
              <circle cx={YOU.x} cy={YOU.y} r={1.3} />
            </g>
            {chargers.map((c) => (
              <g
                key={c.id}
                className="plug-pin"
                data-active={s.charger === c.id}
                data-cursor="Select"
                transform={`translate(${c.x} ${c.y})`}
                onClick={() => dispatch({ type: "charger", id: c.id })}
              >
                <circle r={4.6} />
                <text y={1.6}>{c.letter}</text>
              </g>
            ))}
          </svg>
          <p className="plug-legend">
            <span className="plug-legend-you" aria-hidden="true" /> You (sample position)
          </p>
        </div>

        <div className="plug-panel">
          {s.phase === "confirmed" && charger ? (
            <div className="plug-confirm" role="group" aria-label="Simulated confirmation">
              <p className="lab-kicker">Simulation · nothing booked</p>
              <p className="plug-confirm-title">Slot requested</p>
              <p>
                {charger.name}, today at {s.slot}. In the concept, the host would now confirm the request.
              </p>
              <button type="button" className="lab-reset" onClick={() => dispatch({ type: "reset" })}>
                Start over
              </button>
            </div>
          ) : (
            <>
              <p className="lab-kicker">Sample chargers nearby</p>
              <ul className="plug-list">
                {chargers.map((c) => (
                  <li key={c.id}>
                    <button type="button" className="plug-item" aria-pressed={s.charger === c.id} onClick={() => dispatch({ type: "charger", id: c.id })}>
                      <span className="plug-letter" aria-hidden="true">
                        {c.letter}
                      </span>
                      <span>
                        <strong>{c.name}</strong>
                        <span>
                          {c.connector} · {c.power} · {distance(c.x, c.y)} km
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {charger ? (
                <div className="plug-slots">
                  <p className="lab-kicker">Example slots today · {charger.name}</p>
                  <div role="group" aria-label={`Example slots for ${charger.name}`}>
                    {charger.slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        className="lab-chip"
                        disabled={!slot.open}
                        aria-pressed={s.slot === slot.time}
                        onClick={() => dispatch({ type: "slot", time: slot.time })}
                      >
                        {slot.time}
                        <span className="sr-only">{slot.open ? "" : " (taken)"}</span>
                      </button>
                    ))}
                  </div>
                  <div className="plug-actions">
                    <button
                      type="button"
                      className="lab-primary"
                      disabled={!s.slot}
                      onClick={() => {
                        dispatch({ type: "book" });
                        sfx("success");
                      }}
                    >
                      {s.slot ? `Request ${s.slot} (simulation)` : "Pick a slot"}
                    </button>
                    <button type="button" className="lab-reset" onClick={() => dispatch({ type: "reset" })}>
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
