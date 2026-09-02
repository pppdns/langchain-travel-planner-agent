import { z } from "zod";
import { getDestination } from "@/data/travel/catalog";
import { searchKnowledge } from "@/src/ai/graph/rank";

export const TOOL_NAMES = [
  "lookup_destination_profile",
  "search_travel_knowledge",
  "get_weather",
  "convert_currency",
  "search_memories",
  "write_memory",
  "read_trip_state",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const NODE_TOOL_ALLOWLIST: Record<string, ToolName[]> = {
  gather_preferences: ["search_memories", "read_trip_state"],
  route_supervisor: ["read_trip_state"],
  discover_destinations: [
    "lookup_destination_profile",
    "search_travel_knowledge",
    "get_weather",
    "convert_currency",
  ],
  research_local: ["search_travel_knowledge", "lookup_destination_profile", "get_weather"],
  plan_itinerary: ["search_travel_knowledge", "convert_currency"],
  critique_itinerary: ["read_trip_state"],
};

export function assertToolAllowed(nodeId: string, tool: ToolName) {
  const allowed = NODE_TOOL_ALLOWLIST[nodeId] ?? [];
  if (!allowed.includes(tool)) {
    throw new Error(`Tool ${tool} is not authorized on ${nodeId}`);
  }
}

export const lookupDestinationProfile = {
  name: "lookup_destination_profile" as const,
  description: "Look up structured destination traits from the synthetic catalog.",
  schema: z.object({ slug: z.string() }),
  execute(input: { slug: string }) {
    const destination = getDestination(input.slug);
    if (!destination) return { ok: false as const, error: "not_found" };
    return { ok: true as const, destination };
  },
};

export const searchTravelKnowledge = {
  name: "search_travel_knowledge" as const,
  description: "Search the synthetic travel corpus with optional destination filter.",
  schema: z.object({ query: z.string(), destinationSlug: z.string().optional() }),
  execute(input: { query: string; destinationSlug?: string }) {
    return {
      ok: true as const,
      items: searchKnowledge(input.query, input.destinationSlug).map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        sourceType: doc.sourceType,
      })),
    };
  },
};

export const getWeather = {
  name: "get_weather" as const,
  description: "Return a cached seasonal weather sketch. Never blocks the trip if live weather is down.",
  schema: z.object({ slug: z.string() }),
  execute(input: { slug: string }) {
    const destination = getDestination(input.slug);
    return {
      ok: true as const,
      summary: destination?.traits.warm
        ? "Warm afternoons, plan shade after 11."
        : "Changeable weather, keep an indoor backup.",
      source: "fallback",
    };
  },
};

export const convertCurrency = {
  name: "convert_currency" as const,
  description: "Convert a trip budget using a static fallback table.",
  schema: z.object({ amount: z.number(), from: z.string(), to: z.string() }),
  execute(input: { amount: number; from: string; to: string }) {
    const rates: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.85 };
    const from = rates[input.from] ?? 1;
    const to = rates[input.to] ?? 1;
    return { ok: true as const, amount: Number(((input.amount / from) * to).toFixed(2)), source: "fallback" };
  },
};
