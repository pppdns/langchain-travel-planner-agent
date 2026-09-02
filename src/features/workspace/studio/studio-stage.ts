import type { PublicTripState } from "@/src/ai/graph/state";

export type StudioStage =
  | "intake"
  | "gathering"
  | "discovering"
  | "awaiting_destination"
  | "planning"
  | "awaiting_tradeoff"
  | "complete"
  | "off_scope";

export function isOffScopeQuestion(question?: string) {
  return Boolean(question && /only plan trips/i.test(question));
}

export function chipFieldForQuestion(question?: string): string {
  const haystack = question?.toLowerCase() ?? "";
  if (haystack.includes("night")) return "duration";
  if (haystack.includes("pace")) return "pace";
  if (haystack.includes("budget")) return "budget";
  if (haystack.includes("origin") || haystack.includes("where from")) return "origin";
  return "tripType";
}

export function resolveStudioStage(trip: PublicTripState, running: boolean): StudioStage {
  if (
    isOffScopeQuestion(trip.lastQuestion) &&
    !running &&
    !trip.itinerary &&
    trip.currentPlanningStage === "intake" &&
    trip.candidateDestinations.length === 0
  ) {
    return "off_scope";
  }
  if (
    trip.pendingInterrupt?.interruptType === "choose_destination" ||
    trip.currentPlanningStage === "awaiting_destination"
  ) {
    return "awaiting_destination";
  }
  if (
    trip.pendingInterrupt?.interruptType === "approve_tradeoff" ||
    trip.currentPlanningStage === "awaiting_tradeoff"
  ) {
    return "awaiting_tradeoff";
  }
  if (trip.itinerary) return "complete";
  if (trip.currentPlanningStage === "gathering") return "gathering";
  if (trip.currentPlanningStage === "discovering") return "discovering";
  if (
    trip.destinationSlug &&
    (trip.currentPlanningStage === "researching" || trip.currentPlanningStage === "planning" || running)
  ) {
    return "planning";
  }
  return "intake";
}
