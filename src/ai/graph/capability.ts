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
  return /this app is a demo|cannot book|can't book|do not reserve|don't reserve|cannot (?:buy|take payments)|no bookings|fixed (?:demo )?catalog/i.test(
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
    `This app is a demo with a fixed catalog of ${DESTINATIONS.length} European cities.`,
    "I do not reserve rooms, buy tickets, or take payments.",
    nextCapableHint(trip),
  ].join(" ");
}

export function selfAwareReply(trip: TripState) {
  return [
    `This app is a demo that plans trips from a fixed catalog of ${DESTINATIONS.length} European cities.`,
    "I can rank places, check weather, draft days, and revise a plan on this thread.",
    "I cannot book hotels, buy tickets, or take payments.",
    nextCapableHint(trip),
  ].join(" ");
}

export function missingPlanReply(trip: TripState) {
  return ["You asked to see the plan. There is no itinerary yet.", nextCapableHint(trip)].join(" ");
}

const CATALOG_ALIASES = [
  "europe",
  "european",
  "eu",
  "mediterranean",
  "iberia",
  "iberian",
  "scandinavia",
  "scandinavian",
  "balkans",
  "adriatic",
  "balearics",
  "cyclades",
  "crete",
  "uk",
  "britain",
  "british",
  "great britain",
  "scotland",
  "czech republic",
  "czechia",
  "holland",
  "the netherlands",
  "netherlands",
];

const GENERIC_GEO = new Set([
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "january",
  "february",
  "march",
  "summer",
  "winter",
  "spring",
  "fall",
  "autumn",
  "morning",
  "evening",
  "afternoon",
  "night",
  "today",
  "tomorrow",
  "trip",
  "catalog",
  "demo",
  "app",
  "database",
  "beach",
  "city",
  "hotel",
  "hotels",
  "there",
  "here",
  "general",
  "english",
  "mind",
  "advance",
  "particular",
]);

const OUTSIDE_PLACES: { label: string; pattern: RegExp }[] = [
  {
    label: "the USA",
    pattern:
      /\b(?:usa|u\.s\.a\.?|u\.s\.|united states(?: of america)?|new york|nyc|los angeles|miami|chicago|san francisco|boston|seattle|hawaii|california|florida|texas)\b|\b(?:in|to) (?:the )?(?:us|america)\b/i,
  },
  { label: "Canada", pattern: /\b(?:canada|toronto|vancouver|montreal)\b/i },
  { label: "Mexico", pattern: /\b(?:mexico|cancun|mexico city)\b/i },
  { label: "Asia", pattern: /\basia\b/i },
  { label: "Japan", pattern: /\b(?:japan|tokyo|osaka|kyoto)\b/i },
  { label: "China", pattern: /\b(?:china|beijing|shanghai|hong kong)\b/i },
  { label: "India", pattern: /\b(?:india|mumbai|delhi)\b/i },
  { label: "Thailand", pattern: /\b(?:thailand|bangkok|phuket)\b/i },
  { label: "Indonesia", pattern: /\b(?:indonesia|bali)\b/i },
  { label: "Vietnam", pattern: /\b(?:vietnam|hanoi|ho chi minh)\b/i },
  { label: "South Korea", pattern: /\b(?:korea|seoul)\b/i },
  { label: "Singapore", pattern: /\bsingapore\b/i },
  { label: "Australia", pattern: /\b(?:australia|sydney|melbourne)\b/i },
  { label: "New Zealand", pattern: /\b(?:new zealand|auckland)\b/i },
  { label: "Africa", pattern: /\bafrica\b/i },
  { label: "Morocco", pattern: /\b(?:morocco|marrakech|marrakesh)\b/i },
  { label: "South Africa", pattern: /\b(?:south africa|cape town)\b/i },
  { label: "Egypt", pattern: /\b(?:egypt|cairo)\b/i },
  { label: "the Middle East", pattern: /\b(?:middle east|uae|dubai|abu dhabi|qatar)\b/i },
  { label: "South America", pattern: /\b(?:south america|brazil|argentina|rio|buenos aires|lima|peru)\b/i },
  { label: "the Caribbean", pattern: /\b(?:caribbean|jamaica|bahamas|cuba)\b/i },
];

function normalizePlace(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATALOG_PLACES = (() => {
  const tokens = new Set<string>(CATALOG_ALIASES.map(normalizePlace));
  for (const destination of DESTINATIONS) {
    tokens.add(normalizePlace(destination.slug.replaceAll("-", " ")));
    tokens.add(normalizePlace(destination.name));
    tokens.add(normalizePlace(destination.country));
    tokens.add(normalizePlace(destination.region));
    for (const part of normalizePlace(destination.name).split(" ")) {
      if (part.length >= 4) tokens.add(part);
    }
  }
  return tokens;
})();

function stripPlaceArticle(value: string) {
  return normalizePlace(value).replace(/^(the|a|an)\s+/, "");
}

function isCatalogPlace(value: string) {
  const normalized = stripPlaceArticle(value);
  return Boolean(normalized) && CATALOG_PLACES.has(normalized);
}

function displayPlace(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function looksLikePlaceCoverageAsk(text: string) {
  return /\b(?:destination|destinations|city|cities|place|places|somewhere|anywhere|visit|visiting|go(?:ing)? to)\b/i.test(
    text,
  );
}

function extractCoveredPlace(text: string) {
  const coverage = text.match(
    /\b(?:destination|destinations|city|cities|place|places|somewhere|anywhere)\b[\s\S]{0,48}?\b(?:in|to|near|around)\s+(?:the\s+)?([A-Za-z][A-Za-z .'-]{1,32}?)(?=\s*[?!,.]|$)/i,
  );
  if (coverage?.[1]) return coverage[1].trim();
  const going = text.match(
    /\b(?:go(?:ing)? to|visit(?:ing)?)\s+(?:the\s+)?([A-Za-z][A-Za-z .'-]{1,32}?)(?=\s*[?!,.]|$)/i,
  );
  return going?.[1]?.trim() ?? "";
}

export function detectOutOfCatalogAsk(text: string): string | null {
  const haystack = text.trim();
  if (!haystack) return null;
  for (const place of OUTSIDE_PLACES) {
    if (place.pattern.test(haystack)) return place.label;
  }
  if (!looksLikePlaceCoverageAsk(haystack)) return null;
  const extracted = extractCoveredPlace(haystack);
  if (!extracted) return null;
  const normalized = stripPlaceArticle(extracted);
  if (!normalized || normalized.length < 3 || GENERIC_GEO.has(normalized) || isCatalogPlace(extracted)) {
    return null;
  }
  return displayPlace(extracted);
}

function formatNameList(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function mentionsOutOfCatalog(text: string, place: string) {
  const hay = text.toLowerCase();
  const needle = place.toLowerCase().replace(/^the /, "");
  if (!needle || !hay.includes(needle)) return false;
  return mentionsCapabilityLimit(text) || /no (?:destinations?|places?) in/i.test(text);
}

export function outOfCatalogReply(trip: TripState, askedPlace: string) {
  const names = trip.candidateDestinations.map((item) => item.name);
  const listed = formatNameList(names);
  const next = listed
    ? `Pick one of ${listed} from the catalog.`
    : nextCapableHint(trip);
  return [
    `You asked for a destination in ${askedPlace}.`,
    `There are no destinations in ${askedPlace} in this demo catalog.`,
    `This app is a demo with a fixed set of ${DESTINATIONS.length} European cities.`,
    next,
  ].join(" ");
}
