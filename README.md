# Route State

A public, no-signup travel planner whose **Orchestration Atlas** is the live LangGraph execution path.

Open the app, click **Warm family beach in Europe**, choose a destination, and watch the same interrupted thread resume into an itinerary. For a second interrupt, start **City break, food and culture, under 1500 EUR**, pick a place, then choose whether to protect the budget or the packed pace. If live AI is unavailable, the same journey plays as a labeled recorded run.

This is a hiring showcase, not authoritative travel advice. The corpus is primarily synthetic.

## What it demonstrates

- LangGraph supervisor + subgraphs + two human interrupt/resume points
- Typed public event stream for a graph-first UI
- Hybrid RAG over a checked-in travel corpus, with evidence titles in the thread
- Node-scoped tool authorization and session preference memory
- Itinerary revision on the same checkpointed thread
- Owner-bound anonymous Supabase tenancy
- Atomic demo budget + replay fallback, with Fake / Live / Recorded labeled in the header
- Safe scenery-image policy and BotID abuse controls

## Recruiter path

1. Open `/`
2. Start the family-beach starter
3. Inspect a graph node and the trip brief
4. Optional: city-break starter for the tradeoff interrupt
5. Optional: `/case-study` and `/replay/family-beach-europe`

Built by Denes Papp.

## Stack

Next.js App Router, LangGraph.js, LangChain.js, Supabase, Vercel AI SDK stream contract, Vercel BotID, React Flow.

## Setup

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
```

See `docs/architecture.md`, `docs/security.md`, and `docs/evaluation.md`.
