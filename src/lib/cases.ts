import { flushSync } from "react-dom";
import { projects } from "@/content/portfolio";
import { sfx, ui } from "./store";

/**
 * Case-study routing over the History API. Each case has a stable URL (/work/<slug>).
 * Opening from the gallery pushes one entry; Back or Close pops it and restores
 * the exact scroll position and focus. Direct entry is rewritten to /#work + case,
 * so closing a directly opened case lands on the gallery.
 */
let returnFocus: HTMLElement | null = null;
let savedY = 0;
let pushed = false;
let direct = false;
let baseTitle = "";

const SLUGS = new Set(projects.map((p) => p.slug));

export function slugFromPath(path: string) {
  const m = path.match(/^\/work\/([a-z0-9-]+)\/?$/);
  return m && SLUGS.has(m[1] as never) ? m[1] : null;
}

function titleFor(slug: string) {
  const p = projects.find((x) => x.slug === slug);
  return p ? `${p.title} · Asimangkan Boro` : baseTitle;
}

function show(slug: string) {
  if (!ui.get().caseSlug && !baseTitle) baseTitle = document.title;
  ui.set({ caseSlug: slug });
  document.title = titleFor(slug);
}

/**
 * Shared-element transition: the exhibit stage and the case media share a
 * view-transition-name, so the browser morphs one into the other. Without
 * View Transitions support, or with reduced motion, the update simply applies.
 */
function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition !== "function" || ui.get().reduceMotion) {
    update();
    return;
  }
  try {
    doc.startViewTransition(() => flushSync(update));
  } catch {
    update();
  }
}

function manualScroll() {
  try {
    window.history.scrollRestoration = "manual";
  } catch {
    /* not supported */
  }
}

export function openCase(slug: string, from?: HTMLElement | null) {
  if (!SLUGS.has(slug as never)) return;
  manualScroll();
  const wasOpen = ui.get().caseSlug;
  if (wasOpen) {
    // moving between cases inside the dialog: keep a single history entry
    window.history.replaceState({ abCase: slug }, "", `/work/${slug}`);
    show(slug);
    return;
  }
  returnFocus = from ?? (document.activeElement as HTMLElement | null);
  savedY = window.scrollY;
  direct = false;
  window.history.pushState({ abCase: slug }, "", `/work/${slug}`);
  pushed = true;
  withTransition(() => show(slug));
  sfx("open");
}

/** Called once on load when the URL is a case URL. */
let adopted = false;

export function adoptDirectCase(slug: string) {
  if (adopted) return;
  adopted = true;
  manualScroll();
  direct = true;
  savedY = 0;
  returnFocus = null;
  baseTitle = "Asimangkan Boro · Software developer from Assam";
  window.history.replaceState({ abBase: true }, "", "/#work");
  window.history.pushState({ abCase: slug }, "", `/work/${slug}`);
  pushed = true;
  show(slug);
  (window as unknown as { __abCaseAdopted?: boolean }).__abCaseAdopted = true;
}

export function closeCase() {
  if (!ui.get().caseSlug) return;
  if (pushed && slugFromPath(window.location.pathname)) {
    window.history.back(); // popstate finishes the close
  } else {
    finishClose();
  }
}

let pendingRestore: (() => void) | null = null;

function finishClose() {
  pushed = false;
  const wasDirect = direct;
  const y = savedY;
  const target = returnFocus;
  direct = false;
  returnFocus = null;
  // Runs from the case layer's effect, after React has removed the dialog and the inert page state.
  pendingRestore = () => {
    if (wasDirect) {
      document.getElementById("work")?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
      document.getElementById("work-title")?.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      if (target && document.contains(target)) target.focus({ preventScroll: true });
    }
  };
  withTransition(() => ui.set({ caseSlug: null }));
  document.title = baseTitle || "Asimangkan Boro · Software developer from Assam";
  sfx("close");
}

/** Called by the case layer once the closed state has committed. */
export function runPendingRestore() {
  const fn = pendingRestore;
  pendingRestore = null;
  fn?.();
}

export function onPopState() {
  const slug = slugFromPath(window.location.pathname);
  const current = ui.get().caseSlug;
  if (slug && slug !== current) {
    if (!current) {
      savedY = window.scrollY;
      returnFocus = document.querySelector<HTMLElement>(`[data-case-link="${slug}"]`);
    }
    pushed = true;
    if (current) show(slug);
    else withTransition(() => show(slug));
    if (!current) sfx("open");
  } else if (!slug && current) {
    finishClose();
  }
}

export function interceptCaseClick(e: React.MouseEvent<HTMLAnchorElement>, slug: string, focusTarget?: HTMLElement | null) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openCase(slug, focusTarget ?? e.currentTarget);
}
