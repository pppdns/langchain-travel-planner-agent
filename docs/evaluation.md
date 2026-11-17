# Evaluation

There are three layers. Each catches a different kind of regression.

| Layer | Command | Runtime | Cost | Where it runs |
|---|---|---|---|---|
| Unit tests | `pnpm test` | Fake (deterministic) | $0 | CI, every push |
| Graph regression evals | `pnpm eval` | Fake (deterministic) | $0 | CI, every push |
| Live evals | `pnpm eval:live` | Real models plus an LLM judge | about $1–2 per run | Manual, or the `evals-live` GitHub workflow (`workflow_dispatch`) |

The evals use [PromptFoo](https://promptfoo.dev). A custom provider ([`evals/provider.ts`](../evals/provider.ts)) runs the **real compiled LangGraph** for each case:
- seeds a starter or sends a message
- optionally resumes the destination interrupt
- sends follow-up turns on the same thread
- in live mode, streams the final "operations brief" just as the UI does

It returns the user-visible text plus graph facts as metadata: route, stage, candidates, itinerary length, interrupt type, and the model-call log. Assertions can check both what the agent said and what the graph did.

## Eval types

| Type | Suite | What it checks | Assertion style |
|---|---|---|---|
| Deterministic regression | `deterministic.yaml` | Starter → candidates → interrupt → resume → itinerary; tradeoff interrupt; revisions | JS on graph metadata |
| Safety / scope | both | Off-topic requests, direct and embedded prompt injection, booking or payment asks | `not-icontains` on prompt fragments, JS regex, `llm-rubric` |
| Grounding / hallucination | both | Out-of-catalog places (USA, Japan, Thailand), no invented prices | JS check against the catalog ([`evals/assertions/grounded.ts`](../evals/assertions/grounded.ts)), `llm-rubric` |
| Task success (end-to-end) | `live.yaml` | Free-text brief to itinerary; known destination; discovery and choice | JS on metadata (itinerary days, destination), `llm-rubric` |
| Multi-turn | both | Follow-up questions and revisions on the same thread | Metadata plus `llm-rubric` |
| Quality (LLM-as-judge) | `live.yaml` | Helpfulness, specificity, a clear next step | `llm-rubric`, judged by `openai/gpt-5.6-terra` via the AI Gateway |
| Style / format | both | No em-dashes, no "match %", no product or hiring talk, length bounds | `not-contains`, JS regex |
| Component: structured extraction | `components.yaml` | `extractTripFacts`: party size, nights, budget, pace, slug; does not invent fields | `is-json` plus field-level JS |
| Component: routing classification | `components.yaml` | Live supervisor route label for 6 utterances in seeded trip states | `equals` / JS |
| Reliability | live suites | Live mode really used the model and did not silently fall back to rules | `metadata.fellBack === false` |
| Non-functional | `live.yaml` | Latency per case, agent token budget per case | `latency`, JS on `tokenUsage` |

### Why `fellBack` matters
Model helpers in `src/ai/models/factory.ts` return `null` on any error, and the graph then quietly uses its deterministic path. That keeps the public demo alive, but it means an eval could "pass" on the fallback with a broken key. Here is how the evals catch that:
- An AsyncLocalStorage call log ([`src/ai/models/call-log.ts`](../src/ai/models/call-log.ts)) records every model call in a run: success or fallback, tier, token usage, latency.
- Every live case asserts there was no fallback.
- The same log feeds PromptFoo's `tokenUsage`.

## Running

```sh
pnpm eval              # deterministic, no keys, ~2s
pnpm eval:live         # live e2e + components; needs AI_GATEWAY_API_KEY (or OPENAI_API_KEY) in .env.local
pnpm eval:view         # PromptFoo web viewer for the last runs
```

`pnpm eval:live` writes raw output to `evals/output/` (gitignored) and regenerates [`evals/results.md`](../evals/results.md) with [`evals/summarize.ts`](../evals/summarize.ts).

## Reading results
- Live runs are not deterministic. A case can flip between runs, and the judge has its own variance. Read pass rates as a trend.
- Failures are left visible on purpose. Each one is either a real agent issue or a too-strict expectation, and the fix decides which.
- Each case row has a LangSmith thread id. Open LangSmith, filter by `thread_id` or the `eval` tag, and you get the full trace for that case: graph nodes, every LLM call with prompts and tokens, and tool calls.

The first live runs scored 19–20 of 23 and found three real bugs. All three are fixed, each with a unit test, and two later runs passed 23/23:

| Found by | Bug | Fix |
|---|---|---|
| `task: free-text family beach brief` | The live supervisor picked `await_destination` when there were no candidates, so the graph interrupted with an empty choice and never built an itinerary | `repairAwaitDestination` in `supervise.ts` sends that route to `discover` (or `research`) |
| `multi-turn: weather follow-up` | "Is it going to be too hot there for the kids?" matched the "going to <place>" pattern, and the reply said "Be Too Hot There For The Kids" is not in the catalog | `detectOutOfCatalogAsk` in `capability.ts` now rejects phrases that can't be place names |
| `route: revision request`, `route: unknown destination` | The live router answered revision and discovery requests instead of routing them | Clearer routing rules in the router prompt, plus a deterministic safety net: a clear revision of an existing plan always routes to `plan` |

## Tracing (LangSmith)

All three paths are traced: live app runs, live evals, and component evals.
- LangGraph nodes come from `@langchain/core` callbacks.
- AI SDK calls come from the AI SDK 7 telemetry hook (`LangSmithTelemetry`), so LLM spans nest under the active graph node, with token counts and tool calls.
- Setup is in [`src/ai/observability/tracing.ts`](../src/ai/observability/tracing.ts).

Trace shape for one eval case:

```
eval_case                       tags: eval, eval:live · metadata: thread_id, eval_case
└─ trip_turn                    one per user turn
   └─ LangGraph
      ├─ scope_guard
      ├─ gather_preferences ─ extract_trip_facts (llm)
      ├─ route_supervisor
      │  ├─ route_supervisor.react (llm, tools: search_travel_knowledge, lookup_destination_profile, …)
      │  └─ route_supervisor.route (llm, structured output)
      ├─ research_local ─ write_research_copy (llm)
      └─ plan_itinerary / critique_itinerary / present_plan
└─ present_brief (llm, streamed)
```

In the app, `present_brief` streams after the graph returns. It shows up as a sibling run of `trip_turn`, not a child.

Tracing turns on with `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY`. It is forced off under Vitest, Playwright, and `pnpm eval`. Where runs land:
- `LANGSMITH_AGENT_ID` + `LANGSMITH_AGENT_ENVIRONMENT` choose the destination agent and environment, for example `…-local` or `…-production`.
- Without those, runs go to `LANGSMITH_PROJECT`.

The run route flushes pending batches with Next's `after()`, so serverless functions don't drop traces.

## Not included (on purpose)
- PromptFoo red-team generation: plugin-generated attacks at scale. The hand-written injection cases cover the basics for a demo.
- Online evals on production traffic, such as LangSmith online evaluators or feedback scores.
- Repeat runs per case (`--repeat`) for variance estimates. Cheap to add, but they multiply cost.
