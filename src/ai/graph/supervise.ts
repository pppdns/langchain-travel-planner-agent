import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getDestination } from "@/data/travel/catalog";
import {
  applyRevision,
  detectRevision,
  resetForRediscovery,
  revisionAssistantText,
} from "@/src/ai/graph/revisions";
import { mergeTripState, type EvidenceRef, type TripState } from "@/src/ai/graph/state";
import { matchCatalogDestination } from "@/src/ai/models/live";
import {
  canCallLiveModels,
  generateStructured,
  languageModel,
  routeModelTier,
} from "@/src/ai/models/factory";
import { liveModelsFromConfig } from "@/src/ai/runtime/live-flag";
import {
  assertToolAllowed,
  convertCurrency,
  getWeather,
  lookupDestinationProfile,
  readTripState,
  searchMemories,
  searchTravelKnowledge,
} from "@/src/ai/tools/catalog";

export const SUPERVISOR_ROUTES = [
  "answer",
  "discover",
  "research",
  "plan",
  "present",
  "await_destination",
] as const;

export type SupervisorRoute = (typeof SUPERVISOR_ROUTES)[number];

export type SupervisorInput = {
  messages: BaseMessage[];
  trip: TripState;
  inputText: string;
  inputKind: string;
  assistantText: string;
};

export type SupervisorResult = {
  trip: TripState;
  assistantText?: string;
  messages: BaseMessage[];
  supervisorRoute: SupervisorRoute;
};

const supervisorRouteSchema = z.object({
  route: z.enum(SUPERVISOR_ROUTES),
  reply: z.string(),
});

const SUPERVISOR_SYSTEM = [
  "You are Route State's travel supervisor. The scope guard already ran. Stay on travel.",
  "Answer the latest user message. The first sentence must name their key ask and the place, for example: You asked about the weather in Faro.",
  "Resolve words like there or it from the current trip destination.",
  "Use tool results only. Do not invent weather, prices, or bookings.",
  "Do not dump the full itinerary unless they asked for the plan or a revision.",
  "If the trip is not planned yet, keep planning after you answer: ask the next missing field, or route to research when the destination is known, or discover when it is not.",
  "If the user only answered an intake field such as city or 4, do not end the turn. Continue planning.",
  "No em-dashes. No fake match percentages.",
].join(" ");

function threadIdFrom(config?: LangGraphRunnableConfig) {
  return String(config?.configurable?.thread_id ?? "local-demo-user");
}

function placeName(trip: TripState) {
  return trip.destinationName ?? trip.destinationSlug ?? "this trip";
}

