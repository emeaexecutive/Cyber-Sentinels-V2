-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- Validation adds no business rows. Constraint validation marks existing
-- constraints valid and should not be undone. If phase 7 fails, later
-- application testing must stop and the entire failed transaction rolls back.
--
-- Capture the exact error, restore the disposable baseline when necessary,
-- correct the proposal, and rerun all phases. Never suppress a failed
-- validation marker.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: validation failure requires correction or baseline restore';
end
$manual_review_required$;
