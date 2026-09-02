import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import type { GraphNodeId } from "@/src/ai/graph/spec";

export type WorkspaceState = {
  tripId: string | null;
  mode: "live" | "replay" | "fake";
  tripState: PublicTripState;
  events: PublicEvent[];
  lastAssistantText: string;
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  atlasOpen: boolean;
  running: boolean;
  error: string | null;
};
