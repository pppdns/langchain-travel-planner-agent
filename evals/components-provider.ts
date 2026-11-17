/**
 * Component-level PromptFoo provider: evaluates one model-backed step in isolation.
 *
 * config.component:
 *   "extract"  structured extraction (`extractTripFacts`). Output is the extracted JSON.
 *   "route"    the live supervisor's routing decision for one message. Output is the route label.
 *              `vars.starter` (+ `vars.resume`) first builds the trip state with the deterministic
 *              graph, so only the routing call under test uses a model.
 */
import { randomUUID } from "node:crypto";
import type { ApiProvider, CallApiContextParams, ProviderResponse } from "promptfoo";
import { loadLocalEnv } from "../scripts/load-local-env";

loadLocalEnv();

type Component = "extract" | "route";

export default class RouteStateComponentProvider implements ApiProvider {
  private readonly component: Component;
  constructor(options: { config?: { component?: Component } } = {}) {
    this.component = options.config?.component ?? "extract";
  }

  id() {
    return `route-state-component:${this.component}`;
  }

  async callApi(_prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
      return { error: "Component evals need AI_GATEWAY_API_KEY or OPENAI_API_KEY (e.g. in .env.local)." };
    }
    const vars = (context?.vars ?? {}) as { message?: string; starter?: string; resume?: string };
    const message = String(vars.message ?? "");
    const { withModelCallLog } = await import("../src/ai/models/call-log");
    const tracing = await import("../src/ai/observability/tracing");
    const threadId = `eval-${randomUUID()}`;
    const started = Date.now();

    const work = async (): Promise<string> => {
      if (this.component === "extract") {
        const { extractTripFacts } = await import("../src/ai/models/live");
        return JSON.stringify(await extractTripFacts(message));
      }
      const { superviseTurn } = await import("../src/ai/graph/supervise");
      const trip = await setupTrip(vars.starter, vars.resume);
      const result = await superviseTurn(
        { messages: [], trip, inputText: message, inputKind: "message", assistantText: "" },
        { configurable: { thread_id: threadId, liveModels: true } },
      );
      return result.supervisorRoute;
    };

    try {
      const { result: output, calls } = await withModelCallLog(() =>
        tracing.withTrace(
          `eval_${this.component}`,
          { threadId, requestKind: "eval", liveModels: true, tags: ["eval", `eval:${this.component}`], metadata: { eval_case: context?.test?.description } },
          work,
        ),
      );
      await tracing.flushTraces();
      const prompt = calls.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0);
      const completion = calls.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0);
      return {
        output,
        latencyMs: Date.now() - started,
        tokenUsage: { prompt, completion, total: prompt + completion, numRequests: calls.length },
        metadata: {
          threadId,
          modelCalls: calls.length,
          fellBack: calls.length === 0 || calls.some((call) => !call.ok),
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}

/** Build the trip state a routing case starts from, using the deterministic graph (no model calls). */
async function setupTrip(starter?: string, resume?: string) {
  const { emptyTripState } = await import("../src/ai/graph/state");
  if (!starter) return emptyTripState();
  const { runTripGraph } = await import("../src/ai/runtime/public-run");
  const { applyStarterSeed } = await import("../src/ai/contracts/starters");
  const { getTripState } = await import("./trip-state");
  type StarterId = Parameters<typeof applyStarterSeed>[0];
  const threadId = `eval-setup-${randomUUID()}`;
  let result = await runTripGraph({
    threadId,
    request: { kind: "starter", starterId: starter as StarterId, idempotencyKey: randomUUID() },
    existing: applyStarterSeed(starter as StarterId),
  });
  const pending = result.tripState.pendingInterrupt;
  if (resume && result.interrupted && pending) {
    const value = resume === "first" ? (pending.options[0]?.id ?? "") : resume;
    result = await runTripGraph({
      threadId,
      request: { kind: "resume", interruptId: pending.interruptId, value, idempotencyKey: randomUUID() },
    });
  }
  return getTripState(threadId);
}
