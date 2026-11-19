"use client";

import { MotionSystem } from "./MotionSystem";
import { SceneHost } from "./SceneHost";
import { Cursor } from "./Cursor";
import { AudioBridge } from "./AudioBridge";
import { CaseLayer } from "./CaseLayer";
import { OverviewPlayer } from "./OverviewPlayer";

/** Browser-only systems. The page content itself is server-rendered. */
export function ClientRoot({ initialCase }: { initialCase: string | null }) {
  return (
    <>
      <MotionSystem />
      <SceneHost />
      <AudioBridge />
      <CaseLayer initialSlug={initialCase} />
      <OverviewPlayer />
      <Cursor />
    </>
  );
}
