import { Annotation, END, MemorySaver, START, StateGraph, interrupt } from "@langchain/langgraph";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { buildItinerary } from "@/src/ai/graph/itinerary";
import { evidenceFor, rankDestinations } from "@/src/ai/graph/rank";
import {
  emptyTripState,
  mergeTripState,
  missingUsefulFields,
  type PendingInterrupt,
  type TripState,
} from "@/src/ai/graph/state";
import { isOffScope, looksLikeInjection } from "@/src/ai/guardrails/scope";
import { applyStarterSeed } from "@/src/ai/contracts/starters";
import type { StarterId } from "@/src/ai/contracts/http";

export const GraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  trip: Annotation<TripState>({
    reducer: (left, right) => mergeTripState(left ?? emptyTripState(), right ?? {}),
    default: emptyTripState,
  }),
  inputText: Annotation<string>({
    reducer: (_left, right) => right ?? "",
    default: () => "",
  }),
  inputKind: Annotation<string>({
    reducer: (_left, right) => right ?? "message",
    default: () => "message",
  }),
  assistantText: Annotation<string>({
    reducer: (_left, right) => right ?? "",
    default: () => "",
  }),
});

export type GraphState = typeof GraphAnnotation.State;

function applyChip(state: TripState, field: string, value: string): TripState {
  if (field === "tripType") return mergeTripState(state, { tripType: value as TripState["tripType"] });
  if (field === "origin") return mergeTripState(state, { origin: value });
  if (field === "pace") return mergeTripState(state, { pace: value as TripState["pace"] });
  if (field === "duration") {
    return mergeTripState(state, {
      dates: { ...state.dates, durationNights: Number.parseInt(value, 10) || 5 },
    });
  }
  if (field === "budget") {
    return mergeTripState(state, {
      budget: { ...state.budget, amount: Number.parseInt(value, 10) || 1500 },
    });
  }
  return mergeTripState(state, { preferences: [...state.preferences, value] });
}

async function scopeGuard(state: GraphState) {
  const text = state.inputText;
  if (text && (isOffScope(text) || looksLikeInjection(text))) {
    return {
      trip: mergeTripState(state.trip, {
        offScopeRedirects: state.trip.offScopeRedirects + 1,
        lastQuestion: "I only plan trips. Tell me where, when, and with whom you want to travel.",
        guidedOptions: ["Warm family beach in Europe", "5 days in Barcelona", "City break under 1500 EUR"],
        currentPlanningStage: "intake" as const,
      }),
      assistantText:
        "I only plan trips here. Share a destination, a vibe, or pick a starter and I will stay on the graph.",
    };
  }
  return {};
}

async function gatherPreferences(state: GraphState) {
  let trip = state.trip;
  if (state.inputKind === "starter") {
    trip = applyStarterSeed(state.inputText as StarterId);
  } else if (state.inputKind === "chip") {
    const [field, value] = state.inputText.split(":", 2);
    trip = applyChip(trip, field, value ?? "");
  } else if (state.inputText) {
    const text = state.inputText.toLowerCase();
    if (text.includes("barcelona")) {
      trip = mergeTripState(trip, {
        destinationStatus: "known",
        destinationSlug: "barcelona",
        destinationName: "Barcelona",
      });
    }
    if (text.includes("beach")) trip = mergeTripState(trip, { tripType: "beach", preferences: [...trip.preferences, "beach"] });
    if (text.includes("family")) trip = mergeTripState(trip, { tripType: "family" });
    if (text.includes("unhurried") || text.includes("relax")) trip = mergeTripState(trip, { pace: "relaxed" });
  }

  const missing = missingUsefulFields(trip);
  if (missing.includes("tripType")) {
    return {
      trip: mergeTripState(trip, {
        currentPlanningStage: "gathering",
        lastQuestion: "What kind of trip are you trying to make?",
        guidedOptions: ["beach", "city", "family", "mix"],
      }),
      assistantText: "What kind of trip are you trying to make?",
    };
  }
  if (missing.includes("dates")) {
    return {
      trip: mergeTripState(trip, {
        currentPlanningStage: "gathering",
        lastQuestion: "How many nights should I plan for?",
        guidedOptions: ["4", "5", "6", "7"],
      }),
      assistantText: "How many nights should I plan for?",
    };
  }

  return {
    trip: mergeTripState(trip, {
      currentPlanningStage: trip.destinationStatus === "known" ? "researching" : "discovering",
      lastQuestion: undefined,
      guidedOptions: [],
    }),
  };
}

