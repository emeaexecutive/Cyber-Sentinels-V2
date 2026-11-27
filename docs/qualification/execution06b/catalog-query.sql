BEGIN READ ONLY;
SELECT jsonb_build_object(
 'identity',jsonb_build_object('database',current_database(),'role',current_user,'version',current_setting('server_version')),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text)) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'),
 'rpcs',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'securityDefiner',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname ~ '(swarm|native_enforcement|native.*dispatch|native.*approval)'),
 'relations',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl::text)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='swarm_private' OR (n.nspname='public' AND c.relname ~ '(native|workload|replay)')),
 'policies',(SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE schemaname='swarm_private' OR (schemaname='public' AND tablename ~ '(native|workload|replay)')),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid))) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='swarm_private' OR (n.nspname='public' AND c.relname ~ '(native|workload|replay)')),
 'indexes',(SELECT jsonb_agg(to_jsonb(i)) FROM pg_indexes i WHERE schemaname='swarm_private' OR (schemaname='public' AND tablename ~ '(native|workload|replay)')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid))) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND (n.nspname='swarm_private' OR (n.nspname='public' AND c.relname ~ '(native|workload|replay)')))
) AS catalog;
ROLLBACK;
