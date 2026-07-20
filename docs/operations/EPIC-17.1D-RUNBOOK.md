# EPIC 17.1D Runbook

## Preflight

Use Node 22 or the repository-supported runtime. Install locked dependencies, run `npm run verify:17.1d`, and inspect the generated report. Apply the forward-only migration in a non-production Supabase project first. Confirm all seven tables have RLS, anonymous privileges are absent, authenticated writes are absent, and service-role RPC execution is available only to the trusted server.

## Provider checks

For Hopae, configure the existing credentials and webhook secret through the deployment secret store. Send a documented signed sandbox delivery and verify: accepted envelope, request hash, one normalized evidence object, one canonical event, and a matching integrity response. Repeat the same delivery and confirm `DUPLICATE` with no additional evidence or event. Change the bytes without changing the event ID and confirm HTTP 409.

For World ID, confirm every response and event remains `INCONCLUSIVE`, confidence 0, `serverVerified=false`, and carries `WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED`. Confirm placeholders return `BLOCKED_PROVIDER` and create no evidence or event.

## Incident handling

On signature or timestamp rejection, retain only the envelope digest and disposition; do not log the body or signature. On `CHAIN_CONTENTION_RETRY_EXHAUSTED`, pause ingestion for that tenant, inspect the chain head and recent audit records, and retry the provider delivery without changing its idempotency reference. On an integrity failure, block downstream Replay/decision consumption, preserve the database and audit logs, and escalate; never update or delete the accepted event.

## Rollout and rollback

Deployment is production-only after all gates pass, but this implementation does not deploy. The migration is forward-only. Application rollback may stop new canonical ingestion; database rollback must be a new reviewed migration and must not destroy accepted history. Vercel, Cloudflare and Supabase deployment controls remain `BLOCKED_BY_EXTERNAL_CONFIGURATION` until directly evidenced.

Run the launcher with `./Launch-Verify-EPIC-17.1D.ps1`; use `-NoPause` in CI.
