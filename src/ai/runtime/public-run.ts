import { Command, isGraphInterrupt } from "@langchain/langgraph";
import { getGraphNode, type GraphNodeId } from "@/src/ai/graph/spec";
import { tripGraph, type GraphState } from "@/src/ai/graph/compile";
import {
  emptyTripState,
  projectPublicTripState,
  tripStateSchema,
  type PublicTripState,
  type TripState,
} from "@/src/ai/graph/state";
import {
  GOLDEN_DISCOVERY_EVENTS,
  GOLDEN_DISCOVERY_RESUME_EVENTS,
} from "@/src/ai/replay/golden-discovery";
import { GOLDEN_KNOWN_EVENTS } from "@/src/ai/replay/golden-known";
import {
  graphEvent,
  sanitizePublicEvent,
  type PublicEvent,
} from "@/src/ai/stream/public-events";
import type { RunTripRequest, StarterId } from "@/src/ai/contracts/http";

export type RunResult = {
  events: PublicEvent[];
  tripState: PublicTripState;
  assistantText: string;
  interrupted: boolean;
};

const NODE_ORDER: GraphNodeId[] = [
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
];

function eventsFromUpdate(update: Record<string, unknown>): PublicEvent[] {
  const events: PublicEvent[] = [];
  for (const nodeId of NODE_ORDER) {
    if (!(nodeId in update)) continue;
    const spec = getGraphNode(nodeId);
    events.push(graphEvent(nodeId, "start", spec.safeCaption));
    const payload = update[nodeId] as Partial<GraphState> | undefined;
    if (payload?.trip) {
      events.push({ type: "trip-state", patch: projectPublicTripState(payload.trip as TripState) });
      if (payload.trip.candidateDestinations?.length) {
        events.push({
          type: "evidence",
          items: payload.trip.candidateDestinations.flatMap((candidate) => candidate.evidence).slice(0, 6),
        });
      }
      if (payload.trip.pendingInterrupt) {
        events.push({
          type: "interrupt",
          interruptId: payload.trip.pendingInterrupt.interruptId,
          interruptType: payload.trip.pendingInterrupt.interruptType,
          title: payload.trip.pendingInterrupt.title,
          prompt: payload.trip.pendingInterrupt.prompt,
          options: payload.trip.pendingInterrupt.options,
        });
        events.push(graphEvent(nodeId, "waiting", spec.safeCaption));
      } else {
        events.push(graphEvent(nodeId, "end", spec.safeCaption));
      }
    } else {
      events.push(graphEvent(nodeId, "end", spec.safeCaption));
    }
  }
  return events.map((event) => sanitizePublicEvent(event));
}

export async function runTripGraph(input: {
  threadId: string;
  request: RunTripRequest;
  existing?: TripState;
}): Promise<RunResult> {
  const config = {
    configurable: { thread_id: input.threadId },
    recursionLimit: 16,
  };

  const existing = tripStateSchema.parse(input.existing ?? emptyTripState());
  const payload =
    input.request.kind === "resume"
      ? (new Command({ resume: input.request.value }) as never)
      : {
          inputKind: input.request.kind,
          inputText:
            input.request.kind === "starter"
              ? input.request.starterId
              : input.request.kind === "chip"
                ? `${input.request.field}:${input.request.value}`
                : input.request.kind === "message"
                  ? input.request.text
                  : "",
          trip: existing,
        };

  const events: PublicEvent[] = [];
  let tripState = projectPublicTripState(existing);
  let assistantText = "";
  let interrupted = false;

  try {
    const stream = await tripGraph.stream(payload, {
      ...config,
      streamMode: "updates",
    });

    for await (const update of stream) {
      const nextEvents = eventsFromUpdate(update as Record<string, unknown>);
      events.push(...nextEvents);
      const tripPatch = Object.values(update as Record<string, { trip?: TripState; assistantText?: string }>)
        .map((value) => value)
        .find((value) => value?.trip || value?.assistantText);
      if (tripPatch?.trip) {
        tripState = projectPublicTripState(tripPatch.trip);
      }
      if (tripPatch?.assistantText) {
        assistantText = tripPatch.assistantText;
      }
    }
  } catch (error) {
    if (isGraphInterrupt(error)) {
      interrupted = true;
    } else {
      throw error;
    }
  }

  const snapshot = await tripGraph.getState(config);
  if (snapshot.values?.trip) {
    tripState = projectPublicTripState(snapshot.values.trip);
  }
  if (snapshot.values?.assistantText) {
    assistantText = snapshot.values.assistantText;
  }
  if (snapshot.tasks?.some((task) => task.interrupts?.length)) {
    interrupted = true;
  }

  return { events, tripState, assistantText, interrupted };
}

export function replayEventsFor(starterId: StarterId, resume?: boolean): PublicEvent[] {
  if (starterId === "barcelona-couple") {
    return GOLDEN_KNOWN_EVENTS;
  }
  return resume ? [...GOLDEN_DISCOVERY_EVENTS, ...GOLDEN_DISCOVERY_RESUME_EVENTS] : GOLDEN_DISCOVERY_EVENTS;
}
