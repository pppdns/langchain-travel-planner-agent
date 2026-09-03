"use client";

import { useEffect, useState } from "react";
import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { latestGraphCaption } from "@/src/features/workspace/atlas/node-status";
import { agentProgressLabel } from "@/src/features/workspace/conversation/agent-progress";

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
  running,
  progressLabel,
  onInspect,
  surface,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  running?: boolean;
  progressLabel?: string;
  onInspect: () => void;
  surface: "desktop" | "mobile";
}) {
  const [tick, setTick] = useState(0);
  const graphCaption = latestGraphCaption(events);
  const live = Boolean(running) || graphCaption !== "Quiet until you start.";
  const caption = running ? (progressLabel ?? agentProgressLabel(events, activeNode, tick)) : graphCaption;
  const label = activeNode ? getGraphNode(activeNode).label : "Graph";

  useEffect(() => {
    if (!running || progressLabel) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 400);
    return () => window.clearInterval(id);
  }, [progressLabel, running]);

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
