-- STAGING TEST ONLY - MANUAL REVIEW REQUIRED
-- NOT APPROVED FOR PRODUCTION
--
-- Never automatically drop consent receipts, events or audit history.
--
-- Safe decision order:
-- 1. Stop the consent API.
-- 2. Export receipt/event/audit counts and integrity hashes.
-- 3. Revoke table access from service_role and authenticated.
-- 4. Rename consent tables with a staging rollback suffix in dependency order.
-- 5. Preserve receipt IDs and hashes for later replay.
--
-- The current-state consent_preferences table may be rebuilt from append-only
-- receipts, but only after reconciliation validation. Receipt/event/audit
-- history is not safely reversible after new writes. Use database restore when
-- baseline recovery is required.

do $manual_review_required$
begin
  raise exception
    'STAGING TEST ONLY - MANUAL REVIEW REQUIRED: consent history must be preserved';
end
$manual_review_required$;
