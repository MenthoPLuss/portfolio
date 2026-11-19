"use client";

import { ui } from "@/lib/store";

export function PlayOverview() {
  return (
    <button
      type="button"
      className="play-overview"
      data-overview-trigger
      data-magnetic
      onClick={() => ui.set({ overviewOpen: true })}
    >
      <span className="mag">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M8 5.5 L18.5 12 L8 18.5 Z" fill="currentColor" />
        </svg>
        Play overview
      </span>
    </button>
  );
}
