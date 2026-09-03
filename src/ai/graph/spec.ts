export const GRAPH_NODE_IDS = [
  "scope_guard",
  "gather_preferences",
  "route_supervisor",
  "discover_destinations",
  "await_destination_choice",
  "research_local",
  "plan_itinerary",
  "critique_itinerary",
  "await_tradeoff",
  "present_plan",
] as const;

export type GraphNodeId = (typeof GRAPH_NODE_IDS)[number];

export type GraphNodeSpec = {
  id: GraphNodeId;
  label: string;
  safeCaption: string;
  kind: "guard" | "gather" | "route" | "react" | "interrupt" | "research" | "plan" | "present";
  inspector: {
    purpose: string;
    typicalTools: string[];
  };
  position: { x: number; y: number };
};

export type GraphEdgeSpec = {
  id: string;
  source: GraphNodeId;
  target: GraphNodeId;
};

export const GRAPH_NODES: readonly GraphNodeSpec[] = [
  {
    id: "scope_guard",
    label: "Scope",
    safeCaption: "Keeping the conversation on the trip",
    kind: "guard",
    inspector: {
      purpose: "Detect off-scope and injection attempts before tools run.",
      typicalTools: [],
    },
    position: { x: 24, y: 140 },
  },
  {
    id: "gather_preferences",
    label: "Gather",
    safeCaption: "Understanding trip preferences",
    kind: "gather",
    inspector: {
      purpose: "Fill only useful missing TripState fields.",
      typicalTools: ["read_trip_state", "search_memories", "write_memory"],
    },
    position: { x: 220, y: 40 },
  },
  {
    id: "route_supervisor",
    label: "Supervisor",
    safeCaption: "Choosing the next planning stage",
    kind: "route",
    inspector: {
      purpose: "Route between discovery, local research, and planning.",
      typicalTools: ["read_trip_state"],
    },
    position: { x: 220, y: 240 },
  },
  {
    id: "discover_destinations",
    label: "Discover",
    safeCaption: "Searching destination knowledge",
    kind: "react",
    inspector: {
      purpose: "ReAct loop over profiles, RAG, and live tools.",
      typicalTools: [
        "lookup_destination_profile",
        "search_travel_knowledge",
        "get_weather",
        "convert_currency",
      ],
    },
    position: { x: 440, y: 40 },
  },
  {
    id: "await_destination_choice",
    label: "Decide",
    safeCaption: "Waiting for a destination choice",
    kind: "interrupt",
    inspector: {
      purpose: "Pause the same thread until a destination is selected.",
      typicalTools: [],
    },
    position: { x: 660, y: 40 },
  },
  {
    id: "research_local",
    label: "Research",
    safeCaption: "Delegating local research",
    kind: "research",
    inspector: {
      purpose: "Neighborhoods, pace, and activity evidence for the chosen place.",
      typicalTools: ["search_travel_knowledge", "lookup_destination_profile", "get_weather"],
    },
    position: { x: 440, y: 240 },
  },
  {
    id: "plan_itinerary",
    label: "Plan",
    safeCaption: "Building itinerary",
    kind: "plan",
    inspector: {
      purpose: "Create a structured day-by-day plan from evidence and constraints.",
      typicalTools: ["search_travel_knowledge", "convert_currency"],
    },
    position: { x: 660, y: 240 },
  },
  {
    id: "critique_itinerary",
    label: "Review",
    safeCaption: "Reviewing itinerary",
    kind: "plan",
    inspector: {
      purpose: "Check pace, geography, and budget conflicts.",
      typicalTools: ["read_trip_state"],
    },
    position: { x: 880, y: 240 },
  },
  {
    id: "await_tradeoff",
    label: "Tradeoff",
    safeCaption: "Waiting on a planning tradeoff",
    kind: "interrupt",
    inspector: {
      purpose: "Optional human decision when two viable plans conflict.",
      typicalTools: [],
    },
    position: { x: 880, y: 40 },
  },
  {
    id: "present_plan",
    label: "Present",
    safeCaption: "Presenting the trip",
    kind: "present",
    inspector: {
      purpose: "Project the public itinerary and invite revisions.",
      typicalTools: [],
    },
    position: { x: 1100, y: 140 },
  },
] as const;

export const GRAPH_EDGES: readonly GraphEdgeSpec[] = [
  { id: "e-scope-gather", source: "scope_guard", target: "gather_preferences" },
  { id: "e-scope-route", source: "scope_guard", target: "route_supervisor" },
  { id: "e-gather-route", source: "gather_preferences", target: "route_supervisor" },
  { id: "e-route-discover", source: "route_supervisor", target: "discover_destinations" },
  { id: "e-route-research", source: "route_supervisor", target: "research_local" },
  { id: "e-route-plan", source: "route_supervisor", target: "plan_itinerary" },
  { id: "e-discover-decide", source: "discover_destinations", target: "await_destination_choice" },
  { id: "e-decide-research", source: "await_destination_choice", target: "research_local" },
  { id: "e-research-plan", source: "research_local", target: "plan_itinerary" },
  { id: "e-plan-review", source: "plan_itinerary", target: "critique_itinerary" },
  { id: "e-review-tradeoff", source: "critique_itinerary", target: "await_tradeoff" },
  { id: "e-review-present", source: "critique_itinerary", target: "present_plan" },
  { id: "e-tradeoff-plan", source: "await_tradeoff", target: "plan_itinerary" },
  { id: "e-tradeoff-present", source: "await_tradeoff", target: "present_plan" },
] as const;

export const GRAPH_SPEC = {
  id: "route-state-trip-planner",
  nodes: GRAPH_NODES,
  edges: GRAPH_EDGES,
} as const;

export function getGraphNode(id: GraphNodeId): GraphNodeSpec {
  const node = GRAPH_NODES.find((item) => item.id === id);
  if (!node) {
    throw new Error(`Unknown graph node: ${id}`);
  }
  return node;
}

export function assertGraphNodeId(value: string): asserts value is GraphNodeId {
  if (!GRAPH_NODE_IDS.includes(value as GraphNodeId)) {
    throw new Error(`Unknown graph node: ${value}`);
  }
}
