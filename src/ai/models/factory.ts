import { openai } from "@ai-sdk/openai";
import { embed, embedMany, generateText, streamText, Output, type EmbeddingModel, type LanguageModel } from "ai";
import { getEnv, hasLiveModelCredentials, type AppEnv } from "@/src/lib/env";
import type { ModelTier } from "@/src/ai/graph/state";
import { loggedCall, recordModelCall } from "@/src/ai/models/call-log";
import { configureTracing } from "@/src/ai/observability/tracing";

configureTracing();

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

export function toOpenAiModelId(modelId: string): string {
  return modelId.includes("/") ? modelId.slice(modelId.indexOf("/") + 1) : modelId;
}

export function languageModel(tier: Exclude<ModelTier, "embedding">, env: AppEnv = getEnv()): LanguageModel {
  const modelId = resolveModelId(tier, env);
  if (env.AI_GATEWAY_API_KEY) return modelId;
  return openai(toOpenAiModelId(modelId));
}

export function embeddingModel(env: AppEnv = getEnv()): EmbeddingModel {
  const modelId = resolveModelId("embedding", env);
  if (env.AI_GATEWAY_API_KEY) return modelId;
  return openai.embedding(toOpenAiModelId(modelId));
}

export function canCallLiveModels(env: AppEnv = getEnv()): boolean {
  return hasLiveModelCredentials(env);
}

export function routeModelTier(task: "scope" | "extract" | "supervise" | "research" | "rank" | "critique" | "vision" | "present") {
  if (task === "vision") return "vision" as const;
  if (task === "rank" || task === "critique") return "reasoning" as const;
  if (task === "supervise" || task === "research" || task === "present") return "standard" as const;
  return "fast" as const;
}

export async function generateStructured<T>(params: {
  tier: Exclude<ModelTier, "embedding">;
  schema: import("zod").ZodType<T>;
  system: string;
  prompt: string;
  timeoutMs?: number;
  /** Span name in traces. */
  name?: string;
}): Promise<{ output: T; usage?: { inputTokens?: number; outputTokens?: number } } | null> {
  if (!canCallLiveModels()) return null;
  return loggedCall({ kind: "structured", tier: params.tier }, () => generateStructuredUnlogged(params), (value) => value.usage);
}

async function generateStructuredUnlogged<T>(params: {
  tier: Exclude<ModelTier, "embedding">;
  schema: import("zod").ZodType<T>;
  system: string;
  prompt: string;
  timeoutMs?: number;
  /** Span name in traces. */
  name?: string;
}): Promise<{ output: T; usage?: { inputTokens?: number; outputTokens?: number } } | null> {
  try {
    const result = await generateText({
      model: languageModel(params.tier),
      system: params.system,
      prompt: params.prompt,
      output: Output.object({ schema: params.schema }),
      telemetry: { functionId: params.name ?? `structured_${params.tier}` },
      abortSignal: AbortSignal.timeout(params.timeoutMs ?? 20_000),
      maxRetries: 1,
    });
    return {
      output: result.output as T,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
    };
  } catch {
    return null;
  }
}

export async function generatePlainText(params: {
  tier: Exclude<ModelTier, "embedding">;
  system: string;
  prompt: string;
  timeoutMs?: number;
  /** Span name in traces. */
  name?: string;
}): Promise<string | null> {
  if (!canCallLiveModels()) return null;
  let usage: { inputTokens?: number; outputTokens?: number } | undefined;
  return loggedCall(
    { kind: "text", tier: params.tier },
    async () => {
      try {
        const result = await generateText({
          model: languageModel(params.tier),
          system: params.system,
          prompt: params.prompt,
          abortSignal: AbortSignal.timeout(params.timeoutMs ?? 20_000),
          maxRetries: 1,
          telemetry: { functionId: params.name ?? `text_${params.tier}` },
        });
        usage = { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens };
        return result.text.trim() || null;
      } catch {
        return null;
      }
    },
    () => usage,
  );
}

export function streamPlainText(params: {
  tier: Exclude<ModelTier, "embedding">;
  system: string;
  prompt: string;
  timeoutMs?: number;
  /** Span name in traces. */
  name?: string;
}) {
  const started = Date.now();
  return streamText({
    model: languageModel(params.tier),
    system: params.system,
    prompt: params.prompt,
    abortSignal: AbortSignal.timeout(params.timeoutMs ?? 25_000),
    maxRetries: 1,
    telemetry: { functionId: params.name ?? `stream_${params.tier}` },
    onFinish: ({ totalUsage }) =>
      recordModelCall({
        kind: "stream",
        tier: params.tier,
        ok: true,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        latencyMs: Date.now() - started,
      }),
    onError: () => recordModelCall({ kind: "stream", tier: params.tier, ok: false, latencyMs: Date.now() - started }),
  });
}

export async function embedTexts(values: string[]) {
  if (!values.length || !canCallLiveModels()) return [];
  const result = await embedMany({
    model: embeddingModel(),
    values,
    maxParallelCalls: 4,
    maxRetries: 1,
  });
  return result.embeddings;
}

export async function embedQuery(value: string) {
  if (!canCallLiveModels()) return null;
  return loggedCall({ kind: "embed", tier: "embedding" }, () => embedQueryUnlogged(value));
}

async function embedQueryUnlogged(value: string) {
  try {
    const result = await embed({
      model: embeddingModel(),
      value,
      abortSignal: AbortSignal.timeout(8_000),
      telemetry: { functionId: "embed_query" },
      maxRetries: 1,
    });
    return result.embedding;
  } catch {
    return null;
  }
}
