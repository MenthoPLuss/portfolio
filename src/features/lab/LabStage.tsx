"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ProjectSlug } from "@/content/portfolio";
import { ui, useStore } from "@/lib/store";
import "./lab.css";

type DemoProps = { idPrefix: string };

const loading = () => <div className="lab lab-loading" aria-hidden="true" />;

/** Each demo is its own client chunk, server-rendered in its initial state. */
const DEMOS: Record<ProjectSlug, ComponentType<DemoProps>> = {
  "jec-maps": dynamic(() => import("./JecMapsDemo"), { loading }),
  "m-phish": dynamic(() => import("./MPhishDemo"), { loading }),
  "tender-ai": dynamic(() => import("./TenderAIDemo"), { loading }),
  plugora: dynamic(() => import("./PlugoraDemo"), { loading }),
};

/**
 * The exhibit stage and the case-study media share a view-transition name, so opening
 * a case morphs one into the other. Only one element may hold the name at a time.
 */
export function LabStage({ slug, context }: { slug: ProjectSlug; context: "exhibit" | "case" }) {
  const open = useStore(ui, (s) => s.caseSlug, null);
  const named = context === "case" || open !== slug;
  const Demo = DEMOS[slug];
  return (
    <div className={`stage stage-${slug}`} style={named ? ({ viewTransitionName: `stage-${slug}` } as React.CSSProperties) : undefined}>
      <Demo idPrefix={`${context}-${slug}`} />
    </div>
  );
}
