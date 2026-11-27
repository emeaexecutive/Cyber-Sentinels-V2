\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $checks$
DECLARE required text[] := ARRAY['persist_canonical_trust_transaction_decision_v1','extend_canonical_trust_transaction_graph_v1','append_canonical_trust_transaction_replay_v1','emit_canonical_trust_transaction_memory_v1']; n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace WHERE s.nspname='public' AND p.proname=ANY(required);
 IF n<>4 THEN RAISE EXCEPTION 'Critical RPC inventory incomplete'; END IF;
 IF EXISTS(SELECT FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace
   WHERE s.nspname='public' AND p.proname=ANY(required)
   AND (NOT p.prosecdef OR p.proowner<>'postgres'::regrole OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') OR p.proconfig IS NULL))
 THEN RAISE EXCEPTION 'Critical RPC execution security mismatch'; END IF;
 IF EXISTS(SELECT FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace WHERE s.nspname='public' AND p.proname LIKE 'security_closure_%' AND (NOT p.prosecdef OR p.proowner<>'postgres'::regrole OR has_function_privilege('anon',p.oid,'EXECUTE') OR p.proconfig IS NULL))
 THEN RAISE EXCEPTION 'Local hardening helper security mismatch'; END IF;
 IF has_schema_privilege('anon','public','CREATE') OR has_schema_privilege('authenticated','public','CREATE') OR has_schema_privilege('anon','extensions','CREATE') OR has_schema_privilege('authenticated','extensions','CREATE')
 THEN RAISE EXCEPTION 'Untrusted role can write a SECURITY DEFINER search-path schema'; END IF;
 IF EXISTS(SELECT FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname='public' AND c.relname IN ('ai_agents','trust_workspaces','trust_replay_sessions','trust_memory_index','trust_events','trust_alerts') AND NOT c.relrowsecurity)
 THEN RAISE EXCEPTION 'Required tenant table has RLS disabled'; END IF;
 IF EXISTS(SELECT FROM pg_policies WHERE schemaname='public' AND tablename='ai_agents' AND policyname='ai_select' AND qual='true')
 THEN RAISE EXCEPTION 'Known broad Agent Registry policy remains'; END IF;
 RAISE NOTICE 'PASS critical SECURITY DEFINER ownership/execute/search-path and required RLS checks';
END $checks$;
SELECT json_agg(json_build_object('function',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'securityDefiner',p.prosecdef,'settings',p.proconfig,'acl',p.proacl))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','auth') AND (p.proname LIKE 'security_closure_%' OR p.proname IN ('uid','rls_auto_enable','user_can_access_trust_workspace','persist_canonical_trust_transaction_decision_v1','extend_canonical_trust_transaction_graph_v1','append_canonical_trust_transaction_replay_v1','emit_canonical_trust_transaction_memory_v1'));
ROLLBACK;
