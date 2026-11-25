-- Read-only preflight to run on the exact proposed host before any role binding.
-- Any unexpected row blocks approval; do not repair shared PUBLIC grants blindly.
select n.nspname,p.proname,'unexpected callable function' as blocker
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname not in ('pg_catalog','information_schema')
and not (n.nspname='qualification20' and p.proname in ('schema_read','agent_register','authority_read','decision_create','review_read','replay_read')
  and p.proargtypes::text='25 25 25 3802 25' and p.prorettype='jsonb'::regtype and p.prosecdef
  and p.proowner=(select oid from pg_roles where rolname='execution20_gateway_owner'))
and has_schema_privilege('execution20_gateway_login',n.oid,'USAGE')
and has_function_privilege('execution20_gateway_login',p.oid,'EXECUTE');
select n.nspname,c.relname,'unexpected readable relation' as blocker
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname not in ('pg_catalog','information_schema') and c.relkind in ('r','v','m','p')
and has_schema_privilege('execution20_gateway_login',n.oid,'USAGE')
and has_table_privilege('execution20_gateway_login',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER');
select rolname,'unexpected elevated role' as blocker from pg_roles
where rolname in ('execution20_gateway_login','execution20_gateway_owner')
and (rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication);
select member::regrole,roleid::regrole,'unexpected role membership' as blocker
from pg_auth_members where member in ('execution20_gateway_login'::regrole,'execution20_gateway_owner'::regrole);
