# EPIC 17.1A — Runtime Hardening and Resilient Audit

Status: implemented in repository source; production provider and platform controls remain evidence-gated.

Date: 2026-07-19

## Outcome

EPIC 17.1A replaces the fail-fast CS-ENG-002 audit with an independent staged runner and hardens identity-provider truth at API and persistence boundaries. Registration and configuration are no longer treated as proof of provider availability or identity verification.

## Runtime changes

- `lib/providers/capability-truth.ts` defines the ordered provider capability vocabulary: `REGISTERED`, `CONFIGURED`, `AVAILABLE`, `TRANSACTIONAL`, `SIGNED`, `SERVER_VERIFIED`, `DEGRADED`, `DISABLED`, and `BLOCKED`.
- `app/api/identity/providers/route.ts` derives capability states from tenant-scoped transactions, normalized evidence, execution records, provider configuration, registry health, signatures, and idempotency evidence.
- `lib/identity-signals/repository.ts` provides the tenant-scoped runtime-evidence query used by the provider API.
- `lib/providers/hopae-rc1-server.ts` emits deterministic Hopae reason codes and rejects both duplicate events and distinct events for a completed provider transaction.
- World ID callback, verification, adapter, and health paths return `INCONCLUSIVE`/`BLOCKED`, zero confidence, `serverVerified: false`, and `WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED` until a real server exchange exists.
- Registry-only and incomplete adapters expose an unavailable, blocked, or inconclusive state with a reason code and zero positive confidence.
- `lib/operations/external-control-truth.ts` defines the operational evidence vocabulary and preserves external controls as `BLOCKED_BY_EXTERNAL_CONFIGURATION` without direct evidence.

## Audit changes

`scripts/audit-cs-eng-002.ps1` now runs repository validation, Git checks, dependency installation, lint, type-check, unit tests, integration tests, security tests, build, production dependency audit, and all requested inventories as independent stages. Each stage catches exceptions, retains combined stdout/stderr in a dedicated log, and contributes to one final exit code after report generation.

The audit remains read-only with respect to deployments, external configuration, and database migration application. Environment-variable inventory records names only; the secret scan suppresses matched values.

## Verification coverage

- Existing provider-abstraction tests cover valid, forged, expired, and future-dated Hopae HMAC signatures plus deterministic callback idempotency.
- Existing Hopae tests cover callback contract and fail-closed behavior.
- `tests/identity-runtime-hardening.test.mjs` covers capability ordering, complete Hopae evidence gates, placeholder zero-confidence behavior, World ID false-positive prevention, external-control blocking, required Hopae reason codes, and the completed-transaction guard.
- `tests/audit-runner-resilience.test.mjs` injects a critical lint failure and proves that later stages and report generation still run, combined stderr is retained, CI does not pause, and exit code 2 is selected only at the end.

## Evidence boundary

Repository tests prove source behavior. They do not prove Hopae credentials, a live signed transaction, Vercel dashboard policy, Cloudflare controls, deployed Supabase migration state, or Production RLS. Those claims remain blocked until captured from the authoritative runtime or control plane.

## Remaining work

- Implement and independently test the World ID server verification exchange before enabling it.
- Capture a live Hopae signed callback and persisted evidence chain in the target environment.
- Verify Vercel, Cloudflare, and Supabase controls through authenticated platform evidence.
- Replace the authenticated-wide `teams`/`team_members` policies with a later tenant-scoped migration; the repository dry audit retains this as a critical source blocker.
