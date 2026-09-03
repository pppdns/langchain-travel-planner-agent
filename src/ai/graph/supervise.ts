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
  question: z.string().optional(),
  options: z.array(z.string().min(1).max(96)).max(6).optional(),
});

const STEER_TAILS = [
  "What kind of trip are you trying to make?",
  "How many nights should I plan for?",
  "I can search for places that fit.",
  "I can draft the days whenever you want.",
];

const SUPERVISOR_SYSTEM = [
  "You are Route State's travel supervisor. The scope guard already ran. Stay on travel.",
  "Answer the latest user message. The first sentence must name their key ask and the place, for example: You asked about the weather in Faro.",
  "Resolve words like there or it from the current trip destination.",
  "Use tool results only. Do not invent weather, prices, or bookings.",
  "Do not dump the full itinerary unless they asked for the plan or a revision.",
  "If the trip is not planned yet, keep planning after you answer: ask the next missing field, offer a visible next step, or route to research when the destination is known, or discover when it is not.",
  "Never leave an unfinished plan without a next question or a choice. If the user only answered an intake field such as city or 4, do not end the turn.",
  "If you offer 2 to 6 concrete choices, list them as a numbered list. Those become the on-screen chips. Do not also ask what kind of trip in that same reply.",
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
  if (trip.itinerary) return null;
  if (trip.pendingInterrupt?.interruptType === "choose_destination" && trip.destinationStatus !== "known") {
    return null;
  }
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
  if (trip.destinationStatus !== "known") {
    return {
      question: "I can search for places that fit.",
      options: ["Find destinations"],
    };
  }
  return {
    question: "I can draft the days whenever you want.",
    options: ["Draft the days"],
  };
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

function cleanChoice(value: string) {
  return value.replace(/^[*_`]+|[*_`]+$/g, "").replace(/\s+/g, " ").trim();
}

function isSteerQuestion(value: string) {
  return STEER_TAILS.some((tail) => value.toLowerCase().includes(tail.toLowerCase()));
}

function isIntakeOptions(options: string[]) {
  const norm = options.map((option) => option.toLowerCase());
  if (norm.every((option) => ["beach", "city", "family", "mix"].includes(option))) return true;
  if (norm.every((option) => ["4", "5", "6", "7"].includes(option))) return true;
  return (
    options.length === 1 &&
    /^(draft the days|find destinations)$/i.test(options[0] ?? "")
  );
}

export function extractReplyChoices(text: string): { question: string; options: string[] } | null {
  const items: { n: number; t: string }[] = [];
  for (const match of text.matchAll(/^\s*(?:(\d+)[\.\)\:]|[-*•])\s+(.+?)\s*$/gm)) {
    const option = cleanChoice(match[2] ?? "");
    if (!option || option.length > 80 || isSteerQuestion(option) || /which sounds|what country/i.test(option)) {
      continue;
    }
    items.push({ n: Number(match[1] || items.length + 1), t: option });
  }
  if (items.length < 2) {
    for (const match of text.matchAll(/(\d+)[\.\)]\s+([^0-9\n]+?)(?=(?:\s+\d+[\.\)])|$)/g)) {
      const option = cleanChoice(match[2] ?? "");
      if (!option || option.length > 80 || isSteerQuestion(option) || /which sounds|what country/i.test(option)) {
        continue;
      }
      items.push({ n: Number(match[1]), t: option });
    }
  }
  const options = [...new Map(items.sort((a, b) => a.n - b.n).map((item) => [item.t.toLowerCase(), item.t])).values()];
  if (options.length < 2) return null;
  const questions = text.match(/[^.!?\n]+\?/g)?.map((item) => item.trim()) ?? [];
  const question = questions.filter((item) => !isSteerQuestion(item)).at(-1) ?? "Which of these fits?";
  return { question, options: options.slice(0, 6) };
}

function stripSteerTails(text: string) {
  let next = text.trim();
  for (const tail of STEER_TAILS) {
    const pattern = new RegExp(`(?:\\s+${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})+$`, "i");
    next = next.replace(pattern, "").trim();
  }
  return next;
}

function isContinueIntent(state: SupervisorInput) {
  const text = state.inputText.toLowerCase();
  if (state.inputKind === "chip" && text.startsWith("continue:")) return true;
  return /draft the days|find destinations|continue planning/.test(text);
}

