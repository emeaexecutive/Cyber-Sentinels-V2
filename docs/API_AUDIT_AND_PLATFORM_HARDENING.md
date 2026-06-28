# API Audit and Platform Hardening

## Audit scope

This pass reviewed provider registration and normalization, `/api/trust/*`,
`/api/replay/*`, `/api/receipts/*`, `/api/governance/*`,
`/api/workflows/*`, and `/api/providers`. It also reviewed replay, receipts,
the deterministic workflow trust engine, and validation-lab claims.

The audit does not certify third-party uptime or accuracy. “Active” means the
repository has a connected code path and required configuration is present.

## Provider status

| Provider | Implementation | Failure behavior | Auth | Replay / receipt |
| --- | --- | --- | --- | --- |
| World ID | Placeholder proof intake; provider exchange not connected | Returns `501`, never a verified result | Supabase session | Not connected |
| Stripe Identity | Placeholder for identity verification; Stripe billing is separate | Safely disabled without workflow setup | Not publicly exposed | Not connected |
| Persona | Future adapter placeholder | No provider call | Not exposed | Not connected |
| Entrust | Future adapter placeholder | No provider call | Not exposed | Not connected |
| Cloudflare Turnstile | Active on protected public forms when configured | Production forms fail safely when missing or invalid | Server-side form verification | Not trust-replay evidence |
| Fingerprint / device risk | Placeholder signal | No provider call | Not exposed | Not connected |
| Hopae Connect | Active only when explicitly enabled and all server credentials exist | Safely disabled otherwise | Server-side integration | Normalized evidence |

`GET /api/providers` is session-protected and reports these implementation
states without returning environment-variable names, credentials, provider
payloads, or secrets.

## Normalized provider output

Provider adapters return a stable, bounded structure:

- `verification_state`
- `identity_confidence`
- `provider_signal`
- `evidence_summary`
- `governance_recommendation`

Additional session confidence, evidence reference, and risk-flag fields remain
available for compatibility. Missing confidence now defaults to a neutral `50`;
a provider state never invents high confidence. Credential-like references are
filtered and secret-like text is redacted.

## API status and protection

- Operational posture, workflow, replay, receipt, governance, and provider
  endpoints require a Supabase session and use the caller’s RLS-bound client.
- Legacy Trust API computation endpoints use `TRUST_API_KEY`. Missing
  configuration fails closed in production and remains development-only
  outside production.
- Trust alerts and certifications are always owner-scoped in their general API.
  Allowlisted email status no longer grants an implicit broad-data bypass.
- Operational API responses use field allowlists. Raw receipt evidence
  snapshots are used server-side for normalization and removed before response.
- Errors return stable, generic messages rather than database or provider
  details.

## Replay integrity

Replay remains canonical operational trust evidence. The replay API resolves a
replay session before loading its subject chronology, then returns ordered
timeline events, evidence summaries, governance lineage, normalized provider
evidence, trust posture, and linked receipts. It does not return raw provider
outputs.

## Receipt portability

Receipts include deterministic integrity checks, normalized provider evidence,
governance lineage, and a replay reference only when a replay session exists.
Absent replay is represented as `not_available`; the API does not manufacture a
link. Portable receipts remain evidence summaries, not claims of cryptographic
or absolute truth.

## Trust engine audit

The workflow trust engine is deterministic and exposes dimension weights,
signal explanations, evidence references, score deltas, governance actions,
authorization continuity, and state snapshots.

Direction handling is now explicit: a `decrease` always subtracts the absolute
signal magnitude and an `increase` always adds it. Scores remain bounded from
zero to 100. Governance can restrict or approve workflow outcomes, and provider
evidence remains one weighted input rather than an automatic decision.

No statistical decay model is implemented. Time-based posture uses explicit
freshness checkpoints and reverification windows; it should not be described as
learned prediction.

## Validation lab

The protected lab labels controlled scenarios as simulations and rule-based
checks. Provider-backed evidence is counted only when attached to workflow
evidence. Placeholders and configured-but-unverified adapters are now explicitly
identified as unvalidated capabilities.

## Platform hardening notes

- World ID no longer returns success for an unverified placeholder exchange.
- Provider output defaults no longer imply unsupported confidence.
- Evidence references and summaries are bounded and scrubbed for common
  credential patterns.
- Production Trust APIs fail closed when their API key is absent.
- Provider status distinguishes implementation from configuration.
- Receipt replay links represent actual replay availability.

## Future provider roadmap

Before enabling a placeholder adapter, add a server-side exchange, tenant scope,
timeouts, bounded retries, signed webhook validation, idempotency, normalized
evidence persistence, replay linkage, receipt linkage, health monitoring, and
provider-specific tests. Live benchmarking and accuracy claims require separate
representative validation; configuration alone is never sufficient.

