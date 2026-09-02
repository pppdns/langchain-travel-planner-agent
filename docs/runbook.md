# Operator runbook

Environment flags:

- `DEMO_DISABLED=true` stops new live runs.
- `REPLAY_ONLY=true` forces golden fixtures.
- `UPLOADS_DISABLED=true` blocks image uploads.
- `DAILY_BUDGET_CENTS` is the UTC spend ceiling.

If live models fail or the budget is exhausted, starters play recorded runs with an honest banner.

Preview deployments should stay on `ROUTE_STATE_RUNTIME=fake` or `replay`.

Rollback: disable the production deployment, set `DEMO_DISABLED=true`, and keep `/replay/family-beach-europe` available.
