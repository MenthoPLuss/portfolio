"use client";

import { Fragment, useMemo, useReducer, type ReactNode } from "react";
import { inspect, messages, type Signal } from "./data/messages";
import { sfx } from "@/lib/store";
import { DemoFrame } from "./DemoFrame";
import "./lab.css";

type State = { id: string; inspected: boolean; run: number };
type Action = { type: "select"; id: string } | { type: "inspect" } | { type: "reset" };

function reducer(s: State, a: Action): State {
  if (a.type === "select") return { id: a.id, inspected: false, run: s.run };
  if (a.type === "inspect") return { ...s, inspected: true, run: s.run + 1 };
  return { ...s, inspected: false };
}

/** Wraps the first case-insensitive occurrence of each match in a numbered mark. */
function withMarks(text: string, marks: { match: string; n: number }[]): ReactNode {
  type Hit = { start: number; end: number; n: number };
  const hits: Hit[] = [];
  for (const m of marks) {
    const i = text.toLowerCase().indexOf(m.match.toLowerCase());
    if (i >= 0 && !hits.some((h) => i < h.end && i + m.match.length > h.start)) hits.push({ start: i, end: i + m.match.length, n: m.n });
  }
  hits.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let at = 0;
  hits.forEach((h) => {
    out.push(text.slice(at, h.start));
    out.push(
      <mark key={h.start} className="phish-mark" style={{ ["--d" as string]: `${h.n * 140}ms` }}>
        {text.slice(h.start, h.end)}
        <sup aria-hidden="true">{h.n}</sup>
      </mark>,
    );
    at = h.end;
  });
  out.push(text.slice(at));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

export default function MPhishDemo({ idPrefix }: { idPrefix: string }) {
  const [state, dispatch] = useReducer(reducer, { id: messages[0].id, inspected: false, run: 0 });
  const message = messages.find((m) => m.id === state.id)!;
  const result = useMemo(() => inspect(message), [message]);
  const numbered = result.signals.map((s, i) => ({ ...s, n: i + 1 }));
  const marksFor = (where: Signal["where"]) => (state.inspected ? numbered.filter((s) => s.where === where).map((s) => ({ match: s.match, n: s.n })) : []);

  const status = state.inspected
    ? `Inspection of “${message.subject}”: ${result.level} risk, ${result.signals.length} warning sign${result.signals.length === 1 ? "" : "s"}.`
    : `Selected message: ${message.subject}. Choose Inspect message to check it.`;

  return (
    <DemoFrame
      className="phish"
      label="M-PHISH message inspection demonstration"
      note="Synthetic messages on reserved example domains. A few simple rules run in your browser to explain the idea. This is not the M-PHISH engine."
      status={status}
      statusId={`${idPrefix}-status`}
    >
      <div className="phish-layout">
        <div className="phish-list" role="group" aria-label="Sample messages">
          {messages.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className="phish-pick"
              aria-pressed={state.id === m.id}
              onClick={() => dispatch({ type: "select", id: m.id })}
            >
              <span className="lab-index">0{i + 1}</span>
              <span>
                <strong>{m.label}</strong>
                <span className="phish-pick-from">{m.fromName}</span>
              </span>
            </button>
          ))}
        </div>

        <article className="phish-message" aria-label={`Sample message: ${message.subject}`}>
          <header>
            <p className="lab-kicker">Sample message · synthetic</p>
            <p className="phish-from">
              {message.fromName} <span>&lt;{withMarks(message.fromAddress, marksFor("from"))}&gt;</span>
            </p>
            <h4 className="phish-subject">{message.subject}</h4>
          </header>
          <p className="phish-body">{withMarks(message.body, marksFor("body"))}</p>
          <p className="phish-link" title="Shown as text. Not a clickable link.">
            <span className="lab-kicker">Link in message</span>
            <code>{withMarks(message.link, marksFor("link"))}</code>
          </p>
          <div className="phish-actions">
            {state.inspected ? (
              <button type="button" className="lab-reset on-dark" onClick={() => dispatch({ type: "reset" })}>
                Clear inspection
              </button>
            ) : (
              <button
                type="button"
                className="lab-primary"
                onClick={() => {
                  dispatch({ type: "inspect" });
                  sfx("success");
                }}
              >
                Inspect message
              </button>
            )}
          </div>
        </article>

        <section className="phish-report" aria-label="Inspection report" data-ready={state.inspected} key={state.run}>
          {state.inspected ? (
            <>
              <p className="lab-kicker">Assessment</p>
              <p className="phish-level" data-level={result.level}>
                {result.level} risk
              </p>
              {numbered.length ? (
                <ol className="phish-signals">
                  {numbered.map((s) => (
                    <li key={s.id} style={{ ["--d" as string]: `${s.n * 140}ms` }} data-severity={s.severity}>
                      <strong>{s.title}</strong>
                      <span>{s.explain}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              <p className="phish-summary">{result.summary}</p>
            </>
          ) : (
            <p className="phish-empty">The report appears here after you inspect a message.</p>
          )}
        </section>
      </div>
    </DemoFrame>
  );
}
