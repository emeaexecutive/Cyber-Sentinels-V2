-- Target ONLY Cyber Sentinels Staging: agpyhygpfmppjkxwcpac.
-- Prepared for explicit authorization; not executed in Execution06.
-- Catalog metadata only. No customer rows, function bodies, secrets or settings changes.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_setting('server_version') AS server_version;
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public','private')
  AND p.proname IN ('issue_native_enforcement_approval_v2','claim_native_enforcement_dispatch_v2','load_swarm_state_v1','cas_swarm_state_v1')
ORDER BY n.nspname, p.proname;
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','private')
  AND (c.relname LIKE '%swarm%' OR c.relname LIKE '%dispatch%' OR c.relname LIKE '%replay%')
ORDER BY n.nspname, c.relname;
ROLLBACK;
