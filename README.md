# Route State

A public, no-signup travel planner whose **Orchestration Atlas** is the live LangGraph execution path.

Open the app, click **Warm family beach in Europe**, choose a destination, and watch the same interrupted thread resume into an itinerary. If live AI is unavailable, the same journey plays as a labeled recorded run.

This is a hiring showcase, not authoritative travel advice. The corpus is primarily synthetic.

## What it demonstrates

- LangGraph supervisor + subgraphs + human interrupt/resume
- Typed public event stream for a graph-first UI
- Hybrid RAG over a checked-in travel corpus
- Owner-bound anonymous Supabase tenancy
- Atomic demo budget + replay fallback
- Safe image policy and BotID abuse controls

## Recruiter path

1. Open `/`
2. Start the family-beach starter
3. Inspect a graph node
4. Optional: `/case-study` and `/replay/family-beach-europe`

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
