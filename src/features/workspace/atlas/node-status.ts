import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";

export type AtlasNodeStatus = "idle" | "active" | "waiting" | "done";

export function statusFor(
  nodeId: GraphNodeId,
  events: PublicEvent[],
  activeNode: GraphNodeId | null,
): AtlasNodeStatus {
  const related = events.filter((event) => event.type === "graph" && event.node === nodeId);
  const waiting = related.some((event) => event.type === "graph" && event.phase === "waiting");
  const ended = related.some((event) => event.type === "graph" && event.phase === "end");
  if (waiting && !ended) return "waiting";
  if (activeNode === nodeId && !ended) return "active";
  if (ended) return "done";
  if (related.length) return "active";
  return "idle";
}

export function latestGraphCaption(events: PublicEvent[]): string {
  const latest = [...events].reverse().find((event) => event.type === "graph");
  return latest && latest.type === "graph" ? latest.caption : "Quiet until you start.";
}
