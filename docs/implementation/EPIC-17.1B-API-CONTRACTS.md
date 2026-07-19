# EPIC 17.1B — API Contracts

## Common enterprise contract

Enterprise routes require an authenticated Supabase session and a valid `X-Enterprise-Id` header resolved against workspace ownership or membership. Mutation routes require owner, admin, or reviewer. Caller-supplied enterprise IDs in JSON bodies are rejected.

Responses include `schemaVersion`, `ok`, and `correlationId`. Successful responses also include `generatedAt`. Errors use stable `code` and safe `error` fields. A valid caller `X-Correlation-Id` is retained; otherwise the server generates a UUID.

## Routes

| Method and route | Authorization | Request | Result |
| --- | --- | --- | --- |
| `POST /api/identity/subjects` | owner/admin/reviewer | JSON subject type, optional label and external reference | `201` normalized subject; external reference is HMAC-digested |
| `POST /api/identity/verifications` | owner/admin/reviewer | `Idempotency-Key`, subject UUID, signals, purpose, bounded signal inputs | `202` new partial/completed request; `200` exact replay; `409` body mismatch |
| `GET /api/identity/verifications/:id` | enterprise member | Verification UUID | Tenant-scoped request, transactions, evidence, and confidence |
| `GET /api/identity/subjects/:id/signals` | enterprise member | Subject UUID | Tenant-scoped normalized evidence history |
| `GET /api/identity/subjects/:id/confidence` | enterprise member | Subject UUID | Latest versioned provisional confidence |
| `GET /api/identity/providers` | enterprise member | None | Repository capability rows plus evidence-gated runtime truth |
| `GET /api/identity/providers/health` | enterprise member | None | Safe provider health without secret values |
| `POST /api/providers/hopae/callback` | signed provider callback | Exact raw body and Hopae signature | Idempotent signed processing and normalized bridge |
| `POST /api/providers/world-id/callback` | rate-limited callback | Bounded JSON | `501`, `INCONCLUSIVE`, zero confidence, never verified |

## Verification idempotency

`Idempotency-Key` is mandatory and must contain 8–160 characters. The request digest covers subject, deduplicated requested signals, purpose, and canonicalized signal inputs.

- Same tenant + operation + key + body returns the persisted prior response.
- Same tenant + operation + key with a different body returns `IDEMPOTENCY_CONFLICT` and HTTP 409.
- A concurrent unique-key race re-reads the winner and applies the same comparison.

## Stable provider result

Each normalized signal contains:

```text
providerId, signalType, status, outcome,
serverVerified, signatureVerified,
providerEventId, providerReference, providerTransactionId, providerRequestId,
confidence, riskScore, riskFlags, reasonCodes,
observedAt, expiresAt, normalizedValue, payloadHash, sourceDigest, provenance
```

Provider timeouts and exceptions become persisted zero-confidence `UNAVAILABLE` or `ERROR` evidence. They do not abort remaining signals.

## Important semantics

- `PASS` is evidence quality, not identity authorization.
- A Hopae session creation is `PENDING`, not verified.
- A World ID proof receipt is always `INCONCLUSIVE` until server verification is implemented.
- API output is provisional identity evidence and cannot bypass the authoritative Trust Decision path.
