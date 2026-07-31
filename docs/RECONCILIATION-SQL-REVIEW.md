# Reconciliation SQL Review

> **STAGING VALIDATION APPROVED**
> **NOT APPROVED FOR PRODUCTION**

Review date: 2026-07-29. Source baseline: captured Production schema for
`kecgtsfibkypjuaxqbjx`, remote migration boundary `202606090003`.

## Phase review

| Phase | Purpose and dependencies | Objects / data | Locks and transaction | Rollback / security | Local proof |
|---|---|---|---|---|---|
| `202607300001_reconciliation_preflight.sql` | Refuses unknown or incompatible baseline before writes | Read-only catalog assertions | Transactional read locks only | No rollback required; fails closed | Passed negative and positive baseline tests |
| `202607300002_reconciliation_ledger.sql` | Records the forward-only reconciliation release | Creates `schema_reconciliation_runs`; no backfill | Short DDL locks in one transaction | Dedicated rollback drops only the unused release ledger; forced RLS, service-role access | Passed |
| `202607300003_canonical_trust_foundation.sql` | Extends legacy `trust_events`; adds canonical append infrastructure | Adds nullable compatibility columns, indexes, event envelopes, chain heads, links, audit, and append RPC; no user-data delete | DDL/index locks; staged baseline is schema-only, Production timing still requires measured query plans | Operational rollback preserves legacy events; service-role append, tenant reads, explicit search paths | Event append, chain, role, tamper, and concurrency tests passed |
| `202607300004_consent_foundation.sql` | Depends on workspace and trust foundation | Creates consent policy/catalogue/preferences/receipt/event/audit objects; no backfill of fabricated consent | New-object DDL locks only | Phase rollback before Production writes; forced RLS and no browser writes | Schema and role tests passed |
| `202607300005_consent_persistence_rpc.sql` | Depends on consent tables and append RPC | Creates service-only atomic persistence and policy RPCs; no bulk data rewrite | Row/advisory locks scoped to idempotency/enterprise in transaction | Function rollback; explicit search path and revoked default execution | Essential, analytics, withdrawal, expiry, duplicate/conflict, malformed and concurrent tests passed |
| `202607300006_consent_security_and_rls.sql` | Finalizes grants and tenant read policies | Replaces privileges/policies; no row mutation | Short catalog locks | Policy/grant rollback; service-only mutation | Negative role/RLS tests passed |
| `202607300007_reconciliation_validation.sql` | Final compatibility constraints and release assertions | Adds/validates canonical event constraints after null/conflict checks; no delete | Constraint-validation and catalog locks; must be measured on data-bearing staging | Validation phase does not hide warnings; stop on mismatch | Validation and controlled-failure rollback passed |

## Statement-level findings

- No `DROP TABLE`, `DROP COLUMN`, `DROP SCHEMA`, unbounded `DELETE`, or
  unbounded data `UPDATE` exists in the seven forward phases.
- `IF NOT EXISTS` text occurs only inside explicit `DO`-block catalog checks
  that raise on missing/incompatible prerequisites. It is not used to conceal
  incompatible object creation.
- Historical migrations are not referenced as an executable batch and remain
  unchanged.
- Security-definer functions use `SET search_path = public`; default/public,
  anon, and authenticated execution is revoked for controlled write RPCs.
- Authenticated grants are reads protected by tenant policies. Mutation is
  reserved for `service_role`.
- New indexes and legacy-table constraint validation require data-bearing
  PostgreSQL 17 staging timings before Production review.
- Rollback SQL is staging-approved only. After Production writes, consent/event
  objects are operationally reversible or restore-required and must not be
  blindly dropped.

Seven phases are safe to attempt one at a time on an isolated baseline-matched
staging database after the protected-project guard passes. Approval does not
authorize Production execution.
