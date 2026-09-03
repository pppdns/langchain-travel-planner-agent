import { describe, expect, it } from "vitest";
import {
  capabilityLimitReply,
  detectCapabilityLimit,
  detectOutOfCatalogAsk,
  looksLikePresentAsk,
  looksLikeSelfAsk,
  missingPlanReply,
  outOfCatalogReply,
} from "@/src/ai/graph/capability";
import { isOffScope } from "@/src/ai/guardrails/scope";
import { emptyTripState } from "@/src/ai/graph/state";

describe("capability and scope", () => {
  it("treats booking as a demo limit, not as off-scope", () => {
    expect(detectCapabilityLimit("book me a hotel")).toBe("book");
    expect(detectCapabilityLimit("Can you reserve a table in Faro?")).toBe("reserve");
    expect(isOffScope("book me a hotel")).toBe(false);
    expect(isOffScope("best beer halls in Munich")).toBe(false);
    expect(isOffScope("wine tasting in Bordeaux")).toBe(false);
  });

  it("refuses non-travel how-tos and still blocks code", () => {
    expect(isOffScope("how to brew beer")).toBe(true);
    expect(isOffScope("Write me a Python web scraper")).toBe(true);
    expect(isOffScope("write me a 5 day plan")).toBe(false);
  });

  it("names the demo limit and a next step it can do", () => {
    const reply = capabilityLimitReply(emptyTripState(), "book");
    expect(reply).toMatch(/can't/i);
    expect(reply).toMatch(/hiring demo/i);
    expect(reply).toMatch(/fixed catalog/i);
    expect(reply).toMatch(/share a destination or a vibe/i);
  });

  it("detects places outside the European catalog", () => {
    expect(detectOutOfCatalogAsk("any destination in the USA?")).toBe("the USA");
    expect(detectOutOfCatalogAsk("what about Tokyo?")).toBe("Japan");
    expect(detectOutOfCatalogAsk("somewhere in Asia")).toBe("Asia");
    expect(detectOutOfCatalogAsk("any destination in Norway?")).toBe("Norway");
    expect(detectOutOfCatalogAsk("is Faro walkable?")).toBeNull();
    expect(detectOutOfCatalogAsk("any destination in Portugal?")).toBeNull();
    expect(detectOutOfCatalogAsk("best beer halls in Munich")).toBeNull();
    expect(detectOutOfCatalogAsk("weather in Faro?")).toBeNull();
  });

  it("names the missing region and keeps catalog choices", () => {
    const trip = {
      ...emptyTripState(),
      candidateDestinations: [
        { slug: "faro", name: "Faro / Algarve", country: "Portugal", summary: "", fit: "strong" as const, factors: [], evidence: [] },
        { slug: "malaga", name: "Málaga", country: "Spain", summary: "", fit: "strong" as const, factors: [], evidence: [] },
        { slug: "chania", name: "Chania", country: "Greece", summary: "", fit: "strong" as const, factors: [], evidence: [] },
      ],
    };
    const reply = outOfCatalogReply(trip, "the USA");
    expect(reply).toMatch(/USA/);
    expect(reply).toMatch(/no destinations in the USA/i);
    expect(reply).toMatch(/hiring demo/i);
    expect(reply).toMatch(/fixed set/i);
    expect(reply).toMatch(/Faro \/ Algarve/);
    expect(reply).toMatch(/Málaga/);
    expect(reply).toMatch(/Chania/);
  });

  it("does not lecture when they only asked to see the plan", () => {
    expect(looksLikePresentAsk("show me my plan")).toBe(true);
    expect(looksLikePresentAsk("book me a hotel")).toBe(false);
    expect(missingPlanReply(emptyTripState())).toMatch(/no itinerary yet/i);
    expect(looksLikeSelfAsk("what can you do?")).toBe(true);
  });
});
