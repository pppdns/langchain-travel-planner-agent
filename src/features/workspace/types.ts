import type { PublicEvent } from "@/src/ai/stream/public-events";
import type { PublicTripState } from "@/src/ai/graph/state";
import type { GraphNodeId } from "@/src/ai/graph/spec";
import type { AgentProcess } from "@/src/features/workspace/conversation/agent-process";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  process?: AgentProcess;
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
  runEventStart: number;
  error: string | null;
};
