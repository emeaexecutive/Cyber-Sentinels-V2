-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- Phase 1 is read-only and commits no schema or data changes. There is
-- therefore nothing to roll back. If the preflight failed, correct or restore
-- the disposable staging baseline and rerun it; never weaken an assertion to
-- make an unexplained schema pass.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: preflight has no rollback action';
end
$manual_review_required$;
