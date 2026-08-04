begin transaction read only;
do $$
declare expected_tables text[] := array['identity_subjects','identity_verification_requests','provider_health_snapshots','trust_entities','trust_graph_relationships_v2','environment_attestations','scope_continuity_decisions','incident_regulatory_assessments','incident_reviewer_decisions','trust_contracts','trust_fabric_decisions'];
begin
  if exists (
    select 1 from unnest(expected_tables) expected(name)
    where not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=expected.name and c.relrowsecurity)
  ) then raise exception 'EXPECTED_RLS_TABLE_NOT_PROTECTED'; end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name=any(expected_tables) and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
  ) then raise exception 'ANON_WRITE_GRANT_PRESENT'; end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name in ('trust_fabric_decisions','incident_reviewer_decisions','scope_continuity_decisions') and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
  ) then raise exception 'SERVICE_ONLY_TABLE_HAS_AUTHENTICATED_WRITE'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('persist_scope_continuity_decision_v1','persist_trust_contract_v1','persist_trust_contract_evaluation_v1') and has_function_privilege('authenticated',p.oid,'EXECUTE')
  ) then raise exception 'SERVICE_RPC_EXECUTE_GRANT_UNSAFE'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='v' and c.relname in ('scope_continuity_replay','incident_reporting_replay') and not coalesce(c.reloptions,'{}') @> array['security_invoker=true']
  ) then raise exception 'SECURITY_INVOKER_VIEW_REQUIRED'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='incident_reviewer_decisions') then raise exception 'REVIEWER_AUTHORIZATION_POLICY_MISSING'; end if;
end $$;
select 'STATIC_RLS_VALIDATION_PASS' as status;
commit;
