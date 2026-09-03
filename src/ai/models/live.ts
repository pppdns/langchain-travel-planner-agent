import { z } from "zod";
import { DESTINATIONS, getDestination } from "@/data/travel/catalog";
import { generateStructured, generatePlainText, streamPlainText, routeModelTier } from "@/src/ai/models/factory";
import {
  mergeTripState,
  paceSchema,
  tripTypeSchema,
  type LastTurnKind,
  type PublicTripState,
  type TripState,
} from "@/src/ai/graph/state";

const AMBIGUOUS_DESTINATION_TOKENS = new Set(["nice", "split"]);

function mentionsDestination(haystack: string, token: string) {
  if (!AMBIGUOUS_DESTINATION_TOKENS.has(token)) {
    return haystack.includes(token);
  }
  return new RegExp(`\\b(?:in|to|visit|around)\\s+${token}\\b|\\b${token}\\s*(?:,|france|croatia)\\b`, "i").test(
    haystack,
  );
}

export const tripExtractSchema = z.object({
  destinationSlug: z.string().optional(),
  tripType: tripTypeSchema.optional(),
  origin: z.string().optional(),
  durationNights: z.number().int().min(1).max(21).optional(),
  budgetAmount: z.number().min(0).max(100_000).optional(),
  currency: z.string().length(3).optional(),
  pace: paceSchema.optional(),
  preferences: z.array(z.string().max(48)).max(12).optional(),
  adults: z.number().int().min(1).max(12).optional(),
  children: z.number().int().min(0).max(12).optional(),
});

export type TripExtract = z.infer<typeof tripExtractSchema>;

export function matchCatalogDestination(text: string): { slug: string; name: string } | null {
  const haystack = text.toLowerCase();
  const ranked = [...DESTINATIONS].sort((left, right) => right.name.length - left.name.length);
  for (const destination of ranked) {
    if (mentionsDestination(haystack, destination.slug)) {
      return { slug: destination.slug, name: destination.name };
    }
    const name = destination.name.toLowerCase();
    if (name.length > 4 && mentionsDestination(haystack, name)) {
      return { slug: destination.slug, name: destination.name };
    }
  }
  return null;
}

export function applyExtractedFacts(trip: TripState, facts: TripExtract): TripState {
  const destination = facts.destinationSlug ? getDestination(facts.destinationSlug) : undefined;
  const nextPreferences = [...trip.preferences];
  for (const item of facts.preferences ?? []) {
    if (!nextPreferences.includes(item)) nextPreferences.push(item);
  }
  return mergeTripState(trip, {
    destinationStatus: destination && trip.destinationStatus === "unknown" ? "known" : trip.destinationStatus,
    destinationSlug: destination && !trip.destinationSlug ? destination.slug : trip.destinationSlug,
    destinationName: destination && !trip.destinationName ? destination.name : trip.destinationName,
    tripType: trip.tripType ?? facts.tripType,
    origin: trip.origin ?? facts.origin,
    dates: {
      ...trip.dates,
      durationNights: trip.dates.durationNights ?? facts.durationNights,
    },
    budget: {
      ...trip.budget,
      amount: trip.budget.amount ?? facts.budgetAmount,
      currency: facts.currency ?? trip.budget.currency,
    },
    pace: trip.pace ?? facts.pace,
    preferences: nextPreferences,
    travelers: {
      adults: facts.adults ?? trip.travelers.adults,
      children: facts.children ?? trip.travelers.children,
    },
  });
}

export async function extractTripFacts(text: string): Promise<TripExtract | null> {
  const catalog = DESTINATIONS.map((item) => `${item.slug} (${item.name}, ${item.country})`).join("; ");
  const result = await generateStructured({
    tier: routeModelTier("extract"),
    schema: tripExtractSchema,
    system:
      "Extract travel-planning facts for Route State. Only use destinationSlug values from the catalog. Leave fields omitted when the user did not say them. Never invent prices.",
    prompt: `Catalog slugs: ${catalog}\n\nUser message:\n${text}`,
    timeoutMs: 12_000,
  });
  return result?.output ?? null;
}

export async function writeLiveAssistantCopy(params: {
  kind: "discover" | "research" | "question";
  fallback: string;
  facts: string;
}): Promise<string> {
  const text = await generatePlainText({
    tier: params.kind === "research" ? routeModelTier("research") : routeModelTier("extract"),
    system:
      "You write short Route State replies. No em-dashes. No match percentages. No bookings or live prices. Use only the supplied facts. Two to four sentences.",
    prompt: `Facts:\n${params.facts}\n\nFallback tone to keep:\n${params.fallback}`,
    timeoutMs: 12_000,
  });
  return text ?? params.fallback;
}

export type LivePresentation = {
  system: string;
  prompt: string;
  modelTier: "fast" | "standard" | "reasoning" | "vision";
};

export function buildLivePresentation(params: {
  trip: PublicTripState;
  assistantText: string;
  interrupted: boolean;
  userText?: string;
  turnKind?: LastTurnKind;
}): LivePresentation | null {
  if (!params.assistantText) return null;
  if (/only plan trips/i.test(params.assistantText)) return null;
  if (params.turnKind === "answer" || params.turnKind === "gather") return null;

  const facts = {
    userAsk: params.userText,
    destination: params.trip.destinationName ?? params.trip.destinationSlug,
    stage: params.trip.currentPlanningStage,
    tripType: params.trip.tripType,
    nights: params.trip.dates.durationNights,
    pace: params.trip.pace,
    budget: params.trip.budget.amount
      ? `${params.trip.budget.amount} ${params.trip.budget.currency}`
      : undefined,
    candidates: params.trip.candidateDestinations.map((item) => ({
      name: item.name,
      country: item.country,
      summary: item.summary,
      factors: item.factors,
    })),
    itinerary: params.trip.itinerary
      ? {
          destination: params.trip.itinerary.destinationName,
          days: params.trip.itinerary.days.map((day) => ({
            day: day.day,
            title: day.title,
            stops: day.stops.map((stop) => stop.title),
          })),
        }
      : undefined,
    question: params.trip.lastQuestion,
    interrupt: params.interrupted ? params.trip.pendingInterrupt?.title : undefined,
    fallback: params.assistantText,
  };

  return {
    modelTier: routeModelTier("present"),
    system:
      "You are Route State's travel planner. Write a concise operations brief from the supplied facts only. No em-dashes, no match percentages, no invented prices or bookings. Keep Day labels when an itinerary is present.",
    prompt: JSON.stringify(facts),
  };
}

export function streamLivePresentation(presentation: LivePresentation) {
  return streamPlainText({
    tier: presentation.modelTier,
    system: presentation.system,
    prompt: presentation.prompt,
  });
}
