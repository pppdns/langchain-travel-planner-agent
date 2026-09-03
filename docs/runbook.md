# Operator runbook

Environment flags:

- `DEMO_DISABLED=true` stops new live runs.
- `REPLAY_ONLY=true` forces golden fixtures.
- `UPLOADS_DISABLED=true` blocks image uploads.
- `DAILY_BUDGET_CENTS` is the UTC spend ceiling.

If live models fail or the budget is exhausted, starters play recorded runs with an honest banner.

`ROUTE_STATE_RUNTIME=live` only turns on live models. Trip create/run persistence uses Supabase Postgres via `SUPABASE_SESSION_POOLER_DATABASE_URL`. Vercel isolates do not share the in-memory map, so that pooler URL is required in production.

Optional: enable [Anonymous sign-ins](https://supabase.com/dashboard/project/_/auth/providers) and set `SUPABASE_SERVICE_ROLE_KEY` so Auth-backed RLS sessions work too.

To turn on live models, pgvector retrieval, AI SDK token streaming, and Open-Meteo weather:

```sh
# .env.local
ROUTE_STATE_RUNTIME=live
OPENAI_API_KEY=...
# or AI_GATEWAY_API_KEY=...
SUPABASE_SESSION_POOLER_DATABASE_URL=...

pnpm generate:corpus
pnpm seed:corpus
```

Vitest and Playwright stay on the fake graph even if the env file says live.

Preview deployments should stay on `ROUTE_STATE_RUNTIME=fake` or `replay`.

Rollback: disable the production deployment, set `DEMO_DISABLED=true`, and keep `/replay/family-beach-europe` available.
