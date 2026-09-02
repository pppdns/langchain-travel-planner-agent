# Security

- Anonymous Supabase sessions with owner-bound RLS on `trips`, `messages`, `preferences`, and `trip_images`.
- Message and image metadata writes are server-mediated. Clients cannot insert evidence or spend records.
- `rag`, `internal`, `langgraph`, and `ops` are not on the Data API.
- `public.rls_auto_enable()` execute is revoked from `anon` and `authenticated`.
- Checkpoints are private. Every resume path re-checks trip ownership in application code.
- Vercel BotID gates trip creation, runs, and uploads. It is not a substitute for RLS or spend limits.
- Image uploads accept JPEG/PNG/WebP scenery only. Identity and booking documents are rejected.
- Public events are allowlisted. Prompts, secrets, OCR, and chunk bodies never leave the server.
