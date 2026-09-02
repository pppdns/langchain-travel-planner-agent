import { ChatOpenAI } from "@langchain/openai";
import { getEnv, type AppEnv } from "@/src/lib/env";
import type { ModelTier } from "@/src/ai/graph/state";

export function resolveModelId(tier: ModelTier, env: AppEnv = getEnv()): string {
  switch (tier) {
    case "fast":
      return env.MODEL_FAST;
    case "standard":
      return env.MODEL_STANDARD;
    case "reasoning":
      return env.MODEL_REASONING;
    case "vision":
      return env.MODEL_VISION;
    case "embedding":
      return env.MODEL_EMBEDDING;
  }
}

export function createGatewayModel(tier: Exclude<ModelTier, "embedding">) {
  const env = getEnv();
  const apiKey = env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new ChatOpenAI({
    model: resolveModelId(tier, env),
    apiKey,
    configuration: env.AI_GATEWAY_API_KEY
      ? { baseURL: "https://ai-gateway.vercel.sh/v1" }
      : undefined,
    timeout: tier === "reasoning" ? 45_000 : 20_000,
    maxRetries: 1,
  });
}

export function routeModelTier(task: "scope" | "extract" | "supervise" | "research" | "rank" | "critique" | "vision") {
  if (task === "vision") return "vision" as const;
  if (task === "rank" || task === "critique") return "reasoning" as const;
  if (task === "supervise" || task === "research") return "standard" as const;
  return "fast" as const;
}
