"use client";

import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { latestGraphCaption } from "@/src/features/workspace/atlas/node-status";

function PulseCopy({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <>
      <span className="text-accent">{label}</span>
      <span className="text-subtle"> · </span>
      <span>{caption}</span>
    </>
  );
}

export function GraphPulse({
  events,
  activeNode,
  onInspect,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  onInspect: () => void;
}) {
  const caption = latestGraphCaption(events);
  const label = activeNode ? getGraphNode(activeNode).label : "Graph";

  return (
    <>
      <p className="hidden min-h-11 max-w-full truncate pt-2 font-mono text-[12px] text-muted lg:block">
        <PulseCopy label={label} caption={caption} />
      </p>
      <button
        type="button"
        onClick={onInspect}
        className="min-h-11 max-w-full truncate text-left font-mono text-[12px] text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
      >
        <PulseCopy label={label} caption={caption} />
      </button>
    </>
  );
}
