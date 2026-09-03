import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
const query = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get(name: string) {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set(name: string, value: string) {
      cookieJar.set(name, value);
    },
    getAll() {
      return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
    },
  })),
}));

vi.mock("@/src/lib/db/pool", () => ({
  getCheckpointPool: vi.fn(() => ({ query })),
}));

vi.mock("@/src/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => null),
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => {
    throw new Error("supabase unavailable");
  }),
}));

import {
  canUseMemoryFallback,
  createStoredTrip,
  getSessionUserId,
  getStoredTrip,
  isPersistedUserId,
} from "@/src/lib/trips/store";

describe("trip identity", () => {
  beforeEach(() => {
    cookieJar.clear();
    query.mockReset();
    delete process.env.VERCEL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("treats only UUIDs as persistable owners", () => {
    expect(isPersistedUserId("local-demo-user")).toBe(false);
    expect(isPersistedUserId("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("reuses a cookie owner across requests", async () => {
    process.env.VERCEL = "1";
    const first = await getSessionUserId();
    const second = await getSessionUserId();
    expect(isPersistedUserId(first)).toBe(true);
    expect(second).toBe(first);
    expect(cookieJar.get("rs_demo_uid")).toBe(first);
  });

  it("keeps a local memory fallback when Supabase is unset", async () => {
    expect(canUseMemoryFallback()).toBe(true);
    await expect(getSessionUserId()).resolves.toBe("local-demo-user");
  });
});

describe("trip persistence", () => {
  beforeEach(() => {
    cookieJar.clear();
    query.mockReset();
    process.env.VERCEL = "1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  it("writes the trip through the session pooler", async () => {
    query.mockResolvedValue({ rows: [] });
    const trip = await createStoredTrip({
      userId: "11111111-1111-4111-8111-111111111111",
      title: "Untitled trip",
      mode: "live",
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[1]?.[0]).toBe(trip.id);
    expect(query.mock.calls[0]?.[1]?.[1]).toBe(trip.userId);
  });

  it("fails closed on Vercel when persist fails", async () => {
    query.mockRejectedValue(new Error("fk"));
    await expect(
      createStoredTrip({
        userId: "11111111-1111-4111-8111-111111111111",
        title: "Untitled trip",
        mode: "live",
      }),
    ).rejects.toThrow("fk");
  });

  it("loads only the owner row from Postgres", async () => {
    query.mockResolvedValue({
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          user_id: "11111111-1111-4111-8111-111111111111",
          title: "Untitled trip",
          status: "active",
          mode: "live",
          public_state: {},
        },
      ],
    });
    const trip = await getStoredTrip(
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(trip?.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(String(query.mock.calls[0]?.[0])).toContain("user_id");
  });

  it("does not return another visitor's trip", async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(
      getStoredTrip("22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"),
    ).resolves.toBeNull();
  });
});
