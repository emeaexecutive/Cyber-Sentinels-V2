# EPIC 17.1B — Identity Signal Engine Runtime

Status: implemented in repository source; deployment and live-provider proof remain external evidence gates.

Date: 2026-07-19

## Outcome

EPIC 17.1B turns the existing Identity Signal Engine baseline into a typed, timeout-safe runtime. It adds forward-only schema hardening, tenant-safe relationships, operation-scoped idempotency, provider event/transaction uniqueness, normalized evidence fields, the required signal-status vocabulary, explicit provider contracts, partial completion, and `identity-confidence-v1` contradiction handling.

## Database implementation

The baseline migration `202607190001_identity_signal_engine.sql` creates all seven required tables. The additive `202607190002_identity_signal_runtime.sql` preserves migration history and adds:

- `(enterprise_id, operation, idempotency_key)` uniqueness;
- provider event and provider transaction uniqueness per signal;
- composite tenant foreign keys preventing cross-enterprise relationships;
- provider, request, signal, subject, audit, and status indexes;
- `signal_status`, signature verification, provider references, payload hash, normalized value, and provenance fields;
- contradiction count persistence;
- authenticated insert policies for owner/admin/reviewer subject and request creation;
- continued service-role-only callback, evidence, transaction, capability mutation, confidence, and audit writes.

Raw provider payloads, proofs, documents, credentials, and biometric material are not stored. Only allowlisted normalized values and SHA-256 digests are permitted.

## Runtime implementation

`lib/identity-signals/types.ts` now defines subjects, requests, capabilities, transactions, signal evidence, confidence, audit events, reason codes, provider health, callback input, and the complete provider adapter contract.

`IdentitySignalOrchestrator` performs trusted-context validation, request hashing, operation-scoped replay, concurrent-key conflict handling, provider capability evaluation, provider health gating, timeout isolation, safe error normalization, transaction/evidence persistence, partial completion, confidence calculation, audit persistence, and stable response construction.

Provider output includes provider and signal identifiers, status, server/signature verification, provider references, event/transaction/request IDs, confidence, risk fields, reason codes, timestamps, normalized value, payload hash, and provenance.

## Provider results

- Hopae continues to use the EPIC 17.1A signed callback path. A created session remains `PENDING`; only signed, retrieved, normalized, server-verified callback evidence becomes `PASS` and contributes confidence.
- World ID remains `INCONCLUSIVE`, `serverVerified=false`, zero confidence, with `WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED`.
- Device context remains non-verifying and zero-confidence even when privacy-safe hashing is configured.
- Registry-only providers remain blocked, unavailable, or unsupported and never activate from credentials alone.

## Confidence behavior

`identity-confidence-v1` accepts positive contribution only when evidence is `PASS`, signature-verified, server-verified, and has a verified outcome. World ID, placeholders, pending sessions, provider errors, timeouts, and client context contribute zero positive score. Each contradiction applies a 15-point penalty and is persisted through reason codes and `contradiction_count`. No eligible evidence returns `INSUFFICIENT_EVIDENCE`.

## Evidence boundary and blockers

Repository tests do not prove that migrations are deployed, RLS is active in Production, credentials are complete, or a live provider transaction succeeds. Supabase Production migration/RLS state and live Hopae evidence remain blocked pending authoritative runtime verification. World ID requires a real server exchange before enablement.
