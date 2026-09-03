import { NextResponse } from "next/server";
import { runTripRequestSchema } from "@/src/ai/contracts/http";
import { replayEventsFor, runTripGraph } from "@/src/ai/runtime/public-run";
import { budgetExhausted, reserveSpend, settleSpend } from "@/src/ai/runtime/budget";
import { createAssistantStream, createEventStream } from "@/src/ai/stream/bridge";
import { emptyTripState, tripStateSchema } from "@/src/ai/graph/state";
import { assertHumanRequest } from "@/src/lib/botid";
import { getEnv, isLiveModelsEnabled } from "@/src/lib/env";
import {
  acquireLease,
  getSessionUserId,
  getStoredTrip,
  releaseLease,
  saveStoredTrip,
} from "@/src/lib/trips/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertHumanRequest();
  } catch {
    return NextResponse.json({ error: "Bot traffic blocked" }, { status: 403 });
  }

  const env = getEnv();
  if (env.DEMO_DISABLED === "true") {
    return NextResponse.json({ error: "Live demo is paused." }, { status: 503 });
  }

  const { id } = await context.params;
  const parsed = runTripRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid run request" }, { status: 400 });
  }

  const userId = await getSessionUserId();
  const trip = await getStoredTrip(id, userId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const idempotencyKey = "idempotencyKey" in parsed.data ? parsed.data.idempotencyKey : `replay-${id}`;
  const lease = acquireLease(id, idempotencyKey);
  if (lease === "busy") {
    return NextResponse.json({ error: "This trip is already running." }, { status: 409 });
  }

  try {
    const useReplay = trip.mode === "replay" || parsed.data.kind === "replay" || budgetExhausted();
    if (useReplay) {
      const starterId =
        parsed.data.kind === "starter" || parsed.data.kind === "replay"
          ? parsed.data.starterId
          : "family-beach-europe";
      const events = replayEventsFor(starterId, parsed.data.kind === "resume");
      trip.mode = "replay";
      trip.events = [...trip.events, ...events];
      const lastState = [...events].reverse().find((event) => event.type === "trip-state");
      if (lastState && lastState.type === "trip-state") {
        trip.tripState = { ...trip.tripState, ...lastState.patch };
      }
      const text =
        parsed.data.kind === "resume"
          ? "Recorded resume: the same interrupted thread continues into a structured itinerary."
          : "Recorded run. Live planning is paused or this starter is playing a golden fixture.";
      trip.messages.push({ role: "assistant", content: text });
      await saveStoredTrip(trip);
      return new Response(createEventStream({ text, events }), {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      });
    }

    if (!reserveSpend(trip.id, 8)) {
      trip.mode = "replay";
      await saveStoredTrip(trip);
      return NextResponse.json({ error: "Daily demo budget exhausted." }, { status: 402 });
    }

    const userText =
      parsed.data.kind === "message"
        ? parsed.data.text
        : parsed.data.kind === "chip"
          ? parsed.data.value
          : parsed.data.kind === "starter"
            ? parsed.data.starterId
            : parsed.data.kind === "resume"
              ? parsed.data.value
              : parsed.data.starterId;
    trip.messages.push({ role: "user", content: userText });

    const playwright = request.headers.get("x-playwright") === "1" || process.env.PLAYWRIGHT === "1";
    const liveModels = !playwright && isLiveModelsEnabled();
    const result = await runTripGraph({
      threadId: trip.id,
      request: parsed.data,
      existing: tripStateSchema.parse(trip.tripState ?? emptyTripState()),
      liveModels,
    });

    trip.tripState = result.tripState;
    trip.events = [...trip.events, ...result.events];
    if (result.assistantText) {
      trip.messages.push({ role: "assistant", content: result.assistantText });
    }
    if (result.tripState.currentPlanningStage === "complete") {
      trip.status = "completed";
    }
    await saveStoredTrip(trip);
    settleSpend(trip.id, liveModels ? 8 : 4);

    return new Response(
      await createAssistantStream({
        text: result.assistantText,
        events: result.events,
        live: result.livePresentation,
        onText: async (text) => {
          const last = trip.messages.at(-1);
          if (last?.role === "assistant") last.content = text;
          await saveStoredTrip(trip);
        },
      }),
      { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } },
    );
  } finally {
    releaseLease(id);
  }
}
