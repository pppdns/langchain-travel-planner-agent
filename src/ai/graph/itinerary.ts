import { getDestination } from "@/data/travel/catalog";
import type { Itinerary, TripState } from "@/src/ai/graph/state";

export function buildItinerary(state: TripState, slug: string): Itinerary {
  const destination = getDestination(slug);
  const nights = state.dates.durationNights ?? 4;
  const days = Math.min(Math.max(nights, 2), 6);
  const name = destination?.name ?? slug;
  const relaxed = state.pace === "relaxed" || state.preferences.includes("unhurried");

  const templates = [
    {
      title: `Arrive and keep the radius small`,
      area: name,
      stops: [
        { title: "Settle near the core", notes: "Drop bags, short orientation walk, early dinner." },
        { title: "Neighborhood loop", notes: "One square or waterfront, then stop." },
      ],
    },
    {
      title: destination?.traits.beach ? "Beach or waterfront day" : "One focused neighborhood",
      area: destination?.traits.beach ? "Coast" : name,
      stops: destination?.traits.beach
        ? [{ title: "Half-day swim or promenade", notes: "Shade first, then a late lunch nearby." }]
        : [{ title: "Market and side streets", notes: "Leave the afternoon open." }],
    },
    {
      title: "Food-led wandering",
      area: name,
      stops: [{ title: "Residential streets and one reservation", notes: "Avoid the first obvious square." }],
    },
    {
      title: relaxed ? "Slow morning, one paid visit" : "Two cultural stops, one long meal",
      area: name,
      stops: [{ title: relaxed ? "Museum window" : "Pair two nearby sites", notes: "Keep transfers on foot." }],
    },
    {
      title: "Optional excursion or more of the same",
      area: name,
      stops: [{ title: "Choose rest or one ferry/train hop", notes: "Do not split the stay." }],
    },
    {
      title: "Leave with a buffer",
      area: name,
      stops: [{ title: "Last cafe and airport path", notes: "No timed tickets on departure day." }],
    },
  ];

  return {
    destinationSlug: slug,
    destinationName: name,
    constraintsHonored: [
      ...(state.travelers.children > 0 ? ["family pace"] : []),
      ...(state.preferences.slice(0, 3) ?? []),
      ...(relaxed ? ["unhurried"] : []),
    ],
    days: templates.slice(0, days).map((day, index) => ({
      day: index + 1,
      title: day.title,
      area: day.area,
      stops: day.stops,
    })),
  };
}
