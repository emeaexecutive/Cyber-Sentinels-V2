# Sprint 16.1B implementation

Sprint 16.1B extends the existing Release 1 provider and trust pipeline. It does not add a second trust engine, database, dashboard, authorization path, or raw-evidence vault.

## Delivered

- Permanent provider-neutral contracts, typed safe errors, callback security, deterministic evidence IDs, telemetry, health contracts, and a server-controlled adapter service under `lib/providers`.
- Hopae Connect adapter with strict sandbox/production validation, Basic-auth server client, bounded timeout, safe-method retries, response validation, documented callback parsing, normalized evidence, and health checks.
- Session creation records a provider execution before the upstream request. Hopae eID selection is deployment-controlled with `HOPAE_PROVIDER_ID`.
- Authenticated session retrieval reuses `GET /api/trust/execute`, derives scope from the retained server session, rate-limits polling, and prevents terminal-state regression.
- `POST /api/providers` retains exact raw bytes only in memory, enforces JSON and 256KB limits, verifies Hopae HMAC before parsing, stores a SHA-256 digest, reserves a unique replay key, and processes duplicates idempotently.
- One migration extends existing provider execution and Hopae tables and adds governed registry, state audit, health snapshots, and provider-neutral normalized evidence. The wrapper RPC commits normalized evidence and the existing RC1 Replay/Evidence Graph/Trust Memory/Trust Decision path in one transaction.
- Existing `/api/providers`, `/api/trust/execute`, and `/admin/provider-status` ownership is preserved. `PATCH /api/providers` is admin-gated for audited registry state changes.
- Mocked PAL/Hopae tests, static RLS denial tests, and an explicit opt-in sandbox harness were added.

## Truth boundary

No live sandbox test was run in this implementation because credentials were absent. Mocked tests prove local behavior, not Hopae availability. A provider cannot be described as production-ready until the migration is applied, registry enablement is audited, target credentials exist, a real health check and signed callback complete, deployment RLS tests pass, and evidence is reviewed.
