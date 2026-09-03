import { describe, expect, it } from "vitest";
import { Command } from "@langchain/langgraph";
import { afterGather, compileTripGraph } from "@/src/ai/graph/compile";
import { emptyTripState } from "@/src/ai/graph/state";
import { applyStarterSeed } from "@/src/ai/contracts/starters";
import { detectRevision } from "@/src/ai/graph/revisions";
import { buildLivePresentation } from "@/src/ai/models/live";
import { assertToolAllowed } from "@/src/ai/tools/catalog";

function emptyGraphState(overrides: {
  trip?: ReturnType<typeof emptyTripState>;
  assistantText?: string;
  inputText?: string;
}) {
  return {
    messages: [],
    trip: overrides.trip ?? emptyTripState(),
    inputText: overrides.inputText ?? "",
    inputKind: "message",
    assistantText: overrides.assistantText ?? "",
    supervisorRoute: "",
  };
}

describe("supervisor routing", () => {
  it("does not send a complete trip from gather to present_plan", () => {
    expect(
      afterGather(
        emptyGraphState({
          trip: { ...emptyTripState(), currentPlanningStage: "complete" },
          inputText: "what is the weather like in there?",
        }),
      ),
    ).toBe("route_supervisor");
  });

  it("sends gathering turns to the supervisor so questions can be answered", () => {
    expect(
      afterGather(
        emptyGraphState({
          trip: { ...emptyTripState(), currentPlanningStage: "gathering" },
          inputText: "what is the weather in Budapest?",
        }),
      ),
    ).toBe("route_supervisor");
  });

  it("still exits early for forgotten memory", () => {
    expect(
      afterGather(
        emptyGraphState({
          trip: { ...emptyTripState(), currentPlanningStage: "complete" },
          assistantText: "Forgot that preference for this session.",
        }),
      ),
    ).toBe("present_plan");
  });

  it("authorizes weather on the supervisor", () => {
    expect(() => assertToolAllowed("route_supervisor", "get_weather")).not.toThrow();
  });

  it("does not treat a weather question as a revision", () => {
    expect(detectRevision("what is the weather like in there?")).toBeNull();
    expect(detectRevision("is it relaxing there?")).toBeNull();
  });

  it("answers a Faro weather follow-up without presenting the plan", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "faro-weather-follow-up" } };
    await graph.invoke(
      {
        inputKind: "starter",
        inputText: "family-beach-europe",
        trip: applyStarterSeed("family-beach-europe"),
      },
      thread,
    );
    await graph.invoke(new Command({ resume: "faro" }), thread);

    const planned = await graph.getState(thread);
    expect(planned.values.trip.destinationSlug).toBe("faro");
    expect(planned.values.trip.itinerary?.days.length).toBeGreaterThan(0);
    expect(planned.values.trip.lastTurnKind).toBe("plan");

    const nodes: string[] = [];
    const stream = await graph.stream(
      {
        inputKind: "message",
        inputText: "what is the weather like in there?",
        trip: planned.values.trip,
      },
      { ...thread, streamMode: "updates" },
    );
    for await (const update of stream) {
      nodes.push(...Object.keys(update as Record<string, unknown>));
    }

    const answered = await graph.getState(thread);
    expect(nodes).toContain("route_supervisor");
    expect(nodes).not.toContain("present_plan");
    expect(answered.values.trip.lastTurnKind).toBe("answer");
    expect(answered.values.assistantText).toMatch(/weather/i);
    expect(answered.values.assistantText).toMatch(/faro/i);
    expect(answered.values.trip.latestEvidence.some((item: { title: string }) => /weather/i.test(item.title))).toBe(
      true,
    );
  });

  it("answers weather before a plan exists and then continues into planning", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "budapest-weather-before-plan" } };
    const firstNodes: string[] = [];
    const firstStream = await graph.stream(
      {
        inputKind: "message",
        inputText: "what is the weather in Budapest?",
        trip: emptyTripState(),
      },
      { ...thread, streamMode: "updates" },
    );
    for await (const update of firstStream) {
      firstNodes.push(...Object.keys(update as Record<string, unknown>));
    }

    const asked = await graph.getState(thread);
    expect(firstNodes).toContain("route_supervisor");
    expect(firstNodes).not.toContain("present_plan");
    expect(asked.values.trip.destinationSlug).toBe("budapest");
    expect(asked.values.trip.currentPlanningStage).toBe("gathering");
    expect(asked.values.assistantText).toMatch(/weather/i);
    expect(asked.values.assistantText).toMatch(/budapest/i);
    expect(asked.values.assistantText).toMatch(/what kind of trip/i);

    await graph.invoke(
      {
        inputKind: "chip",
        inputText: "tripType:city",
        trip: asked.values.trip,
      },
      thread,
    );
    const typed = await graph.getState(thread);
    expect(typed.values.assistantText).toMatch(/nights/i);

    await graph.invoke(
      {
        inputKind: "chip",
        inputText: "duration:4",
        trip: typed.values.trip,
      },
      thread,
    );
    const planned = await graph.getState(thread);
    expect(planned.values.trip.itinerary?.destinationSlug).toBe("budapest");
    expect(planned.values.trip.lastTurnKind).toBe("plan");
    expect(planned.values.assistantText).toMatch(/4-day plan for Budapest/i);
  });
});

describe("live presentation on answer turns", () => {
  it("does not rewrite a grounded supervisor answer into an operations brief", () => {
    const trip = {
      ...emptyTripState(),
      destinationSlug: "faro",
      destinationName: "Faro / Algarve",
      lastTurnKind: "answer" as const,
    };
    expect(
      buildLivePresentation({
        trip,
        assistantText: "You asked about the weather in Faro / Algarve. Warm afternoons, plan shade after 11.",
        interrupted: false,
        userText: "what is the weather like in there?",
        turnKind: "answer",
      }),
    ).toBeNull();
  });
});
