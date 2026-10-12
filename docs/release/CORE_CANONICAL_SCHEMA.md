# Canonical application schema and approval boundary

The candidate preserves the six previously qualified migrations and adds six forward closure migrations. Historical applied SQL is unchanged. The old candidate `12d67951201b1dae6a3b91ac9fae405322671905` is **SUPERSEDED FOR PRODUCTION — REMAINS AUDITABLE**.

## Approval contract

Authentication alone grants no customer access. Database-owned APPROVED status is an additional requirement on top of existing tenant, owner, RBAC and authority rules. PENDING, DENIED, SUSPENDED and REVOKED cannot read or mutate customer resources. Editable user metadata cannot approve an account. Platform administration retains its separate server-controlled identity boundary; tenant administration requires customer approval.

All public application tables have RLS and a restrictive approval policy, except the explicitly restricted own approval-status row. Customer views execute as the caller; materialized/foreign relations and unapproved RPCs are not customer grants. New default grants deny customer table/function access. Service-role CRUD grants support trusted backend writers without broadening customer privileges. Retired historical tables are preserved with customer access revoked.

The complete resource/method inventory is [CORE_APPROVAL_BOUNDARY.md](CORE_APPROVAL_BOUNDARY.md). Public API exceptions are exact path-and-method matches in `lib/auth/approval-boundary.ts`: health/readiness, authentication transport, password reset/logout, subject-bound privacy consent, and rate-limited/validated access-request and waitlist submission. Consent catalogue/policy are public configuration, not customer operational data. Signed provider callbacks and `/api/v1` retain independent signature or API-key checks; API keys require an approved owner. All other API methods default to CUSTOMER.

Before approval, an authenticated person can obtain only their own `user_id`, `status`, `organization` and `reason` approval fields, the minimal login/waiting screen, and an own blocked-login audit operation. No client account-approval mutation is granted. Auth telemetry routes are not public exceptions.

## Trust Memory provenance and decision

The preflight recorded the exact Production and Staging definitions of `append_trust_event_v1`. Production matched the committed `20260822124942` source. Staging contained the archived `20260816135031_staging_repair_append_trust_event_consent_namespace.sql` repair, including consent event support and normalization absent from Production. This was application behavior, not managed drift.

`20261007150224_canonical_trust_memory_function_reconciliation.sql` makes the reviewed behavior canonical. It retains supported consent/event namespaces and empty-string normalization, and strengthens null-safe service-role and required-envelope checks, positive safe-integer sequence validation and cross-tenant envelope rejection. It preserves advisory-lock ordering, immutable history, hash-chain chronology and conflict handling. SQL validates the canonical envelope; trusted TypeScript writers remain responsible for canonical hashes/signature verification. The migration does not claim SQL independently verifies signatures.

## Workspace bootstrap

Authentication can create an approval request without usable customer access. Workspace creation by a customer is denied until approval. The canonical workspace INSERT trigger creates owner membership atomically, replacing the application’s separate membership write. Existing creator membership is reconciled without demoting owner/admin roles. Historical preapproval workspace rows may remain, but restrictive policies keep them inaccessible until approval. No broad product-flow redesign is involved.

## Schema reconciliation

[CORE_SCHEMA_DIFFERENCE_CLOSURE.md](CORE_SCHEMA_DIFFERENCE_CLOSURE.md) and its JSON companion classify all 1,360 original differences. The canonical union preserves historical columns/tables and immutable records. Nullable added columns do not fabricate values for old rows. Required additions fail safely for populated tables unless the reviewed default denies capability (`usage_limits.governance_enabled=false`). Constraint/nullability preflight checked existing Production and Staging data without exporting customer rows. Defaults no longer invent measured scores. CHECK/FK/unique constraints validate or abort; legacy source-supported event/media variants remain supported.

The two repeated Hopae index names are explicitly guarded, identical repairs; the namespace test permits only those exact definitions/file pairs. Two already-recorded policy replacement migrations are pinned by immutable SHA-256 in the source guard and backed by runtime RLS tests. Future arbitrary policy replacement is not exempted.

`supabase/canonical-schema-contract.json` fingerprints twelve sections of the intended application schema. `tools/release/effective-application-schema.sql` captures the observed catalog. The comparator preserves SQL literals, grants and security behavior. It tolerates physical column order, two exact reviewed CHECK-expression grouping variants, and one exact fingerprinted Supabase RLS event-trigger helper. An unknown helper body or changed constraint fails.

Reconstruction uses the observed Production application catalog in a disposable PostgreSQL-compatible PGlite instance, followed by all twelve pending migrations in repository order. Its result must match both the contract and live Staging. This proves target application-catalog equivalence against the observed baseline. It is not a native full backup restore, nor a claim that the entire historical Supabase installation can be recreated from an empty database.

## Evidence download revocation

Hosted testing found that private Storage downloads could return a CDN HIT after approval revocation, including with `max-age=0` and `no-store` upload metadata. Cache-bypassed requests correctly denied access. Therefore RLS alone on a directly cacheable byte URL did not satisfy the required boundary.

`20261008112858_evidence_download_approval_revalidation.sql` restricts customer Storage SELECT to exact list/upload/update/delete operation names. Direct download, transformation, signed URL and unknown operations fail closed. Existing owner and approval policies still apply. `/api/evidence/download` uses the same database-owned approval/object-owner helper before backend byte retrieval and again before delivery, with private/no-store browser and CDN headers. It returns bytes, not a reusable signed capability. Upload metadata maps file formats to canonical media categories.

At Production cutover, previously issued direct or signed URLs require explicit cache retirement before declaring the boundary closed. Production currently contains one evidence object; do not delete it or rotate its path without a backed-up, reviewed preservation procedure. Staging qualification cleans up only its synthetic objects. Browser copies already downloaded cannot be revoked. Supabase documents separate token/cache expiry and propagation limits: [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn), [cache purge](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache). Free-plan Production must not assume paid cache-purge availability.

Production schema, accounts, objects, credentials and deployment remain unchanged. Recovery prerequisites are in [the recovery procedure](../production-recovery-procedure.md).