function looksLikeUserQuestion(text: string) {
  const trimmed = text.trim();
  return (
    /\?\s*$/.test(trimmed) ||
    /^(what|what's|whats|how|is|are|does|do|can|could|where|when|why|which)\b/i.test(trimmed)
  );
}

function resolveSlug(trip: TripState, text = "") {
  if (trip.destinationSlug) return trip.destinationSlug;
  const matched = matchCatalogDestination(text);
  if (matched) return matched.slug;
  const haystack = text.toLowerCase();
  const mentioned = trip.candidateDestinations.find(
    (item) => haystack.includes(item.slug) || haystack.includes(item.name.toLowerCase()),
  );
  return mentioned?.slug;
}

export function nextSteer(trip: TripState): { question: string; options: string[] } | null {
  if (!trip.tripType) {
    return {
      question: "What kind of trip are you trying to make?",
      options: ["beach", "city", "family", "mix"],
    };
  }
  if (!trip.dates.durationNights && !trip.dates.start) {
    return {
      question: "How many nights should I plan for?",
      options: ["4", "5", "6", "7"],
    };
  }
  return null;
}

export function nextPlanningRoute(trip: TripState): Exclude<SupervisorRoute, "answer"> | null {
  if (trip.itinerary) return null;
  if (!trip.tripType || (!trip.dates.durationNights && !trip.dates.start)) return null;
  if (trip.pendingInterrupt?.interruptType === "choose_destination" && trip.destinationStatus !== "known") {
    return "await_destination";
  }
  if (trip.destinationStatus === "known") return "research";
  return "discover";
}

function applySteer(trip: TripState, steer: { question: string; options: string[] } | null): TripState {
  if (!steer) return trip;
  return mergeTripState(trip, {
    currentPlanningStage: "gathering",
    lastQuestion: steer.question,
    guidedOptions: steer.options,
  });
}

function weatherEvidence(slug: string): EvidenceRef {
  const destination = getDestination(slug);
  return {
    id: `weather-${slug}`,
    title: `${destination?.name ?? slug} weather`,
    sourceType: "synthetic",
    destinationSlug: slug,
    category: "weather",
  };
}

function humanDelta(text: string) {
  return new HumanMessage(text || "continue");
}

function finishAnswer(params: {
  trip: TripState;
  text: string;
  assistantText: string;
  evidence?: EvidenceRef[];
}): SupervisorResult {
  return {
    trip: mergeTripState(params.trip, {
      currentPlanningStage:
        params.trip.currentPlanningStage === "gathering"
          ? "gathering"
          : params.trip.itinerary
            ? "complete"
            : params.trip.currentPlanningStage,
      lastTurnKind: "answer",
      latestEvidence: params.evidence?.length ? params.evidence.slice(0, 6) : params.trip.latestEvidence,
    }),
    assistantText: params.assistantText,
    messages: [humanDelta(params.text), new AIMessage(params.assistantText)],
    supervisorRoute: "answer",
  };
}

function finishRoute(params: {
  trip: TripState;
  text: string;
  route: Exclude<SupervisorRoute, "answer">;
  assistantText?: string;
  evidence?: EvidenceRef[];
}): SupervisorResult {
  return {
    trip: mergeTripState(params.trip, {
      lastQuestion: undefined,
      guidedOptions: [],
      latestEvidence: params.evidence?.length ? params.evidence.slice(0, 6) : params.trip.latestEvidence,
    }),
    assistantText: params.assistantText,
    messages: [humanDelta(params.text)],
    supervisorRoute: params.route,
  };
}

async function readPublicTrip(trip: TripState) {
  assertToolAllowed("route_supervisor", "read_trip_state");
  return readTripState.execute({
    destinationStatus: trip.destinationStatus,
    currentPlanningStage: trip.currentPlanningStage,
    destinationSlug: trip.destinationSlug,
  });
}

function bindSupervisorTools(ctx: { trip: TripState; live: boolean; threadId: string; evidence: EvidenceRef[] }) {
  return {
    read_trip_state: tool({
      description: readTripState.description,
      inputSchema: z.object({}),
      execute: async () => readPublicTrip(ctx.trip),
    }),
    get_weather: tool({
      description: getWeather.description,
      inputSchema: getWeather.schema,
      execute: async ({ slug }) => {
        const resolved =
          getDestination(slug)?.slug ??
          matchCatalogDestination(slug)?.slug ??
          (slug || ctx.trip.destinationSlug);
        if (!resolved) return { ok: false as const, error: "no_destination" };
        assertToolAllowed("route_supervisor", "get_weather");
        const weather = await getWeather.execute({ slug: resolved, live: ctx.live });
        ctx.evidence.push(weatherEvidence(resolved));
        return weather;
      },
    }),
    search_travel_knowledge: tool({
      description: searchTravelKnowledge.description,
      inputSchema: searchTravelKnowledge.schema,
      execute: async ({ query, destinationSlug }) => {
        assertToolAllowed("route_supervisor", "search_travel_knowledge");
        const result = await searchTravelKnowledge.execute({
          query,
          destinationSlug: destinationSlug ?? ctx.trip.destinationSlug,
          live: ctx.live,
        });
        ctx.evidence.push(...result.items.slice(0, 3));
        return { ok: true as const, items: result.items };
      },
    }),
    lookup_destination_profile: tool({
      description: lookupDestinationProfile.description,
      inputSchema: lookupDestinationProfile.schema,
      execute: async ({ slug }) => {
        assertToolAllowed("route_supervisor", "lookup_destination_profile");
        return lookupDestinationProfile.execute({ slug });
      },
    }),
    search_memories: tool({
      description: searchMemories.description,
      inputSchema: z.object({ query: z.string().optional() }),
      execute: async ({ query }) => {
        assertToolAllowed("route_supervisor", "search_memories");
        return searchMemories.execute({ userId: ctx.threadId, query });
      },
    }),
    convert_currency: tool({
      description: convertCurrency.description,
      inputSchema: convertCurrency.schema,
      execute: async (input) => {
        assertToolAllowed("route_supervisor", "convert_currency");
        return convertCurrency.execute(input);
      },
    }),
  };
}

function tripBrief(trip: TripState) {
  return JSON.stringify({
    destination: trip.destinationName ?? trip.destinationSlug ?? "unknown",
    destinationSlug: trip.destinationSlug,
    destinationStatus: trip.destinationStatus,
    stage: trip.currentPlanningStage,
    nights: trip.dates.durationNights,
    pace: trip.pace,
    itineraryDays: trip.itinerary?.days.map((day) => ({ day: day.day, title: day.title })) ?? [],
  });
}

function applyRequestedRevision(trip: TripState, text: string, route: SupervisorRoute) {
  if (route !== "plan" && route !== "discover") return { trip, preface: undefined as string | undefined };
  const revision = detectRevision(text);
  if (!revision || !trip.itinerary) return { trip, preface: undefined };
  if (revision === "another-destination") {
    return { trip: resetForRediscovery(trip), preface: revisionAssistantText(revision) };
  }
  return { trip: applyRevision(trip, revision), preface: revisionAssistantText(revision) };
}

async function runLiveSupervisor(
  state: SupervisorInput,
  config: LangGraphRunnableConfig | undefined,
  live: boolean,
): Promise<SupervisorResult | null> {
  if (!canCallLiveModels()) return null;
  const evidence: EvidenceRef[] = [];
  const tools = bindSupervisorTools({
    trip: state.trip,
    live,
    threadId: threadIdFrom(config),
    evidence,
  });

  try {
    const drafted = await generateText({
      model: languageModel(routeModelTier("supervise")),
      system: SUPERVISOR_SYSTEM,
      prompt: `Trip:\n${tripBrief(state.trip)}\n\nLatest user message:\n${state.inputText}`,
      tools,
      stopWhen: stepCountIs(5),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20_000),
    });

    const routed = await generateStructured({
      tier: routeModelTier("supervise"),
      schema: supervisorRouteSchema,
      system:
        "Choose the next Route State graph move. answer ends the turn. discover/research/plan/present hand off to specialist nodes. await_destination only if a destination choice is already pending. Use only the supplied facts.",
      prompt: [
        `User message: ${state.inputText}`,
        `Trip: ${tripBrief(state.trip)}`,
        `Draft reply: ${drafted.text.trim() || "(empty)"}`,
        `Evidence titles: ${evidence.map((item) => item.title).join("; ") || "(none)"}`,
      ].join("\n"),
      timeoutMs: 12_000,
    });

    if (!routed) return null;
    const route = routed.output.route;
    const reply = routed.output.reply.trim() || drafted.text.trim();
    if (route === "answer") {
      if (!reply) return null;
      return finishAnswer({
        trip: state.trip,
        text: state.inputText,
        assistantText: reply,
        evidence,
      });
    }

    const revised = applyRequestedRevision(state.trip, state.inputText, route);
    return finishRoute({
      trip: revised.trip,
      text: state.inputText,
      route,
      assistantText: revised.preface ?? reply,
      evidence,
    });
  } catch {
    return null;
  }
}

