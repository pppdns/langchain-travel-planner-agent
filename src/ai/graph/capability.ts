import { DESTINATIONS } from "@/data/travel/catalog";
import type { TripState } from "@/src/ai/graph/state";

export const CAPABILITY_LIMITS = ["book", "reserve", "pay", "live_price"] as const;
export type CapabilityLimit = (typeof CAPABILITY_LIMITS)[number];

const BOOK =
  /\b(?:book|reserve|reservation)\b.{0,40}\b(?:hotel|hotels|room|rooms|flight|flights|table|restaurant|ticket|tickets|airbnb|stay)\b|\b(?:hotel|hotels|room|rooms|flight|flights|table|ticket|tickets).{0,24}\b(?:book|reserve|reservation)\b|\bbook me\b/i;
const PAY = /\b(?:pay for|take (?:my )?payment|check ?out with|credit card)\b/i;
const LIVE_PRICE =
  /\b(?:nightly (?:rate|price)|how much (?:is|are) (?:the )?(?:hotel|hotels|flights?|rooms?))\b|\b(?:live|current) (?:prices?|availability|inventory)\b|\bcheck availability\b/i;

export function detectCapabilityLimit(text: string): CapabilityLimit | null {
  const haystack = text.trim();
  if (!haystack) return null;
  if (PAY.test(haystack)) return "pay";
  if (LIVE_PRICE.test(haystack)) return "live_price";
  if (BOOK.test(haystack)) return /reserve|reservation/i.test(haystack) ? "reserve" : "book";
  return null;
}

export function looksLikeSelfAsk(text: string) {
  return /\b(?:what can you (?:do|plan)|what (?:are you|is this(?: app| demo)?)\b|your (?:limits|limitations)|what (?:can't|cannot) you do)\b/i.test(
    text,
  );
}

export function looksLikePresentAsk(text: string) {
  const haystack = text.toLowerCase();
  return /show (?:me )?(?:the |my )?plan|see (?:the |my )?(?:plan|itinerary)|full itinerary|my itinerary/.test(
    haystack,
  );
}

export function mentionsCapabilityLimit(text: string) {
  return /hiring demo|cannot book|can't book|do not reserve|don't reserve|cannot (?:buy|take payments)|no bookings|fixed (?:demo )?catalog/i.test(
    text,
  );
}

function placeName(trip: TripState) {
  return trip.destinationName ?? trip.destinationSlug ?? "this trip";
}

function actionPhrase(limit: CapabilityLimit) {
  if (limit === "pay") return "take a payment";
  if (limit === "live_price") return "quote live prices or availability";
  if (limit === "reserve") return "make a reservation";
  return "book a hotel or tickets";
}

export function nextCapableHint(trip: TripState) {
  if (trip.itinerary) {
    return `I can show the ${placeName(trip)} plan or adjust the days.`;
  }
  if (trip.pendingInterrupt?.interruptType === "choose_destination" && trip.destinationStatus !== "known") {
    return "I can keep planning from the places already on screen.";
  }
  if (trip.destinationStatus === "known") {
    return `I can draft a ${placeName(trip)} stay from the catalog.`;
  }
  if (trip.tripType && (trip.dates.durationNights || trip.dates.start)) {
    return "I can search the catalog for places that fit.";
  }
  return "I can help plan a trip from that catalog if you share a destination or a vibe.";
}

export function capabilityLimitReply(trip: TripState, limit: CapabilityLimit) {
  return [
    `You asked me to ${actionPhrase(limit)}. I can't.`,
    `Route State is a hiring demo with a fixed catalog of ${DESTINATIONS.length} European cities.`,
    "I do not reserve rooms, buy tickets, or take payments.",
    nextCapableHint(trip),
  ].join(" ");
}

export function selfAwareReply(trip: TripState) {
  return [
    `I am Route State, a hiring demo that plans trips from a fixed catalog of ${DESTINATIONS.length} European cities.`,
    "I can rank places, check weather, draft days, and revise a plan on this thread.",
    "I cannot book hotels, buy tickets, or take payments.",
    nextCapableHint(trip),
  ].join(" ");
}

export function missingPlanReply(trip: TripState) {
  return ["You asked to see the plan. There is no itinerary yet.", nextCapableHint(trip)].join(" ");
}
