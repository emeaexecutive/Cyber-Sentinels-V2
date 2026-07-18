# Evidence storage

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

Evidence storage preserves normalized observations, provenance, continuity and tenant isolation. It is a persistence contract, not a claim that all migration files are deployed.

## Current persistence surfaces

| Surface | Purpose | Current immutability boundary |
| --- | --- | --- |
| `normalized_identity_evidence` | Provider-neutral identity evidence, idempotency key, digest, mapping, attributes and limitations | Insert/read-oriented RLS; no complete database trigger preventing privileged mutation was found |
| `hopae_verifications` and callback events | Provider workflow and normalized callback context | Application functions update workflow state; normalized evidence and digests are retained |
| `evidence_files` and private storage bucket | User-owned evidence-file metadata and protected object access | File records are not a universal append-only event ledger |
| `evidence_chains` | Continuity summaries and snapshots | Tenant-scoped insert/read in the RC1 gate |
| `trust_timeline_events` | Replay and Trust Memory chronology | Database trigger rejects update/delete and creates an append-only boundary |
| `trust_replay_sessions` | Replay session summaries | Tenant-scoped insert/read; exact immutable snapshot enforcement is not universal |
| `verification_receipts` | Portable outcomes and evidence snapshot | Can be enriched by controlled functions; not equivalent to immutable source evidence |

## Permanent evidence record

Each new canonical evidence record should include:

- immutable evidence ID and schema/mapping versions;
- workspace/tenant and owner scope;
- workflow, trust-session and correlation references;
- source and provider attribution;
- observed, received and expiry timestamps;
- verification state and declared confidence scale;
- canonical digest, signature-verification result and signing-key reference;
- normalized allowlisted metadata and limitations;
- protected raw-payload reference only when an approved retention policy permits it; and
- `supersedes_evidence_id` for corrections or reprocessing.

## Immutability and lifecycle

Evidence is event-oriented:

1. Receive and authenticate source material.
2. Normalize and compute a canonical digest.
3. Insert once under a tenant-derived scope and deterministic uniqueness key.
4. Link the record into the Evidence Graph and Replay chronology.
5. Create a new evidence record for re-verification, corrected mappings or changed source state.
6. Mark expiry, revocation, retention tombstone or legal disposition with a new event; do not edit the historical observation.

The blueprint rule that previous evidence is never modified is the **target** for canonical evidence. Current database enforcement is strongest for `trust_timeline_events` but is not proven across every evidence table. Service-role access must not be treated as an exception to application-level immutability.

## Integrity and tamper detection

- Recompute canonical hashes at ingestion and before portable export.
- Preserve digest algorithm and canonicalization version.
- Verify callback signatures before normalization; do not store a boolean success without provider, timestamp and key context.
- Use uniqueness constraints for provider/event/mapping identity.
- Link receipts and chains to evidence digests so missing or substituted records are detectable.
- Treat digest mismatch, impossible chronology and missing tenant lineage as integrity failures requiring review.

The current Hopae path stores a 64-character hexadecimal source digest and no raw identity-provider payload. Evidence-chain and receipt utilities provide continuity checks, but a platform-wide cryptographic chain covering every evidence surface is not yet established.

## Encryption and access

PostgreSQL/storage encryption at rest and transport encryption are deployment controls supplied by the hosting platform; repository source alone does not prove their deployed configuration. Application requirements are:

- TLS for provider and database transport;
- private object buckets and signed, short-lived object access;
- Supabase Auth/JWT validation before tenant derivation;
- RLS for user-facing reads and writes;
- service-role use only in server-only, reviewed paths;
- secret-free normalized metadata and logs; and
- field-level encryption or tokenization for sensitive retained payloads where threat modelling requires it.

## Retention

Retention is classified by evidence type, provider contract, customer policy, legal basis and region. Expiry should stop operational reuse before physical disposition. Privacy deletion is represented by a retention/tombstone event and deletion or irreversible de-identification of data that must not remain. “Append-only” does not authorize indefinite retention of personal data.

## Index strategy

Required access paths are:

- `(workspace_id, created_at desc)` for tenant chronology;
- unique provider/event/idempotency identity;
- `(trust_session_id, observed_at)` and `(correlation_id, observed_at)`;
- source digest for integrity reconciliation;
- expiry/retention timestamp for disposition jobs; and
- graph/replay foreign references.

Indexes must begin with tenant scope for user-facing queries where practical. JSON metadata should receive a GIN index only for stable, measured query patterns; unrestricted JSON indexing increases cost and can encourage policy bypass.

## Verification gaps

- Confirm applied migrations, RLS policies and encryption settings in each environment with deployed evidence.
- Add database-level immutable enforcement for the canonical normalized evidence table after retention semantics are approved.
- Define a durable disposition worker and legal-hold behavior.
- Prove restore procedures preserve hashes, chronology and tenant isolation.