async function routeSupervisor(state: GraphState) {
  return {
    trip: mergeTripState(state.trip, {
      currentPlanningStage:
        state.trip.destinationStatus === "known"
          ? "researching"
          : state.trip.candidateDestinations.length
            ? "awaiting_destination"
            : "discovering",
    }),
  };
}

async function discoverDestinations(state: GraphState) {
  const candidates = rankDestinations(state.trip, 3);
  const interruptPayload: PendingInterrupt = {
    interruptId: `choose-destination-${candidates.map((item) => item.slug).join("-")}`,
    interruptType: "choose_destination",
    title: "Choose a destination",
    prompt: "These places fit the trip so far. Pick one and I will keep the same thread.",
    options: candidates.map((item, index) => ({
      id: item.slug,
      label: item.name,
      description: item.summary,
      recommended: index === 0,
    })),
  };

  return {
    trip: mergeTripState(state.trip, {
      destinationStatus: "candidates",
      candidateDestinations: candidates,
      currentPlanningStage: "awaiting_destination",
      pendingInterrupt: interruptPayload,
    }),
    assistantText: "I have three destination options with evidence. Choose one to continue on this same thread.",
  };
}

async function awaitDestinationChoice(state: GraphState) {
  const payload = state.trip.pendingInterrupt ?? {
    interruptId: "choose-destination",
    interruptType: "choose_destination" as const,
    title: "Choose a destination",
    prompt: "Pick a destination to continue.",
    options: state.trip.candidateDestinations.map((item) => ({
      id: item.slug,
      label: item.name,
      description: item.summary,
    })),
  };
  const choice = interrupt(payload);
  const slug = typeof choice === "string" ? choice : String(choice);
  const selected = state.trip.candidateDestinations.find((item) => item.slug === slug);
  return {
    trip: mergeTripState(state.trip, {
      destinationStatus: "known",
      destinationSlug: slug,
      destinationName: selected?.name ?? slug,
      pendingInterrupt: null,
      currentPlanningStage: "researching",
    }),
  };
}

async function researchLocal(state: GraphState) {
  const slug = state.trip.destinationSlug;
  if (!slug) {
    return {};
  }
  const evidence = evidenceFor(slug, ["neighborhoods", "pace", "food", "family"]);
  return {
    trip: mergeTripState(state.trip, {
      currentPlanningStage: "planning",
      publicSummary: evidence[0]?.body,
    }),
    assistantText: `I gathered local notes for ${state.trip.destinationName ?? slug}. Next I will draft the days.`,
  };
}

async function planItinerary(state: GraphState) {
  const slug = state.trip.destinationSlug;
  if (!slug) return {};
  const itinerary = buildItinerary(state.trip, slug);
  return {
    trip: mergeTripState(state.trip, {
      itinerary,
      currentPlanningStage: "planning",
    }),
  };
}

async function critiqueItinerary(state: GraphState) {
  const needsTradeoff =
    state.trip.budget.flexibility === "strict" &&
    state.trip.pace === "packed" &&
    (state.trip.budget.amount ?? 0) > 0;

  if (needsTradeoff) {
    const pending: PendingInterrupt = {
      interruptId: "tradeoff-pace-budget",
      interruptType: "approve_tradeoff",
      title: "Choose a tradeoff",
      prompt: "A packed pace and a strict budget are in tension. Which should I protect?",
      options: [
        { id: "protect-budget", label: "Protect the budget", recommended: true },
        { id: "protect-pace", label: "Keep the packed pace" },
      ],
    };
    return {
      trip: mergeTripState(state.trip, {
        pendingInterrupt: pending,
        currentPlanningStage: "awaiting_tradeoff",
      }),
    };
  }

  return {
    trip: mergeTripState(state.trip, {
      currentPlanningStage: "presenting",
    }),
  };
}

