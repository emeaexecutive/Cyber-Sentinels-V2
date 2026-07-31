-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- Safe decision order:
-- 1. Confirm no later phase has started.
-- 2. Preserve the ledger row as execution evidence.
-- 3. If the proposal must be disabled, rename the table instead of deleting it:
--      alter table public.schema_reconciliation_runs
--        rename to schema_reconciliation_runs_staging_rollback_20260730;
-- 4. Revoke all access from API roles after the rename.
--
-- If later phases exist, do not isolate the ledger before capturing their
-- metadata. Database restore is the only clean baseline recovery.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: inspect later phases before ledger isolation';
end
$manual_review_required$;
