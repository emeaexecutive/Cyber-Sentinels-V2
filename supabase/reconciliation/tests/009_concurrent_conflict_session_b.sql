-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- STAGING TEST ONLY - conflicting request waits, then fails without writes.

begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;
set local app.test_request_hash = 'f';
set local app.expected_status = 'CONFLICT';

\ir 007_concurrent_conflict_call.sql

do $concurrent_conflict_validation$
begin
  if (
    select count(*)
    from public.consent_receipts
    where enterprise_id = '10000000-0000-4000-8000-000000000002'
      and idempotency_key = 'synthetic-key-concurrent-conflict'
      and request_hash = repeat('e', 64)
  ) <> 1 then
    raise exception
      'TEST_FAILED: concurrent conflict did not preserve the first receipt';
  end if;

  if (
    select count(*)
    from public.trust_events
    where enterprise_id = '10000000-0000-4000-8000-000000000002'
      and schema_version = 'trust-event-v1'
      and id in (
        '50000000-0000-4000-8000-000000000015',
        '50000000-0000-4000-8000-000000000016'
      )
  ) <> 2 then
    raise exception
      'TEST_FAILED: concurrent conflict produced partial or duplicate events';
  end if;
end
$concurrent_conflict_validation$;

commit;
