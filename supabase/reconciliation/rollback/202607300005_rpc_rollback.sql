-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- The safe RPC rollback is a dependency switch, not a destructive drop:
-- 1. Stop consent writes.
-- 2. Revoke EXECUTE from service_role.
-- 3. Rename persist_consent_change_v1 to a staging-disabled name only after
--    PostgREST and application traffic have stopped.
-- 4. Reload the staging PostgREST schema cache.
-- 5. Preserve all tables and rows.
--
-- Do not replace the RPC with a permissive stub and do not grant a browser role
-- a fallback write path.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: stop callers before disabling the consent RPC';
end
$manual_review_required$;
