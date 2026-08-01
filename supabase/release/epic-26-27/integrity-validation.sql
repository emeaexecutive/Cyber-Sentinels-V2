-- Read-only append-only, tenant-FK, replay, graph and Trust Memory validation.
do $$
declare trigger_count integer; tenant_fk_count integer;
begin
  select count(*) into trigger_count from pg_trigger where not tgisinternal and tgname like any(array['%scope%append_only%','%incident%append_only%']);
  if trigger_count<18 then raise exception 'EPIC_26_27_APPEND_ONLY_TRIGGER_COUNT: %',trigger_count; end if;
  select count(*) into tenant_fk_count from pg_constraint where contype='f' and connamespace='public'::regnamespace and array_length(conkey,1)>=2 and conrelid::regclass::text like any(array['%scope%','%environment%','%incident%','%execution_context%']);
  if tenant_fk_count<20 then raise exception 'EPIC_26_27_TENANT_FK_COUNT: %',tenant_fk_count; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.evidence_graph_edges'::regclass and pg_get_constraintdef(oid) like '%INCIDENT_HAS_SNAPSHOT%') then raise exception 'EPIC_26_27_GRAPH_EDGE_TYPES_MISSING'; end if;
  if not exists(select 1 from pg_proc where proname='persist_scope_continuity_decision_v1' and prosrc like '%trust_memory_index%') then raise exception 'EPIC_26_TRUST_MEMORY_WRITE_MISSING'; end if;
  if not exists(select 1 from pg_proc where proname='persist_serious_incident_case_v1' and prosrc like '%trust_memory_index%') then raise exception 'EPIC_27_TRUST_MEMORY_WRITE_MISSING'; end if;
end $$;
