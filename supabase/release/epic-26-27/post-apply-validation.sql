-- Read-only existence validation after canonical migrations are applied.
do $$
declare missing text[] := '{}'; object_name text;
begin
  foreach object_name in array array[
    'public.execution_context_declarations','public.environment_attestations','public.scope_authorization_leases',
    'public.scope_continuity_decisions','public.scope_decision_attestations','public.context_contradiction_events',
    'public.scope_continuity_reviewer_actions','public.incident_regulatory_assessments','public.incident_responsibility_roles',
    'public.incident_chronology_events','public.incident_evidence_snapshots','public.incident_impact_assessments',
    'public.incident_regulatory_trigger_findings','public.incident_reviewer_decisions','public.incident_submission_packages',
    'public.incident_external_submissions','public.incident_corrective_actions','public.incident_evidence_supersessions',
    'public.scope_continuity_replay','public.incident_reporting_replay',
    'public.provider_operational_health_snapshots','public.provider_health_snapshots'
  ] loop if to_regclass(object_name) is null then missing:=array_append(missing,object_name); end if; end loop;
  if to_regprocedure('public.persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid)') is null then missing:=array_append(missing,'persist_scope_continuity_decision_v1'); end if;
  if to_regprocedure('public.persist_serious_incident_case_v1(jsonb,jsonb,jsonb,uuid,uuid)') is null then missing:=array_append(missing,'persist_serious_incident_case_v1'); end if;
  if to_regprocedure('public.append_serious_incident_record_v1(uuid,uuid,text,jsonb,uuid,uuid)') is null then missing:=array_append(missing,'append_serious_incident_record_v1'); end if;
  if to_regprocedure('public.record_provider_health_v1(uuid,jsonb,jsonb,uuid)') is null then missing:=array_append(missing,'record_provider_health_v1'); end if;
  if cardinality(missing)>0 then raise exception 'EPIC_26_27_POST_APPLY_MISSING: %',array_to_string(missing,', '); end if;
end $$;