function withPlanningSteer(params: {
  trip: TripState;
  text: string;
  assistantText: string;
  evidence?: EvidenceRef[];
}): SupervisorResult {
  const { trip, text, assistantText, evidence } = params;
  if (trip.itinerary) {
    return finishAnswer({ trip, text, assistantText, evidence });
  }

  if (trip.pendingInterrupt?.interruptType === "choose_destination" && trip.destinationStatus !== "known") {
    const kept = assistantText.includes("Pick a destination")
      ? assistantText
      : `${assistantText} Pick a destination to continue.`;
    return finishAnswer({
      trip: mergeTripState(trip, { currentPlanningStage: "awaiting_destination" }),
      text,
      assistantText: kept,
      evidence,
    });
  }

  const extracted = extractReplyChoices(assistantText);
  const offered =
    trip.guidedOptions.length >= 2 && !isIntakeOptions(trip.guidedOptions)
      ? {
          question: trip.lastQuestion || extracted?.question || "Which of these fits?",
          options: trip.guidedOptions,
        }
      : null;
  const choices = extracted ?? offered;
  if (choices) {
    return finishAnswer({
      trip: applySteer(trip, choices),
      text,
      assistantText: stripSteerTails(assistantText),
      evidence,
    });
  }

  const steer = nextSteer(trip);
  const reply =
    steer && !assistantText.includes(steer.question) ? `${assistantText} ${steer.question}` : assistantText;
  return finishAnswer({
    trip: applySteer(trip, steer),
    text,
    assistantText: reply,
    evidence,
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
        "Choose the next Route State graph move. If the user asked a question and there is no itinerary yet, choose answer. Do not jump to discover, research, or plan just because a destination is known. answer ends the turn. discover/research/plan/present hand off to specialist nodes. await_destination only if a destination choice is already pending and they are picking a place, not asking a question. If the draft lists 2 to 6 concrete choices, copy them into options and set question to the sentence that asks which to pick. Use only the supplied facts.",
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
      const offered = routed.output.options?.map((item) => item.trim()).filter(Boolean).slice(0, 6);
      const trip =
        offered && offered.length >= 2
          ? applySteer(state.trip, {
              question: routed.output.question?.trim() || extractReplyChoices(reply)?.question || "Which of these fits?",
              options: offered,
            })
          : state.trip;
      return finishAnswer({
        trip,
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

  if (isContinueIntent(state)) {
    const advance = nextPlanningRoute(trip) ?? ( /find destinations/.test(haystack) ? "discover" : "research");
    return finishRoute({ trip, text, route: advance });
  }

  if (
    trip.pendingInterrupt?.interruptType === "choose_destination" &&
    trip.destinationStatus !== "known" &&
    !(state.inputKind === "message" && looksLikeUserQuestion(text))
  ) {
    return finishRoute({ trip, text, route: "await_destination" });
  }

  if (/hike|hiking|trek|trail|alpine|landscape/.test(haystack) && !trip.itinerary) {
    return withPlanningSteer({
      trip,
      text,
      assistantText: [
        "You asked for a destination with beautiful hiking landscapes.",
        "",
        "A few directions to choose from:",
        "",
        "1. Mountains and alpine lakes",
        "2. Coastal cliffs and sea views",
        "3. Volcanoes and dramatic terrain",
        "4. Forests, waterfalls, and valleys",
        "",
        "Which sounds most like your ideal hike?",
      ].join("\n"),
    });
  }

  if (/weather|forecast|temperature|rain|how hot|how warm/.test(haystack)) {
    const slug = resolveSlug(trip, text);
    if (slug) {
      assertToolAllowed("route_supervisor", "get_weather");
      const weather = await getWeather.execute({ slug, live });
      const name = getDestination(slug)?.name ?? trip.destinationName ?? slug;
      return withPlanningSteer({
        trip,
        text,
        assistantText: `You asked about the weather in ${name}. ${weather.summary}`,
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
      return withPlanningSteer({
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

  if (asked) {
    return withPlanningSteer({
      trip,
      text,
      assistantText: `You asked about ${placeName(trip)}.`,
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

export function finalizeSupervisor(state: SupervisorInput, result: SupervisorResult): SupervisorResult {
  const asked = state.inputKind === "message" && looksLikeUserQuestion(state.inputText);
  const advance = nextPlanningRoute(result.trip);
  const evidence = result.trip.latestEvidence;

  if (isContinueIntent(state) && advance) {
    return finishRoute({
      trip: result.trip,
      text: state.inputText,
      route: advance,
      evidence,
    });
  }

  if (asked && !result.trip.itinerary) {
    return withPlanningSteer({
      trip: result.trip,
      text: state.inputText,
      assistantText: result.assistantText?.trim() || `You asked about ${placeName(result.trip)}.`,
      evidence,
    });
  }

  if (result.supervisorRoute === "answer" && !asked && advance) {
    return finishRoute({
      trip: result.trip,
      text: state.inputText,
      route: advance,
      evidence,
    });
  }

  if (result.supervisorRoute === "answer" && !result.trip.itinerary && result.assistantText) {
    return withPlanningSteer({
      trip: result.trip,
      text: state.inputText,
      assistantText: result.assistantText,
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