async function runFakeSupervisor(state: SupervisorInput, live: boolean): Promise<SupervisorResult> {
  const text = state.inputText;
  const haystack = text.toLowerCase();
  const trip = state.trip;
  await readPublicTrip(trip);

  if (trip.pendingInterrupt?.interruptType === "choose_destination" && trip.destinationStatus !== "known") {
    return finishRoute({ trip, text, route: "await_destination" });
  }

  if (/weather|forecast|temperature|rain|how hot|how warm/.test(haystack)) {
    const slug = resolveSlug(trip, text);
    if (slug) {
      assertToolAllowed("route_supervisor", "get_weather");
      const weather = await getWeather.execute({ slug, live });
      const name = getDestination(slug)?.name ?? trip.destinationName ?? slug;
      const steer = nextSteer(trip);
      return finishAnswer({
        trip: applySteer(trip, steer),
        text,
        assistantText: [`You asked about the weather in ${name}. ${weather.summary}`, steer?.question]
          .filter(Boolean)
          .join(" "),
        evidence: [weatherEvidence(slug)],
      });
    }
  }

  const dayMatch = haystack.match(/\bday\s*(\d+)\b/);
  if (dayMatch && trip.itinerary) {
    const day = trip.itinerary.days.find((item) => item.day === Number(dayMatch[1]));
    if (day) {
      const stops = day.stops.map((stop) => stop.title).join(", ");
      return finishAnswer({
        trip,
        text,
        assistantText: `You asked about Day ${day.day} in ${placeName(trip)}. ${day.title}. ${stops}.`,
      });
    }
  }

  if (/neighborhood|neighbourhood|area|which part|where (?:should|do) we/.test(haystack)) {
    const slug = resolveSlug(trip, text);
    if (slug) {
      assertToolAllowed("route_supervisor", "search_travel_knowledge");
      const knowledge = await searchTravelKnowledge.execute({
        query: text,
        destinationSlug: slug,
        live,
      });
      const titles = knowledge.items.map((item) => item.title).slice(0, 2);
      const detail = titles.length
        ? titles.join("; ")
        : trip.itinerary?.days[0]?.area ?? placeName(trip);
      return finishAnswer({
        trip,
        text,
        assistantText: `You asked about neighborhoods in ${placeName(trip)}. ${detail}.`,
        evidence: knowledge.items.slice(0, 3),
      });
    }
  }

  if (/show (?:the |my )?plan|see the (?:plan|itinerary)|full itinerary/.test(haystack) && trip.itinerary) {
    return finishRoute({ trip, text, route: "present" });
  }

  if (trip.itinerary) {
    const revision = detectRevision(text);
    if (revision === "another-destination") {
      return finishRoute({
        trip: resetForRediscovery(trip),
        text,
        route: "discover",
        assistantText: revisionAssistantText(revision),
      });
    }
    if (revision) {
      return finishRoute({
        trip: applyRevision(trip, revision),
        text,
        route: "plan",
        assistantText: revisionAssistantText(revision),
      });
    }
  }

  const asked = state.inputKind === "message" && looksLikeUserQuestion(text);
  const advance = nextPlanningRoute(trip);
  const steer = nextSteer(trip);

  if (asked && steer) {
    return finishAnswer({
      trip: applySteer(trip, steer),
      text,
      assistantText: `You asked about ${placeName(trip)}. ${steer.question}`,
    });
  }

  if (asked && advance) {
    return finishAnswer({
      trip,
      text,
      assistantText: `You asked about ${placeName(trip)}. I have enough to draft the days when you want the plan.`,
    });
  }

  if (advance) {
    return finishRoute({ trip, text, route: advance });
  }

  if (steer) {
    return finishAnswer({
      trip: applySteer(trip, steer),
      text,
      assistantText: steer.question,
    });
  }

  return finishRoute({ trip, text, route: "discover" });
}

