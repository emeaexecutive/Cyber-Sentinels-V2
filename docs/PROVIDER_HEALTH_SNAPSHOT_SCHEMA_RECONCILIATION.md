# Provider health snapshot schema reconciliation

## Decision

Two independently authored provider-health concepts are retained under distinct canonical names:

| Owner | Canonical table | Ownership | Purpose |
|---|---|---|---|
| Epic 16 / Hopae provider abstraction | `public.provider_operational_health_snapshots` | Global provider registry; no enterprise owner | Operational configuration, connectivity, callback, execution, and evidence-pipeline telemetry |
| Epic 17 / Provider Consensus | `public.provider_health_snapshots` | Required `enterprise_id` | Tenant-scoped consensus state, telemetry, circuit state, and reason-code evidence |

The concepts are structurally and semantically incompatible. Operational records must not be assigned a fabricated enterprise owner, and tenant Consensus evidence must not be written through the global Hopae path.

## Application-status proof

The database and release owners supplied the following sanitized authoritative evidence on 2026-08-02:

- the linked Production migration ledger ends at `202606090003`;
- local migration `202607170002` has a blank remote entry;
- local migration `202607200003` has a blank remote entry;
- the Supabase branch inventory contains no persistent branches;
- the PR #16 and obsolete PR #15 branches are disposable Preview branches;
- the partially applied PR Preview is not a retained durable environment; and
- no published Production release package contains either migration.

No database URL, credential, or unsanitized connection output is recorded here. Production was not mutated, and no migration ledger repair is required.

This evidence authorizes a narrowly scoped correction to the unapplied Epic 16 migration. It does not authorize applying Epic 16, Epic 17, Epic 26, Epic 27, or Epic 28 to Production.

## Historical correction

`supabase/migrations/202607170002_provider_abstraction_hopae.sql` was introduced by commit `cc9c9135fae85c542a7f59e2fc89298575cfe922`. Its original canonical-text SHA-256 is `3043937d1f0b5d2c9eba51f3de0fc336a2eb765486c80a2e75240318a5d37deb`; the original remains recoverable through Git history.

The only schema change is a name separation:

- table `provider_health_snapshots` becomes `provider_operational_health_snapshots`;
- its inferred primary-key constraint becomes `provider_operational_health_snapshots_pkey` by PostgreSQL convention;
- index `provider_health_latest_idx` becomes `provider_operational_health_snapshots_provider_idx`;
- RLS and revoke statements target the renamed table; and
- all Epic 16 Hopae operational inserts target the renamed table.

The columns, checks, foreign key, defaults, retention behavior, privileges, and global ownership semantics are unchanged. `202607200003_provider_consensus_engine.sql` is not modified.

## Consumer boundary

Operational consumers use the Epic 16 shape: `snapshot_id`, `provider_id`, `environment`, `health_status`, `health_dimension`, operational counters, `checked_at`, and `retention_expires_at`. They target `provider_operational_health_snapshots` and use `ProviderOperationalHealthSnapshot`.

Consensus, Continuous Trust, Replay, and Trust Architecture consumers use the Epic 17 shape: `enterprise_id`, `provider_key`, `state`, `observed_at`, latency/error/timeout telemetry, failure counters, circuit state, and reason codes. They continue to target `provider_health_snapshots` and use `ProviderConsensusHealthSnapshot` where the Consensus domain model is represented.

## August validator decision

The uncommitted `202608020001_provider_health_snapshot_reconciliation.sql` validator was removed. Once the unapplied history is corrected, it performs no forward schema transition and would add an audit table solely to validate objects that the release package and namespace tests can validate without migration noise.

Fail-closed checks remain in:

- `tests/provider-health-schema-reconciliation.test.mjs`;
- the Epic 26/27 staging-package preflight, post-apply, RLS, and integrity validation; and
- the release manifest and expected inventory.

## Safety and rollout boundary

No data migration is required because neither historical migration was durably applied. No table is dropped, renamed in a durable database, truncated, or backfilled. Production requires a separate deployment authorization after PR #16 passes clean disposable Preview reconstruction and all hosted checks.
