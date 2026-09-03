import { cookies } from "next/headers";
import { emptyTripState, publicTripStateSchema, type PublicTripState } from "@/src/ai/graph/state";
import type { PublicEvent } from "@/src/ai/stream/public-events";
import { getCheckpointPool } from "@/src/lib/db/pool";
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

const LOCAL_DEMO_USER = "local-demo-user";
const DEMO_UID_COOKIE = "rs_demo_uid";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const memory = new Map<string, StoredTrip>();

type TripRecord = {
  id: string;
  user_id: string;
  title: string;
  status: StoredTrip["status"];
  mode: StoredTrip["mode"];
  public_state: unknown;
};

export function isPersistedUserId(userId: string): boolean {
  return UUID_RE.test(userId);
}

export function canUseMemoryFallback(): boolean {
  return process.env.VERCEL !== "1";
}

function tripFromRecord(data: TripRecord, cached?: StoredTrip | null): StoredTrip {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    status: data.status,
    mode: data.mode,
    tripState: publicTripStateSchema.catch(emptyTripState()).parse(data.public_state),
    events: cached?.events ?? [],
    messages: cached?.messages ?? [],
  };
}

async function readDemoUserCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    const value = store.get(DEMO_UID_COOKIE)?.value;
    return value && isPersistedUserId(value) ? value : null;
  } catch {
    return null;
  }
}

async function writeDemoUserCookie(userId: string) {
  try {
    const store = await cookies();
    store.set(DEMO_UID_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });
  } catch {
    // Route handlers can set cookies. Server Components cannot.
  }
}

async function persistTripRow(trip: StoredTrip): Promise<boolean> {
  if (!isPersistedUserId(trip.userId)) return false;

  const row = {
    id: trip.id,
    user_id: trip.userId,
    title: trip.title,
    status: trip.status,
    mode: trip.mode,
    public_state: trip.tripState,
  };

  const pool = getCheckpointPool();
  if (pool) {
    await pool.query(
      `insert into public.trips (id, user_id, title, status, mode, public_state)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [row.id, row.user_id, row.title, row.status, row.mode, JSON.stringify(row.public_state)],
    );
    return true;
  }

  const admin = createAdminSupabaseClient();
  if (admin) {
    const { error } = await admin.from("trips").insert(row);
    if (error) throw error;
    return true;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("trips").insert(row);
  if (error) throw error;
  return true;
}

async function loadTripRow(tripId: string, userId: string): Promise<TripRecord | null> {
  if (!isPersistedUserId(userId)) return null;

  const pool = getCheckpointPool();
  if (pool) {
    const result = await pool.query<TripRecord>(
      `select id, user_id, title, status, mode, public_state
       from public.trips
       where id = $1 and user_id = $2
       limit 1`,
      [tripId, userId],
    );
    return result.rows[0] ?? null;
  }

  const admin = createAdminSupabaseClient();
  if (admin) {
    const { data, error } = await admin.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== userId) return null;
    return data as TripRecord;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) return null;
  return data as TripRecord;
}

async function updateTripRow(trip: StoredTrip): Promise<void> {
  if (!isPersistedUserId(trip.userId)) return;

  const pool = getCheckpointPool();
  if (pool) {
    await pool.query(
      `update public.trips
       set title = $2,
           status = $3,
           mode = $4,
           public_state = $5::jsonb,
           updated_at = now()
       where id = $1 and user_id = $6`,
      [trip.id, trip.title, trip.status, trip.mode, JSON.stringify(trip.tripState), trip.userId],
    );
    return;
  }

  const admin = createAdminSupabaseClient();
  const client = admin ?? (await createServerSupabaseClient().catch(() => null));
  if (!client) return;
  const { error } = await client
    .from("trips")
    .update({
      title: trip.title,
      status: trip.status,
      mode: trip.mode,
      public_state: trip.tripState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trip.id)
    .eq("user_id", trip.userId);
  if (error) throw error;
}

export async function getSessionUserId(): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient();
    const existing = await supabase.auth.getUser();
    if (existing.data.user?.id) {
      await writeDemoUserCookie(existing.data.user.id);
      return existing.data.user.id;
    }
    const created = await supabase.auth.signInAnonymously();
    if (created.data.user?.id) {
      await writeDemoUserCookie(created.data.user.id);
      return created.data.user.id;
    }
  } catch {
    // Cookie identity still works when Auth is off or cookies cannot be written here.
  }

  const cookieId = await readDemoUserCookie();
  if (cookieId) return cookieId;

  if (canUseMemoryFallback() && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return LOCAL_DEMO_USER;
  }

  const userId = crypto.randomUUID();
  await writeDemoUserCookie(userId);
  return userId;
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

  try {
    const persisted = await persistTripRow(trip);
    if (!persisted && !canUseMemoryFallback()) {
      throw new Error("Trip storage is not configured");
    }
  } catch (error) {
    if (!canUseMemoryFallback()) throw error;
  }

  memory.set(trip.id, trip);
  return trip;
}

export async function getStoredTrip(tripId: string, userId: string): Promise<StoredTrip | null> {
  const cached = memory.get(tripId);
  if (cached && cached.userId === userId) return cached;

  try {
    const row = await loadTripRow(tripId, userId);
    if (!row) return null;
    const trip = tripFromRecord(row, cached?.userId === userId ? cached : null);
    memory.set(trip.id, trip);
    return trip;
  } catch {
    return cached?.userId === userId ? cached : null;
  }
}

export async function saveStoredTrip(trip: StoredTrip) {
  memory.set(trip.id, trip);
  try {
    await updateTripRow(trip);
  } catch {
    if (!canUseMemoryFallback()) {
      throw new Error("Could not persist trip");
    }
  }
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
