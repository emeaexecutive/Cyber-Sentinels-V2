-- NOT APPROVED FOR PRODUCTION
-- STAGING TEST ONLY - payload intentionally matches session A exactly.

begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;

\ir 004_concurrent_session_a_call.sql

commit;