async function awaitTradeoff(state: GraphState) {
  if (state.trip.currentPlanningStage !== "awaiting_tradeoff" || !state.trip.pendingInterrupt) {
    return {};
  }
  const choice = interrupt(state.trip.pendingInterrupt);
  const protectBudget = String(choice).includes("budget");
  return {
    trip: mergeTripState(state.trip, {
      pendingInterrupt: null,
      pace: protectBudget ? "relaxed" : state.trip.pace,
      currentPlanningStage: "planning",
    }),
  };
}

async function presentPlan(state: GraphState) {
  if (state.assistantText.includes("I only plan trips")) {
    return { assistantText: state.assistantText };
  }
  const itinerary = state.trip.itinerary;
  const text = itinerary
    ? `Here is a ${itinerary.days.length}-day plan for ${itinerary.destinationName}. Ask for a revision and I will keep the same thread.`
    : "The plan is ready.";
  return {
    trip: mergeTripState(state.trip, {
      currentPlanningStage: "complete",
      pendingInterrupt: null,
    }),
    assistantText: text,
    messages: [new HumanMessage(state.inputText || "continue")],
  };
}

function afterScope(state: GraphState) {
  if (state.assistantText?.includes("I only plan trips")) return "present_plan";
  return "gather_preferences";
}

function afterGather(state: GraphState) {
  if (state.trip.currentPlanningStage === "gathering") return "present_plan";
  return "route_supervisor";
}

function afterRoute(state: GraphState) {
  if (state.trip.destinationStatus === "known") return "research_local";
  if (state.trip.pendingInterrupt?.interruptType === "choose_destination") return "await_destination_choice";
  return "discover_destinations";
}

function afterCritique(state: GraphState) {
  if (state.trip.currentPlanningStage === "awaiting_tradeoff") return "await_tradeoff";
  return "present_plan";
}

export function compileTripGraph(checkpointer = new MemorySaver()) {
  const graph = new StateGraph(GraphAnnotation)
    .addNode("scope_guard", scopeGuard)
    .addNode("gather_preferences", gatherPreferences)
    .addNode("route_supervisor", routeSupervisor)
    .addNode("discover_destinations", discoverDestinations)
    .addNode("await_destination_choice", awaitDestinationChoice)
    .addNode("research_local", researchLocal)
    .addNode("plan_itinerary", planItinerary)
    .addNode("critique_itinerary", critiqueItinerary)
    .addNode("await_tradeoff", awaitTradeoff)
    .addNode("present_plan", presentPlan)
    .addEdge(START, "scope_guard")
    .addConditionalEdges("scope_guard", afterScope, {
      gather_preferences: "gather_preferences",
      present_plan: "present_plan",
    })
    .addConditionalEdges("gather_preferences", afterGather, {
      route_supervisor: "route_supervisor",
      present_plan: "present_plan",
    })
    .addConditionalEdges("route_supervisor", afterRoute, {
      discover_destinations: "discover_destinations",
      await_destination_choice: "await_destination_choice",
      research_local: "research_local",
    })
    .addEdge("discover_destinations", "await_destination_choice")
    .addEdge("await_destination_choice", "research_local")
    .addEdge("research_local", "plan_itinerary")
    .addEdge("plan_itinerary", "critique_itinerary")
    .addConditionalEdges("critique_itinerary", afterCritique, {
      await_tradeoff: "await_tradeoff",
      present_plan: "present_plan",
    })
    .addEdge("await_tradeoff", "plan_itinerary")
    .addEdge("present_plan", END);

  return graph.compile({ checkpointer });
}

export const tripGraph = compileTripGraph();
