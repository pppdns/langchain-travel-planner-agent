/**
 * PromptFoo provider that runs the real compiled LangGraph, one or more turns per test case.
 *
 * vars:
 *   starter     starter id (seeds the trip like the UI starter cards)
 *   message     first free-text user message (used when no starter)
 *   resume      "first" | <catalog slug>: answer a pending destination interrupt
 *   followUps   string[]: more user messages on the same thread
 * provider config:
 *   mode        "fake" (deterministic graph, $0) | "live" (real models)
 *
 * Output is the text the user would see on the last turn. Metadata carries the graph facts
 * (route, stage, candidates, itinerary) plus a model-call log so assertions can catch silent
 * fallbacks to the deterministic path.
 */
import { randomUUID } from "node:crypto";
import type { ApiProvider, CallApiContextParams, ProviderResponse } from "promptfoo";
import { loadLocalEnv } from "../scripts/load-local-env";

loadLocalEnv();

type Mode = "fake" | "live";
type Vars = {
  starter?: string;
  message?: string;
  resume?: string;
  followUps?: string[] | string;
};

export default class RouteStateProvider implements ApiProvider {
  private readonly mode: Mode;

  constructor(options: { id?: string; config?: { mode?: Mode } } = {}) {
    this.mode = options.config?.mode ?? "fake";
  }

  id() {
    return `route-state-graph:${this.mode}`;
  }

  async callApi(_prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    const vars = (context?.vars ?? {}) as Vars;
    const live = this.mode === "live";
    if (live && !process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
      return { error: "Live evals need AI_GATEWAY_API_KEY or OPENAI_API_KEY (e.g. in .env.local)." };
    }

    // Import after env is loaded so model + tracing config see it.
    const [{ runTripGraph }, { applyStarterSeed }, { streamLivePresentation }, { withModelCallLog }, tracing] =
      await Promise.all([
        import("../src/ai/runtime/public-run"),
        import("../src/ai/contracts/starters"),
        import("../src/ai/models/live"),
        import("../src/ai/models/call-log"),
        import("../src/ai/observability/tracing"),
      ]);
    type StarterId = Parameters<typeof applyStarterSeed>[0];

    const threadId = `eval-${randomUUID()}`;
    const testId = String(context?.test?.description ?? "case");
    const traceTags = ["eval", `eval:${this.mode}`];
    const started = Date.now();

    const run = () =>
      tracing.withTrace(
        "eval_case",
        {
          threadId,
          requestKind: "eval",
          starterId: vars.starter,
          liveModels: live,
          tags: traceTags,
          metadata: { eval_case: testId },
        },
        async () => {
          const turns: Array<{ route?: string }> = [];
          const step = (request: Parameters<typeof runTripGraph>[0]["request"], existing?: Parameters<typeof runTripGraph>[0]["existing"]) =>
            runTripGraph({ threadId, request, existing, liveModels: live, traceTags });

          let result = vars.starter
            ? await step(
                { kind: "starter", starterId: vars.starter as StarterId, idempotencyKey: randomUUID() },
                applyStarterSeed(vars.starter as StarterId),
              )
            : await step({ kind: "message", text: String(vars.message ?? ""), idempotencyKey: randomUUID() });
          turns.push({ route: result.supervisorRoute });

          if (vars.resume && result.interrupted && result.tripState.pendingInterrupt) {
            const pending = result.tripState.pendingInterrupt;
            const value = vars.resume === "first" ? (pending.options[0]?.id ?? "") : vars.resume;
            result = await step({ kind: "resume", interruptId: pending.interruptId, value, idempotencyKey: randomUUID() });
            turns.push({ route: result.supervisorRoute });
          }

          const followUps = typeof vars.followUps === "string" ? [vars.followUps] : (vars.followUps ?? []);
          for (const text of followUps) {
            result = await step({ kind: "message", text, idempotencyKey: randomUUID() });
            turns.push({ route: result.supervisorRoute });
          }

          // Live mode: the user sees the streamed "operations brief" when the graph hands one over.
          let output = result.assistantText;
          if (live && result.livePresentation) {
            const streamed = streamLivePresentation(result.livePresentation);
            const text = (await streamed.text).trim();
            if (text) output = text;
          }
          return { result, output, turns };
        },
      );

    try {
      const { result: run_, calls } = await withModelCallLog(run);
      const { result, output, turns } = run_;
      const trip = result.tripState;
      const inputTokens = calls.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0);
      const outputTokens = calls.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0);
      await tracing.flushTraces();
      return {
        output,
        latencyMs: Date.now() - started,
        tokenUsage: { prompt: inputTokens, completion: outputTokens, total: inputTokens + outputTokens, numRequests: calls.length },
        metadata: {
          mode: this.mode,
          threadId,
          route: result.supervisorRoute,
          routes: turns.map((turn) => turn.route),
          stage: trip.currentPlanningStage,
          destinationSlug: trip.destinationSlug,
          candidates: trip.candidateDestinations.map((item) => item.slug),
          itineraryDays: trip.itinerary?.days.length ?? 0,
          interrupted: result.interrupted,
          interruptType: trip.pendingInterrupt?.interruptType,
          options: trip.pendingInterrupt ? trip.pendingInterrupt.options.map((option) => option.label) : trip.guidedOptions,
          modelCalls: calls.length,
          failedModelCalls: calls.filter((call) => !call.ok).length,
          // True when a live model call failed and the graph silently used the rule-based path.
          // (Zero calls is legitimate: e.g. the scope guard rejects off-topic input before any model runs.)
          fellBack: live && calls.some((call) => !call.ok),
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}
