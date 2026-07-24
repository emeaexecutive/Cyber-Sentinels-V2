# EPIC 24: Continuous Trust Engine

## 1. Existing architecture discovered

Current `main` contains canonical Trust Events/Replay hash chaining, Enterprise Trust Architecture/Evidence Graph, the authoritative Trust State engine, provider consensus/health, tenant/RLS helpers, and EPIC 19 continuous assessments. The unmerged EPIC 21–23 feature branches were not copied; their production equivalents on `main` were extended.

## 2. Files added

- Signal domain, validation, deterministic evaluator, repository, service, state adapter, alert, review, and override services under `src/lib/continuous-trust`.
- Tenant-safe API routes under `app/api/trust`.
- Dashboard loading/error states.
- One forward migration.
- Four EPIC 24 test files.
- Six operator/domain documents plus this report and the security review.

## 3. Files modified

The existing dashboard, alert transition routes, continuous-trust exports, Trust State evidence-hash compatibility, package scripts, and Vercel Cron configuration were extended. Stable routes remain backward compatible.

## 4. Database migrations

`202607240001_continuous_trust_engine.sql` adds immutable signals, durable processing, policy decisions, failures, manual review/history, alert history, and overrides. It extends existing drift and alert tables and provides transaction functions for ingestion, rejection audit, processing, reviews, overrides, and alerts.

## 5. RLS policies

All new tenant tables enable RLS. Authenticated access is select-only through `user_can_access_trust_workspace(tenant_id)`. Mutation functions are revoked from public/anonymous/authenticated and granted to service role only.

## 6. Signal types implemented

All 21 requested categories and seven entity types are tightly validated. Signals carry source, provider, timing, severity, 0–1 confidence, status, fingerprint, correlation/causation, bounded metadata, and immutable timestamps.

## 7. Processing pipeline

Validation, tenant/entity verification, idempotency, immutable persistence, evidence projection, deterministic policy/drift, canonical recalculation, state evaluation, Replay, alert/review, and result recording are implemented. Transaction boundaries prevent partial ingestion/finalization.

## 8. State machine

The existing authoritative states are preserved. Signal actions map to `CHALLENGED`, `BLOCKED`, or `REVOKED`; evidence-backed recovery remains available through the existing state engine. Arbitrary direct mutation is not introduced.

## 9. Trust Drift rules

Device, fingerprint, location, VPN/proxy, email, document, provider, liveness, deepfake, AI, credential, authority, enterprise policy, repeated failure, shared identifier, evidence disappearance, score reduction, and historical mismatch rules are deterministic and explainable.

## 10. Trust DNA integration

Every signal maps to one or more of the twelve Trust DNA dimensions. Affected dimensions, drift values, confidence, evidence, and reason codes are persisted. The canonical assessment recalculates from current evidence. Dimension-only recalculation remains an extension point because a separate EPIC 22 engine is not present on current `main`.

## 11. Trust Graph integration

Normalized signal evidence is projected into the existing evidence object/reference architecture. Existing graph indexing links it to subject and source. Historical evidence is not deleted.

## 12. Replay integration

Canonical hash-chained events cover accepted/rejected/processed/material signals, continuous assessments/state decisions, reviews, overrides, alert transitions, and existing provider-health changes. Events contain normalized facts and references, not raw sensitive payloads.

## 13. Alert workflow

Existing alerts are extended with signal/policy context. Tenant-safe detail and acknowledge/resolve/dismiss APIs create append-only history, audit, and Replay.

## 14. Manual-review workflow

Requested, assigned, in-review, approved, rejected, and cancelled states are controlled in SQL. Outcomes require reason and actor and append history/audit/Replay.

## 15. Background-processing approach

A transactional Postgres outbox plus Vercel Cron provides bounded five-attempt processing, exponential backoff, `SKIP LOCKED` claiming, observable failures, terminal state, and no request-resident worker.

## 16. Privacy safeguards

Primitive-only bounded metadata and denylisted sensitive keys are enforced in TypeScript and SQL. Provider/system impersonation is denied. Tenant IDs derive from auth. Secrets and service-role credentials remain server-side.

## 17. Tests and results

Focused EPIC 24 result: 18/18 passing. This covers unit rules, malformed/unauthorized/privacy cases, API contracts, tenant/RLS SQL contracts, state controls, provider outage handling, positive-trust escalation prevention, dashboard wiring, and a deterministic 10,000-signal load test. The full repository suite also passes.

## 18. Build results

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS (complete repository suite)
- `npm run build`: PASS (184 static pages plus dynamic routes)
- `npm audit --omit=dev`: PASS (0 vulnerabilities after pinning the Next-compatible runtime image dependency to patched `sharp` 0.35.3)
- Migration validation: static SQL/RLS PASS; live Supabase execution unavailable unless the environment is configured
- Affected production-server smoke: server starts, but protected route/API execution is environment-blocked because this checkout has neither `NEXT_PUBLIC_SUPABASE_URL` nor `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the app fails closed with its existing configuration guard

Node emitted existing `MODULE_TYPELESS_PACKAGE_JSON` notices during direct TypeScript test imports. The local shell runs Node 26 while the repository declares Node 22.x; CI/deployment must continue to use the declared engine. Next also emitted two webpack cache-serialization performance notices during build; compilation and page generation completed successfully.

## 19. Security findings

No service credential reaches client code. Mutation roles are explicit, signal source spoofing is denied, idempotency/replay controls are bounded, append-only history preserves auditability, and the production dependency audit is clear. See `docs/EPIC-24-SECURITY-REVIEW.md`.

## 20. Known limitations

- No OpenAPI specification exists to update.
- Live migration and runtime RLS tests require a configured Supabase test project.
- Authenticated browser E2E requires the missing local Supabase public configuration and a tenant fixture; the unauthenticated local server correctly failed closed instead of rendering invented data.
- The local rate limit is process-scoped; production high-volume ingestion should also use edge/shared quotas.
- Dimension-only Trust DNA recalculation and ML-assisted drift are future extensions.

## 21. Recommended EPIC 25 scope

Add signed provider-to-signal adapters, distributed ingestion quotas, production queue-age/latency metrics, a Supabase-backed RLS integration harness, policy simulation/version UI, retention automation, and validated dimension-selective recalculation. ML candidates should remain advisory until independently calibrated and governed.

EPIC 24 READY
