import { describe, expect, it } from "vitest";
import {
  catalogFactAnswer,
  distinctiveAskTokens,
  looksLikeUserQuestion,
  replyAddressesAsk,
  unansweredAskReply,
} from "@/src/ai/graph/answer";
import { emptyTripState } from "@/src/ai/graph/state";

const candidates = {
  ...emptyTripState(),
  destinationStatus: "candidates" as const,
  candidateDestinations: [
    { slug: "faro", name: "Faro / Algarve", country: "Portugal", summary: "", fit: "strong" as const, factors: [], evidence: [] },
    { slug: "malaga", name: "Málaga", country: "Spain", summary: "", fit: "strong" as const, factors: [], evidence: [] },
    { slug: "chania", name: "Chania", country: "Greece", summary: "", fit: "strong" as const, factors: [], evidence: [] },
  ],
};

describe("grounded answers", () => {
  it("treats freeform asks as questions, not only question-mark lines", () => {
    expect(looksLikeUserQuestion("any destination in the USA?")).toBe(true);
    expect(looksLikeUserQuestion("do they have wifi in Faro?")).toBe(true);
    expect(looksLikeUserQuestion("tell me about Faro")).toBe(true);
    expect(looksLikeUserQuestion("beach")).toBe(false);
    expect(looksLikeUserQuestion("4")).toBe(false);
  });

  it("answers catalog facts instead of ignoring the ask", () => {
    const walkable = catalogFactAnswer(candidates, "is Faro walkable?", "faro");
    expect(walkable).toMatch(/Faro \/ Algarve/);
    expect(walkable).toMatch(/walkable/i);
    const food = catalogFactAnswer(candidates, "what's the food like in Faro?", "faro");
    expect(food).toMatch(/food|meal/i);
    const compared = catalogFactAnswer(candidates, "which of these is family-friendly?");
    expect(compared).toMatch(/family-friendly/i);
    expect(compared).toMatch(/Faro \/ Algarve/);
  });

  it("does not invent an answer when the catalog has no fact", () => {
    expect(catalogFactAnswer(candidates, "do they have wifi in Faro?", "faro")).toBeNull();
    expect(catalogFactAnswer(emptyTripState(), "is there a Costco nearby?")).toBeNull();
  });

  it("rejects replies that ignore the user's words", () => {
    expect(distinctiveAskTokens("do they have wifi in Faro?")).toContain("wifi");
    expect(replyAddressesAsk("do they have wifi in Faro?", "You asked about this trip.")).toBe(false);
    expect(replyAddressesAsk("do they have wifi in Faro?", "You asked about Faro / Algarve. Warm Atlantic beaches.")).toBe(
      false,
    );
    expect(
      replyAddressesAsk("do they have wifi in Faro?", unansweredAskReply(candidates, "do they have wifi in Faro?")),
    ).toBe(true);
    expect(replyAddressesAsk("what is the weather like in Faro?", "You asked about the weather in Faro / Algarve.")).toBe(
      true,
    );
  });

  it("names the missing fact and a next step", () => {
    const reply = unansweredAskReply(candidates, "do they have wifi in Faro?");
    expect(reply).toMatch(/wifi/i);
    expect(reply).toMatch(/don't have an answer/i);
    expect(reply).toMatch(/hiring demo/i);
    expect(reply).toMatch(/Faro \/ Algarve/);
  });
});
