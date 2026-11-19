"use client";

export function PrintButton() {
  return (
    <button type="button" className="pill" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
