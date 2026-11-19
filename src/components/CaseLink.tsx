"use client";

import type { ReactNode } from "react";
import { interceptCaseClick } from "@/lib/cases";

export function CaseLink({ slug, className, children }: { slug: string; className?: string; children: ReactNode }) {
  return (
    <a href={`/work/${slug}`} className={className} data-case-link={slug} onClick={(e) => interceptCaseClick(e, slug)}>
      {children}
    </a>
  );
}

/** Generic link: case URLs open the dialog, everything else behaves normally. */
export function SmartLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const m = href.match(/^\/work\/([a-z0-9-]+)$/);
  if (m) {
    return (
      <a href={href} className={className} onClick={(e) => interceptCaseClick(e, m[1])}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
