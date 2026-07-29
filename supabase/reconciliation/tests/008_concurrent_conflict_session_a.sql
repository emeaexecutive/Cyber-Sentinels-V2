-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- STAGING TEST ONLY - run concurrently with session B.

begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;
set local app.test_request_hash = 'e';
set local app.expected_status = 'CREATED';

\ir 007_concurrent_conflict_call.sql

select pg_sleep(2);
commit;
