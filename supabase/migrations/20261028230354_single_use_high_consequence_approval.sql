-- A high-consequence approval is bound to one canonical transaction. A caller
-- must not spend it again by choosing a new idempotency key. Database uniqueness
-- arbitrates concurrent reservations, including distinct application processes.
-- Cancelled and REVIEW_REQUIRED reservations do not consume an approval.
-- Existing duplicate authorized requests intentionally fail migration; never
-- delete or rewrite append-only evidence to make this index build succeed.
create unique index native_enforcement_single_approved_transaction
  on public.native_enforcement_requests (enterprise_id, transaction_id)
  where request_state = 'REQUESTED' and consequence in ('HIGH', 'CRITICAL');
