import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-run record of model calls. The model helpers return `null` on any failure and the graph
 * silently falls back to deterministic logic, so evals need this log to tell "the model answered"
 * apart from "the fallback answered". It also carries real token usage for cost assertions.
 */
export type ModelCallRecord = {
  kind: "structured" | "text" | "stream" | "agent" | "embed";
  tier: string;
  ok: boolean;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
};

const storage = new AsyncLocalStorage<ModelCallRecord[]>();

export async function withModelCallLog<T>(fn: () => Promise<T>): Promise<{ result: T; calls: ModelCallRecord[] }> {
  const calls: ModelCallRecord[] = [];
  const result = await storage.run(calls, fn);
  return { result, calls };
}

export function recordModelCall(record: ModelCallRecord) {
  storage.getStore()?.push(record);
}

/** Times `fn` and records it. `fn` returning null counts as a failed (fallback) call. */
export async function loggedCall<T>(
  meta: Pick<ModelCallRecord, "kind" | "tier">,
  fn: () => Promise<T>,
  usageOf?: (value: NonNullable<T>) => { inputTokens?: number; outputTokens?: number } | undefined,
): Promise<T> {
  const started = Date.now();
  try {
    const value = await fn();
    recordModelCall({ ...meta, ok: value != null, latencyMs: Date.now() - started, ...(value != null ? usageOf?.(value as NonNullable<T>) : {}) });
    return value;
  } catch (error) {
    recordModelCall({ ...meta, ok: false, latencyMs: Date.now() - started });
    throw error;
  }
}
