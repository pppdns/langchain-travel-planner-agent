import { NextResponse } from "next/server";
import { createTripRequestSchema } from "@/src/ai/contracts/http";
import { STARTERS } from "@/src/ai/contracts/starters";
import { budgetExhausted } from "@/src/ai/runtime/budget";
import { getEnv, resolveRuntimeMode } from "@/src/lib/env";
import { assertHumanRequest } from "@/src/lib/botid";
import { createStoredTrip, getSessionUserId } from "@/src/lib/trips/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    await assertHumanRequest();
  } catch {
    return NextResponse.json({ error: "Bot traffic blocked" }, { status: 403 });
  }

  const env = getEnv();
  if (env.DEMO_DISABLED === "true") {
    return NextResponse.json({ error: "Live demo is paused." }, { status: 503 });
  }

  const body = createTripRequestSchema.catch({}).parse(await request.json().catch(() => ({})));
  const userId = await getSessionUserId();
  const mode = budgetExhausted() || resolveRuntimeMode() === "replay" ? "replay" : resolveRuntimeMode();
  const title = body.starterId ? STARTERS[body.starterId].label : "Untitled trip";
  const trip = await createStoredTrip({ userId, title, mode });

  return NextResponse.json({
    tripId: trip.id,
    mode,
    uploadsEnabled: env.UPLOADS_DISABLED !== "true",
  });
}
