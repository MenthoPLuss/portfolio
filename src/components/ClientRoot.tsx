"use client";

import { PageSystems } from "./PageSystems";
import { CaseLayer } from "./CaseLayer";
import { Cursor } from "./Cursor";

/** Browser-only systems. The page content itself is server-rendered. */
export function ClientRoot({ initialCase }: { initialCase: string | null }) {
  return (
    <>
      <PageSystems />
      <CaseLayer initialSlug={initialCase} />
      <Cursor />
    </>
  );
}
