# Reconciled Forward Migration Sequence

> Status update (2026-08-02): authoritative application evidence permitted the unapplied Epic 16 history to be corrected. Its operational table is now `provider_operational_health_snapshots`; Epic 17 retains tenant-scoped `provider_health_snapshots`. Earlier provisional `provider_health_snapshots_v2` guidance below is superseded.

> **NOT APPROVED FOR PRODUCTION**

## Decision

Do not author active migrations until the canonical contracts in `PRODUCTION-TO-TARGET-SCHEMA-DIFF.md` are approved and the duplicate `provider_health_snapshots` target defect is resolved.

The following filenames are the proposed forward-only series. They must be placed in a dedicated reviewed path first, then moved to the active migration path only after approval:

1. `202607300001_production_schema_reconciliation_preflight.sql`
2. `202607300002_production_legacy_contract_compatibility.sql`
3. `202607300003_production_provider_identity_compatibility.sql`
4. `202607300004_production_canonical_events_and_consent.sql`
5. `202607300005_production_versioned_trust_runtime.sql`
6. `202607300006_production_schema_reconciliation_validation.sql`

No SQL migration proposal was created in this run because the local target does not build. Creating executable DDL before resolving the duplicate target and approving versioned names would encode an unverified target.

## Phase 1 — Preflight and control ledger

Purpose:

- assert PostgreSQL major version and expected public schema fingerprint;
- assert the 12 known collision shapes;
- assert critical absent objects remain absent;
- create an operational reconciliation ledger;
- abort on any unexpected definition.

Proposed ledger:

```sql
create table public.schema_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  reconciliation_key text not null unique,
  phase text not null,
  status text not null check (status in ('STARTED','COMPLETED','FAILED','ROLLED_BACK')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
```

It provides real value by making retries, phase completion and operational evidence explicit. It must:

- contain no secrets, tokens, email addresses or row payloads;
- be revoked from `public`, `anon`, and `authenticated`;
- be writable/readable only by `service_role` and database operators;
- record only counts, schema hashes, migration identifiers and timestamps.

Every phase must reject execution unless:

```sql
current_setting('app.reconciliation.environment', true) = 'staging'
```

Production enablement requires a separately reviewed change replacing that gate with an approval identifier.

## Phase 2 — Legacy contract compatibility

Objects:

- `runtime_validation_logs`;
- `trust_certifications`;
- `trust_alerts`;
- `provenance_events`;
- four session-integrity tables.

Method:

1. Validate exact Production columns/types.
2. Add new columns as nullable.
3. Backfill aliases without deleting legacy values.
4. Add checks/FKs as `NOT VALID`.
5. Validate constraints after counts reach zero.
6. Add new indexes concurrently outside a transaction where required.
7. Introduce new policies under versioned names.
8. Run RLS tests before retiring old policies.

Example guard:

```sql
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'runtime_validation_logs'
      and column_name = 'health_score'
      and data_type = 'integer'
  ) then
    raise exception
      'RECONCILIATION_PREFLIGHT_RUNTIME_LOGS: expected Production health_score integer';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'runtime_validation_logs'
      and column_name = 'health_percent'
      and data_type <> 'integer'
  ) then
    raise exception
      'RECONCILIATION_PREFLIGHT_RUNTIME_LOGS: incompatible health_percent already exists';
  end if;
end
$$;
```

## Phase 3 — Provider and identity compatibility

Objects:

- both Hopae tables;
- provider registry/execution/health objects;
- identity subject/request/transaction/evidence/confidence/audit objects;
- workspace access helpers.

Rules:

- preserve legacy Hopae raw/status columns;
- add owner/workspace/workflow/correlation columns explicitly;
- do not backfill workspace IDs without an approved deterministic mapping;
- leave unmapped rows quarantined from new tenant-scoped APIs;
- use `provider_health_snapshots_v2` until the two local definitions are reconciled;
- do not drop the legacy primary key or idempotency index in the first pass.

## Phase 4 — Canonical events and consent

This phase is detailed in `CONSENT-RESTORATION-PLAN.md`.

It must depend only on:

- verified `trust_workspaces`, `workspace_members`, `trust_events`, and `agents`;
- versioned workspace-role helpers created by phase 3;
- objects created inside phase 4.

It must not depend on the original five pending migrations having run.

## Phase 5 — Versioned trust runtime

Canonical decisions:

- retain legacy `trust_relationships`;
- create `trust_graph_relationships_v2`;
- retain legacy `trust_signals`;
- create `continuous_trust_signals_v2`;
- use `provider_health_snapshots_v2` until a single provider-health contract is approved.

Application repositories must be updated in the same staged release before enabling these objects. Compatibility views must not expose writes unless `INSTEAD OF` behavior is explicitly reviewed.

## Phase 6 — Validation

Assertions:

- all expected columns have exact types/nullability;
- no invalid constraints remain;
- no duplicate unique keys;
- no orphan tenant references;
- all required functions have exact signatures and `SECURITY DEFINER` search paths;
- consent RPC grants match the required matrix;
- PostgREST exposes expected tables/RPCs;
- old/new table routing is explicit;
- no reconciliation phase remains `STARTED`.

## Data safety matrix

| Transformation | Preflight counts | Lock estimate | Expected time |
|---|---|---|---|
| Add nullable columns | table existence/schema fingerprint | brief metadata lock | short |
| Runtime log alias backfill | total, null, invalid health range | row locks; batchable | short at current size |
| Certification owner mapping | null owners, invalid UUID/text actors | row locks; requires owner mapping | unknown/blocking |
| Session compatibility | rows missing interview/user mapping | row locks; may require quarantine | unknown/blocking |
| Hopae workspace mapping | null/unmapped/duplicate correlation IDs | row locks and unique-index scan | medium/unknown |
| Evidence integrity backfill | null hashes, duplicate evidence IDs | table scan and row locks | high |
| Alert state conversion | counts by legacy status/severity | row locks and check validation | short at current size, verify |
| Consent introduction | absent-object checks, tenant FK orphans | new objects plus trust-event alteration | medium |

Every backfill must have before/after aggregate queries recorded in `schema_reconciliation_runs.metadata`.

## Legacy migration-history model

Recommended model: **C — rebuild repository history into a new canonical baseline for all environments**, combined with **D only after verification** for the Production ledger.

Operational interpretation:

- preserve the current migration directory in an immutable archive/tag for audit;
- create a canonical baseline from the verified Production schema plus approved reconciliations;
- make new developer, CI and staging environments build from that baseline;
- test that the baseline and forward migrations reproduce the approved target;
- only after independent verification, use an approved history reconciliation to align Production;
- never mark the 26 files applied merely because replacement objects exist.

Why not a permanent separate Production path:

- it creates two schemas and two CI truths;
- future migrations must support both indefinitely;
- audit and incident response become harder.

Impact:

- developers/CI: one reproducible clean baseline;
- staging: restored Production and empty builds converge on the same target;
- Production: requires one formally approved ledger transition;
- auditability: old history remains tagged and documented;
- rollback: physical restore plus retained legacy objects;
- complexity: higher one-time work, lower long-term operational risk.
