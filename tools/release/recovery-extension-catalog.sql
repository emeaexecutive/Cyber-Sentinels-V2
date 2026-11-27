BEGIN TRANSACTION READ ONLY;
SELECT json_build_object(
'captured_at',clock_timestamp(),'server_version',current_setting('server_version'),
'extensions',(SELECT json_agg(json_build_object('name',extname,'version',extversion,'owner',extowner::regrole::text)) FROM pg_extension),
'objects',(SELECT json_agg(x) FROM (
 SELECT 'function' AS kind,n.nspname AS schema,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,e.extname AS extension,p.proowner::regrole::text AS owner,p.proacl::text AS acl,p.prosecdef AS security_definer,p.proconfig AS settings,p.provolatile::text AS volatility,l.lanname AS language,md5(pg_get_functiondef(p.oid)) AS definition_md5,
 (SELECT json_agg(json_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END,'grantor',a.grantor::regrole::text,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee::regrole::text,a.privilege_type) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a) AS effective_acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang JOIN pg_depend d ON d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e' JOIN pg_extension e ON e.oid=d.refobjid
 WHERE e.extname IN ('pg_stat_statements','pgcrypto','uuid-ossp','supabase_vault')
 UNION ALL
 SELECT 'relation',n.nspname,c.relname,NULL,e.extname,c.relowner::regrole::text,c.relacl::text,NULL,NULL,NULL,NULL,CASE WHEN c.relkind='v' THEN md5(pg_get_viewdef(c.oid)) ELSE NULL END,
 (SELECT json_agg(json_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END,'grantor',a.grantor::regrole::text,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee::regrole::text,a.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=c.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e' JOIN pg_extension e ON e.oid=d.refobjid
 WHERE e.extname IN ('pg_stat_statements','pgcrypto','uuid-ossp','supabase_vault') AND c.relkind IN ('r','v','m')
) x)) AS catalog;
COMMIT;
