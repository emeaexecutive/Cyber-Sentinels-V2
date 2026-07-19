# Database Rollback and Recovery Runbook

**Status:** Approved specification; target backup/PITR and restore drills require external evidence

## Decision rule

Database rollback is exceptional. Prefer a tested forward fix when data has been written under the new schema. Restoration can discard valid post-backup changes and requires Incident Commander, Data owner and Security approval.

## Triage

1. Identify migration IDs, application SHAs, affected tables/policies/functions and start time.
2. Stop or restrict incompatible writes while preserving evidence.
3. Determine whether the issue is schema, policy/grant, data corruption, partial backfill or application incompatibility.
4. Confirm current backups/PITR point and estimated data-loss window.
5. Choose forward fix, reversible migration or restore.

## Forward fix

Create a new ordered migration that restores compatibility or corrects policy/data. Test it against a copy of the affected state, run RLS/integrity queries, review lock/backfill risk and apply through the approved migration path. Never edit an already released migration to hide history.

## Reversible migration

Use a down operation only when it was designed, peer-reviewed and tested, no incompatible data would be lost, and both old/new application versions are understood. Record every SQL statement and result.

## Backup/PITR restore

Restore into an isolated project first where possible. Validate migration history, row counts/integrity hashes, foreign keys, RLS/grants, tenant denial, audit continuity and critical workflows. Promote/cut over only with accepted RPO/RTO and communications plan.

## Compatibility

Application rollback and database recovery are coordinated but separate. Confirm the selected application SHA can operate with the recovered schema and environment. Keep expanded columns/tables through the compatibility window before destructive contract changes.

## Verification and evidence

Run authentication, cross-tenant RLS, provider/evidence, Trust Decision, Replay, Evidence Graph, Trust Memory and report checks. Record target project, backup point, migrations, operator, timestamps, measured RTO/RPO, validation results, data reconciliation and residual loss.

## Escalation

Declare SEV1 for cross-tenant policy failure, confirmed corruption, destructive deletion or unbounded data loss. Engage Supabase/vendor support through verified contacts without sending secrets or raw customer evidence in tickets.
