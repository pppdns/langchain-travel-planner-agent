import { DESTINATIONS, KNOWLEDGE_DOCS, getDestination } from "@/data/travel/catalog";
import type { CandidateDestination, TripState } from "@/src/ai/graph/state";

function scoreDestination(state: TripState, slug: string): { score: number; factors: string[]; fit: CandidateDestination["fit"] } {
  const destination = getDestination(slug);
  if (!destination) {
    return { score: 0, factors: [], fit: "possible" };
  }

  let score = 0;
  const factors: string[] = [];
  const prefs = new Set(state.preferences.map((item) => item.toLowerCase()));

  if (state.tripType === "family" && destination.traits.family) {
    score += 4;
    factors.push("family-friendly");
  }
  if (state.tripType === "beach" && destination.traits.beach) {
    score += 4;
    factors.push("real beach access");
  }
  if (state.tripType === "city" && destination.traits.city) {
    score += 4;
    factors.push("city-break scale");
  }
  if ((prefs.has("beach") || prefs.has("warm water")) && destination.traits.beach) {
    score += 3;
    factors.push("coastal days");
  }
  if ((prefs.has("food") || prefs.has("culture")) && (destination.traits.food || destination.traits.culture)) {
    score += 2;
    factors.push("food and culture");
  }
  if ((prefs.has("walkable") || prefs.has("compact") || state.travelers.children > 0) && destination.traits.walkable) {
    score += 2;
    factors.push("compact walking");
  }
  if (state.exclusions.some((item) => item.includes("driving") || item.includes("transfers")) && destination.traits.shortTransfers) {
    score += 3;
    factors.push("short transfers");
  }
  if (state.budget.amount !== undefined && state.budget.amount <= 1500 && destination.traits.budgetFriendly) {
    score += 3;
    factors.push("fits a careful budget");
  }
  if (destination.traits.warm && (state.tripType === "beach" || prefs.has("warm water"))) {
    score += 2;
    factors.push("warm season fit");
  }
  if (slug === "santorini" && state.travelers.children > 0) {
    score -= 4;
  }

  const fit = score >= 8 ? "strong" : score >= 5 ? "good" : "possible";
  return { score, factors: factors.slice(0, 4), fit };
}

export function rankDestinations(state: TripState, limit = 3): CandidateDestination[] {
  return DESTINATIONS.map((destination) => {
    const ranked = scoreDestination(state, destination.slug);
    const evidence = KNOWLEDGE_DOCS.filter((doc) => doc.destinationSlug === destination.slug)
      .slice(0, 2)
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        sourceType: doc.sourceType,
        destinationSlug: doc.destinationSlug,
        category: doc.category,
      }));
    return {
      slug: destination.slug,
      name: destination.name,
      country: destination.country,
      summary: destination.summary,
      fit: ranked.fit,
      factors: ranked.factors,
      evidence,
      score: ranked.score,
    };
  })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((candidate) => ({
      slug: candidate.slug,
      name: candidate.name,
      country: candidate.country,
      summary: candidate.summary,
      fit: candidate.fit,
      factors: candidate.factors,
      evidence: candidate.evidence,
    }));
}

export function evidenceFor(slug: string, categories: string[] = []) {
  return KNOWLEDGE_DOCS.filter((doc) => {
    if (doc.destinationSlug !== slug) return false;
    if (categories.length === 0) return true;
    return categories.includes(doc.category);
  }).slice(0, 4);
}

export function searchKnowledge(query: string, destinationSlug?: string) {
  const haystack = query.toLowerCase();
  return KNOWLEDGE_DOCS.filter((doc) => {
    if (destinationSlug && doc.destinationSlug !== destinationSlug) return false;
    return (
      doc.title.toLowerCase().includes(haystack) ||
      doc.body.toLowerCase().includes(haystack) ||
      doc.category.toLowerCase().includes(haystack)
    );
  }).slice(0, 6);
}
