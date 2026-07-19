# Database Migration Operations

**Status:** Approved specification; automated migration workflow and target drift evidence are missing

## Principles

- SQL in the repository is intent; applied target state must be verified separately.
- Migrations are ordered, immutable after release and reviewed with the application change.
- Prefer expand/migrate/contract. Do not require new code and destructive schema changes simultaneously.
- RLS, grants, functions, triggers, retention and indexes are part of the migration contract.
- Never run destructive reset commands against Production.

## Required migration record

Every migration states owner, purpose, dependencies, affected tables/functions/policies, data volume, lock risk, compatibility window, backfill, validation, rollback/forward-fix plan and evidence query. Sensitive values never appear in SQL or logs.

## Preflight

1. Create an ephemeral database and apply the full ordered migration set from empty.
2. Compare generated schema/policy inventory with the expected repository model.
3. Run RLS allow/deny tests with two users and two tenants.
4. Estimate locks, duration, index build and backfill cost using representative non-production data.
5. Confirm backup/PITR state and restoration owner in the target platform.
6. Confirm old and new application versions can operate during the deployment window.

## Production execution

Use an approved migration mechanism tied to the target project. Record target project identifier, current migration version, expected SHA, operator and start time. Apply one reviewed batch, monitor database errors/locks/latency, run validation queries, then authorize application deployment.

## Failure and rollback

Prefer a forward fix when data has already changed. Use a reversible down operation only when it was designed and tested. Restoration requires incident command, known backup point, accepted data-loss window, customer-impact review and post-restore integrity/RLS validation. Application rollback alone does not revert schema.

## Current repository gaps

There is no `supabase/config.toml`, fresh-schema CI, applied Production migration inventory or tested restore evidence. The root README's instruction to run only `001_initial_schema.sql` is obsolete and must not be used as the complete deployment procedure.
