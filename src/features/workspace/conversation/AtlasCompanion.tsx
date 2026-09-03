"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import { OrchestrationAtlas } from "@/src/features/workspace/atlas/OrchestrationAtlas";
import { TripBrief } from "@/src/features/workspace/conversation/TripBrief";
import { NodeInspector } from "@/src/features/workspace/inspector/NodeInspector";

function AtlasBody({
  events,
  activeNode,
  selectedNode,
  tripState,
  onSelect,
  onClearSelected,
  onForget,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  tripState: PublicTripState;
  onSelect: (id: GraphNodeId) => void;
  onClearSelected: () => void;
  onForget?: (key: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <OrchestrationAtlas
          events={events}
          activeNode={activeNode}
          selectedNode={selectedNode}
          onSelect={onSelect}
        />
      </div>
      <TripBrief tripState={tripState} onForget={onForget} />
      {selectedNode && (
        <NodeInspector
          nodeId={selectedNode}
          events={events}
          tripState={tripState}
          onClose={onClearSelected}
        />
      )}
    </div>
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
  onForget,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  tripState: PublicTripState;
  sheetOpen: boolean;
  onSelect: (id: GraphNodeId) => void;
  onClearSelected: () => void;
  onCloseSheet: () => void;
  onForget?: (key: string) => void;
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
        className="hidden min-h-0 flex-col border-l border-border bg-surface lg:flex lg:w-[min(46vw,640px)]"
      >
        <div className="flex shrink-0 items-baseline justify-between px-4 pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">Orchestration Atlas</p>
          <p className="font-mono text-[11px] text-subtle">Live path</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AtlasBody
          events={events}
          activeNode={activeNode}
          selectedNode={selectedNode}
          tripState={tripState}
          onSelect={onSelect}
          onClearSelected={onClearSelected}
          onForget={onForget}
        />
        </div>
      </aside>

      {sheetOpen && (
        <div className="fixed inset-0 z-[45] lg:hidden">
          <button type="button" aria-label="Close atlas" className="absolute inset-0 bg-background/70" onClick={onCloseSheet} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="atlas-sheet-title"
            className="absolute inset-x-0 bottom-0 z-[50] flex h-[80dvh] flex-col overflow-hidden rounded-t-[14px] border border-border bg-surface"
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
              onForget={onForget}
            />
          </div>
        </div>
      )}
    </>
  );
}
