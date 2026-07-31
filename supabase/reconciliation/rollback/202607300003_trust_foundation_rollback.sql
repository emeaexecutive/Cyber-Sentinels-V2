-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- Never automatically drop canonical Trust Events after writes begin.
--
-- Safe decision order:
-- 1. Stop application writes and capture counts plus chain-head hashes.
-- 2. Revoke EXECUTE on append_trust_event_v1 from service_role.
-- 3. Repoint application readers to the legacy contract.
-- 4. Rename new tables with a staging rollback suffix, preserving all rows.
-- 5. Restore the two replaced legacy trust_events policies from the verified
--    Production baseline.
-- 6. Only remove additive trust_events columns from a disposable reset where
--    every canonical row has been exported and verified.
--
-- Irreversible boundary: once canonical Trust Events have been accepted by
-- clients or referenced externally, physical restore plus replay is the only
-- safe rollback. Dropping events, chain heads or hashes is prohibited.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: canonical Trust Event rollback requires write freeze and data preservation';
end
$manual_review_required$;
