import { registerTelemetry } from "ai";
import { RunTree } from "langsmith/run_trees";
import { LangSmithTelemetry } from "langsmith/experimental/vercel";
import { traceable } from "langsmith/traceable";

/**
 * LangSmith tracing for live runs.
 *
 * - LangGraph nodes are traced by `@langchain/core` callbacks when `LANGSMITH_TRACING=true`.
 * - AI SDK calls (generateText / streamText / tool calls) are traced through the AI SDK 7
 *   telemetry hook, nested under whatever LangSmith run is active.
 * - `LANGSMITH_AGENT_ID` + `LANGSMITH_AGENT_ENVIRONMENT` (or `LANGSMITH_PROJECT`) choose where runs land;
 *   the SDK reads them directly.
 *
 * Traces hold prompts and model output, so they only go to a private LangSmith workspace.
 * They are never part of the public event stream.
 */
export function isTracingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PLAYWRIGHT === "1" || env.VITEST === "true" || env.NODE_ENV === "test") return false;
  const flag = env.LANGSMITH_TRACING ?? env.LANGCHAIN_TRACING_V2;
  return flag === "true" && Boolean(env.LANGSMITH_API_KEY ?? env.LANGCHAIN_API_KEY);
}

let configured = false;

/** Call once per process. Turns tracing fully off when it should not run (tests, Playwright, no key). */
export function configureTracing(env: NodeJS.ProcessEnv = process.env): boolean {
  const enabled = isTracingEnabled(env);
  if (configured) return enabled;
  configured = true;
  if (!enabled) {
    // LangChain reads these env vars lazily; force them off so `.env.local` cannot leak test runs into LangSmith.
    env.LANGSMITH_TRACING = "false";
    env.LANGCHAIN_TRACING_V2 = "false";
    return false;
  }
  registerTelemetry(LangSmithTelemetry());
  return true;
}

export type TraceMeta = {
  threadId: string;
  requestKind: string;
  starterId?: string;
  liveModels: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

/** Wrap one unit of agent work in a named LangSmith run (no-op when tracing is off). */
export function withTrace<T>(name: string, meta: TraceMeta, fn: () => Promise<T>): Promise<T> {
  if (!configureTracing()) return fn();
  const traced = traceable(fn, {
    name,
    run_type: "chain",
    tags: [meta.liveModels ? "live" : "fake", ...(meta.tags ?? [])],
    metadata: {
      // `thread_id` groups turns of one trip into a LangSmith thread.
      thread_id: meta.threadId,
      request_kind: meta.requestKind,
      starter_id: meta.starterId,
      ...meta.metadata,
    },
  });
  return traced();
}

/** Wait for pending trace batches. Call from `after()` on serverless so traces are not lost. */
export async function flushTraces(): Promise<void> {
  if (!isTracingEnabled()) return;
  const { awaitAllCallbacks } = await import("@langchain/core/callbacks/promises");
  await Promise.allSettled([awaitAllCallbacks(), RunTree.getSharedClient().awaitPendingTraceBatches()]);
}
