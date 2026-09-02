"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import { OrchestrationAtlas } from "@/src/features/workspace/atlas/OrchestrationAtlas";
import { NodeInspector } from "@/src/features/workspace/inspector/NodeInspector";

export function AtlasOverlay({
  events,
  activeNode,
  selectedNode,
  tripState,
  onSelect,
  onClearSelected,
  onClose,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  tripState: PublicTripState;
  onSelect: (id: GraphNodeId) => void;
  onClearSelected: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[45]">
      <button
        type="button"
        aria-label="Close atlas"
        className="absolute inset-0 bg-text/20"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="atlas-overlay-title"
        className="absolute inset-3 z-[50] flex flex-col overflow-hidden rounded-[12px] border border-border bg-background md:inset-6"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Inspect</p>
            <h2 id="atlas-overlay-title" className="text-sm text-text">
              Orchestration Atlas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X weight="light" size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 p-4">
          <OrchestrationAtlas
            events={events}
            activeNode={activeNode}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        </div>
        {selectedNode && (
          <NodeInspector
            nodeId={selectedNode}
            events={events}
            tripState={tripState}
            onClose={onClearSelected}
          />
        )}
      </div>
    </div>
  );
}
