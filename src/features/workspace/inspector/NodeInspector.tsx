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
    <aside className="border-t border-border bg-elevated px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">Inspector</p>
          <h3 className="mt-1 text-base font-medium">{spec.label}</h3>
          <p className="mt-1 text-sm text-muted">{spec.inspector.purpose}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-3 text-sm text-muted transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Close
        </button>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">L1 tools</dt>
          <dd className="mt-1 text-text">{spec.inspector.typicalTools.join(", ") || "No tools"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">Evidence titles</dt>
          <dd className="mt-1 text-text">
            {evidence.length ? evidence.map((item) => item.title).join(" · ") : "None yet"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">L2 public state</dt>
          <dd className="mt-1 text-text">
            Stage {tripState.currentPlanningStage}
            {tripState.destinationName ? ` · ${tripState.destinationName}` : ""}
          </dd>
        </div>
        {usage && usage.type === "usage" && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">Usage</dt>
            <dd className="mt-1 font-mono text-xs text-muted">
              {usage.modelTier} · {usage.latencyMs ?? 0}ms · {usage.inputTokens ?? 0}/{usage.outputTokens ?? 0} tok · ~
              {usage.estimatedCents ?? 0}¢ · retries {usage.retries}
            </dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
