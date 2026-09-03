import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import type { GraphNodeId } from "@/src/ai/graph/spec";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type WorkspaceState = {
  tripId: string | null;
  mode: "live" | "replay" | "fake";
  uploadsEnabled: boolean;
  tripState: PublicTripState;
  events: PublicEvent[];
  messages: ConversationMessage[];
  activeNode: GraphNodeId | null;
  selectedNode: GraphNodeId | null;
  atlasOpen: boolean;
  running: boolean;
  error: string | null;
};
