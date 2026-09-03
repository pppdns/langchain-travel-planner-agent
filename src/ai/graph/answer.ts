import { DESTINATIONS, KNOWLEDGE_DOCS, getDestination, type DestinationTraits } from "@/data/travel/catalog";
import { nextCapableHint } from "@/src/ai/graph/capability";
import type { TripState } from "@/src/ai/graph/state";

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "on",
  "to",
  "of",
  "for",
  "is",
  "are",
  "am",
  "was",
  "were",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "will",
  "i",
  "you",
  "me",
  "my",
  "your",
  "we",
  "our",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "any",
  "some",
  "and",
  "or",
  "but",
  "if",
  "so",
  "what",
  "whats",
  "how",
  "where",
  "when",
  "why",
  "which",
  "who",
  "about",
  "with",
  "from",
  "into",
  "over",
  "again",
  "more",
  "other",
  "please",
  "just",
  "also",
  "really",
  "very",
  "too",
  "than",
  "then",
  "asked",
  "trip",
  "destination",
  "destinations",
  "place",
  "places",
  "city",
  "cities",
  "like",
  "have",
  "has",
  "they",
  "them",
  "their",
]);

const TRAIT_ASKS: { key: keyof DestinationTraits; label: string; pattern: RegExp }[] = [
  { key: "walkable", label: "walkable", pattern: /walkable|walkability|on foot|without a car|car[- ]free/i },
  { key: "family", label: "family-friendly", pattern: /famil|kid|child|toddler/i },
  { key: "beach", label: "a beach destination", pattern: /beach|swim|swimming|coast/i },
  { key: "warm", label: "warm-weather", pattern: /(?:\bwarm\b|\bhot\b|heat)(?!el)/i },
  { key: "food", label: "food-first", pattern: /food|restaurant|eat|dining|meal|tapas/i },
  { key: "nightlife", label: "nightlife", pattern: /nightlife|night life|clubs?|bars?\b/i },
  { key: "nature", label: "a nature or hiking destination", pattern: /nature|hike|hiking|trek|trail|landscape/i },
  { key: "budgetFriendly", label: "budget-friendly", pattern: /budget|cheap|afford|expensive/i },
  { key: "shortTransfers", label: "short-transfer", pattern: /transfer|airport|little driving|minimal driving/i },
  { key: "culture", label: "a culture destination", pattern: /culture|museum|historic/i },
];

const TOPIC_ASKS: { topic: string; pattern: RegExp }[] = [
  { topic: "neighborhoods", pattern: /neighborhood|neighbourhood|area|which part|where (?:should|do) we stay/i },
  { topic: "food", pattern: /food|restaurant|eat|dining|meal|tapas|wine/i },
  { topic: "family", pattern: /famil|kid|child|toddler/i },
  { topic: "beach", pattern: /beach|swim|swimming|coast/i },
  { topic: "pace", pattern: /pace|relax|unhurried|packed|busy|chill/i },
  { topic: "transfers", pattern: /transfer|airport|driv(?:e|ing)|rental car|taxi/i },
  { topic: "budget", pattern: /budget|cheap|afford|expensive|cost(?!a)/i },
  { topic: "weather", pattern: /weather|forecast|temperature|rain|how hot|how warm/i },
  { topic: "evenings", pattern: /evening|nightlife|after dark|at night/i },
];

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const CATALOG_WORDS = new Set(
  DESTINATIONS.flatMap((destination) =>
    normalizeWords(`${destination.slug.replaceAll("-", " ")} ${destination.name} ${destination.country}`),
  ).filter((word) => word.length >= 4),
);

export function looksLikeUserQuestion(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\?\s*$/.test(trimmed)) return true;
  return /^(what|what's|whats|how|is|are|does|do|can|could|where|when|why|which|any|anyone|tell me|i need to know|i want to know)\b/i.test(
    trimmed,
  );
}

