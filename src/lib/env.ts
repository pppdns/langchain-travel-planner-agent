import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_SESSION_POOLER_DATABASE_URL: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ROUTE_STATE_RUNTIME: z.enum(["fake", "live", "replay"]).default("fake"),
  DEMO_DISABLED: z.enum(["true", "false"]).default("false"),
  UPLOADS_DISABLED: z.enum(["true", "false"]).default("false"),
  REPLAY_ONLY: z.enum(["true", "false"]).default("false"),
  DAILY_BUDGET_CENTS: z.coerce.number().default(1000),
  SESSION_BUDGET_CENTS: z.coerce.number().default(80),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  MODEL_FAST: z.string().default("openai/gpt-5.6-luna"),
  MODEL_STANDARD: z.string().default("openai/gpt-5.6-terra"),
  MODEL_REASONING: z.string().default("openai/gpt-5.6-sol"),
  MODEL_VISION: z.string().default("openai/gpt-5.6-luna"),
  MODEL_EMBEDDING: z.string().default("openai/text-embedding-3-small"),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
  VERCEL_ENV: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SESSION_POOLER_DATABASE_URL: process.env.SUPABASE_SESSION_POOLER_DATABASE_URL,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ROUTE_STATE_RUNTIME: process.env.ROUTE_STATE_RUNTIME,
    DEMO_DISABLED: process.env.DEMO_DISABLED,
    UPLOADS_DISABLED: process.env.UPLOADS_DISABLED,
    REPLAY_ONLY: process.env.REPLAY_ONLY,
    DAILY_BUDGET_CENTS: process.env.DAILY_BUDGET_CENTS,
    SESSION_BUDGET_CENTS: process.env.SESSION_BUDGET_CENTS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    MODEL_FAST: process.env.MODEL_FAST,
    MODEL_STANDARD: process.env.MODEL_STANDARD,
    MODEL_REASONING: process.env.MODEL_REASONING,
    MODEL_VISION: process.env.MODEL_VISION,
    MODEL_EMBEDDING: process.env.MODEL_EMBEDDING,
    EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}

export function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export function isForcedFakeRuntime(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export function hasLiveModelCredentials(env: AppEnv = getEnv()): boolean {
  return Boolean(env.AI_GATEWAY_API_KEY || env.OPENAI_API_KEY);
}

export function isLiveModelsEnabled(): boolean {
  return !isForcedFakeRuntime() && resolveRuntimeMode() === "live" && hasLiveModelCredentials();
}

export function resolveRuntimeMode(): "fake" | "live" | "replay" {
  if (isForcedFakeRuntime()) return "fake";
  const env = getEnv();
  if (env.DEMO_DISABLED === "true" || env.REPLAY_ONLY === "true" || isPreviewDeployment()) {
    return env.ROUTE_STATE_RUNTIME === "live" && env.REPLAY_ONLY !== "true" && env.DEMO_DISABLED !== "true"
      ? "replay"
      : env.ROUTE_STATE_RUNTIME === "live"
        ? "replay"
        : env.ROUTE_STATE_RUNTIME;
  }
  return env.ROUTE_STATE_RUNTIME;
}
