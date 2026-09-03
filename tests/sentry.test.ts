import { describe, expect, it } from "vitest";
import { isSentryEnabled } from "@/src/lib/sentry";

const production = {
  NODE_ENV: "production",
  SENTRY_DSN: "https://example@o0.ingest.sentry.io/1",
} satisfies NodeJS.ProcessEnv;

describe("Sentry stays off except production", () => {
  it("enables only with a DSN in production", () => {
    expect(isSentryEnabled(production)).toBe(true);
    expect(isSentryEnabled({ ...production, SENTRY_DSN: undefined })).toBe(false);
  });

  it("stays off in development", () => {
    expect(isSentryEnabled({ ...production, NODE_ENV: "development" })).toBe(false);
  });

  it("stays off in tests and Playwright", () => {
    expect(isSentryEnabled({ ...production, NODE_ENV: "test" })).toBe(false);
    expect(isSentryEnabled({ ...production, VITEST: "true" })).toBe(false);
    expect(isSentryEnabled({ ...production, PLAYWRIGHT: "1" })).toBe(false);
  });

  it("stays off on Vercel preview", () => {
    expect(isSentryEnabled({ ...production, VERCEL_ENV: "preview" })).toBe(false);
    expect(isSentryEnabled({ ...production, NEXT_PUBLIC_VERCEL_ENV: "preview" })).toBe(false);
  });
});
