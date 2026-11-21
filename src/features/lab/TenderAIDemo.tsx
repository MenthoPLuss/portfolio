"use client";

import { useEffect, useReducer } from "react";
import { FIELD_LABELS, FIELD_ORDER, tenders } from "./data/tenders";
import { sfx, ui } from "@/lib/store";
import { DemoFrame } from "./DemoFrame";
import "./lab.css";

type Mode = "document" | "compare";
type State = { doc: string; step: number; running: boolean; mode: Mode };
type Action =
  | { type: "select"; doc: string }
  | { type: "extract"; instant: boolean }
  | { type: "advance" }
  | { type: "mode"; mode: Mode }
  | { type: "reset" };

const STEPS = FIELD_ORDER.length;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "select":
      return { doc: a.doc, step: 0, running: false, mode: "document" };
    case "extract":
      return a.instant ? { ...s, step: STEPS, running: false } : { ...s, step: 1, running: true };
    case "advance":
      return s.step + 1 >= STEPS ? { ...s, step: STEPS, running: false } : { ...s, step: s.step + 1 };
    case "mode":
      return { ...s, mode: a.mode };
    case "reset":
      return { ...s, step: 0, running: false };
  }
}

const STEP_MS = 380;

export default function TenderAIDemo({ idPrefix }: { idPrefix: string }) {
  const [s, dispatch] = useReducer(reducer, { doc: tenders[0].id, step: 0, running: false, mode: "document" });
  const tender = tenders.find((t) => t.id === s.doc)!;

  useEffect(() => {
    if (!s.running) return;
    const id = window.setTimeout(() => dispatch({ type: "advance" }), STEP_MS);
    return () => window.clearTimeout(id);
  }, [s.running, s.step]);

  useEffect(() => {
    if (s.step === STEPS) sfx("success");
  }, [s.step]);

  const shown = FIELD_ORDER.slice(0, s.step);
  const currentLine = s.step > 0 && s.step <= STEPS ? tender.fields[FIELD_ORDER[s.step - 1]].line : -1;
  const sourceLines = new Set(shown.map((k) => tender.fields[k].line));

  const earliest = Math.min(...tenders.map((t) => t.compare.deadlineSort));
  const lowestEmd = Math.min(...tenders.map((t) => t.compare.emd));
  const highest = Math.max(...tenders.map((t) => t.compare.valueLakh));

  const status =
    s.mode === "compare"
      ? "Comparing all three fictional tenders."
      : s.step === STEPS
        ? `Extracted ${STEPS} sample fields from ${tender.title}.`
        : s.step > 0
          ? `Extracting: ${FIELD_LABELS[FIELD_ORDER[s.step - 1]]}.`
          : `Selected ${tender.title}.`;

  return (
    <DemoFrame
      className="tender"
      label="Tender AI document extraction preview"
      note="Fictional tenders. The extracted fields are prewritten sample data that illustrate the interface. They are not output from Tender AI."
      status={status}
      statusId={`${idPrefix}-status`}
    >
      <div className="tender-bar">
        <div className="tender-tabs" role="group" aria-label="Sample tender documents">
          {tenders.map((t) => (
            <button key={t.id} type="button" className="lab-chip" aria-pressed={s.mode === "document" && s.doc === t.id} onClick={() => dispatch({ type: "select", doc: t.id })}>
              {t.short}
            </button>
          ))}
        </div>
        <button type="button" className="lab-chip" aria-pressed={s.mode === "compare"} onClick={() => dispatch({ type: "mode", mode: s.mode === "compare" ? "document" : "compare" })}>
          Compare all three
        </button>
      </div>

      {s.mode === "document" ? (
        <div className="tender-layout">
          <div className="tender-doc" aria-label={`Fictional document: ${tender.title}`}>
            <p className="lab-kicker">Fictional document</p>
            <ol>
              {tender.lines.map((line, i) => (
                <li key={i} data-source={sourceLines.has(i)} data-current={currentLine === i}>
                  {line}
                </li>
              ))}
            </ol>
          </div>
          <div className="tender-fields">
            <p className="lab-kicker">Structured view</p>
            <dl>
              {FIELD_ORDER.map((k, i) => (
                <div key={k} data-filled={i < s.step}>
                  <dt>{FIELD_LABELS[k]}</dt>
                  <dd>{i < s.step ? tender.fields[k].value : "—"}</dd>
                </div>
              ))}
            </dl>
            {s.step === 0 ? (
              <button type="button" className="lab-primary" onClick={() => dispatch({ type: "extract", instant: ui.get().reduceMotion })}>
                Extract fields
              </button>
            ) : (
              <button type="button" className="lab-reset" onClick={() => dispatch({ type: "reset" })} disabled={s.running}>
                {s.running ? "Extracting…" : "Reset"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tender-compare">
          <table>
            <caption className="sr-only">Comparison of three fictional tenders</caption>
            <thead>
              <tr>
                <th scope="col">Tender</th>
                <th scope="col">Estimated value</th>
                <th scope="col">EMD</th>
                <th scope="col">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((t) => (
                <tr key={t.id}>
                  <th scope="row">{t.title}</th>
                  <td data-hl={t.compare.valueLakh === highest}>
                    {t.fields.value.value}
                    {t.compare.valueLakh === highest ? <em>Highest value</em> : null}
                  </td>
                  <td data-hl={t.compare.emd === lowestEmd}>
                    {t.fields.emd.value}
                    {t.compare.emd === lowestEmd ? <em>Lowest EMD</em> : null}
                  </td>
                  <td data-hl={t.compare.deadlineSort === earliest}>
                    {t.compare.deadline}
                    {t.compare.deadlineSort === earliest ? <em>Closes first</em> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DemoFrame>
  );
}
