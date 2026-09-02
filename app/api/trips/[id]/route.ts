import { NextResponse } from "next/server";
import { getSessionUserId, getStoredTrip } from "@/src/lib/trips/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = await getSessionUserId();
  const trip = await getStoredTrip(id, userId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json({
    tripId: trip.id,
    title: trip.title,
    status: trip.status,
    mode: trip.mode,
    tripState: trip.tripState,
    pendingInterrupt:
      trip.events.find((event) => event.type === "interrupt") ??
      (trip.tripState.pendingInterrupt
        ? {
            type: "interrupt" as const,
            ...trip.tripState.pendingInterrupt,
            options: trip.tripState.pendingInterrupt.options,
          }
        : null),
    events: trip.events,
    messages: trip.messages,
  });
}
