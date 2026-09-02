import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import type { GraphNodeId } from "@/src/ai/graph/spec";

export type JournalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type WorkspaceState = {
  tripId: string | null;
  mode: "live" | "replay" | "fake";
  tripState: PublicTripState;
  events: PublicEvent[];
  messages: JournalMessage[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  running: boolean;
  error: string | null;
};
