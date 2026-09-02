# Route State

Public graph-first travel planner used as an AI engineering showcase.

## Tech stack

Next.js 16 App Router, TypeScript, Tailwind v4, LangGraph.js, LangChain.js, Supabase, Vitest, Playwright.

## Project structure

- `src/ai/graph` shared spec, state, ranking, compiled graph
- `src/ai/stream` public event protocol
- `src/ai/runtime` run, replay, budget
- `src/features/workspace` Orchestration Atlas UI
- `app/api/trips` create, snapshot, run, images
- `data/travel` synthetic catalog
- `langflow/route-state.json` non-runtime viewer artifact
- `docs/` architecture, security, evaluation, runbook

## Commands

```sh
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
```

## Conventions

- Graph node IDs stay in `src/ai/graph/spec.ts` and must match LangFlow + atlas + fixtures.
- Stream only allowlisted public events. Never prompts, secrets, or chunk bodies.
- Resume uses `Command({ resume })`.
- Send message deltas only. Do not append the client transcript to the checkpointer.
- Default runtime is deterministic/fake so CI and the public demo stay alive.

## Documentation

- `README.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/evaluation.md`
- `docs/runbook.md`
- `.ulpi/design/DESIGN.md`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
