"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import { OrchestrationAtlas } from "@/src/features/workspace/atlas/OrchestrationAtlas";
import { NodeInspector } from "@/src/features/workspace/inspector/NodeInspector";

function AtlasBody({
  events,
  activeNode,
  selectedNode,
  tripState,
  onSelect,
  onClearSelected,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  tripState: PublicTripState;
  onSelect: (id: GraphNodeId) => void;
  onClearSelected: () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 p-3">
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
    </>
  );
}

export function AtlasCompanion({
  events,
  activeNode,
  selectedNode,
  tripState,
  sheetOpen,
  onSelect,
  onClearSelected,
  onCloseSheet,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  tripState: PublicTripState;
  sheetOpen: boolean;
  onSelect: (id: GraphNodeId) => void;
  onClearSelected: () => void;
  onCloseSheet: () => void;
}) {
  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCloseSheet, sheetOpen]);

  return (
    <>
      <aside
        role="region"
        aria-label="Orchestration Atlas"
        className="hidden min-h-0 flex-col border-l border-border lg:flex lg:w-[min(42vw,560px)]"
      >
        <AtlasBody
          events={events}
          activeNode={activeNode}
          selectedNode={selectedNode}
          tripState={tripState}
          onSelect={onSelect}
          onClearSelected={onClearSelected}
        />
      </aside>

      {sheetOpen && (
        <div className="fixed inset-0 z-[45] lg:hidden">
          <button type="button" aria-label="Close atlas" className="absolute inset-0 bg-text/20" onClick={onCloseSheet} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="atlas-sheet-title"
            className="absolute inset-x-0 bottom-0 z-[50] flex h-[80dvh] flex-col rounded-t-[12px] border border-border bg-background"
          >
            <div className="flex items-center justify-between px-5 py-3">
              <h2 id="atlas-sheet-title" className="text-sm text-text">
                Orchestration Atlas
              </h2>
              <button
                type="button"
                onClick={onCloseSheet}
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <X weight="light" size={18} />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AtlasBody
              events={events}
              activeNode={activeNode}
              selectedNode={selectedNode}
              tripState={tripState}
              onSelect={onSelect}
              onClearSelected={onClearSelected}
            />
          </div>
        </div>
      )}
    </>
  );
}
