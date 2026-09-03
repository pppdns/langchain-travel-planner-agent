import { GRAPH_EDGES, type GraphNodeId } from "@/src/ai/graph/spec";

export type AtlasDensity = "desk" | "preview" | "overlay";

export type AtlasCamera = {
  padding: number;
  minZoom: number;
  maxZoom: number;
  duration: number;
};

export function atlasFocusIds(
  activeNode: GraphNodeId | null,
  selectedNode: GraphNodeId | null,
  previousNode: GraphNodeId | null = null,
): GraphNodeId[] {
  if (selectedNode) {
    return previousNode && previousNode !== selectedNode ? [previousNode, selectedNode] : [selectedNode];
  }
  if (!activeNode) return [];
  const ids = new Set<GraphNodeId>([activeNode]);
  if (previousNode) ids.add(previousNode);
  for (const edge of GRAPH_EDGES) {
    if (edge.source === activeNode) ids.add(edge.target);
    if (edge.target === activeNode) ids.add(edge.source);
  }
  return [...ids];
}

export function atlasCamera(density: AtlasDensity, focused: boolean): AtlasCamera {
  if (density === "preview") {
    return focused
      ? { padding: 0.08, minZoom: 0.85, maxZoom: 1.55, duration: 520 }
      : { padding: 0.06, minZoom: 0.42, maxZoom: 1.05, duration: 400 };
  }
  if (density === "overlay") {
    return focused
      ? { padding: 0.18, minZoom: 0.7, maxZoom: 1.48, duration: 720 }
      : { padding: 0.12, minZoom: 0.58, maxZoom: 1.08, duration: 520 };
  }
  return focused
    ? { padding: 0.24, minZoom: 0.78, maxZoom: 1.34, duration: 760 }
    : { padding: 0.14, minZoom: 0.7, maxZoom: 1.08, duration: 560 };
}

export function atlasEdgeStroke(density: AtlasDensity, committed: boolean): number {
  if (density === "preview") return committed ? 3.2 : 2.1;
  if (density === "overlay") return committed ? 3.6 : 2.3;
  return committed ? 2.4 : 1.2;
}
