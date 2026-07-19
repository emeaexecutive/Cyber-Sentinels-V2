# EPIC 17.1 — Identity Signal Engine Implementation Report

**Implementation date:** 2026-07-19

**Baseline:** `main` at `df1c53f`
**Decision:** IMPLEMENTED WITH EXTERNAL BLOCKERS

## Executive outcome

The repository now contains a provider-neutral, tenant-scoped Identity Signal Engine with additive storage, strict RLS, authenticated APIs, idempotent orchestration, truthful provider states, provisional confidence, operator UI, provider callback paths, tests, API documentation, configuration register, and production runbook.

No hosted migration, provider configuration, credential, Vercel setting, production data, or direct deployment action was performed. Consequently, repository implementation is complete for the defined local scope, while live Supabase isolation and live provider behavior remain externally blocked.

## Delivered architecture

- Seven new logical stores: subjects, verification requests, provider capabilities, provider transactions, normalized signal evidence, confidence results, and append-only audit events.
- Enterprise ownership references `trust_workspaces`; authorization is resolved through `trust_workspaces` and `workspace_members`.
- Every tenant-facing query includes `enterprise_id`; all new browser writes are revoked and runtime writes use the service role only after session and membership authorization.
- `X-Enterprise-Id` is a selector, not authority. Body-supplied enterprise IDs are rejected.
- Verification requests require an idempotency key and deterministic request digest. Same-key/different-body use fails with HTTP 409, including concurrent uniqueness races.
- Only successful, server-verified evidence contributes to confidence. Inconclusive, blocked, unavailable, client-reported, and unsupported evidence contributes zero.
- Confidence is explicitly advisory and never an authorization decision.

## Provider delivery

### Hopae Connect

The existing adapter, strict configuration inspection, signed callback verification, timestamp tolerance, idempotent webhook ledger, upstream evidence retrieval, normalized persistence, and Trust Decision integration are preserved. The new engine can start the canonical governed Hopae workflow when explicit workflow context is supplied. Session creation remains inconclusive. After the established signed callback path accepts evidence quality, a bridge updates the linked identity signal and recomputes provisional confidence.

Status: IMPLEMENTED, BLOCKED BY CREDENTIALS / EXTERNAL CONFIGURATION for live operation.

### World ID

The existing safe proof-shape endpoint is preserved. A canonical callback endpoint now returns HTTP 501 with `INCONCLUSIVE`, zero confidence, and `serverVerified: false`. No proof can become verified without a real server exchange.

Status: PARTIALLY IMPLEMENTED, BLOCKED BY EXTERNAL CONFIGURATION.

### Other signals

Device context records a bounded HMAC digest when `SECURITY_HASH_SECRET` exists, but remains non-verifying. Email, phone, IP reputation, network anonymity, and geolocation have explicit disabled adapters that persist blocked evidence and limitations.

Status: PARTIALLY IMPLEMENTED for device context; MISSING provider integrations for the remainder.

## API delivery

Implemented:

- `POST /api/identity/subjects`
- `POST /api/identity/verifications`
- `GET /api/identity/verifications/:id`
- `GET /api/identity/subjects/:id/signals`
- `GET /api/identity/subjects/:id/confidence`
- `GET /api/identity/providers`
- `GET /api/identity/providers/health`
- `POST /api/providers/hopae/callback`
- `POST /api/providers/world-id/callback`
- `GET /api/health/identity-signals`

The provider callback aliases bypass browser-session middleware only for POST; their route handlers enforce provider-specific fail-closed behavior. All `/api/identity/*` routes authenticate independently.

## UI delivery

- `/dashboard/identity`: workspace-scoped subjects, request activity, counts, and explicit schema-deployment empty state.
- `/dashboard/identity/verifications/:id`: status, evidence, provider transactions, reason codes, and confidence.
- `/dashboard/identity/providers`: provider/signal implementation and runtime truth matrix.

The UI does not synthesize demo evidence when the migration is absent.

## Security and privacy decisions

- No raw identity proof, identity document, biometric, access token, client secret, webhook secret, IP address, or external reference is stored in the new schema.
- External references use a tenant-bound HMAC and are rejected when the stable secret is absent.
- Provider capability rows contain secret names only.
- Identity audit events are append-only.
- Public health output exposes state categories, not secrets.
- Rate and payload-size limits protect mutation and callback routes.

## External blockers and residual gaps

1. The migration has not been applied to hosted Supabase; live RLS behavior is not claimed.
2. Hopae cannot be called live without approved credentials, registry enablement, callback registration, and sandbox validation.
3. World ID has no official server verification exchange in this repository.
4. Email, phone, IP reputation, VPN/proxy/Tor, and geolocation providers are not selected or implemented.
5. Device context is client-reported continuity context, not attestation or identity verification.
6. The separate CS-ENG-002 legacy `teams` / `team_members` broad-RLS finding remains a production release blocker even though EPIC 17.1 does not use those tables.
7. No CI workflow exists in the repository; local gates passed but automated branch enforcement remains absent.

## Files and evidence

- Migration: `supabase/migrations/202607190001_identity_signal_engine.sql`
- Runtime: `lib/identity-signals/*`
- APIs: `app/api/identity/*`, provider callbacks, identity health
- UI: `app/dashboard/identity/*`
- Tests: `tests/identity-signals*.mjs`, `tests/rls/identity-signals.test.mjs`
- API reference: `docs/api/identity-signal-engine.md`
- Provider matrix, external configuration register, test report, and production runbook accompany this report.

## Final classification

**IMPLEMENTED WITH EXTERNAL BLOCKERS** is the only supportable classification. Repository functionality and local quality gates are present; production readiness cannot be declared until the hosted migration, live isolation tests, credentials/configuration, provider validation, and separate legacy RLS blocker are resolved.
