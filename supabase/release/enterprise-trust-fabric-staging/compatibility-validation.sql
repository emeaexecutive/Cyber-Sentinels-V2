begin transaction read only;
do $$
begin
  if to_regclass('public.trust_relationships') is null or to_regclass('public.trust_graph_relationships_v2') is null then raise exception 'LEGACY_AND_ENTERPRISE_GRAPH_CONTRACTS_REQUIRED'; end if;
  if to_regclass('public.provider_operational_health_snapshots') is null or to_regclass('public.provider_health_snapshots') is null then raise exception 'OPERATIONAL_AND_CONSENSUS_PROVIDER_HEALTH_REQUIRED'; end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='persist_scope_continuity_decision_v1') then raise exception 'EPIC_26_LEASE_HASH_CORRECTION_MISSING'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_fabric_decisions' and column_name='trust_state') then raise exception 'FROZEN_TRUST_STATE_CONTRACT_MISSING'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='incident_reviewer_decisions' and column_name='reviewer_role') then raise exception 'REVIEWER_AUTHORITY_CONTRACT_MISSING'; end if;
end $$;
select 'ARCHITECTURE_COMPATIBILITY_PASS' as status;
commit;
