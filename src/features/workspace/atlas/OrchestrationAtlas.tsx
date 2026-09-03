"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { GRAPH_EDGES, GRAPH_NODES, type GraphNodeId } from "@/src/ai/graph/spec";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import {
  atlasCamera,
  atlasEdgeStroke,
  atlasFocusIds,
  type AtlasDensity,
} from "@/src/features/workspace/atlas/atlas-camera";
import { statusFor } from "@/src/features/workspace/atlas/node-status";
import { cn } from "@/src/lib/cn";

type AtlasNodeData = {
  label: string;
  caption: string;
  status: "idle" | "active" | "waiting" | "done";
  density: AtlasDensity;
};

function AtlasNode({ data, selected }: NodeProps) {
  const node = data as AtlasNodeData;
  const preview = node.density === "preview";
  const overlay = node.density === "overlay";
  return (
    <div
      className={cn(
        "relative border bg-elevated text-text shadow-[inset_0_1px_0_oklch(0.93_0.014_85/0.05)]",
        preview ? "min-w-[76px] rounded-[8px] px-2 py-1.5" : overlay ? "min-w-[132px] rounded-[10px] px-3 py-2.5" : "min-w-[168px] rounded-[10px] px-3 py-2",
        node.status === "idle" && "border-border",
        node.status === "active" && "border-accent",
        node.status === "waiting" && "border-accent",
        node.status === "done" && "border-success/50",
        selected && !preview && "outline outline-2 outline-accent",
      )}
    >
      <Handle
        type="target"
        id="in"
        position={Position.Left}
        className={cn(
          "!border-map-line !bg-map-line",
          preview ? "!h-1.5 !w-1.5" : overlay ? "!h-2.5 !w-2.5" : "!h-2 !w-2",
        )}
      />
      <Handle
        type="source"
        id="out"
        position={Position.Right}
        className={cn(
          "!border-map-line !bg-map-line",
          preview ? "!h-1.5 !w-1.5" : overlay ? "!h-2.5 !w-2.5" : "!h-2 !w-2",
        )}
      />
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-full",
            preview ? "h-1.5 w-1.5" : "h-1.5 w-1.5",
            node.status === "idle" && "bg-border",
            node.status === "active" && "live-pip",
            node.status === "waiting" && "live-pip",
            node.status === "done" && "bg-success",
          )}
          data-live={node.status === "active" || node.status === "waiting" ? "true" : "false"}
        />
        {!preview && (
          <div className={cn("font-mono uppercase text-accent", overlay ? "text-[11px] tracking-[0.12em]" : "text-[10px] tracking-[0.14em]")}>
            {node.status}
          </div>
        )}
        {preview && <div className="text-[11px] font-medium leading-none">{node.label}</div>}
      </div>
      {!preview && (
        <>
          <div className={cn("mt-1 font-medium", overlay ? "text-[15px]" : "text-sm")}>{node.label}</div>
          {node.density === "desk" && (
            <div className="mt-0.5 max-w-[180px] text-[11px] leading-snug text-muted">{node.caption}</div>
          )}
        </>
      )}
    </div>
  );
}

const nodeTypes = { atlas: AtlasNode };

