# API P0 Production promotion closure

This is an operator plan, not deployment authorization. The repository run that produced it did not deploy, apply a migration, access Production, commit, push, stage files, or merge.

## Exact candidate and target controls

- Build and qualify one clean commit from `feat/authority-runtime-evidence`; record its full SHA before deployment.
- The only approved database qualification target is Supabase ref `agpyhygpfmppjkxwcpac` (Staging, EU West Paris).
- Ref `kecgtsfibkypjuaxqbjx`, `cybersentinels.com`, and `www.cybersentinels.com` are refused by the automated live guard.
- Set `STAGING_ENVIRONMENT=staging`, `CYBER_SENTINELS_STAGING_PROJECT_REF=agpyhygpfmppjkxwcpac`, `STAGING_MIGRATION_HEAD=20260829164824`, `SYNTHETIC_FIXTURES=true`, and `I_CONFIRM_STAGING=I_CONFIRM_STAGING`. There are no target/hostname/confirmation fallbacks.
- Verify `/api/health` and `/api/ready` expose the exact deployed SHA before any Customer Zero mutation. `/api/ready` must prove API authentication, canonical persistence, authority, human review, rate limiting, and atomic API-key rotation.

## Migration application plan

Apply only to the independently verified Staging ref, in this order:

1. `20260828165913_close_public_api_security_contract.sql`
2. `20260829094528_harden_public_api_rate_limit_isolation.sql`
3. `20260829164824_close_public_api_customer_zero.sql`

Preconditions: backup/PITR status observed in the Supabase control plane; migration ledger reconciled; no unexpected long-running transaction; required existing tables/functions present; service-role access available through an approved secret channel; application traffic can be stopped. The closure migration adds columns/indexes and replaces service-only functions. It does not drop business tables or delete history. Creating indexes and altering constraints can lock the affected API-key/review tables, so apply in a quiet window and stop if lock wait, statement timeout, replica lag, error rate, or connection saturation exceeds the approved operational threshold.

After each migration, record version and duration. After the final migration, call the read-only `public_api_readiness_v1()` through `/api/ready`; verify RLS denial tests, exact function grants, tenant/client isolation, and API-key rotation concurrency/retry cases. Do not proceed on a partial ledger or a readiness warning.

## Rollback and forward recovery

Application rollback is the first response: stop V1 mutation traffic and restore the last known-good exact SHA. Do not delete canonical transactions, evidence, review history, Replay events, authority history, API-key audit history, or rate-limit records.

Database recovery is forward-only unless the database owner approves a compatibility-proven reversal before traffic. For a failed transaction, PostgreSQL rolls back that migration transaction. For a committed migration with application failure, keep the additive schema, restore the application, and ship a reviewed forward repair. If API-key rotation is implicated, disable the developer mutation route, retain both lineage rows and audit evidence, and revoke affected active keys through the approved server path; never attempt to recover raw keys from storage. If review/authority functions are implicated, stop their write routes while preserving reads and append-only history.

Restore validation requires: exact migration ledger, `/api/ready=READY`, tenant A/B and client Alpha/Beta isolation, one safe rotation and retry, one canonical transaction/receipt/Replay read, current authority read, review read, and audit/observability confirmation. Escalation owners are the release owner (application), database owner (schema/recovery), and security owner (credential or evidence concern).

## Authentication and anti-abuse configuration

On the exact hosted Staging project, record screenshots or control-plane evidence (without values) for Supabase Site URL, exact callback/recovery redirect allowlist, email confirmation, JWT/session settings, and SMTP or Supabase-managed email delivery. Execute sign-up confirmation, login, logout, expired session, password reset request/callback, and cross-tenant denial using synthetic identities.

Use environment-specific Turnstile site/secret keys and an exact Staging hostname. Keep `TURNSTILE_MODE=live` unless the explicitly documented Preview-only Cloudflare test pair is used. Verify valid, invalid, missing, replayed, wrong-hostname, timeout, and provider-outage behavior. Turnstile is abuse resistance, never identity or authority proof. No hosted setting is considered proven by repository source alone.

## Customer Zero and adversarial proof

Run `examples/agent-gamma` only after the stop gate. It covers readiness, registration, Ed25519 credential/Manifest/challenge/proof, authority grant/history, ALLOW, governed REVIEW and immutable resolution, fresh post-review evaluation, DENY, receipt, canonical Replay, outcome classification, revocation, and post-revocation DENY. Enable the bounded attack branch for challenge replay and wrong-key proof. Add explicit tenant A/B, client Alpha/Beta, foreign identifier, expired/revoked/wrong-scope key, evidence/provider/digest spoofing, sequential/concurrent idempotency, concurrent atomic rate-limit, and rotation retry/concurrency evidence.

## Observability, performance, and secrets

Correlate request ID, correlation ID, API client ID, route class, stable reason code, latency, decision, authority/review reference, and exact application SHA. Never log bearer/API/service-role/access/refresh tokens, passwords, raw evidence, private keys, raw one-time secrets, SMTP credentials, or internal reasoning. Alert on readiness failure, authentication/authorization denial spikes, 5xx/429 rate, migration/DB errors, rotation conflicts, review/authority failures, provider outage, and anomalous latency.

Use `npm run perf:api-v1` only against local/Preview/Staging. It is bounded to 20 iterations and concurrency 5 and refuses Production hosts. It measures authentication/agent read, authority retrieval, decision evaluation+persistence, transaction confirmation, receipt, Replay, and optional review retrieval with p50/p95/p99. Agent registration, authority grant/revocation, and review-resolution latency are recorded by the one-shot Customer Zero runner. Retain methodology, sample count, concurrency, target class, exact SHA, and timestamp; make no Production SLO claim from this baseline.

Run `npm run security:secrets:scoped` immediately before handoff. It scans tracked and nonignored release text, reports file/line/classification without values, distinguishes real candidates from test fixtures/examples, and fails on real candidates.

## Exact-SHA promotion procedure

1. Create a clean commit only after human review of the explicit release file set.
2. Deploy that exact SHA to isolated Preview/Staging and verify platform target, Supabase ref, migration ledger, runtime environment names, health/readiness SHA, auth/SMTP/Turnstile configuration, and secret availability by name only.
3. Run Customer Zero, adversarial/isolation/RLS suites, bounded performance, dashboard/API parity, SDK consumer qualification, logs review, and recovery rehearsal. Retain sanitized evidence.
4. Obtain named release, database, and security approvals. Any failed mandatory gate is NO-GO.
5. Immediately before Production, compare the approved SHA, migration checksums/order, dependency lock, OpenAPI/SDK version, required environment-variable names, and release evidence. Refuse drift.
6. Promotion, Production migration, and Production smoke are separate authorized human actions. Canary/limited traffic first where supported; watch readiness, errors, latency, auth, DB, rate limits, rotation, authority, and reviews.
7. Post-deploy smoke: health/readiness exact SHA, login/reset, safe API authentication denial, one approved synthetic/canary read path, dashboard canonical truth, and no secret-bearing logs. Stop/rollback the application on any critical regression and use the forward-recovery plan for schema.

Local completion can establish `READY_FOR_COMMIT`. Only exact-SHA hosted Staging evidence can establish `READY_FOR_EXACT_SHA_STAGING`, and only the named human approvals plus a successful Production change window can authorize promotion.
