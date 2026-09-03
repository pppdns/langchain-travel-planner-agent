"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { GRAPH_EDGES, GRAPH_NODES, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { statusFor } from "@/src/features/workspace/atlas/node-status";
import { cn } from "@/src/lib/cn";

type AtlasNodeData = {
  label: string;
  caption: string;
  status: "idle" | "active" | "waiting" | "done";
};

function AtlasNode({ data, selected }: NodeProps) {
  const node = data as AtlasNodeData;
  return (
    <div
      className={cn(
        "relative min-w-[168px] rounded-[10px] border bg-elevated px-3 py-2 text-text shadow-[inset_0_1px_0_oklch(0.93_0.014_85/0.05)]",
        node.status === "idle" && "border-border",
        node.status === "active" && "border-accent",
        node.status === "waiting" && "border-accent",
        node.status === "done" && "border-success/50",
        selected && "outline outline-2 outline-accent",
      )}
    >
      <Handle type="target" id="in" position={Position.Left} className="!h-2 !w-2 !border-map-line !bg-map-line" />
      <Handle type="source" id="out" position={Position.Right} className="!h-2 !w-2 !border-map-line !bg-map-line" />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            node.status === "idle" && "bg-border",
            node.status === "active" && "live-pip",
            node.status === "waiting" && "live-pip",
            node.status === "done" && "bg-success",
          )}
          data-live={node.status === "active" || node.status === "waiting" ? "true" : "false"}
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">{node.status}</div>
      </div>
      <div className="mt-1 text-sm font-medium">{node.label}</div>
      <div className="mt-0.5 max-w-[180px] text-[11px] leading-snug text-muted">{node.caption}</div>
    </div>
  );
}

const nodeTypes = { atlas: AtlasNode };

export function OrchestrationAtlas({
  events,
  activeNode,
  selectedNode,
  onSelect,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  onSelect: (id: GraphNodeId) => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const nodes = useMemo<Node[]>(
    () =>
      GRAPH_NODES.map((node) => ({
        id: node.id,
        type: "atlas",
        position: node.position,
        selected: selectedNode === node.id,
        data: {
          label: node.label,
          caption: node.safeCaption,
          status: statusFor(node.id, events, activeNode),
        },
      })),
    [activeNode, events, selectedNode],
  );

  const edges = useMemo<Edge[]>(
    () =>
      GRAPH_EDGES.map((edge) => {
        const sourceDone = statusFor(edge.source, events, activeNode) !== "idle";
        const targetTouched = statusFor(edge.target, events, activeNode) !== "idle";
        const committed = sourceDone && targetTouched;
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: "out",
          targetHandle: "in",
          animated: committed && activeNode === edge.target,
          style: {
            stroke: committed ? "var(--accent)" : "var(--map-line)",
            strokeWidth: committed ? 2.4 : 1.2,
          },
        };
      }),
    [activeNode, events],
  );

  return (
    <div className="atlas-sheet relative h-full min-h-[280px] overflow-hidden rounded-[12px] border border-border">
      {!mounted ? null : (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelect(node.id as GraphNodeId)}
        minZoom={0.4}
        maxZoom={1.4}
      >
        <Background color="transparent" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      )}
    </div>
  );
}
