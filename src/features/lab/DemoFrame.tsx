import type { ReactNode } from "react";

/** Shared shell for every lab demo: a labelled group, a plain-language note and a polite status line. */
export function DemoFrame({
  className,
  label,
  note,
  status,
  statusId,
  children,
}: {
  className: string;
  label: string;
  note: string;
  status: string;
  statusId: string;
  children: ReactNode;
}) {
  return (
    <div className={`lab lab-${className}`} role="group" aria-label={label}>
      {children}
      <p className="lab-note">{note}</p>
      <p className="sr-only" id={statusId} aria-live="polite">
        {status}
      </p>
    </div>
  );
}
