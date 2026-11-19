"use client";

import { credits } from "@/content/portfolio";
import { sfx } from "@/lib/store";

export function CreditsDetails() {
  return (
    <details className="credits" onToggle={(e) => sfx((e.currentTarget as HTMLDetailsElement).open ? "creditsOpen" : "creditsClose")}>
      <summary>Credits</summary>
      <ul>
        {credits.map((c) => (
          <li key={c.what}>
            <strong>{c.what}</strong> · {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer">{c.who}<span className="sr-only"> (opens in a new tab)</span></a> : c.who} ·{" "}
            <span className="muted">{c.license}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