export function quoteUserAsk(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[?!.]+$/, "");
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69).trim()}...`;
}

export function askContentTokens(text: string) {
  return [...new Set(normalizeWords(text).filter((word) => word.length >= 3 && !STOPWORDS.has(word)))];
}

export function distinctiveAskTokens(text: string) {
  return askContentTokens(text).filter((word) => !CATALOG_WORDS.has(word));
}

function formatNameList(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function replyAddressesAsk(userText: string, reply: string) {
  const draft = reply.trim();
  if (!draft) return false;
  if (/you asked about this trip/i.test(draft)) return false;
  const distinctive = distinctiveAskTokens(userText);
  const hay = draft.toLowerCase();
  if (distinctive.length === 0) {
    return draft.length > 40 && !/^you asked about this trip/i.test(draft);
  }
  return distinctive.some((token) => hay.includes(token));
}

export function unansweredAskReply(trip: TripState, text: string) {
  const names = trip.candidateDestinations.map((item) => item.name);
  const listed = formatNameList(names);
  const next = listed ? `Pick one of ${listed} from the catalog.` : nextCapableHint(trip);
  return [
    `You asked "${quoteUserAsk(text)}".`,
    "I don't have an answer for that in this demo.",
    `Route State is a hiring demo with a fixed catalog of ${DESTINATIONS.length} European cities.`,
    "I can rank those places, check weather, and draft days. I cannot invent facts, bookings, or places outside that set.",
    next,
  ].join(" ");
}

function inferAskedTrait(text: string) {
  if (/weather|forecast|temperature/i.test(text)) {
    return TRAIT_ASKS.find((item) => item.key !== "warm" && item.pattern.test(text)) ?? null;
  }
  return TRAIT_ASKS.find((item) => item.pattern.test(text)) ?? null;
}

export function inferKnowledgeTopic(text: string) {
  return TOPIC_ASKS.find((item) => item.pattern.test(text))?.topic;
}

function knowledgeBody(slug: string, topic: string) {
  return KNOWLEDGE_DOCS.find((doc) => doc.destinationSlug === slug && doc.category === topic)?.body;
}

function looksLikeCandidateCompare(text: string) {
  return /\bwhich\b|\bwhat(?:'s| is) the (?:warmest|best|cheapest|closest)|\b(?:do|does|are) (?:any|either|these|those)\b/i.test(
    text,
  );
}

function compareCandidates(trip: TripState, text: string) {
  if (trip.candidateDestinations.length < 2 || !looksLikeCandidateCompare(text)) return null;
  const asked = inferAskedTrait(text);
  if (!asked) return null;
  const records = trip.candidateDestinations
    .map((item) => getDestination(item.slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const matches = records.filter((item) => item.traits[asked.key]);
  const names = matches.map((item) => item.name);
  const listed = formatNameList(names);
  if (matches.length === records.length) {
    return `You asked which of these is ${asked.label}. ${formatNameList(records.map((item) => item.name))} are all marked ${asked.label} in the catalog.`;
  }
  if (matches.length === 0) {
    return `You asked which of these is ${asked.label}. None of the places on screen are marked ${asked.label} in the catalog.`;
  }
  const verb = matches.length === 1 ? "is" : "are";
  return `You asked which of these is ${asked.label}. ${listed} ${verb} marked ${asked.label} in the catalog.`;
}

function isGeneralPlaceAsk(text: string) {
  return /what(?:'s| is) (?:it|that|this place|there) like|tell me about|what can you tell me/i.test(text);
}

export function catalogFactAnswer(trip: TripState, text: string, slug?: string) {
  const compared = compareCandidates(trip, text);
  if (compared) return compared;

  const dest = slug ? getDestination(slug) : undefined;
  if (!dest) return null;

  const trait = inferAskedTrait(text);
  const topic = inferKnowledgeTopic(text);
  const parts: string[] = [];
  if (trait) {
    parts.push(
      dest.traits[trait.key]
        ? `${dest.name} is marked ${trait.label} in this catalog.`
        : `${dest.name} is not marked ${trait.label} in this catalog.`,
    );
  }
  if (topic && topic !== "weather") {
    const body = knowledgeBody(dest.slug, topic);
    if (body) parts.push(body);
  }
  if (parts.length > 0) {
    return `You asked about ${dest.name}. ${parts.join(" ")}`;
  }
  if (isGeneralPlaceAsk(text) || distinctiveAskTokens(text).length === 0) {
    return `You asked about ${dest.name}. ${dest.summary}`;
  }
  return null;
}
