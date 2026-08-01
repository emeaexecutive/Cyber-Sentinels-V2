-- Read-only Epic 26/27 prerequisite validation. Run before staging application.
do $$
declare missing text[] := '{}'; object_name text;
begin
  foreach object_name in array array[
    'public.trust_workspaces','public.trust_architecture_audit_log','public.evidence_graph_nodes',
    'public.evidence_graph_edges','public.trust_memory_index','public.trust_policy_versions'
  ] loop
    if to_regclass(object_name) is null then missing := array_append(missing,object_name); end if;
  end loop;
  if to_regprocedure('public.user_can_access_trust_workspace(uuid)') is null then missing := array_append(missing,'public.user_can_access_trust_workspace(uuid)'); end if;
  if to_regprocedure('public.prevent_trust_architecture_history_mutation()') is null then missing := array_append(missing,'public.prevent_trust_architecture_history_mutation()'); end if;
  if cardinality(missing)>0 then raise exception 'EPIC_26_27_MISSING_PREREQUISITES: %',array_to_string(missing,', '); end if;
end $$;

-- Known historical-chain collision detector. Either incompatible shape requires forward repair, never history edits.
do $$
begin
  if to_regclass('public.provider_health_snapshots') is not null and not exists(
    select 1 from information_schema.columns where table_schema='public' and table_name='provider_health_snapshots' and column_name='enterprise_id'
  ) then raise exception 'EPIC_26_27_HISTORICAL_PROVIDER_HEALTH_COLLISION: forward-only repair required'; end if;
end $$;
