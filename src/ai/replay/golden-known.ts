import { graphEvent, type PublicEvent } from "@/src/ai/stream/public-events";

export const GOLDEN_KNOWN_EVENTS: PublicEvent[] = [
  graphEvent("scope_guard", "start", "Keeping the conversation on the trip"),
  graphEvent("scope_guard", "end", "On-scope travel request"),
  graphEvent("gather_preferences", "start", "Understanding trip preferences"),
  {
    type: "trip-state",
    patch: {
      destinationStatus: "known",
      destinationSlug: "barcelona",
      destinationName: "Barcelona",
      tripType: "city",
      travelers: { adults: 2, children: 0 },
      dates: { flexible: true, durationNights: 5 },
      pace: "relaxed",
      currentPlanningStage: "researching",
    },
  },
  graphEvent("gather_preferences", "end", "Destination already known"),
  graphEvent("route_supervisor", "start", "Choosing the next planning stage"),
  graphEvent("route_supervisor", "end", "Routing to local research"),
  graphEvent("research_local", "start", "Delegating local research"),
  {
    type: "evidence",
    items: [
      {
        id: "barcelona-eixample",
        title: "Eixample walking grid and food streets",
        sourceType: "synthetic",
        destinationSlug: "barcelona",
        category: "neighborhoods",
      },
      {
        id: "barcelona-gracia",
        title: "Gràcia squares for unhurried evenings",
        sourceType: "synthetic",
        destinationSlug: "barcelona",
        category: "neighborhoods",
      },
    ],
  },
  graphEvent("research_local", "end", "Neighborhood evidence ready"),
  graphEvent("plan_itinerary", "start", "Building itinerary"),
  graphEvent("plan_itinerary", "end", "Five-day unhurried draft"),
  graphEvent("critique_itinerary", "start", "Reviewing itinerary"),
  graphEvent("critique_itinerary", "end", "No blocking tradeoff"),
  graphEvent("present_plan", "start", "Presenting the trip"),
  {
    type: "trip-state",
    patch: {
      currentPlanningStage: "complete",
      itinerary: {
        destinationSlug: "barcelona",
        destinationName: "Barcelona",
        constraintsHonored: ["unhurried", "walkable neighborhoods"],
        days: [
          {
            day: 1,
            title: "Arrive in Eixample",
            area: "Eixample",
            stops: [{ title: "Passeig de Gràcia walk", notes: "Settle in, no timed tickets." }],
          },
          {
            day: 2,
            title: "Gothic Quarter without rushing",
            area: "Ciutat Vella",
            stops: [{ title: "Market and side streets", notes: "Late lunch, one museum window." }],
          },
        ],
      },
    },
  },
  graphEvent("present_plan", "end", "Itinerary ready to revise"),
];
