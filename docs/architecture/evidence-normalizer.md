# Evidence normalizer

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

Evidence normalization converts source-specific observations into a stable, attributed representation. It does not prove that a claim is true and does not authorize an action.

The codebase currently has two complementary paths:

- `lib/core/evidence-normalizer.ts` creates generic `NormalizedTrustEvidence` projections for platform views; and
- `lib/providers/evidence-normalizer.ts`, provider signal mapping and callback security create provider-attributed `NormalizedIdentityEvidence`.

They are not yet one universal immutable envelope.

## Canonical target envelope

| Blueprint field | Target meaning | Current representation |
| --- | --- | --- |
| Evidence ID | Stable immutable event identifier | `id`, `evidenceId` or deterministic `idempotencyKey` depending on path |
| Source | Source system/category | `source` or `sourceType` |
| Provider | Registered external provider | `provider` or `providerId`; generic evidence may omit it |
| Timestamp | Source observation time | `timestamp` or `observedAt` |
| Confidence | Bounded confidence with a declared scale | Generic `confidence` is 0..1; provider assurance is categorical and must not be silently converted |
| Evidence Type | Versioned evidence classification | `type`, `kind` or `evidenceType` |
| Verification Status | Source outcome, not platform decision | `outcome` or provider verification state |
| Hash | Digest of canonical source material or immutable object | Provider `sourceDigest` and idempotency hash; absent from generic evidence |
| Metadata | Allowlisted non-secret attributes | `metadata` or provider `attributes` |
| Signature | Signature scheme, key reference and verification result | Callback signature is verified but raw signature is not part of the common stored object |
| Raw Payload Reference | Protected reference when retention is permitted | Not consistently modelled; Hopae deliberately stores no full raw identity payload |

The target envelope must also carry schema version, mapping version, tenant/workspace, trust session or workflow, correlation ID, limitations, observed and expiry times, and source-mode attribution.

## Required normalization sequence

1. Accept bytes plus transport metadata at a trusted server boundary.
2. Enforce body-size, content-type and schema limits.
3. Verify authentication, signature and replay timestamp before treating fields as provider evidence.
4. Parse strictly and reject malformed or unsupported versions.
5. Validate timestamp plausibility and expiry without replacing invalid source time with the current time.
6. Derive a deterministic digest and idempotency key from canonical bytes and stable source identifiers.
7. Detect a duplicate before persistence and return the existing immutable evidence reference.
8. Map only allowlisted fields; redact secrets and bound text, arrays and metadata.
9. Attach provider, mapping version, confidence scale and limitations.
10. Freeze or serialize the canonical object and persist it through the evidence store.

## Current behavior and limitations

The provider path validates Hopae callback signatures and timestamps, computes a SHA-256 source digest, clamps numeric values, allowlists risk flags, redacts secret-like text and creates deterministic idempotency keys. This is the strongest current normalization path.

The generic normalizer supplies defaults, clamps confidence and creates a timestamped projection. It does not itself verify signatures, hash payloads, detect duplicates, reject every malformed timestamp or persist an immutable record. An invalid timestamp can fall back to the current time. It must therefore not be used as the sole security boundary for external evidence.

## Duplicate and mutation rules

- Duplicate source events resolve through provider event ID, provider session ID, evidence type, mapping version and digest.
- A changed mapping produces a new mapping version and new evidence object; it does not rewrite the earlier object.
- Corrections reference the superseded evidence and explain the correction.
- Raw payload retention is exceptional. When policy forbids retention, store a digest and normalized fields, not a fabricated payload reference.
- Conflicting evidence remains separate and is correlated by the Evidence Graph.

## Rejection states

Reject and audit: invalid signature, stale callback, missing required identifiers, unsupported schema or mapping, impossible timestamps, invalid confidence scale, oversized metadata, secret-bearing fields, cross-tenant references and digest mismatch. Provider unavailability is a missing signal, not successful verification.

## Migration criteria

A unified envelope may replace the two current shapes only after compatibility tests cover every consumer, provider fixtures prove deterministic mapping, database uniqueness enforces idempotency, and replay/reporting can read both old and new versions. Until then, adapters must label which normalized shape they produce.
