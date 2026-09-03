import { describe, expect, it } from "vitest";
import { applyExtractedFacts, matchCatalogDestination } from "@/src/ai/models/live";
import { emptyTripState } from "@/src/ai/graph/state";
import { isForcedFakeRuntime, isLiveModelsEnabled, resolveRuntimeMode } from "@/src/lib/env";
import { retrieveEvidence } from "@/src/ai/retrieval/hybrid";
import { fetchWeatherSummary } from "@/src/ai/tools/weather";
import { createEventStream, encodeFrame } from "@/src/ai/stream/bridge";
import { DESTINATIONS } from "@/data/travel/catalog";

describe("live runtime stays off in tests", () => {
  it("forces fake mode under vitest", () => {
    expect(isForcedFakeRuntime()).toBe(true);
    expect(resolveRuntimeMode()).toBe("fake");
    expect(isLiveModelsEnabled()).toBe(false);
  });
});

describe("catalog matching and extract merge", () => {
  it("matches a destination name without treating Nice as a generic adjective", () => {
    expect(matchCatalogDestination("5 days in Barcelona")).toEqual({
      slug: "barcelona",
      name: "Barcelona",
    });
    expect(matchCatalogDestination("that would be nice")).toBeNull();
  });

  it("applies extracted facts without overwriting a known destination", () => {
    const trip = applyExtractedFacts(
      {
        ...emptyTripState(),
        destinationStatus: "known",
        destinationSlug: "barcelona",
        destinationName: "Barcelona",
      },
      { destinationSlug: "faro", tripType: "city", durationNights: 4, preferences: ["food"] },
    );
    expect(trip.destinationSlug).toBe("barcelona");
    expect(trip.tripType).toBe("city");
    expect(trip.dates.durationNights).toBe(4);
    expect(trip.preferences).toContain("food");
  });
});

describe("retrieval and weather fallbacks", () => {
  it("returns catalog evidence titles only", async () => {
    const items = await retrieveEvidence({ text: "neighborhoods", destinationSlug: "faro" });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.title).toContain("Faro");
    expect(items[0]).not.toHaveProperty("body");
  });

  it("falls back when live weather is disabled", async () => {
    const weather = await fetchWeatherSummary("faro");
    expect(weather.source).toBe("fallback");
    expect(weather.summary).toContain("shade");
  });

  it("uses the Open-Meteo payload when live fetch succeeds", async () => {
    const weather = await fetchWeatherSummary("faro", {
      live: true,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            current: { temperature_2m: 24.2, weather_code: 1 },
            daily: {
              temperature_2m_max: [27],
              temperature_2m_min: [19],
              precipitation_probability_max: [10],
              weather_code: [1],
            },
          }),
          { status: 200 },
        ),
    });
    expect(weather.source).toBe("open-meteo");
    expect(weather.summary).toContain("24C");
  });
});

describe("catalog coordinates and stream frames", () => {
  it("gives every destination coordinates for weather", () => {
    expect(DESTINATIONS.every((destination) => Number.isFinite(destination.latitude))).toBe(true);
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(40);
  });

  it("keeps the NDJSON frame contract", async () => {
    expect(encodeFrame({ text: "Hello" })).toBe('{"text":"Hello"}\n');
    const stream = createEventStream({
      text: "Day 1",
      events: [{ type: "error", code: "unavailable", message: "retry", recoverable: true }],
    });
    const text = await new Response(stream).text();
    expect(text).toContain('"done":true');
    expect(text).toContain('"text":"Day"');
  });
});
