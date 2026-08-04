begin transaction read only;
do $$
begin
  if exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and c.contype='f' and t.relname in ('scope_continuity_decisions','incident_reviewer_decisions','trust_contract_evaluations') and array_length(c.conkey,1)=1
  ) then raise exception 'ID_ONLY_CROSS_TENANT_FOREIGN_KEY_PRESENT'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='provider_health_snapshots' and column_name='enterprise_id') then raise exception 'CONSENSUS_PROVIDER_HEALTH_NOT_TENANT_SCOPED'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='provider_operational_health_snapshots' and column_name='enterprise_id') then raise exception 'OPERATIONAL_PROVIDER_HEALTH_HAS_FABRICATED_TENANT'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_graph_relationships_v2' and column_name='tenant_id') then raise exception 'ENTERPRISE_GRAPH_TENANT_KEY_MISSING'; end if;
  if not exists(select 1 from pg_constraint c where c.contype='c' and c.conname like '%trust_state%') then raise exception 'TRUST_STATE_CONSTRAINT_MISSING'; end if;
end $$;
select 'INTEGRITY_VALIDATION_PASS' as status;
commit;
