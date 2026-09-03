import { describe, expect, it } from "vitest";
import {
  capabilityLimitReply,
  detectCapabilityLimit,
  looksLikePresentAsk,
  looksLikeSelfAsk,
  missingPlanReply,
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

  it("does not lecture when they only asked to see the plan", () => {
    expect(looksLikePresentAsk("show me my plan")).toBe(true);
    expect(looksLikePresentAsk("book me a hotel")).toBe(false);
    expect(missingPlanReply(emptyTripState())).toMatch(/no itinerary yet/i);
    expect(looksLikeSelfAsk("what can you do?")).toBe(true);
  });
});
