# EPIC 17.1 — Production Runbook

## Release gate

Production promotion requires all repository quality gates, an approved additive migration, live tenant-isolation tests, a secrets/configuration review, and resolution of the separate CS-ENG-002 legacy `teams` / `team_members` RLS blocker. A provider may remain disabled without blocking schema deployment, but the UI and APIs must report that state truthfully.

## Deployment sequence

1. Back up the database under the standard release policy and record the recovery point.
2. Review `202607190001_identity_signal_engine.sql`; verify it is additive and targets the intended Supabase project.
3. Apply the migration through the approved migration workflow.
4. Run live RLS tests with two users in distinct workspaces: subject, request, transaction, evidence, confidence, and audit rows must not cross tenant boundaries.
5. Deploy the application without enabling unconfigured providers.
6. Verify authenticated subject creation, verification idempotency, retrieval scope, capability truth, and dashboard empty states.
7. Configure one provider at a time. Hopae must start in sandbox and remain non-production until a signed callback completes the evidence pipeline.

## Health and smoke checks

- `GET /api/health/identity-signals` returns `operational` only when the schema is readable.
- Authenticated `GET /api/identity/providers` returns the seeded capability matrix.
- Authenticated `GET /api/identity/providers/health` returns truthful provider states.
- Repeating an identical `POST /api/identity/verifications` with the same `Idempotency-Key` returns the original request.
- Reusing the key with a changed body returns HTTP 409.
- World ID callback returns HTTP 501, `INCONCLUSIVE`, zero confidence, and `serverVerified: false` until the real exchange is implemented.
- A forged or stale Hopae callback is rejected by the established callback security path.

## Monitoring

Monitor identity request error rate, blocked/unavailable signal rate, provider latency, signature failures, idempotency conflicts, evidence persistence errors, callback bridge warnings, and confidence results with no verified signals. Alert on tenant-scope errors, evidence write failures, or a provider state changing without an audit trail.

Never log request bodies, proof payloads, secrets, stable raw identifiers, IP addresses, or provider identity documents.

## Safe rollback

Application rollback is preferred: deploy the last known-good application while leaving additive tables in place. Disable provider execution through approved provider governance if upstream behavior is unsafe. Do not drop tables during incident response. If a migration fault is confirmed, preserve data and use a reviewed forward-fix migration.

## Disaster recovery

Restore the database to the approved recovery point, reapply additive migrations in order, restore deployment secrets from the secret manager, then verify tenant isolation before serving identity APIs. Provider callbacks received during recovery must be replayed only through provider-supported, signed, idempotent mechanisms.

## Incident triage

1. Contain: disable the affected provider or identity route at the deployment layer.
2. Preserve: retain normalized audit/evidence references; never copy raw identity payloads into incident channels.
3. Scope: identify enterprise, correlation ID, provider session reference, and affected request IDs.
4. Validate: distinguish provider failure from database, configuration, membership, and callback-authentication failure.
5. Recover: use a forward fix, replay only signed/idempotent events, and document the evidence trail.
