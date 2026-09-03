import { describe, expect, it } from "vitest";
import { Command } from "@langchain/langgraph";
import { afterGather, afterRoute, compileTripGraph } from "@/src/ai/graph/compile";
import { emptyTripState, tripStateSchema } from "@/src/ai/graph/state";
import { applyStarterSeed } from "@/src/ai/contracts/starters";
import { detectRevision } from "@/src/ai/graph/revisions";
import {
  catalogBoundReply,
  extractReplyChoices,
  finalizeSupervisor,
  looksLikeMoreOptionsAsk,
  nextSteer,
} from "@/src/ai/graph/supervise";
import { buildLivePresentation } from "@/src/ai/models/live";
import { runTripGraph } from "@/src/ai/runtime/public-run";
import { assertToolAllowed } from "@/src/ai/tools/catalog";
import { chipFieldForQuestion } from "@/src/features/workspace/conversation/helpers";

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

  it("re-parks on destination choice after an answer so resume still works", () => {
    expect(
      afterRoute({
        ...emptyGraphState({
          trip: {
            ...emptyTripState(),
            destinationStatus: "candidates",
            pendingInterrupt: {
              interruptId: "choose-destination",
              interruptType: "choose_destination",
              title: "Choose a destination",
              prompt: "Pick one",
              options: [{ id: "faro", label: "Faro / Algarve" }],
            },
          },
        }),
        supervisorRoute: "answer",
      }),
    ).toBe("await_destination_choice");
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

  it("keeps a mid-planning question from jumping to research", () => {
    const trip = {
      ...emptyTripState(),
      destinationStatus: "known" as const,
      destinationSlug: "budapest",
      destinationName: "Budapest",
      tripType: "city" as const,
    };
    const steered = finalizeSupervisor(
      {
        messages: [],
        trip,
        inputText: "what's the weather like in April?",
        inputKind: "message",
        assistantText: "",
      },
      {
        trip,
        assistantText: "April in Budapest is mild.",
        messages: [],
        supervisorRoute: "research",
      },
    );
    expect(steered.supervisorRoute).toBe("answer");
    expect(steered.trip.guidedOptions).toEqual(["4", "5", "6", "7"]);
    expect(steered.assistantText).toMatch(/april/i);
    expect(steered.assistantText).toMatch(/nights/i);
  });

  it("answers a hiking ask with landscape chips on the graph", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "asia-hike-chips" } };
    await graph.invoke(
      {
        inputKind: "message",
        inputText: "alone, somewhere in Asia. I want beautiful landscapes where I can hike",
        trip: emptyTripState(),
      },
      thread,
    );
    const asked = await graph.getState(thread);
    expect(asked.values.trip.guidedOptions).toEqual([
      "Mountains and alpine lakes",
      "Coastal cliffs and sea views",
      "Volcanoes and dramatic terrain",
      "Forests, waterfalls, and valleys",
    ]);
    expect(asked.values.assistantText).toMatch(/ideal hike/i);
    expect(asked.values.assistantText).not.toMatch(/what kind of trip/i);
  });

  it("uses choices from the reply as chips instead of static trip types", () => {
    const trip = emptyTripState();
    const reply = [
      "You asked for a destination with beautiful hiking landscapes.",
      "",
      "A few directions to choose from:",
      "",
      "1. Mountains and alpine lakes",
      "2. Coastal cliffs and sea views",
      "3. Volcanoes and dramatic terrain",
      "4. Forests, waterfalls, and valleys",
      "",
      "Which sounds most like your ideal hike? What kind of trip are you trying to make?",
    ].join("\n");
    expect(extractReplyChoices(reply)?.options).toEqual([
      "Mountains and alpine lakes",
      "Coastal cliffs and sea views",
      "Volcanoes and dramatic terrain",
      "Forests, waterfalls, and valleys",
    ]);
    const steered = finalizeSupervisor(
      {
        messages: [],
        trip,
        inputText: "somewhere there are beautiful landscapes where I can hike",
        inputKind: "message",
        assistantText: "",
      },
      {
        trip,
        assistantText: reply,
        messages: [],
        supervisorRoute: "answer",
      },
    );
    expect(steered.trip.guidedOptions).toEqual([
      "Mountains and alpine lakes",
      "Coastal cliffs and sea views",
      "Volcanoes and dramatic terrain",
      "Forests, waterfalls, and valleys",
    ]);
    expect(steered.trip.lastQuestion).toMatch(/ideal hike/i);
    expect(steered.assistantText).not.toMatch(/what kind of trip/i);
    expect(chipFieldForQuestion(steered.trip.lastQuestion)).toBe("preference");
  });

  it("leaves a draft-the-days choice after a question when planning can continue", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "budapest-weather-then-draft" } };
    const ready = {
      ...emptyTripState(),
      destinationStatus: "known" as const,
      destinationSlug: "budapest",
      destinationName: "Budapest",
      tripType: "city" as const,
      dates: { flexible: true, durationNights: 4 },
    };
    expect(nextSteer(ready)?.options).toEqual(["Draft the days"]);
    expect(chipFieldForQuestion("I can draft the days whenever you want.")).toBe("continue");

    await graph.invoke(
      {
        inputKind: "message",
        inputText: "what is the weather in Budapest?",
        trip: ready,
      },
      thread,
    );
    const asked = await graph.getState(thread);
    expect(asked.values.assistantText).toMatch(/weather/i);
    expect(asked.values.assistantText).toMatch(/draft the days/i);
    expect(asked.values.trip.guidedOptions).toEqual(["Draft the days"]);
    expect(asked.values.trip.currentPlanningStage).toBe("gathering");

    await graph.invoke(
      {
        inputKind: "chip",
        inputText: "continue:Draft the days",
        trip: asked.values.trip,
      },
      thread,
    );
    const planned = await graph.getState(thread);
    expect(planned.values.trip.itinerary?.destinationSlug).toBe("budapest");
    expect(planned.values.trip.lastTurnKind).toBe("plan");
  });

  it("answers weather during a destination interrupt and keeps the choices", async () => {
    const graph = compileTripGraph();
    const thread = { configurable: { thread_id: "faro-weather-during-decide" } };
    await graph.invoke(
      {
        inputKind: "starter",
        inputText: "family-beach-europe",
        trip: applyStarterSeed("family-beach-europe"),
      },
      thread,
    );
    const interrupted = await graph.getState(thread);
    expect(interrupted.values.trip.pendingInterrupt?.interruptType).toBe("choose_destination");

    const followUp = { configurable: { thread_id: "faro-weather-during-decide-q" } };
    await graph.invoke(
      {
        inputKind: "message",
        inputText: "what is the weather like in Faro?",
        trip: interrupted.values.trip,
      },
      followUp,
    );
    const asked = await graph.getState(followUp);
    expect(asked.values.assistantText).toMatch(/weather/i);
    expect(asked.values.assistantText).toMatch(/faro/i);
    expect(asked.values.assistantText).toMatch(/pick a destination/i);
    expect(asked.values.trip.pendingInterrupt?.interruptType).toBe("choose_destination");
    expect(asked.values.trip.currentPlanningStage).toBe("awaiting_destination");
    expect(asked.values.trip.candidateDestinations.length).toBeGreaterThan(0);
  });

  it("answers weather on the same interrupted thread without treating it as a destination pick", async () => {
    const threadId = "faro-weather-same-thread";
    const first = await runTripGraph({
      threadId,
      request: { kind: "starter", starterId: "family-beach-europe", idempotencyKey: "same-thread-a" },
      existing: applyStarterSeed("family-beach-europe"),
    });
    expect(first.interrupted).toBe(true);
    expect(first.tripState.pendingInterrupt?.interruptType).toBe("choose_destination");

    const asked = await runTripGraph({
      threadId,
      request: { kind: "message", text: "what is the weather like in Faro?", idempotencyKey: "same-thread-b" },
      existing: tripStateSchema.parse(first.tripState),
    });
    expect(asked.assistantText).toMatch(/weather/i);
    expect(asked.assistantText).toMatch(/faro/i);
    expect(asked.assistantText).toMatch(/pick a destination/i);
    expect(asked.tripState.destinationSlug).not.toBe("faro");
    expect(asked.tripState.pendingInterrupt?.interruptType).toBe("choose_destination");
    expect(asked.tripState.lastTurnKind).toBe("answer");
    expect(asked.tripState.candidateDestinations.length).toBeGreaterThan(0);
  });

  it("detects a request for more destinations", () => {
    expect(looksLikeMoreOptionsAsk("Are there other options?")).toBe(true);
    expect(looksLikeMoreOptionsAsk("any other destinations?")).toBe(true);
    expect(looksLikeMoreOptionsAsk("what is the weather like in Faro?")).toBe(false);
  });

  it("names the fixed catalog instead of inventing more destinations", () => {
    const trip = {
      ...emptyTripState(),
      destinationStatus: "candidates" as const,
      candidateDestinations: [
        { slug: "faro", name: "Faro / Algarve", country: "Portugal", summary: "", fit: "strong" as const, factors: [], evidence: [] },
        { slug: "malaga", name: "Málaga", country: "Spain", summary: "", fit: "strong" as const, factors: [], evidence: [] },
        { slug: "chania", name: "Chania", country: "Greece", summary: "", fit: "strong" as const, factors: [], evidence: [] },
      ],
    };
    const reply = catalogBoundReply(trip);
    expect(reply).toMatch(/fixed demo catalog/i);
    expect(reply).toMatch(/Faro \/ Algarve/);
    expect(reply).toMatch(/Málaga/);
    expect(reply).toMatch(/Chania/);
    expect(reply).toMatch(/will not invent/i);
  });

  it("answers a request for other destinations with the catalog limit", async () => {
    const threadId = "family-beach-other-options";
    const first = await runTripGraph({
      threadId,
      request: { kind: "starter", starterId: "family-beach-europe", idempotencyKey: "other-options-a" },
      existing: applyStarterSeed("family-beach-europe"),
    });
    expect(first.interrupted).toBe(true);
    expect(first.tripState.pendingInterrupt?.interruptType).toBe("choose_destination");
    const names = first.tripState.candidateDestinations.map((item) => item.name);

    const asked = await runTripGraph({
      threadId,
      request: { kind: "message", text: "Are there other options?", idempotencyKey: "other-options-b" },
      existing: tripStateSchema.parse(first.tripState),
    });
    expect(asked.assistantText).toMatch(/fixed demo catalog/i);
    expect(asked.assistantText).toMatch(/will not invent/i);
    for (const name of names) {
      expect(asked.assistantText).toContain(name);
    }
    expect(asked.assistantText).toMatch(/pick a destination/i);
    expect(asked.tripState.pendingInterrupt?.interruptType).toBe("choose_destination");
    expect(asked.tripState.lastTurnKind).toBe("answer");
    expect(asked.tripState.candidateDestinations.map((item) => item.slug)).toEqual(
      first.tripState.candidateDestinations.map((item) => item.slug),
    );

    const picked = await runTripGraph({
      threadId,
      request: {
        kind: "resume",
        interruptId: asked.tripState.pendingInterrupt?.interruptId ?? "choose-destination",
        value: "faro",
        idempotencyKey: "other-options-c",
      },
      existing: tripStateSchema.parse(asked.tripState),
    });
    expect(picked.tripState.destinationSlug).toBe("faro");
    expect(picked.tripState.itinerary?.days.length).toBeGreaterThan(0);
  });

  it("rewrites a silent repeat of the same destinations into a catalog limit", () => {
    const trip = {
      ...emptyTripState(),
      destinationStatus: "candidates" as const,
      currentPlanningStage: "awaiting_destination" as const,
      pendingInterrupt: {
        interruptId: "choose-destination-faro-malaga-chania",
        interruptType: "choose_destination" as const,
        title: "Choose a destination",
        prompt: "Pick a destination to continue.",
        options: [
          { id: "faro", label: "Faro / Algarve" },
          { id: "malaga", label: "Málaga" },
          { id: "chania", label: "Chania" },
        ],
      },
      candidateDestinations: [
        { slug: "faro", name: "Faro / Algarve", country: "Portugal", summary: "", fit: "strong" as const, factors: [], evidence: [] },
        { slug: "malaga", name: "Málaga", country: "Spain", summary: "", fit: "strong" as const, factors: [], evidence: [] },
        { slug: "chania", name: "Chania", country: "Greece", summary: "", fit: "strong" as const, factors: [], evidence: [] },
      ],
    };
    const steered = finalizeSupervisor(
      {
        messages: [],
        trip,
        inputText: "Are there other options?",
        inputKind: "message",
        assistantText: "",
      },
      {
        trip,
        assistantText: "Choose a destination. These places fit the trip so far.",
        messages: [],
        supervisorRoute: "await_destination",
      },
    );
    expect(steered.supervisorRoute).toBe("answer");
    expect(steered.assistantText).toMatch(/fixed demo catalog/i);
    expect(steered.assistantText).toMatch(/Faro \/ Algarve/);
    expect(steered.trip.pendingInterrupt?.interruptType).toBe("choose_destination");
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
