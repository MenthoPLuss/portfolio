import { ICON_PATHS, MARK_PATHS, MARK_PATHS_SMALL, MARK_STROKE, MARK_STROKE_SMALL } from "@/lib/mark";

/** Decorative AB monogram. Hidden from assistive technology; pair with visible text. */
export function Monogram({ className, stroke = MARK_STROKE, title }: { className?: string; stroke?: number; title?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function ProjectIcon({ name, className }: { name: string; className?: string }) {
  const icon = ICON_PATHS[name];
  if (!icon) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon.paths.map((d) => (
        <path key={d} d={d} />
      ))}
      {icon.circles?.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </svg>
  );
}

/**
 * The identity tile: the AB monogram in ink on a signal-lime square.
 * Small sizes use the simplified geometry that stays legible at 16-24px.
 */
export function MarkTile({ large = false }: { large?: boolean }) {
  const paths = large ? MARK_PATHS : MARK_PATHS_SMALL;
  return (
    <span className={`mark-tile${large ? " mark-tile-lg" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={large ? 1.7 : MARK_STROKE_SMALL - 0.4} strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}
