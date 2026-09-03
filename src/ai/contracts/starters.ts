import type { StarterId } from "@/src/ai/contracts/http";
import type { TripState } from "@/src/ai/graph/state";
import { emptyTripState } from "@/src/ai/graph/state";

export type StarterSeed = {
  id: StarterId;
  label: string;
  openingMessage: string;
  seed: Partial<TripState>;
};

export const STARTERS: Record<StarterId, StarterSeed> = {
  "family-beach-europe": {
    id: "family-beach-europe",
    label: "Warm family beach in Europe",
    openingMessage: "We want a warm family beach trip in Europe this summer.",
    seed: {
      tripType: "family",
      destinationStatus: "unknown",
      dates: { flexible: true, durationNights: 6 },
      travelers: { adults: 2, children: 1 },
      preferences: ["beach", "family-friendly", "warm water"],
      exclusions: ["long transfers"],
      currentPlanningStage: "gathering",
    },
  },
  "barcelona-couple": {
    id: "barcelona-couple",
    label: "5 days in Barcelona, unhurried",
    openingMessage: "Plan 5 unhurried days in Barcelona for two adults.",
    seed: {
      tripType: "city",
      destinationStatus: "known",
      destinationSlug: "barcelona",
      destinationName: "Barcelona",
      dates: { flexible: true, durationNights: 5 },
      travelers: { adults: 2, children: 0 },
      preferences: ["food", "neighborhood walking", "unhurried"],
      pace: "relaxed",
      currentPlanningStage: "researching",
    },
  },
  "city-break-budget": {
    id: "city-break-budget",
    label: "City break, food and culture, under 1500 EUR",
    openingMessage: "Find a city break with food and culture under 1500 EUR.",
    seed: {
      tripType: "city",
      destinationStatus: "unknown",
      budget: { amount: 1500, currency: "EUR", flexibility: "strict" },
      dates: { flexible: true, durationNights: 4 },
      travelers: { adults: 2, children: 0 },
      preferences: ["food", "culture", "walkable"],
      pace: "packed",
      currentPlanningStage: "gathering",
    },
  },
  "family-minimal-driving": {
    id: "family-minimal-driving",
    label: "Family trip, young child, little driving",
    openingMessage: "Family trip with a young child. Keep driving to a minimum.",
    seed: {
      tripType: "family",
      destinationStatus: "unknown",
      travelers: { adults: 2, children: 1, notes: "young child" },
      dates: { flexible: true, durationNights: 5 },
      preferences: ["family-friendly", "compact", "walkable"],
      exclusions: ["long car days"],
      currentPlanningStage: "gathering",
    },
  },
};

export function applyStarterSeed(starterId: StarterId): TripState {
  return {
    ...emptyTripState(),
    ...STARTERS[starterId].seed,
    travelers: {
      ...emptyTripState().travelers,
      ...STARTERS[starterId].seed.travelers,
    },
    dates: {
      ...emptyTripState().dates,
      ...STARTERS[starterId].seed.dates,
    },
    budget: {
      ...emptyTripState().budget,
      ...STARTERS[starterId].seed.budget,
    },
  };
}
