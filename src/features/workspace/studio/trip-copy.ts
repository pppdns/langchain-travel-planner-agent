import type { PlateMotif } from "@/data/travel/catalog";
import type { StarterId } from "@/src/ai/contracts/http";
import type { PublicTripState } from "@/src/ai/graph/state";

export const STARTER_MOTIFS: Record<StarterId, PlateMotif> = {
  "family-beach-europe": "coast",
  "barcelona-couple": "grid",
  "city-break-budget": "river",
  "family-minimal-driving": "harbor",
};

export const TRIP_TYPE_MOTIFS: Record<string, PlateMotif> = {
  beach: "coast",
  city: "grid",
  family: "harbor",
  mix: "hills",
};

export function destinationPlateValue(trip: PublicTripState) {
  return trip.destinationName ?? "Open";
}

export function datesPlateValue(trip: PublicTripState) {
  if (trip.dates.durationNights) return `${trip.dates.durationNights} nights`;
  if (trip.dates.start) return trip.dates.start;
  return "Dates open";
}

export function travelersPlateValue(trip: PublicTripState) {
  const adults = `${trip.travelers.adults} adult${trip.travelers.adults === 1 ? "" : "s"}`;
  if (!trip.travelers.children) return adults;
  return `${adults}, ${trip.travelers.children} child${trip.travelers.children === 1 ? "" : "ren"}`;
}

export function budgetPlateValue(trip: PublicTripState) {
  if (trip.budget.amount === undefined) return "Budget open";
  return `${trip.budget.amount} ${trip.budget.currency}`;
}