function AtlasFollowCam({
  activeNode,
  selectedNode,
  density,
  hostRef,
}: {
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  density: AtlasDensity;
  hostRef: RefObject<HTMLElement | null>;
}) {
  const { fitView, getNode, setCenter } = useReactFlow();
  const reduce = useReducedMotion();
  const previousRef = useRef<GraphNodeId | null>(null);
  const latestRef = useRef({ activeNode, selectedNode, previous: previousRef.current });
  const focus = selectedNode ?? activeNode;
  latestRef.current = { activeNode, selectedNode, previous: previousRef.current };

  useEffect(() => {
    const from = previousRef.current;
    const run = (duration: number) => {
      const { activeNode: active, selectedNode: selected } = latestRef.current;
      const target = selected ?? active;
      const ids = atlasFocusIds(active, selected, from);
      const nodes = ids.map((id) => getNode(id)).filter((node): node is NonNullable<typeof node> => Boolean(node));
      const camera = atlasCamera(density, nodes.length > 0);
      if (density === "preview" && target) {
        const node = getNode(target);
        if (!node) return;
        const width = node.measured?.width ?? 80;
        const height = node.measured?.height ?? 28;
        void setCenter(node.position.x + width / 2, node.position.y + height / 2, {
          zoom: camera.maxZoom,
          duration,
        });
        return;
      }
      void fitView({
        ...(nodes.length ? { nodes } : {}),
        padding: camera.padding,
        duration,
        maxZoom: camera.maxZoom,
        minZoom: camera.minZoom,
      });
    };
    const duration = reduce ? 0 : atlasCamera(density, Boolean(focus)).duration;
    let attempts = 0;
    const kick = () => {
      const probe = getNode(GRAPH_NODES[0].id);
      if (!probe && attempts < 20) {
        attempts += 1;
        retry = window.setTimeout(kick, 40);
        return;
      }
      run(duration);
      confirm = window.setTimeout(() => run(0), duration + 48);
    };
    const frame = window.requestAnimationFrame(kick);
    let retry = 0;
    let confirm = 0;
    previousRef.current = focus;
    const host = hostRef.current;
    let resizeFrame = 0;
    const observer = host
      ? new ResizeObserver(() => {
          window.cancelAnimationFrame(resizeFrame);
          resizeFrame = window.requestAnimationFrame(() => run(0));
        })
      : null;
    observer?.observe(host as Element);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(retry);
      window.clearTimeout(confirm);
      observer?.disconnect();
    };
  }, [activeNode, density, fitView, focus, getNode, hostRef, reduce, selectedNode, setCenter]);

  return null;
}

function AtlasCanvas({
  events,
  activeNode,
  selectedNode,
  density,
  interactive,
  onSelect,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  density: AtlasDensity;
  interactive: boolean;
  onSelect: (id: GraphNodeId) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
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
          density,
        },
      })),
    [activeNode, density, events, selectedNode],
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
            strokeWidth: atlasEdgeStroke(density, committed),
          },
        };
      }),
    [activeNode, density, events],
  );

  return (
    <div ref={hostRef} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        zoomOnDoubleClick={interactive}
        preventScrolling
        proOptions={{ hideAttribution: true }}
        onInit={(instance) => {
          const camera = atlasCamera(density, Boolean(activeNode || selectedNode));
          void instance.fitView({
            padding: camera.padding,
            duration: 0,
            maxZoom: camera.maxZoom,
            minZoom: camera.minZoom,
          });
        }}
        onNodeClick={interactive ? (_, node) => onSelect(node.id as GraphNodeId) : undefined}
        minZoom={density === "preview" ? 0.5 : 0.55}
        maxZoom={density === "preview" ? 2 : 1.7}
        className="h-full"
        style={{ width: "100%", height: "100%" }}
      >
        <AtlasFollowCam activeNode={activeNode} selectedNode={selectedNode} density={density} hostRef={hostRef} />
        <Background color="transparent" />
        {interactive && density === "desk" && <Controls showInteractive={false} position="bottom-right" />}
      </ReactFlow>
    </div>
  );
}

export function OrchestrationAtlas({
  events,
  activeNode,
  selectedNode,
  density = "desk",
  interactive = true,
  onSelect,
  className,
}: {
  events: PublicEvent[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  density?: AtlasDensity;
  interactive?: boolean;
  onSelect: (id: GraphNodeId) => void;
  className?: string;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div
      data-atlas={density}
      className={cn(
        "atlas-sheet relative overflow-hidden",
        density === "preview" && "h-full min-h-0",
        density === "overlay" && "h-full min-h-0 flex-1 rounded-[12px] border border-border",
        density === "desk" && "h-full min-h-[min(280px,42vh)] flex-1 rounded-[12px] border border-border",
        className,
      )}
    >
      {!mounted ? null : (
        <ReactFlowProvider>
          <AtlasCanvas
            events={events}
            activeNode={activeNode}
            selectedNode={density === "preview" ? null : selectedNode}
            density={density}
            interactive={interactive}
            onSelect={onSelect}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
}
