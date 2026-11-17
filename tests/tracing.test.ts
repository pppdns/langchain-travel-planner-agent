import { describe, expect, it } from "vitest";
import { isTracingEnabled } from "@/src/ai/observability/tracing";
import { withModelCallLog, loggedCall } from "@/src/ai/models/call-log";

describe("langsmith tracing gate", () => {
  const prod = { NODE_ENV: "production", LANGSMITH_TRACING: "true", LANGSMITH_API_KEY: "lsv2_test" } as NodeJS.ProcessEnv;

  it("is on only with the flag and a key", () => {
    expect(isTracingEnabled(prod)).toBe(true);
    expect(isTracingEnabled({ ...prod, LANGSMITH_TRACING: "false" })).toBe(false);
    expect(isTracingEnabled({ ...prod, LANGSMITH_API_KEY: undefined })).toBe(false);
  });

  it("never traces tests or Playwright runs", () => {
    expect(isTracingEnabled({ ...prod, VITEST: "true" })).toBe(false);
    expect(isTracingEnabled({ ...prod, PLAYWRIGHT: "1" })).toBe(false);
    expect(isTracingEnabled({ ...prod, NODE_ENV: "test" })).toBe(false);
  });

  it("is off in this vitest process", () => {
    expect(isTracingEnabled()).toBe(false);
  });
});

describe("model call log", () => {
  it("records successes, null fallbacks, and usage per run", async () => {
    const { calls } = await withModelCallLog(async () => {
      await loggedCall({ kind: "structured", tier: "fast" }, async () => ({ usage: { inputTokens: 10, outputTokens: 2 } }), (value) => value.usage);
      await loggedCall({ kind: "text", tier: "standard" }, async () => null);
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ ok: true, inputTokens: 10, outputTokens: 2 });
    expect(calls[1]).toMatchObject({ ok: false });
  });

  it("is a no-op outside a run", async () => {
    await expect(loggedCall({ kind: "text", tier: "fast" }, async () => "ok")).resolves.toBe("ok");
  });
});
