import { emptyTripState, publicTripStateSchema, type PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { createAdminSupabaseClient } from "@/src/lib/supabase/admin";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type StoredTrip = {
  id: string;
  userId: string;
  title: string;
  status: "active" | "completed" | "expired";
  mode: "live" | "replay" | "fake";
  tripState: PublicTripState;
  events: PublicEvent[];
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

const memory = new Map<string, StoredTrip>();

export async function getSessionUserId(): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient();
    const existing = await supabase.auth.getUser();
    if (existing.data.user) return existing.data.user.id;
    const created = await supabase.auth.signInAnonymously();
    if (created.data.user) return created.data.user.id;
  } catch {
    // Local fallback keeps the demo usable without Auth configuration.
  }
  return "local-demo-user";
}

export async function createStoredTrip(input: {
  userId: string;
  title: string;
  mode: StoredTrip["mode"];
}): Promise<StoredTrip> {
  const trip: StoredTrip = {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title,
    status: "active",
    mode: input.mode,
    tripState: emptyTripState(),
    events: [],
    messages: [],
  };
  memory.set(trip.id, trip);

  const admin = createAdminSupabaseClient();
  if (admin) {
    await admin.from("trips").insert({
      id: trip.id,
      user_id: input.userId,
      title: input.title,
      mode: input.mode,
      public_state: trip.tripState,
    });
  } else {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.from("trips").insert({
        id: trip.id,
        user_id: input.userId,
        title: input.title,
        mode: input.mode,
        public_state: trip.tripState,
      });
    } catch {
      // memory store remains the source of truth
    }
  }

  return trip;
}

export async function getStoredTrip(tripId: string, userId: string): Promise<StoredTrip | null> {
  const cached = memory.get(tripId);
  if (cached && cached.userId === userId) return cached;

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (!data || data.user_id !== userId) return cached?.userId === userId ? cached : null;
    const trip: StoredTrip = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      status: data.status as StoredTrip["status"],
      mode: data.mode as StoredTrip["mode"],
      tripState: publicTripStateSchema.catch(emptyTripState()).parse(data.public_state),
      events: cached?.events ?? [],
      messages: cached?.messages ?? [],
    };
    memory.set(trip.id, trip);
    return trip;
  } catch {
    return cached?.userId === userId ? cached : null;
  }
}

export async function saveStoredTrip(trip: StoredTrip) {
  memory.set(trip.id, trip);
  const admin = createAdminSupabaseClient();
  const client = admin ?? (await createServerSupabaseClient().catch(() => null));
  if (!client) return;
  await client
    .from("trips")
    .update({
      title: trip.title,
      status: trip.status,
      mode: trip.mode,
      public_state: trip.tripState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trip.id);
}

const leases = new Map<string, { key: string; expiresAt: number }>();

export function acquireLease(tripId: string, idempotencyKey: string): "ok" | "duplicate" | "busy" {
  const current = leases.get(tripId);
  const now = Date.now();
  if (current && current.expiresAt > now) {
    return current.key === idempotencyKey ? "duplicate" : "busy";
  }
  leases.set(tripId, { key: idempotencyKey, expiresAt: now + 60_000 });
  return "ok";
}

export function releaseLease(tripId: string) {
  leases.delete(tripId);
}
