import { graphEvent, type PublicEvent } from "@/src/ai/stream/public-events";

export const GOLDEN_DISCOVERY_EVENTS: PublicEvent[] = [
  graphEvent("scope_guard", "start", "Keeping the conversation on the trip"),
  graphEvent("scope_guard", "end", "On-scope travel request"),
  graphEvent("gather_preferences", "start", "Understanding trip preferences"),
  {
    type: "trip-state",
    patch: {
      tripType: "family",
      destinationStatus: "unknown",
      travelers: { adults: 2, children: 1 },
      dates: { flexible: true, durationNights: 6 },
      preferences: ["beach", "family-friendly", "warm water"],
      currentPlanningStage: "discovering",
    },
  },
  graphEvent("gather_preferences", "end", "Enough preference signal to search"),
  graphEvent("route_supervisor", "start", "Choosing the next planning stage"),
  graphEvent("route_supervisor", "end", "Routing to destination discovery"),
  graphEvent("discover_destinations", "start", "Searching destination knowledge"),
  {
    type: "evidence",
    items: [
      {
        id: "faro-family-beach",
        title: "Algarve family beaches and short transfers",
        sourceType: "synthetic",
        destinationSlug: "faro",
        category: "family",
      },
      {
        id: "valencia-coastal-city",
        title: "Valencia beach plus compact city core",
        sourceType: "synthetic",
        destinationSlug: "valencia",
        category: "beach",
      },
      {
        id: "nice-promenade",
        title: "Nice promenade walking and hotel density",
        sourceType: "synthetic",
        destinationSlug: "nice",
        category: "beach",
      },
    ],
  },
  {
    type: "trip-state",
    patch: {
      destinationStatus: "candidates",
      currentPlanningStage: "awaiting_destination",
      candidateDestinations: [
        {
          slug: "faro",
          name: "Faro / Algarve",
          country: "Portugal",
          summary: "Warm Atlantic beaches, compact towns, and short family transfers.",
          fit: "strong",
          factors: ["family beaches", "short hops", "warm summer"],
          evidence: [
            {
              id: "faro-family-beach",
              title: "Algarve family beaches and short transfers",
              sourceType: "synthetic",
              destinationSlug: "faro",
            },
          ],
        },
        {
          slug: "valencia",
          name: "Valencia",
          country: "Spain",
          summary: "A walkable city with a real beach and strong food culture.",
          fit: "good",
          factors: ["beach plus city", "food", "family parks"],
          evidence: [
            {
              id: "valencia-coastal-city",
              title: "Valencia beach plus compact city core",
              sourceType: "synthetic",
              destinationSlug: "valencia",
            },
          ],
        },
        {
          slug: "nice",
          name: "Nice",
          country: "France",
          summary: "Promenade walking and hotel density, less warm-water swimming.",
          fit: "possible",
          factors: ["walkable waterfront", "hotel density"],
          evidence: [
            {
              id: "nice-promenade",
              title: "Nice promenade walking and hotel density",
              sourceType: "synthetic",
              destinationSlug: "nice",
            },
          ],
        },
      ],
    },
  },
  {
    type: "usage",
    modelTier: "standard",
    latencyMs: 1840,
    inputTokens: 1420,
    outputTokens: 380,
    estimatedCents: 4,
    retries: 0,
  },
  graphEvent("discover_destinations", "end", "Ranked three coastal options"),
  graphEvent("await_destination_choice", "waiting", "Waiting for a destination choice"),
  {
    type: "interrupt",
    interruptId: "choose-destination-golden",
    interruptType: "choose_destination",
    title: "Choose a destination",
    prompt: "These three places fit a warm family beach trip. Pick one to plan.",
    options: [
      {
        id: "faro",
        label: "Faro / Algarve",
        description: "Strong family-beach fit with short transfers.",
        recommended: true,
        fit: "strong",
      },
      {
        id: "valencia",
        label: "Valencia",
        description: "Beach plus a compact city core.",
        fit: "good",
      },
      {
        id: "nice",
        label: "Nice",
        description: "Walkable waterfront, cooler swimming.",
        fit: "possible",
      },
    ],
  },
];

export const GOLDEN_DISCOVERY_RESUME_EVENTS: PublicEvent[] = [
  graphEvent("await_destination_choice", "end", "Destination selected"),
  graphEvent("research_local", "start", "Delegating local research"),
  {
    type: "evidence",
    items: [
      {
        id: "faro-old-town",
        title: "Faro old town and Ria Formosa day trip",
        sourceType: "synthetic",
        destinationSlug: "faro",
        category: "neighborhoods",
      },
    ],
  },
  graphEvent("research_local", "end", "Local evidence ready"),
  graphEvent("plan_itinerary", "start", "Building itinerary"),
  graphEvent("plan_itinerary", "end", "Six-night family draft ready"),
  graphEvent("critique_itinerary", "start", "Reviewing itinerary"),
  graphEvent("critique_itinerary", "end", "Pace and transfers look sound"),
  graphEvent("present_plan", "start", "Presenting the trip"),
  {
    type: "trip-state",
    patch: {
      destinationStatus: "known",
      destinationSlug: "faro",
      destinationName: "Faro / Algarve",
      currentPlanningStage: "complete",
      itinerary: {
        destinationSlug: "faro",
        destinationName: "Faro / Algarve",
        constraintsHonored: ["family beaches", "short transfers"],
        days: [
          {
            day: 1,
            title: "Arrive and settle near the water",
            area: "Faro / Olhão",
            stops: [
              { title: "Old town walk", notes: "Short arrival walk, early dinner." },
              { title: "Waterfront sunset", notes: "Keep the first evening light." },
            ],
          },
          {
            day: 2,
            title: "Island beach day",
            area: "Ilha Deserta",
            stops: [{ title: "Ferry to the island", notes: "Pack shade and a late picnic." }],
          },
        ],
      },
      pendingInterrupt: null,
    },
  },
  graphEvent("present_plan", "end", "Itinerary ready to revise"),
];
