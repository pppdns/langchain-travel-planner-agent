"use client";

import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";

export function NodeInspector({
  nodeId,
  events,
  tripState,
  onClose,
}: {
  nodeId: GraphNodeId | null;
  events: PublicEvent[];
  tripState: PublicTripState;
  onClose: () => void;
}) {
  if (!nodeId) return null;
  const spec = getGraphNode(nodeId);
  const usage = [...events].reverse().find((event) => event.type === "usage");
  const evidence = events.filter((event) => event.type === "evidence").flatMap((event) => event.items);

  return (
    <aside className="border-t border-border bg-elevated px-5 py-4 lg:border-l lg:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">Inspector</p>
          <h3 className="mt-1 text-base font-medium">{spec.label}</h3>
          <p className="mt-1 text-sm text-muted">{spec.inspector.purpose}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm text-muted">
          Close
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <p>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">L1 tools</span>
          <br />
          {spec.inspector.typicalTools.join(", ") || "No tools"}
        </p>
        <p>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">Evidence titles</span>
          <br />
          {evidence.length ? evidence.map((item) => item.title).join(" · ") : "None yet"}
        </p>
        <p>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">L2 public state</span>
          <br />
          Stage {tripState.currentPlanningStage}
          {tripState.destinationName ? ` · ${tripState.destinationName}` : ""}
        </p>
        {usage && usage.type === "usage" && (
          <p className="font-mono text-xs text-muted">
            {usage.modelTier} · {usage.latencyMs ?? 0}ms · {usage.inputTokens ?? 0}/{usage.outputTokens ?? 0} tok · ~
            {usage.estimatedCents ?? 0}¢ · retries {usage.retries}
          </p>
        )}
      </div>
    </aside>
  );
}