function finalizeSupervisor(state: SupervisorInput, result: SupervisorResult): SupervisorResult {
  const asked = state.inputKind === "message" && looksLikeUserQuestion(state.inputText);
  const advance = nextPlanningRoute(result.trip);
  const steer = nextSteer(result.trip);
  const evidence = result.trip.latestEvidence;

  if (result.supervisorRoute === "answer" && !asked && advance) {
    return finishRoute({
      trip: result.trip,
      text: state.inputText,
      route: advance,
      evidence,
    });
  }

  if (result.supervisorRoute === "answer" && asked && advance && !steer && result.assistantText) {
    return finishAnswer({
      trip: result.trip,
      text: state.inputText,
      assistantText: /draft the days/i.test(result.assistantText)
        ? result.assistantText
        : `${result.assistantText} I have enough to draft the days when you want the plan.`,
      evidence,
    });
  }

  if (result.supervisorRoute === "answer" && steer && !result.trip.itinerary) {
    const reply = result.assistantText?.includes(steer.question)
      ? result.assistantText
      : [result.assistantText, steer.question].filter(Boolean).join(" ");
    return finishAnswer({
      trip: applySteer(result.trip, steer),
      text: state.inputText,
      assistantText: reply || steer.question,
      evidence,
    });
  }

  return result;
}

export async function superviseTurn(
  state: SupervisorInput,
  config?: LangGraphRunnableConfig,
): Promise<SupervisorResult> {
  const live = liveModelsFromConfig(config);
  if (live) {
    const liveResult = await runLiveSupervisor(state, config, live);
    if (liveResult) return finalizeSupervisor(state, liveResult);
  }
  return finalizeSupervisor(state, await runFakeSupervisor(state, live));
}
