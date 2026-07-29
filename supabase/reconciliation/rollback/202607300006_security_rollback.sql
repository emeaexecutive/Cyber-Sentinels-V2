-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- A rollback must never weaken RLS. If a policy causes an application defect:
-- 1. Revoke authenticated SELECT on the affected table.
-- 2. Keep RLS enabled and forced.
-- 3. Disable the affected application reader.
-- 4. Replace the policy only after a reviewed tenant-access test.
--
-- Do not add USING (true), do not grant direct writes, do not expose SECURITY
-- DEFINER helpers to anon, and do not restore unsafe default privileges.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: security rollback must fail closed';
end
$manual_review_required$;
