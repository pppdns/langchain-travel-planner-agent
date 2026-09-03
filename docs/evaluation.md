# Evaluation

CI runs deterministic evals only.

```sh
pnpm test
```

Covered:

- scope and injection
- destination fit
- interrupt/resume
- unauthorized tools
- image validation
- spend reservation

Optional LLM-as-judge is a manual command and is not part of `stable` CI.

Live models, pgvector, and Open-Meteo are skipped under Vitest and Playwright (`VITEST=true`, `PLAYWRIGHT=1`, or `x-playwright: 1`). Those suites stay on the deterministic graph.
