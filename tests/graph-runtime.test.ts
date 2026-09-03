import { describe, expect, it } from "vitest";
import { Command } from "@langchain/langgraph";
import { compileTripGraph } from "@/src/ai/graph/compile";
import { emptyTripState } from "@/src/ai/graph/state";
import { applyStarterSeed } from "@/src/ai/contracts/starters";

describe("langgraph flows", () => {
  it("discovers destinations and interrupts before resume", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "discovery-test" } };
    await graph.invoke(
      {
        inputKind: "starter",
        inputText: "family-beach-europe",
        trip: applyStarterSeed("family-beach-europe"),
      },
      thread,
    );
    const interrupted = await graph.getState(thread);
    expect(interrupted.values.trip.destinationStatus).toBe("candidates");
    expect(interrupted.tasks.some((task) => task.interrupts.length > 0)).toBe(true);

    await graph.invoke(new Command({ resume: "faro" }), thread);
    const resumed = await graph.getState(thread);
    expect(resumed.values.trip.destinationSlug).toBe("faro");
    expect(resumed.values.trip.itinerary?.days.length).toBeGreaterThan(0);
  });

  it("plans a known destination without a destination interrupt", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "known-test" } };
    await graph.invoke(
      {
        inputKind: "starter",
        inputText: "barcelona-couple",
        trip: applyStarterSeed("barcelona-couple"),
      },
      thread,
    );
    const state = await graph.getState(thread);
    expect(state.values.trip.destinationSlug).toBe("barcelona");
    expect(state.values.trip.itinerary?.destinationSlug).toBe("barcelona");
    expect(state.values.trip.pendingInterrupt).toBeNull();
  });

  it("pauses on a pace-versus-budget tradeoff and resumes", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "tradeoff-test" } };
    await graph.invoke(
      {
        inputKind: "starter",
        inputText: "city-break-budget",
        trip: applyStarterSeed("city-break-budget"),
      },
      thread,
    );
    const interrupted = await graph.getState(thread);
    expect(interrupted.values.trip.destinationStatus).toBe("candidates");

    await graph.invoke(new Command({ resume: interrupted.values.trip.candidateDestinations[0]?.slug }), thread);
    const tradeoff = await graph.getState(thread);
    expect(tradeoff.values.trip.currentPlanningStage).toBe("awaiting_tradeoff");
    expect(tradeoff.tasks.some((task) => task.interrupts.length > 0)).toBe(true);

    await graph.invoke(new Command({ resume: "protect-budget" }), thread);
    const resumed = await graph.getState(thread);
    expect(resumed.values.trip.pace).toBe("relaxed");
    expect(resumed.values.trip.itinerary?.days.length).toBeGreaterThan(0);
    expect(resumed.values.trip.pendingInterrupt).toBeNull();
  });

  it("revises a finished itinerary on the same thread", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "revision-test" } };
    await graph.invoke(
      {
        inputKind: "starter",
        inputText: "barcelona-couple",
        trip: applyStarterSeed("barcelona-couple"),
      },
      thread,
    );
    await graph.invoke(
      {
        inputKind: "message",
        inputText: "Make the pace slower and keep days shorter.",
        trip: (await graph.getState(thread)).values.trip,
      },
      thread,
    );
    const revised = await graph.getState(thread);
    expect(revised.values.assistantText).toMatch(/slowed the days/i);
    expect(revised.values.trip.pace).toBe("relaxed");
    expect(revised.values.trip.itinerary?.constraintsHonored).toContain("unhurried");
  });

  it("redirects off-scope traffic", async () => {
    const graph = compileTripGraph();
    const result = await graph.invoke(
      {
        inputKind: "message",
        inputText: "Write me a Python web scraper",
        trip: emptyTripState(),
      },
      { configurable: { thread_id: "off-scope" } },
    );
    expect(result.assistantText).toMatch(/only plan trips/i);
  });
});
