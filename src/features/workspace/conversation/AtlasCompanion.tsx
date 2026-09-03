"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import { OrchestrationAtlas } from "@/src/features/workspace/atlas/OrchestrationAtlas";
import { latestGraphCaption } from "@/src/features/workspace/atlas/node-status";
import { GraphPulse } from "@/src/features/workspace/conversation/GraphPulse";
import { TripBrief } from "@/src/features/workspace/conversation/TripBrief";
import { NodeInspector } from "@/src/features/workspace/inspector/NodeInspector";

const EASE = [0.16, 1, 0.3, 1] as const;

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
          density="desk"
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

export function AtlasPeek({
  events,
  activeNode,
  running,
  progressLabel,
  onOpen,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  running?: boolean;
  progressLabel?: string;
  onOpen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
      <div className="relative h-[108px]">
        <div className="pointer-events-none h-full">
          <OrchestrationAtlas
            events={events}
            activeNode={activeNode}
            selectedNode={null}
            density="preview"
            interactive={false}
            onSelect={() => undefined}
          />
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="sr-only">Open orchestration atlas</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="w-full border-t border-border px-3 py-2 text-left transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <GraphPulse
          events={events}
          activeNode={activeNode}
          running={running}
          progressLabel={progressLabel}
          surface="caption"
        />
      </button>
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
  const reduce = useReducedMotion();

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
        className="hidden h-full min-h-0 flex-col self-stretch border-l border-border bg-surface lg:sticky lg:top-0 lg:flex lg:w-[min(46vw,640px)]"
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
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="atlas-sheet-title"
            initial={reduce ? false : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE }}
            className="absolute inset-x-0 top-0 z-[50] flex h-[52dvh] flex-col overflow-hidden rounded-b-[14px] border-b border-border bg-surface shadow-[0_18px_50px_oklch(0.12_0.03_265/0.45)]"
          >
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
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
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
              <OrchestrationAtlas
                events={events}
                activeNode={activeNode}
                selectedNode={selectedNode}
                density="overlay"
                onSelect={onSelect}
              />
              <p className="mt-2 truncate font-mono text-[11px] text-subtle">{latestGraphCaption(events)}</p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
