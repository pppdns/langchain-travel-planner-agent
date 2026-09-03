import { buildItinerary } from "@/src/ai/graph/itinerary";
import { emptyTripState, mergeTripState, type TripState } from "@/src/ai/graph/state";

export type RevisionKind = "slower" | "fewer-transfers" | "another-destination";

export function detectRevision(text: string): RevisionKind | null {
  const haystack = text.toLowerCase();
  if (/another destination|different place|somewhere else/.test(haystack)) return "another-destination";
  if (/slower|relax|unhurried|shorter days/.test(haystack)) return "slower";
  if (/fewer transfer|one area|cut optional/.test(haystack)) return "fewer-transfers";
  return null;
}

export function applyRevision(trip: TripState, revision: Exclude<RevisionKind, "another-destination">): TripState {
  const next = mergeTripState(trip, {
    pace: revision === "slower" ? "relaxed" : trip.pace,
    preferences: revision === "slower" ? [...new Set([...trip.preferences, "unhurried"])] : trip.preferences,
    exclusions:
      revision === "fewer-transfers" ? [...new Set([...trip.exclusions, "long transfers"])] : trip.exclusions,
  });
  if (!next.destinationSlug) return next;
  return mergeTripState(next, {
    itinerary: buildItinerary(next, next.destinationSlug),
    currentPlanningStage: "presenting",
  });
}

export function resetForRediscovery(trip: TripState): TripState {
  return {
    ...emptyTripState(),
    tripType: trip.tripType,
    travelers: trip.travelers,
    dates: trip.dates,
    budget: trip.budget,
    preferences: trip.preferences,
    exclusions: trip.exclusions,
    pace: trip.pace,
    origin: trip.origin,
    rememberedPreferences: trip.rememberedPreferences,
    destinationStatus: "unknown",
    currentPlanningStage: "discovering",
  };
}

export function rememberedFromTrip(trip: TripState) {
  const items: Array<{ key: string; value: string }> = [];
  if (trip.tripType) items.push({ key: "tripType", value: trip.tripType });
  if (trip.travelers.children > 0) items.push({ key: "party", value: "travels with kids" });
  if (trip.budget.amount !== undefined) {
    items.push({ key: "budget", value: `${trip.budget.amount} ${trip.budget.currency}` });
  }
  return items;
}

export function revisionAssistantText(revision: RevisionKind) {
  if (revision === "another-destination") return "I will search again with the same preferences.";
  if (revision === "slower") return "I slowed the days and kept the same thread.";
  return "I cut optional transfers and kept the stay in one area.";
}
