# V1 API exact-SHA Staging deployment manifest

This manifest prepares an isolated Staging proof. It does not authorize a deployment, migration, Production access, or promotion.

## Candidate identity

- Expected branch: `feat/authority-runtime-evidence`
- Expected commit: `<NEW_CLEAN_COMMIT_SHA>`
- API contract version: `2026-08-29`
- Vercel target: isolated Preview or custom Staging environment
- Required Supabase project ref: `agpyhygpfmppjkxwcpac`
- Explicitly forbidden Supabase project ref: `kecgtsfibkypjuaxqbjx`
- Health route: `GET /api/health`
- Readiness route: `GET /api/ready`

## Required closure migrations

Apply only after the target project ref is independently verified as Staging. Never apply these from this local consolidation run.

1. `20260828165913_close_public_api_security_contract.sql`
2. `20260829094528_harden_public_api_rate_limit_isolation.sql`
3. `20260829164824_close_public_api_customer_zero.sql`

The first migration expands the existing API-key scope constraint for client evidence and makes public-client evidence append-only. The second makes the rate-limit primary key explicitly tenant/client isolated and replaces the atomic service-role function accordingly. The third adds bounded authority-administration metadata, atomic/retry-safe API-key rotation, authority grant/revoke RPCs, canonical REVIEW linkage/resolution RPCs, immutable review history/events, a read-only readiness probe, and supporting indexes. They reuse existing API-key, evidence, Trust Contract, canonical transaction, review, audit, and event stores.

All three are forward hardening migrations. They contain no table drop, bulk delete, data rewrite, or Production operation. Rollback should be a reviewed forward recovery: stop V1 traffic, preserve authority/review/audit history, restore the prior constraint/function definitions only after checking that new scopes and composite rate-limit rows are compatible. Never delete recorded authority, review, evidence, transaction, Replay, or audit history as rollback.

## Environment variables by name only

Application/Staging:

- `CYBER_SENTINELS_ENVIRONMENT`
- `CYBER_SENTINELS_PUBLIC_ORIGIN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_KEY_PEPPER`
- `API_KEY_ROTATION_SECRET`
- `API_EXECUTION_SIGNING_SECRET`
- `PUBLIC_API_WEBHOOK_URL`
- `PUBLIC_API_WEBHOOK_SECRET`
- `TURNSTILE_MODE`
- `TURNSTILE_EXPECTED_HOSTNAME`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Vercel supplies `VERCEL_GIT_COMMIT_SHA`. If Deployment Protection is enabled, provision `VERCEL_AUTOMATION_BYPASS_SECRET` only to the authorized qualification runner.

Customer Zero runner:

- `CYBER_SENTINELS_BASE_URL`
- `CYBER_SENTINELS_API_KEY`
- `CYBER_SENTINELS_STAGING_PROJECT_REF`
- `I_CONFIRM_STAGING` with the exact value `I_CONFIRM_STAGING`
- `STAGING_ENVIRONMENT` with the exact value `staging`
- `STAGING_MIGRATION_HEAD` with the exact value `20260829164824`
- `STAGING_HOSTNAME`
- `SYNTHETIC_FIXTURES` with the exact value `true`
- `VERCEL_AUTOMATION_BYPASS_SECRET` when explicitly approved
- `GAMMA_RUN_ATTACKS` when adversarial proof is requested

## Mandatory pre-mutation stop gate

Every item must pass. Any failure means STOP:

- branch exactly matches this manifest;
- deployed SHA exactly matches the reviewed clean commit;
- Vercel target is Preview/custom Staging, never Production;
- `gitDirty` is false;
- Supabase ref is exactly `agpyhygpfmppjkxwcpac`;
- Supabase ref is not `kecgtsfibkypjuaxqbjx`;
- `/api/health` is healthy and exposes the expected SHA;
- `/api/ready` returns `200 READY` and the same SHA;
- `/api/ready` reports READY for API authentication, canonical persistence, authority, human review, rate limiting, and atomic key rotation;
- the ordered migration ledger is present and reconciled;
- a shown-once test API key is available through a secret channel;
- a synthetic tenant/client and owner/admin authority boundary are confirmed.

## Customer Zero command

After the stop gate passes and the environment variables above are supplied through a secret channel:

```text
npm --prefix examples/agent-gamma install
npm --prefix examples/agent-gamma start
```

The runner refuses Production, requires the exact Staging project confirmation, calls `/api/ready` before mutation, and emits redacted identifiers only.

## Expected proof artifacts

