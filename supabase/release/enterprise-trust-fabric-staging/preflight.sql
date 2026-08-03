-- Read-only staging preflight. Set these session values only after out-of-band project verification:
-- set app.release_environment = 'staging';
-- set app.release_project_ref = 'agpyhygpfmppjkxwcpac';
-- set app.release_synthetic_mode = 'true';
begin transaction read only;
do $$
declare
  actual_head text;
begin
  if current_setting('app.release_environment', true) is distinct from 'staging' then
    raise exception 'STAGING_ENVIRONMENT_IDENTITY_REQUIRED';
  end if;
  if current_setting('app.release_project_ref', true) is distinct from 'agpyhygpfmppjkxwcpac' then
    raise exception 'STAGING_PROJECT_IDENTITY_MISMATCH';
  end if;
  if current_setting('app.release_synthetic_mode', true) is distinct from 'true' then
    raise exception 'SYNTHETIC_MODE_REQUIRED';
  end if;
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'POSTGRESQL_17_REQUIRED';
  end if;
  if exists (
    select 1 from unnest(array['pgcrypto','uuid-ossp']) required(name)
    where not exists(select 1 from pg_extension e where e.extname=required.name)
  ) then raise exception 'REQUIRED_EXTENSION_MISSING'; end if;
  select max(version) into actual_head from supabase_migrations.schema_migrations;
  if actual_head is distinct from '202606090003' then
    raise exception 'UNEXPECTED_STARTING_MIGRATION_HEAD';
  end if;
  if to_regclass('public.trust_relationships') is null then
    raise exception 'LEGACY_TRUST_RELATIONSHIPS_MISSING';
  end if;
  if to_regclass('public.trust_graph_relationships_v2') is not null
    or to_regclass('public.trust_fabric_decisions') is not null then
    raise exception 'UNEXPECTED_PENDING_OBJECT_PRESENT';
  end if;
  if to_regclass('auth.users') is null or to_regclass('storage.objects') is null then
    raise exception 'AUTH_OR_STORAGE_PREREQUISITE_MISSING';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='trust_relationships' and c.relkind not in ('r','p')
  ) then raise exception 'LEGACY_RELATION_NAMESPACE_COLLISION'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and c.relname in ('trust_workspaces','workspace_members') and not c.relrowsecurity
  ) then raise exception 'RLS_BASELINE_INCOMPATIBLE'; end if;
end $$;
select 'STAGING_PREFLIGHT_PASS' as status, '202606090003' as expected_starting_head;
commit;
