"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sfx } from "@/lib/store";

const LINKS = [
  { id: "work", label: "Work" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
];

/** Sections that light up a nav item other than their own. */
const ALIAS: Record<string, string> = { leadership: "experience", education: "experience", credits: "contact" };
const OBSERVED = ["top", "work", "about", "skills", "experience", "leadership", "education", "contact", "credits"];

/**
 * Primary navigation. A single indicator glides to the active section's link.
 * The links work without JavaScript; the indicator is an enhancement.
 */
export function Nav() {
  const [active, setActive] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        // The active section is the last one whose top has passed 40% of the viewport.
        let current: string | null = null;
        for (const id of OBSERVED) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
        }
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = "contact";
        const mapped = current ? (ALIAS[current] ?? current) : null;
        setActive(mapped && LINKS.some((l) => l.id === mapped) ? mapped : null);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "0px 0px -60% 0px" },
    );
    OBSERVED.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const ul = list.current;
    const b = bar.current;
    if (!ul || !b) return;
    const place = () => {
      const a = active ? ul.querySelector<HTMLElement>(`a[href="#${active}"]`) : null;
      if (!a || a.offsetParent === null) {
        b.style.opacity = "0";
        return;
      }
      b.style.opacity = "1";
      b.style.transform = `translateX(${a.offsetLeft}px)`;
      b.style.width = `${a.offsetWidth}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  return (
    <nav id="site-nav" aria-label="Primary">
      <ul ref={list}>
        {LINKS.map((l) => (
          <li key={l.id}>
            <a href={`#${l.id}`} data-nav aria-current={active === l.id ? "true" : undefined} onClick={() => sfx("tick")}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <span ref={bar} className="nav-bar" aria-hidden="true" />
    </nav>
  );
}
