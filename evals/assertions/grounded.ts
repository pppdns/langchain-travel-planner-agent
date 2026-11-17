import type { AssertionValueFunctionContext, GradingResult } from "promptfoo";
import { DESTINATIONS } from "../../data/travel/catalog";

/**
 * Well-known places outside the European demo catalog. If the reply recommends one of these as a
 * destination, the agent invented a place it cannot plan.
 */
const OFF_CATALOG = [
  "New York", "Los Angeles", "San Francisco", "Las Vegas", "Miami", "Chicago", "Tokyo", "Kyoto",
  "Bangkok", "Bali", "Sydney", "Cancun", "Rio de Janeiro", "Cape Town", "Dubai", "Marrakech",
  "Yellowstone", "Grand Canyon", "Hawaii", "Toronto", "Vancouver", "Mexico City",
];

const CATALOG_NAMES = new Set(DESTINATIONS.map((item) => item.name.toLowerCase()));

/** Fails if the reply names a famous non-catalog place (the user's own words are allowed). */
export function onlyCatalogDestinations(output: string, context: AssertionValueFunctionContext): GradingResult {
  const asked = `${context.vars.message ?? ""} ${[context.vars.followUps ?? ""].flat().join(" ")}`.toLowerCase();
  const invented = OFF_CATALOG.filter(
    (place) => output.toLowerCase().includes(place.toLowerCase()) && !asked.includes(place.toLowerCase()),
  ).filter((place) => !CATALOG_NAMES.has(place.toLowerCase()));
  return invented.length
    ? { pass: false, score: 0, reason: `Named places outside the catalog: ${invented.join(", ")}` }
    : { pass: true, score: 1, reason: "Only catalog destinations named" };
}
