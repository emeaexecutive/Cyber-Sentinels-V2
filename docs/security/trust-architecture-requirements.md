# Trust architecture security requirements

Baseline commit: `77588a5`

Security review date: 2026-07-18

## Scope

These controls apply to provider ingestion, normalized evidence, Evidence Graph, Replay, Trust Memory, ORI, TDE, reports and audit APIs. Migration source documents intended controls; deployed compliance requires environment evidence.

## Control matrix

| Requirement | Required control | Current repository evidence | Status / verification |
| --- | --- | --- | --- |
| Evidence encrypted | TLS in transit; storage/database encryption at rest; field protection for retained sensitive payloads | Private evidence bucket and server-side data paths exist | Deployment encryption settings are unverified from source |
| Replay immutable | Insert-only record, update/delete prevention, digest/link validation and controlled retention tombstone | `trust_timeline_events` mutation-prevention trigger in migration source | Strong partial control; not universal across all replay tables or proven deployed |
| Trust Memory append-only | New event for change/correction; versioned snapshot; no silent mutation | Application integrity validator plus timeline mutation-prevention trigger | Partial; upstream sources and universal durable snapshots need verification |
| Provider payload hashing | Canonical digest with algorithm/version before normalized persistence | Hopae callback/source digests and normalized `source_digest` | Implemented for current Hopae path; platform-wide envelope remains a gap |
| Signature validation | Verify bytes, timestamp and key before parsing/normalizing; reject replay | Hopae HMAC/timestamp callback verification | Implemented for Hopae; every future provider needs equivalent tests |
| JWT validation | Server-authenticated user lookup; signed callbacks use provider auth, not browser JWT | Supabase server auth/middleware and protected route checks | Route-by-route audit and deployed auth configuration remain required |
| RLS enforcement | Enable policies and derive tenant from authenticated membership; deny by default | RLS migrations for evidence, replay, receipts and normalized provider evidence | Source coverage exists; applied-policy and service-role tests required |
| Least privilege | Server-only secrets, minimum grants, scoped admin/service role, audited privileged operations | Server-only service-role/provider modules and role-aware routes | Broad legacy policies and privileged functions require continuing review |

## Evidence confidentiality

- Minimize collection before storage and classify every field.
- Retain normalized allowlisted attributes and digests by default, not full provider payloads.
- Store objects in private buckets with short-lived signed access.
- Never place secrets, identity documents, raw biometrics or unbounded metadata in logs, telemetry, graph edges, Replay summaries or reports.
- Enforce tenant scope on every source and derived projection.
- Audit export and privileged reads.

Encryption at rest is a hosting/deployment property. A migration or SDK setting is not evidence that encryption keys, rotation, backup encryption and regional controls are correctly deployed.

## Integrity and authenticity

1. Verify transport authentication/signature over original bytes.
2. Validate timestamp window and provider event uniqueness.
3. Compute a canonical digest and persist algorithm/canonicalization version.
4. Insert normalized evidence idempotently.
5. Link graph, Replay, decision, Trust Memory and report records by immutable references.
6. Reverify digests at replay/export and flag any missing or conflicting link.

Do not store the provider signature as reusable authentication material. Record scheme, safe key reference, timestamp, digest and verification outcome.

## Authentication and authorization

Supabase Auth/JWT establishes the application account. Tenant membership, domain authority, delegation, policy and reviewer role remain separate authorization checks. Never trust tenant/workspace IDs supplied by a client without membership derivation. Provider webhooks authenticate through the provider signature contract and are scoped to their matching provider event/session.

Administrative routes require server-side admin authorization in addition to middleware. Service-role clients bypass RLS and therefore require server-only isolation, narrow functions, explicit tenant input validation and audit.

## Immutability, retention and privacy

Append-only means retained history is not silently rewritten. It does not authorize indefinite personal-data retention. Retention expiry, legal hold and privacy disposition are governed events. Use a tombstone/de-identification record where deletion is required and make later Replay limitations visible.

## ORI and decision security

- Verify ORI artifact hashes and version all features/thresholds.
- Treat missing/invalid artifacts as abstain/off, never automatic allow.
- Prevent unvalidated ORI output from enforcing or changing authority.
- Record algorithm recommendation, manual override and enforcement outcome separately.
- Require authorized reviewer attribution and reason for overrides.
- Bind receipts/reports to decision and evidence digests.

## Audit API and report controls

Audit APIs and exports require authentication, tenant authorization, purpose limitation, pagination/rate limits, safe filtering and access audit. Apply response minimization and prevent bulk cross-tenant enumeration. Portable reports must keep `not recorded`/incomplete states and cannot expose source secrets.

## Security test requirements

- invalid/stale/replayed provider signatures fail closed;
- duplicate callbacks create no duplicate evidence;
- cross-tenant reads/writes fail under authenticated and service-function paths;
- update/delete of protected chronology fails;
- expired/revoked authority cannot execute;
- missing evidence/ORI/policy never becomes verified by default;
- object URLs expire and cannot access another tenant's evidence;
- logs/telemetry/report exports contain no prohibited fields;
- restore/replay preserves hashes and reports missing retained inputs; and
- key/secret rotation and provider shutdown have tested rollback.

## Open security work

Verify migrations and encryption in Preview/Production; close legacy broad-policy gaps; extend immutable database enforcement to the canonical evidence envelope; create durable replay recovery; define field-level encryption criteria; and complete threat models for graph correlation, report export and future pre-decision ORI use.
