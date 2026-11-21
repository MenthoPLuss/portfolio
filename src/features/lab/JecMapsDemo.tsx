"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { edges, nodes, ORIGIN, pathData, places, shortestPath } from "./data/campus";
import { ui } from "@/lib/store";
import { animate } from "@/lib/motion/frame";
import { DemoFrame } from "./DemoFrame";
import "./lab.css";

type State = { dest: string | null; run: number };
type Action = { type: "select"; dest: string } | { type: "reset" };

function reducer(state: State, action: Action): State {
  if (action.type === "reset") return { dest: null, run: state.run + 1 };
  return { dest: action.dest, run: state.run + 1 };
}

const DRAW_SECONDS = 1.1;

export default function JecMapsDemo({ idPrefix }: { idPrefix: string }) {
  const [state, dispatch] = useReducer(reducer, { dest: null, run: 0 });
  const routePath = useRef<SVGPathElement>(null);
  const traveller = useRef<SVGCircleElement>(null);

  const route = useMemo(() => (state.dest ? shortestPath(ORIGIN, state.dest) : null), [state.dest]);
  const place = places.find((p) => p.id === state.dest);
  const via = route ? route.path.filter((id) => id.startsWith("j")).map((id) => nodes[id].label?.replace("Junction ", "")) : [];

  // Draw the route and move a marker along it. The loop stops when the marker arrives.
  useEffect(() => {
    const path = routePath.current;
    const dot = traveller.current;
    if (!route || !path || !dot) return;
    const total = path.getTotalLength();
    const setAt = (k: number) => {
      const p = path.getPointAtLength(total * k);
      dot.setAttribute("cx", p.x.toFixed(2));
      dot.setAttribute("cy", p.y.toFixed(2));
      path.style.strokeDashoffset = String(1 - k);
    };
    if (ui.get().reduceMotion) {
      setAt(1);
      return;
    }
    let t = 0;
    setAt(0);
    return animate((dt) => {
      t = Math.min(1, t + dt / DRAW_SECONDS);
      const k = 1 - Math.pow(1 - t, 3);
      setAt(k);
      return t < 1;
    });
  }, [route, state.run]);

  const status = place && route ? `Route to ${place.name}: ${route.path.length - 1} segments, ${Math.round(route.length)} map units.` : "Choose a destination to draw a route from the main gate.";

  return (
    <DemoFrame
      className="maps"
      label="JEC Maps route-finding demonstration"
      note="Demonstration geometry. Places and paths are illustrative, not JEC’s real layout. Routes are computed in your browser."
      status={status}
      statusId={`${idPrefix}-status`}
    >
      <div className="maps-layout">
        <div className="maps-stage">
          <svg viewBox="0 0 100 76" className="maps-svg" aria-hidden="true">
            <rect width="100" height="76" className="maps-ground" />
            {places.map((p) => (
              <g
                key={p.id}
                className="maps-place"
                data-active={state.dest === p.id}
                data-cursor="Select"
                onClick={() => dispatch({ type: "select", dest: p.id })}
              >
                <rect x={p.rect[0]} y={p.rect[1]} width={p.rect[2]} height={p.rect[3]} rx={p.id === "field" ? 6 : 0.8} />
                <text x={p.labelAt[0]} y={p.labelAt[1]}>
                  {p.name.toUpperCase()}
                </text>
              </g>
            ))}
            <g className="maps-roads">
              {edges.map(([a, b]) => (
                <line key={a + b} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
              ))}
            </g>
            {route ? (
              <g key={state.run}>
                <path d={pathData(route.path)} className="maps-route-under" />
                <path ref={routePath} d={pathData(route.path)} className="maps-route" pathLength={1} />
                <circle ref={traveller} r={1.6} className="maps-traveller" cx={nodes[ORIGIN].x} cy={nodes[ORIGIN].y} />
              </g>
            ) : null}
            <circle cx={nodes[ORIGIN].x} cy={nodes[ORIGIN].y} r={2} className="maps-origin" />
            <text x={2} y={57} className="maps-origin-label">
              GATE
            </text>
          </svg>
        </div>

        <div className="maps-panel">
          <p className="lab-kicker">From Main gate to</p>
          <div className="maps-dests" role="group" aria-label="Destinations">
            {places.map((p) => (
              <button
                key={p.id}
                type="button"
                className="lab-chip"
                aria-pressed={state.dest === p.id}
                aria-describedby={`${idPrefix}-status`}
                onClick={() => dispatch({ type: "select", dest: p.id })}
              >
                {p.name}
              </button>
            ))}
          </div>
          <dl className="maps-info" data-filled={!!route}>
            <div>
              <dt>Destination</dt>
              <dd>{place ? place.name : "Not selected"}</dd>
            </div>
            <div>
              <dt>Via</dt>
              <dd>{via.length ? via.map((v) => `Junction ${v}`).join(" → ") : "—"}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{route ? `${Math.round(route.length)} map units · ${route.path.length - 1} segments` : "—"}</dd>
            </div>
          </dl>
          {route ? (
            <button type="button" className="lab-reset" onClick={() => dispatch({ type: "reset" })}>
              Reset route
            </button>
          ) : null}
        </div>
      </div>
    </DemoFrame>
  );
}
