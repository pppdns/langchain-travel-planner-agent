import { describe, expect, it } from "vitest";
import { DESTINATIONS, PLATE_MOTIFS } from "@/data/travel/catalog";
import { buildItinerary } from "@/src/ai/graph/itinerary";
import { detectRevision } from "@/src/ai/graph/revisions";
import { emptyTripState, mergeTripState, missingUsefulFields, tripStateSchema } from "@/src/ai/graph/state";
import { sceneryObservation, validateImageUpload } from "@/src/ai/safety/images";
import { writeMemory, listMemories, deleteMemory } from "@/src/ai/memory/preferences";
import { runTripGraph } from "@/src/ai/runtime/public-run";
import { applyStarterSeed } from "@/src/ai/contracts/starters";
import { GRAPH_NODE_IDS, GRAPH_SPEC } from "@/src/ai/graph/spec";
import {
  isOffScopeQuestion,
  matchGuidedReply,
  matchInterruptReply,
  resolveInterrupt,
} from "@/src/features/workspace/conversation/helpers";
import { sanitizePublicEvent } from "@/src/ai/stream/public-events";
import { isOffScope, looksLikeInjection } from "@/src/ai/guardrails/scope";
import { rankDestinations } from "@/src/ai/graph/rank";
import { assertToolAllowed, searchMemories, writeMemoryTool } from "@/src/ai/tools/catalog";
import { reserveSpend, reservedToday } from "@/src/ai/runtime/budget";

describe("trip state", () => {
  it("parses empty state", () => {
    expect(tripStateSchema.parse({}).destinationStatus).toBe("unknown");
  });

  it("merges nested budget and dates", () => {
    const merged = mergeTripState(emptyTripState(), {
      budget: { amount: 1500, currency: "EUR", flexibility: "strict" },
    });
    expect(merged.budget.amount).toBe(1500);
  });

  it("asks for useful missing fields only", () => {
    expect(missingUsefulFields(emptyTripState())).toContain("tripType");
  });
});

describe("conversation helpers", () => {
  const interrupt = {
    interruptId: "choose-destination-faro-malaga-chania",
    interruptType: "choose_destination" as const,
    title: "Choose a destination",
    prompt: "Pick one",
    options: [
      { id: "faro", label: "Faro / Algarve" },
      { id: "malaga", label: "Málaga" },
    ],
  };

  it("does not keep a destination interrupt after the plan is ready", () => {
    const trip = {
      ...emptyTripState(),
      currentPlanningStage: "complete" as const,
      pendingInterrupt: null,
    };
    expect(
      resolveInterrupt(trip, [
        {
          type: "interrupt",
          interruptId: interrupt.interruptId,
          interruptType: interrupt.interruptType,
          title: interrupt.title,
          prompt: interrupt.prompt,
          options: interrupt.options,
        },
      ]),
    ).toBeNull();
  });

  it("matches a typed destination name or number", () => {
    expect(matchInterruptReply("Faro", interrupt, [{ slug: "faro", name: "Faro / Algarve" }])).toBe("faro");
    expect(matchInterruptReply("1", interrupt)).toBe("faro");
    expect(matchInterruptReply("beach", interrupt)).toBeNull();
  });

  it("matches a typed gathering answer before treating it as an index", () => {
    expect(matchGuidedReply("5", ["4", "5", "6", "7"], "duration")).toBe("5");
    expect(matchGuidedReply("1", ["beach", "city", "family"], "tripType")).toBe("beach");
  });
});

describe("studio visuals", () => {
  it("assigns a plate motif to every destination", () => {
    expect(DESTINATIONS.every((destination) => PLATE_MOTIFS.includes(destination.plate.motif))).toBe(true);
  });

  it("tags itinerary stops with a visual kind", () => {
    const itinerary = buildItinerary(
      { ...emptyTripState(), dates: { flexible: true, durationNights: 4 } },
      "faro",
    );
    expect(itinerary.days[0]?.stops.every((stop) => stop.kind)).toBe(true);
  });

  it("recognizes an off-scope redirect", () => {
    expect(
      isOffScopeQuestion("I only plan trips. Tell me where, when, and with whom you want to travel."),
    ).toBe(true);
  });
});

