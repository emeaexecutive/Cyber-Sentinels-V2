# EPIC 17.1B — Database Map

## Tables

| Table | Ownership and relationships | Purpose | Normal-user access |
| --- | --- | --- | --- |
| `identity_subjects` | UUID PK; `enterprise_id`; creator; tenant-scoped external-reference uniqueness | Minimal subject identity without raw external identifiers | Enterprise read; owner/admin/reviewer insert |
| `identity_verification_requests` | UUID PK; enterprise + subject composite FK; operation-scoped idempotency; correlation UUID | Stable verification request and replay boundary | Enterprise read; owner/admin/reviewer insert |
| `identity_provider_capabilities` | UUID PK; nullable enterprise scope for global defaults or tenant overrides; scoped provider/signal uniqueness | Repository provider support and configuration requirements | Global defaults plus enterprise-scoped read; service-only mutation |
| `identity_provider_transactions` | UUID PK; enterprise + request composite FK; provider event/transaction uniqueness | One normalized provider execution record per signal | Enterprise read; server-only write |
| `identity_signal_evidence` | UUID PK; enterprise + subject/request/transaction composite FKs | Normalized signal status, digests, provenance, reasons, risk and confidence | Enterprise read; server-only write |
| `identity_confidence_results` | UUID PK; enterprise + subject/request composite FKs; one result per request | Versioned provisional confidence result | Enterprise read; server-only write |
| `identity_audit_events` | UUID PK; tenant relationships; append-only trigger | Actor, correlation, event type and safe metadata | Enterprise read; server-only append |

## Required signal states

`identity_signal_evidence.signal_status` is constrained to:

```text
PASS
FAIL
INCONCLUSIVE
UNAVAILABLE
UNSUPPORTED
BLOCKED
ERROR
PENDING
```

`PASS` describes accepted evidence quality. It is not an authorization decision and does not independently mean the subject is verified.

## Idempotency and uniqueness

- API replay: unique `(enterprise_id, operation, idempotency_key)`.
- Provider event: unique `(enterprise_id, provider_id, provider_event_id, signal_type)` when present.
- Provider transaction: unique `(enterprise_id, provider_id, provider_transaction_id, signal_type)` when present.
- Evidence event: unique `(enterprise_id, provider_id, provider_event_id, signal_type)` when present.
- Subject external reference: unique by enterprise, subject type, and digest when present.

## RLS and grants

All seven tables have RLS enabled. Anonymous access is revoked. Enterprise reads use `user_can_access_trust_workspace(enterprise_id)`. Only owner/admin/reviewer roles may directly insert subjects or verification requests, with `created_by`/`requested_by = auth.uid()`. Transaction, evidence, confidence, audit, and capability mutation remain service-role controlled. The audit trigger rejects updates and deletes for every role, including accidental service-path mutation.

## Data minimization

The schema has no raw payload, raw proof, client secret, webhook secret, document, or biometric column. `payload_hash` and `source_digest` accept SHA-256 format only. `normalized_value` is restricted by application allowlisting and `provenance` records source and mapping version.

## Deployment state

These files prove repository intent only. Until the migrations and policies are inspected in the target Supabase project, deployed migration and Production RLS state remain `BLOCKED_BY_EXTERNAL_CONFIGURATION`.