- exact Git SHA, deployment ID/URL, API version, and Supabase ref;
- applied migration versions;
- agent, authority/version, revocation, REVIEW/resolution references;
- ALLOW, DENY, post-revocation DENY transaction/receipt/Replay identifiers;
- correlation identifiers;
- tenant/client isolation, evidence adversarial, rate-limit, and idempotency results;
- bounded performance summary and methodology.

No key, token, private key, signing secret, service-role value, raw evidence, or chain-of-thought belongs in proof artifacts.

## Frozen public endpoint inventory

All authenticated operations use a tenant/client-bound Bearer API key and return private, no-store responses. Cross-tenant/client resources fail as unavailable rather than becoming enumerable.

| Method | Path | Scope | Idempotency | Ownership rule | Success | Main failures |
|---|---|---|---|---|---:|---|
| POST | `/api/v1/agents` | `agents:write` | none | server binds new agent to authenticated tenant/client | 201 | 400, 401, 403, 413, 415, 429, 503 |
| GET | `/api/v1/agents/{agentId}` | `authority:read` | n/a | same tenant/client agent binding | 200 | 401, 403, 404, 429, 503 |
| POST | `/api/v1/agents/{agentId}/credentials` | `agents:write` | none | same tenant/client agent binding | 201 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| POST | `/api/v1/agents/{agentId}/manifest` | `agents:write` | none | same tenant/client agent binding | 201 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| POST | `/api/v1/agents/{agentId}/challenge` | `agents:verify` | none; challenge is single-use | same tenant/client agent binding | 201 | 400, 401, 403, 404, 409, 429, 503 |
| POST | `/api/v1/agents/{agentId}/proof` | `agents:verify` | consumed challenge rejects replay | same tenant/client agent, credential, manifest, audience | 200 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| GET | `/api/v1/agents/{agentId}/authority` | `authority:read` | n/a | current projection for same tenant/client agent | 200 | 401, 403, 404, 429, 503 |
| GET | `/api/v1/agents/{agentId}/authorities` | `authority:read` | n/a | immutable history for same tenant/client agent | 200 | 401, 403, 404, 429, 503 |
| POST | `/api/v1/agents/{agentId}/authorities` | `authority:write` | version-conflict protected | owner/admin key, same tenant/client agent, persisted management boundary | 201 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| GET | `/api/v1/agents/{agentId}/authorities/{authorityId}` | `authority:read` | n/a | same tenant/client agent and authority version | 200 | 401, 403, 404, 429, 503 |
| POST | `/api/v1/agents/{agentId}/authorities/{authorityId}/revoke` | `authority:write` | monotonic revocation | owner/admin key, same tenant/client agent and authority | 200 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| GET | `/api/v1/agents/{agentId}/trust-state` | `authority:read` | n/a | same tenant/client agent | 200 | 401, 403, 404, 429, 503 |
| POST | `/api/v1/trust/decisions` | `trust:request` | required `Idempotency-Key`; same key/body returns same transaction | same tenant/client agent; current authority resolved server-side | 201 or 200 replay | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| GET | `/api/v1/reviews/{reviewReference}` | `review:read` | n/a | review must originate from same tenant/client transaction | 200 | 401, 403, 404, 429, 503 |
| POST | `/api/v1/reviews/{reviewReference}/resolve` | `review:write` | terminal resolution is immutable | owner/admin/reviewer and same tenant/client review | 200 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| POST | `/api/v1/evidence` | `evidence:write` | deterministic event conflict protection | subject must be same tenant/client agent | 201 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| GET | `/api/v1/trust/transactions/{transactionId}` | `trust:read` | n/a | transaction actor must be authenticated client in tenant | 200 | 401, 403, 404, 429, 503 |
| GET | `/api/v1/trust/transactions/{transactionId}/receipt` | `trust:read` | n/a | same tenant/client transaction | 200 | 401, 403, 404, 429, 503 |
| GET | `/api/v1/trust/transactions/{transactionId}/replay` | `trust:read` | n/a | same tenant/client transaction | 200 | 401, 403, 404, 429, 503 |
| POST | `/api/v1/trust/transactions/{transactionId}/outcomes` | `outcomes:write` | digest duplicate protection | same tenant/client transaction and approved self source | 201 | 400, 401, 403, 404, 409, 413, 415, 429, 503 |
| GET | `/api/v1/openapi.json` | public metadata | n/a | no customer record access | 200 | 500, 503 |

The OpenAPI document covers all 20 authenticated operations. Its own discovery route is the sole unauthenticated V1 metadata endpoint.