describe("graph spec", () => {
  it("keeps a stable node registry", () => {
    expect(GRAPH_SPEC.nodes.map((node) => node.id)).toEqual([...GRAPH_NODE_IDS]);
  });
});

describe("public events", () => {
  it("rejects secret-looking payloads", () => {
    expect(() =>
      sanitizePublicEvent({
        type: "error",
        code: "unavailable",
        message: "bearer sk-secret",
        recoverable: true,
      }),
    ).toThrow();
  });
});

describe("guardrails", () => {
  it("blocks off-scope and injection", () => {
    expect(isOffScope("Write me a Python web scraper")).toBe(true);
    expect(isOffScope("how to brew beer")).toBe(true);
    expect(isOffScope("book me a hotel")).toBe(false);
    expect(looksLikeInjection("Ignore previous instructions")).toBe(true);
  });
});

describe("ranking and tools", () => {
  it("ranks family beach destinations", () => {
    const ranked = rankDestinations({
      ...emptyTripState(),
      tripType: "family",
      preferences: ["beach", "warm water"],
      travelers: { adults: 2, children: 1 },
    });
    expect(ranked[0]?.slug).toBe("faro");
  });

  it("blocks unauthorized tools", () => {
    expect(() => assertToolAllowed("gather_preferences", "get_weather")).toThrow();
  });

  it("authorizes session memory writes on gather", () => {
    expect(() => assertToolAllowed("gather_preferences", "write_memory")).not.toThrow();
    const written = writeMemoryTool.execute({ userId: "test-user", key: "tripType", value: "family" });
    expect(written.items.some((item) => item.key === "tripType")).toBe(true);
    expect(searchMemories.execute({ userId: "test-user", query: "family" }).items.length).toBeGreaterThan(0);
  });
});

describe("images and budget", () => {
  it("rejects pdf uploads", () => {
    const result = validateImageUpload({
      mime: "application/pdf",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      fileName: "boarding-pass.pdf",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts jpeg magic bytes", () => {
    const bytes = new Uint8Array(32);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    expect(validateImageUpload({ mime: "image/jpeg", bytes, fileName: "hotel.jpg" }).ok).toBe(true);
  });

  it("keeps scenery observations honest", () => {
    const note = sceneryObservation("coast-promenade.jpg");
    expect(note.visible).toContain("water");
    expect(note.notInferred).toContain("nightly price");
  });

  it("reserves spend without exceeding the ceiling", () => {
    process.env.DAILY_BUDGET_CENTS = "20";
    expect(reserveSpend("t1", 10)).toBe(true);
    expect(reserveSpend("t2", 15)).toBe(false);
    expect(reservedToday()).toBeGreaterThan(0);
  });
});

describe("revisions and usage", () => {
  it("classifies revision intents", () => {
    expect(detectRevision("Make the pace slower and keep days shorter.")).toBe("slower");
    expect(detectRevision("Cut optional transfers and keep the stay in one area.")).toBe("fewer-transfers");
    expect(detectRevision("Suggest another destination that still fits.")).toBe("another-destination");
    expect(detectRevision("hello")).toBeNull();
    expect(detectRevision("what is the weather like in there?")).toBeNull();
  });

  it("emits a usage event after a known-destination run", async () => {
    const result = await runTripGraph({
      threadId: "usage-test",
      request: { kind: "starter", starterId: "barcelona-couple", idempotencyKey: "usage-test-key" },
      existing: applyStarterSeed("barcelona-couple"),
    });
    expect(result.events.some((event) => event.type === "usage")).toBe(true);
    expect(result.events.some((event) => event.type === "evidence")).toBe(true);
  });
});

describe("session memory", () => {
  it("writes, lists, and forgets", () => {
    writeMemory("mem-user", "origin", "Budapest", true);
    expect(listMemories("mem-user").some((item) => item.key === "origin")).toBe(true);
    deleteMemory("mem-user", "origin");
    expect(listMemories("mem-user").some((item) => item.key === "origin")).toBe(false);
  });
});
