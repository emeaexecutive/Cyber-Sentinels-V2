-- Read-only application schema fingerprint; excludes managed Auth/Storage internals.
select jsonb_build_object(
 'storage_tables',(select jsonb_agg(x order by x.name) from (select c.relname name,c.relrowsecurity rls,c.relforcerowsecurity forced,(select jsonb_agg(jsonb_build_object('role',role_name,'schema_usage',has_schema_privilege(role_name,n.oid,'USAGE'),'select',has_table_privilege(role_name,c.oid,'SELECT'),'insert',has_table_privilege(role_name,c.oid,'INSERT'),'update',has_table_privilege(role_name,c.oid,'UPDATE'),'delete',has_table_privilege(role_name,c.oid,'DELETE')) order by role_name) from unnest(array['anon','authenticated','service_role']) role_name) privileges from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname in ('objects','buckets')) x),
 'buckets',(select jsonb_agg(x order by x.id) from (select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('evidence-files','support-screenshots')) x),
 'types',(select jsonb_agg(x order by x.schema,x.name) from (select n.nspname schema,t.typname name,t.typtype kind,t.typnotnull as "notnull",t.typdefault "default",case when t.typbasetype<>0 then format_type(t.typbasetype,t.typtypmod) end base_type,(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid) enum from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','private') and t.typtype in ('e','d')) x),
 'schemas',(select jsonb_agg(x order by x.name) from (select n.nspname name,pg_get_userbyid(n.nspowner) owner,n.nspacl::text acl from pg_namespace n where n.nspname in ('public','private')) x),
 'columns',(select jsonb_agg(x order by x.schema,x.table,x.name) from (
 select n.nspname schema,c.relname "table",a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull as "notnull",pg_get_expr(d.adbin,d.adrelid) "default",a.attidentity identity,a.attgenerated generated,a.attacl::text acl,case when a.attcollation<>0 then a.attcollation::regcollation::text end collation
 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
 where n.nspname in ('public','private') and c.relkind in ('r','p','v','m') and a.attnum>0 and not a.attisdropped) x),
 'tables',(select jsonb_agg(x order by x.schema,x.name) from (
 select n.nspname schema,c.relname name,c.relkind kind,c.relrowsecurity rls,c.relforcerowsecurity forced,c.reloptions options,c.relacl::text acl,pg_get_userbyid(c.relowner) owner,case when c.relkind in ('v','m') then pg_get_viewdef(c.oid,true) end view
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','p','v','m','S','f')) x),
 'constraints',(select jsonb_agg(x order by x.schema,x.table,x.name) from (
 select n.nspname schema,c.relname "table",k.conname name,k.contype type,pg_get_constraintdef(k.oid) definition,k.convalidated validated
 from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and k.contype<>'n') x),
 'indexes',(select jsonb_agg(x order by x.schemaname,x.tablename,x.indexname) from (select n.nspname schemaname,t.relname tablename,i.relname indexname,pg_get_indexdef(i.oid) indexdef,k.indisvalid valid,k.indisready ready from pg_index k join pg_class i on i.oid=k.indexrelid join pg_class t on t.oid=k.indrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname in ('public','private')) x),
 'policies',(select jsonb_agg(x order by x.schemaname,x.tablename,x.policyname) from (select * from pg_policies where schemaname in ('public','private','storage')) x),
 'functions',(select jsonb_agg(x order by x.schema,x.name,x.args) from (
 select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition,p.proacl::text acl,pg_get_userbyid(p.proowner) owner
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind='f' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')) x),
 'triggers',(select jsonb_agg(x order by x.schema,x.table,x.name) from (
 select n.nspname schema,c.relname "table",t.tgname name,t.tgenabled enabled,pg_get_triggerdef(t.oid) definition
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and (n.nspname in ('public','private') or n.nspname='auth' and t.tgname='create_account_access_request')) x),
 'default_acls',(select jsonb_agg(x order by x.owner,x.schema,x.type) from (
 select pg_get_userbyid(d.defaclrole) owner,n.nspname schema,d.defaclobjtype type,d.defaclacl::text acl from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace where n.nspname in ('public','private') or d.defaclnamespace=0) x)
) as catalog;
