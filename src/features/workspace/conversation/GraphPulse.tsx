"use client";

import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { latestGraphCaption } from "@/src/features/workspace/atlas/node-status";

function PulseCopy({
  live,
  label,
  caption,
}: {
  live: boolean;
  label: string;
  caption: string;
}) {
  return (
    <>
      <span className="live-pip" data-live={live ? "true" : "false"} />
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
  surface,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  onInspect: () => void;
  surface: "desktop" | "mobile";
}) {
  const caption = latestGraphCaption(events);
  const label = activeNode ? getGraphNode(activeNode).label : "Graph";
  const live = caption !== "Quiet until you start.";

  if (surface === "desktop") {
    return (
      <p className="flex max-w-full items-center gap-2 truncate font-mono text-[12px] text-muted">
        <PulseCopy live={live} label={label} caption={caption} />
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onInspect}
      className="flex min-h-11 max-w-full items-center gap-2 text-left font-mono text-[12px] text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <PulseCopy live={live} label={label} caption={caption} />
    </button>
  );
}
