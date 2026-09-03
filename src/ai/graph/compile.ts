import { Annotation, END, MemorySaver, START, StateGraph, interrupt } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { buildItinerary } from "@/src/ai/graph/itinerary";
import { evidenceFor, rankDestinations } from "@/src/ai/graph/rank";
import { rememberedFromTrip } from "@/src/ai/graph/revisions";
import { superviseTurn } from "@/src/ai/graph/supervise";
import {
  emptyTripState,
  mergeTripState,
  missingUsefulFields,
  tripTypeSchema,
  type PendingInterrupt,
  type TripState,
} from "@/src/ai/graph/state";
import { isOffScope, looksLikeInjection } from "@/src/ai/guardrails/scope";
import { applyStarterSeed } from "@/src/ai/contracts/starters";
import type { StarterId } from "@/src/ai/contracts/http";
import { deleteMemory } from "@/src/ai/memory/preferences";
import {
  applyExtractedFacts,
  extractTripFacts,
  matchCatalogDestination,
  writeLiveAssistantCopy,
} from "@/src/ai/models/live";
import { liveModelsFromConfig } from "@/src/ai/runtime/live-flag";
import {
  assertToolAllowed,
  convertCurrency,
  lookupDestinationProfile,
  readTripState,
  searchMemories,
  searchTravelKnowledge,
  getWeather,
  writeMemoryTool,
} from "@/src/ai/tools/catalog";

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
  supervisorRoute: Annotation<string>({
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

function threadIdFrom(config?: LangGraphRunnableConfig) {
  return String(config?.configurable?.thread_id ?? "local-demo-user");
}

async function gatherPreferences(state: GraphState, config?: LangGraphRunnableConfig) {
  const threadId = threadIdFrom(config);
  let trip = state.trip;

  assertToolAllowed("gather_preferences", "read_trip_state");
  readTripState.execute({
    destinationStatus: trip.destinationStatus,
    currentPlanningStage: trip.currentPlanningStage,
    destinationSlug: trip.destinationSlug,
  });
  assertToolAllowed("gather_preferences", "search_memories");
  searchMemories.execute({ userId: threadId });

  if (state.inputKind === "starter") {
    trip = applyStarterSeed(state.inputText as StarterId);
    const remembered = rememberedFromTrip(trip);
    for (const item of remembered) {
      assertToolAllowed("gather_preferences", "write_memory");
      writeMemoryTool.execute({ userId: threadId, key: item.key, value: item.value });
    }
    trip = mergeTripState(trip, { rememberedPreferences: remembered });
  } else if (state.inputKind === "chip") {
    const [field, value] = state.inputText.split(":", 2);
    if (field === "memory" && value?.startsWith("forget:")) {
      const key = value.slice(7);
      deleteMemory(threadId, key);
      return {
        trip: mergeTripState(trip, {
          rememberedPreferences: trip.rememberedPreferences.filter((item) => item.key !== key),
        }),
        assistantText: "Forgot that preference for this session.",
      };
    }
    trip = applyChip(trip, field, value ?? "");
  } else if (state.inputText) {
    const text = state.inputText.toLowerCase();
    const matched = matchCatalogDestination(state.inputText);
    if (matched && trip.destinationStatus === "unknown") {
      trip = mergeTripState(trip, {
        destinationStatus: "known",
        destinationSlug: matched.slug,
        destinationName: matched.name,
      });
    }
    if (text.includes("beach")) trip = mergeTripState(trip, { tripType: "beach", preferences: [...trip.preferences, "beach"] });
    if (text.includes("family")) trip = mergeTripState(trip, { tripType: "family" });
    const typed = tripTypeSchema.safeParse(state.inputText.trim().toLowerCase());
    if (typed.success) trip = mergeTripState(trip, { tripType: typed.data });
    const nightMatch = state.inputText.match(/\b(\d{1,2})\s*(?:nights?|days?)\b/i);
    if (nightMatch && !trip.dates.durationNights) {
      trip = mergeTripState(trip, {
        dates: { ...trip.dates, durationNights: Number(nightMatch[1]) },
      });
    } else if (!trip.dates.durationNights && /^\d{1,2}$/.test(state.inputText.trim())) {
      const nights = Number.parseInt(state.inputText.trim(), 10);
      if (nights >= 1 && nights <= 21) {
        trip = mergeTripState(trip, { dates: { ...trip.dates, durationNights: nights } });
      }
    }
    if (trip.visionObservations[0]?.atmosphere && !trip.preferences.includes("atmosphere from photo")) {
      trip = mergeTripState(trip, {
        preferences: [...trip.preferences, "atmosphere from photo"],
      });
    }
    if (liveModelsFromConfig(config)) {
      const extracted = await extractTripFacts(state.inputText);
      if (extracted) trip = applyExtractedFacts(trip, extracted);
    }
  }

  const missing = missingUsefulFields(trip);
  const gatheringQuestion = missing.includes("tripType")
    ? {
        lastQuestion: "What kind of trip are you trying to make?",
        guidedOptions: ["beach", "city", "family", "mix"],
      }
    : missing.includes("dates")
      ? {
          lastQuestion: "How many nights should I plan for?",
          guidedOptions: ["4", "5", "6", "7"],
        }
      : null;

  const alreadyPlanned =
    Boolean(trip.itinerary) &&
    (trip.currentPlanningStage === "complete" || trip.currentPlanningStage === "presenting");
  return {
    trip: mergeTripState(trip, {
      currentPlanningStage: gatheringQuestion
        ? "gathering"
        : alreadyPlanned
          ? trip.currentPlanningStage
          : trip.destinationStatus === "known"
            ? "researching"
            : "discovering",
      lastTurnKind: gatheringQuestion ? "gather" : trip.lastTurnKind,
      lastQuestion: gatheringQuestion?.lastQuestion,
      guidedOptions: gatheringQuestion?.guidedOptions ?? [],
    }),
  };
}

async function routeSupervisor(state: GraphState, config?: LangGraphRunnableConfig) {
  return superviseTurn(state, config);
}

async function discoverDestinations(state: GraphState, config?: LangGraphRunnableConfig) {
  const live = liveModelsFromConfig(config);
  const query = [state.trip.tripType, ...state.trip.preferences].filter(Boolean).join(" ") || "city break";
  assertToolAllowed("discover_destinations", "search_travel_knowledge");
  const knowledge = await searchTravelKnowledge.execute({ query, live });
  const candidates = rankDestinations(state.trip, 3);
  const weatherNotes: string[] = [];
  for (const candidate of candidates) {
    assertToolAllowed("discover_destinations", "lookup_destination_profile");
    lookupDestinationProfile.execute({ slug: candidate.slug });
    assertToolAllowed("discover_destinations", "get_weather");
    const weather = await getWeather.execute({ slug: candidate.slug, live });
    weatherNotes.push(`${candidate.name}: ${weather.summary}`);
  }

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

  const fallback = "I have three destination options with evidence. Choose one to continue on this same thread.";
  const assistantText = live
    ? await writeLiveAssistantCopy({
        kind: "discover",
        fallback,
        facts: JSON.stringify({
          candidates: candidates.map((item) => ({ name: item.name, summary: item.summary, factors: item.factors })),
          weather: weatherNotes,
          evidenceTitles: knowledge.items.map((item) => item.title),
        }),
      })
    : fallback;

  return {
    trip: mergeTripState(state.trip, {
      destinationStatus: "candidates",
      candidateDestinations: candidates,
      currentPlanningStage: "awaiting_destination",
      lastTurnKind: "interrupt",
      pendingInterrupt: interruptPayload,
      latestEvidence: [...knowledge.items, ...candidates.flatMap((item) => item.evidence)].slice(0, 6),
    }),
    assistantText,
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

async function researchLocal(state: GraphState, config?: LangGraphRunnableConfig) {
  const slug = state.trip.destinationSlug;
  if (!slug) {
    return {};
  }
  const live = liveModelsFromConfig(config);
  assertToolAllowed("research_local", "search_travel_knowledge");
  const knowledge = await searchTravelKnowledge.execute({
    query: "neighborhoods pace food",
    destinationSlug: slug,
    live,
  });
  assertToolAllowed("research_local", "lookup_destination_profile");
  lookupDestinationProfile.execute({ slug });
  assertToolAllowed("research_local", "get_weather");
  const weather = await getWeather.execute({ slug, live });
  const catalogEvidence = evidenceFor(slug, ["neighborhoods", "pace", "food", "family"]);
  const latestEvidence = (knowledge.items.length ? knowledge.items : catalogEvidence.map((doc) => ({
    id: doc.id,
    title: doc.title,
    sourceType: doc.sourceType,
    destinationSlug: doc.destinationSlug,
    category: doc.category,
  }))).slice(0, 6);
  const fallback = `I gathered local notes for ${state.trip.destinationName ?? slug}. Next I will draft the days.`;
  const assistantText = live
    ? await writeLiveAssistantCopy({
        kind: "research",
        fallback,
        facts: JSON.stringify({
          destination: state.trip.destinationName ?? slug,
          weather: weather.summary,
          evidenceTitles: latestEvidence.map((item) => item.title),
        }),
      })
    : fallback;
  return {
    trip: mergeTripState(state.trip, {
      currentPlanningStage: "planning",
      publicSummary: `Local notes for ${state.trip.destinationName ?? slug}: ${latestEvidence
        .map((item) => item.category)
        .filter(Boolean)
        .slice(0, 4)
        .join(", ")}.`,
      latestEvidence,
    }),
    assistantText,
  };
}

async function planItinerary(state: GraphState) {
  const slug = state.trip.destinationSlug;
  if (!slug) return {};
  if (state.trip.budget.amount !== undefined) {
    assertToolAllowed("plan_itinerary", "convert_currency");
    convertCurrency.execute({
      amount: state.trip.budget.amount,
      from: state.trip.budget.currency,
      to: "EUR",
    });
  }
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
    (state.trip.budget.amount ?? 0) > 0 &&
    !state.trip.resolvedInterruptIds.includes("tradeoff-pace-budget");

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
        lastTurnKind: "interrupt",
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
      resolvedInterruptIds: [...new Set([...state.trip.resolvedInterruptIds, "tradeoff-pace-budget"])],
      currentPlanningStage: "planning",
    }),
  };
}

async function presentPlan(state: GraphState) {
  if (/only plan trips|Forgot that preference/i.test(state.assistantText)) {
    return { assistantText: state.assistantText };
  }
  if (state.trip.currentPlanningStage === "gathering" || state.trip.lastTurnKind === "gather") {
    return {
      assistantText: state.assistantText,
      trip: mergeTripState(state.trip, { lastTurnKind: "gather" }),
    };
  }
  const itinerary = state.trip.itinerary;
  const preface =
    /slowed the days|cut optional transfers|search again|asked about|weather|forecast/i.test(
      state.assistantText,
    )
      ? `${state.assistantText} `
      : "";
  const text = itinerary
    ? `${preface}Here is a ${itinerary.days.length}-day plan for ${itinerary.destinationName}. Ask for a revision and I will keep the same thread.`
    : preface || "The plan is ready.";
  return {
    trip: mergeTripState(state.trip, {
      currentPlanningStage: "complete",
      pendingInterrupt: null,
      lastTurnKind: "plan",
    }),
    assistantText: text,
  };
}

function afterScope(state: GraphState) {
  if (state.assistantText?.includes("I only plan trips")) return "present_plan";
  return "gather_preferences";
}

export function afterGather(state: GraphState) {
  if (/Forgot that preference/i.test(state.assistantText)) return "present_plan";
  return "route_supervisor";
}

export function afterRoute(state: GraphState) {
  switch (state.supervisorRoute) {
    case "answer":
      return "end";
    case "present":
      return "present_plan";
    case "plan":
      return "plan_itinerary";
    case "research":
      return "research_local";
    case "discover":
      return "discover_destinations";
    case "await_destination":
      return "await_destination_choice";
    default:
      if (state.trip.destinationStatus === "known") return "research_local";
      if (state.trip.pendingInterrupt?.interruptType === "choose_destination") return "await_destination_choice";
      return "discover_destinations";
  }
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
      plan_itinerary: "plan_itinerary",
      present_plan: "present_plan",
      end: END,
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
