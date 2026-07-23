-- EPIC 19: Continuous Trust Runtime. Forward-only extension of EPIC 17/18 authority.
create extension if not exists pgcrypto;

alter table public.evidence_objects
  add column if not exists observed_at timestamptz,
  add column if not exists freshness_policy_seconds integer,
  add column if not exists revoked_at timestamptz,
  add column if not exists superseded_by_evidence_id uuid;
update public.evidence_objects set observed_at=coalesce(observed_at,occurred_at), freshness_policy_seconds=coalesce(freshness_policy_seconds,86400);
alter table public.evidence_objects alter column observed_at set not null;
alter table public.evidence_objects alter column freshness_policy_seconds set not null;
alter table public.evidence_objects add constraint evidence_objects_freshness_policy_check check(freshness_policy_seconds between 60 and 31536000) not valid;
alter table public.evidence_objects add constraint evidence_objects_superseded_by_fk foreign key(superseded_by_evidence_id) references public.evidence_objects(evidence_id) on delete restrict not valid;
create index if not exists evidence_objects_runtime_due_idx on public.evidence_objects(enterprise_id,subject_id,expires_at) where revoked_at is null and superseded_by_evidence_id is null;

alter table public.subject_trust_state
  add column if not exists normalized_score integer,
  add column if not exists evidence_freshness text,
  add column if not exists policy_version text,
  add column if not exists last_evaluated_at timestamptz,
  add column if not exists next_evaluation_at timestamptz,
  add column if not exists current_risk_flags text[] not null default '{}',
  add column if not exists source_event_id uuid references public.trust_events(id) on delete restrict,
  add column if not exists decision_reason_summary text;
alter table public.subject_trust_state add constraint subject_trust_state_score_check check(normalized_score is null or normalized_score between 0 and 100) not valid;
alter table public.subject_trust_state add constraint subject_trust_state_freshness_check check(evidence_freshness is null or evidence_freshness in ('CURRENT','DEGRADED','STALE','EXPIRED','UNAVAILABLE')) not valid;
create index if not exists subject_trust_state_next_evaluation_idx on public.subject_trust_state(enterprise_id,next_evaluation_at,subject_id);

create table public.continuous_trust_assessments (
  assessment_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  state_decision_id uuid not null references public.trust_state_decisions(state_decision_id) on delete restrict,
  domain_key text not null,
  subject_id text not null,
  subject_type text not null,
  score integer not null check(score between 0 and 100),
  confidence integer not null check(confidence between 0 and 100),
  evidence_freshness text not null check(evidence_freshness in ('CURRENT','DEGRADED','STALE','EXPIRED','UNAVAILABLE')),
  transition_type text not null check(transition_type in ('INITIAL','UNCHANGED','DEGRADED','RESTORED','RECALCULATED')),
  policy_id text not null,
  policy_version text not null,
  source_event_id uuid references public.trust_events(id) on delete restrict,
  evidence_snapshot_hash text not null check(evidence_snapshot_hash ~ '^[a-f0-9]{64}$'),
  risk_flags text[] not null default '{}',
  reason_codes text[] not null default '{}',
  evidence_references text[] not null default '{}',
  next_evaluation_at timestamptz not null,
  assessment_hash text not null check(assessment_hash ~ '^[a-f0-9]{64}$'),
  evaluated_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,state_decision_id)
);
create index continuous_trust_assessments_subject_idx on public.continuous_trust_assessments(enterprise_id,subject_id,evaluated_at desc,assessment_id desc);

create table public.trust_drift_findings (
  drift_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  assessment_id uuid not null references public.continuous_trust_assessments(assessment_id) on delete restrict,
  subject_id text not null,
  drift_type text not null,
  severity text not null check(severity in ('informational','low','medium','high','critical')),
  rule_id text not null,
  reason_code text not null,
  evidence_references text[] not null default '{}',
  prior_value jsonb,
  current_value jsonb,
  detected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,assessment_id,rule_id,reason_code)
);
create index trust_drift_findings_subject_idx on public.trust_drift_findings(enterprise_id,subject_id,detected_at desc,drift_id desc);

-- Reuse and harden the existing alert table rather than creating a competing alert service.
alter table public.trust_alerts
  add column if not exists subject_reference text,
  add column if not exists severity text,
  add column if not exists detected_at timestamptz,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists triggering_event_id uuid references public.trust_events(id) on delete restrict,
  add column if not exists assessment_id uuid references public.continuous_trust_assessments(assessment_id) on delete restrict,
  add column if not exists drift_id uuid references public.trust_drift_findings(drift_id) on delete restrict,
  add column if not exists policy_id text,
  add column if not exists policy_version text,
  add column if not exists evidence_references text[] not null default '{}',
  add column if not exists remediation_guidance text,
  add column if not exists assigned_to uuid;
update public.trust_alerts set status=case status when 'active' then 'open' when 'in_review' then 'investigating' else status end, severity=coalesce(severity,risk_level,'medium'), detected_at=coalesce(detected_at,created_at), subject_reference=coalesce(subject_reference,subject_id::text);
alter table public.trust_alerts drop constraint if exists trust_alerts_status_check;
alter table public.trust_alerts add constraint trust_alerts_status_epic19_check check(status in ('open','acknowledged','investigating','resolved','dismissed'));
alter table public.trust_alerts drop constraint if exists trust_alerts_type_check;
alter table public.trust_alerts add constraint trust_alerts_type_epic19_check check(alert_type in ('live_trust_alert','behavioural_drift','verification_failure','suspicious_login','suspicious_activity','ai_agent_permission_escalation','workflow_anomaly','synthetic_identity_flag') or alert_type like 'continuous_%');
alter table public.trust_alerts add constraint trust_alerts_severity_epic19_check check(severity in ('informational','low','medium','high','critical')) not valid;
alter table public.trust_alerts add constraint trust_alerts_enterprise_fk foreign key(enterprise_id) references public.trust_workspaces(id) on delete cascade not valid;
create index if not exists trust_alerts_runtime_idx on public.trust_alerts(enterprise_id,status,severity,detected_at desc,id desc);

alter table public.evidence_graph_edges drop constraint if exists evidence_graph_edges_edge_type_check;
alter table public.evidence_graph_edges add constraint evidence_graph_edges_edge_type_epic19_check check(edge_type in ('ASSERTS','DERIVED_FROM','OBSERVED_BY','AUTHORIZED_BY','PARTICIPATED_IN','APPLIES_TO','SUPERSEDES','REVOKES','CONFLICTS_WITH','SUPPORTED','CHALLENGED','RESULTED_IN','TRIGGERED','ALERTED_BY','CORRELATED_WITH','REPLAYED_AS'));

do $$ declare table_name text; begin foreach table_name in array array['continuous_trust_assessments','trust_drift_findings'] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from anon,authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
end loop; end $$;
grant select on public.continuous_trust_assessments,public.trust_drift_findings to authenticated;
create policy "tenant reads continuous trust assessments" on public.continuous_trust_assessments for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads trust drift findings" on public.trust_drift_findings for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create trigger continuous_trust_assessments_append_only before update or delete on public.continuous_trust_assessments for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_drift_findings_append_only before update or delete on public.trust_drift_findings for each row execute function public.prevent_trust_architecture_history_mutation();

drop policy if exists "authenticated manage own trust alerts" on public.trust_alerts;
revoke insert,update,delete on public.trust_alerts from authenticated;
grant select on public.trust_alerts to authenticated;
create policy "tenant reads continuous trust alerts" on public.trust_alerts for select to authenticated using((enterprise_id is not null and public.user_can_access_trust_workspace(enterprise_id)) or (enterprise_id is null and created_by=auth.uid()));

create or replace function public.apply_continuous_trust_assessment_v1(p_contract jsonb,p_decision jsonb,p_trust_event jsonb,p_assessment jsonb,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid:=(p_assessment->>'enterpriseId')::uuid; assessment uuid:=(p_assessment->>'assessmentId')::uuid; result jsonb; finding jsonb; alert jsonb; subject_node uuid; alert_node uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Continuous Trust Runtime service path required'; end if;
  if exists(select 1 from public.continuous_trust_assessments where assessment_id=assessment and enterprise_id=enterprise) then return jsonb_build_object('status','DUPLICATE','assessmentId',assessment); end if;
  result:=public.apply_trust_state_decision_v1(p_contract,p_decision,p_trust_event,p_correlation_id);
  insert into public.continuous_trust_assessments(assessment_id,enterprise_id,state_decision_id,domain_key,subject_id,subject_type,score,confidence,evidence_freshness,transition_type,policy_id,policy_version,source_event_id,evidence_snapshot_hash,risk_flags,reason_codes,evidence_references,next_evaluation_at,assessment_hash,evaluated_at)
  values(assessment,enterprise,(p_decision->>'stateDecisionId')::uuid,p_assessment->>'domainKey',p_assessment->>'subjectId',p_assessment->>'subjectType',(p_assessment->>'score')::integer,(p_assessment->>'confidence')::integer,p_assessment->>'evidenceFreshness',p_assessment->>'transitionType',p_assessment->>'policyId',p_assessment->>'policyVersion',nullif(p_assessment->>'sourceEventId','')::uuid,p_assessment->>'evidenceSnapshotHash',array(select jsonb_array_elements_text(p_assessment->'riskFlags')),array(select jsonb_array_elements_text(p_assessment->'reasonCodes')),array(select jsonb_array_elements_text(p_assessment->'evidenceReferences')),(p_assessment->>'nextEvaluationAt')::timestamptz,p_assessment->>'assessmentHash',(p_assessment->>'evaluatedAt')::timestamptz);
  update public.subject_trust_state set normalized_score=(p_assessment->>'score')::integer,evidence_freshness=p_assessment->>'evidenceFreshness',policy_version=p_assessment->>'policyVersion',last_evaluated_at=(p_assessment->>'evaluatedAt')::timestamptz,next_evaluation_at=(p_assessment->>'nextEvaluationAt')::timestamptz,current_risk_flags=array(select jsonb_array_elements_text(p_assessment->'riskFlags')),source_event_id=nullif(p_assessment->>'sourceEventId','')::uuid,decision_reason_summary=left(array_to_string(array(select jsonb_array_elements_text(p_assessment->'reasonCodes')),', '),500) where enterprise_id=enterprise and subject_id=p_assessment->>'subjectId';
  for finding in select value from jsonb_array_elements(coalesce(p_assessment->'drift','[]'::jsonb)) loop
    insert into public.trust_drift_findings(drift_id,enterprise_id,assessment_id,subject_id,drift_type,severity,rule_id,reason_code,evidence_references,prior_value,current_value,detected_at)
    values((finding->>'driftId')::uuid,enterprise,assessment,p_assessment->>'subjectId',finding->>'driftType',finding->>'severity',finding->>'ruleId',finding->>'reasonCode',array(select jsonb_array_elements_text(finding->'evidenceReferences')),finding->'priorValue',finding->'currentValue',(finding->>'detectedAt')::timestamptz) on conflict do nothing;
  end loop;
  select node_id into subject_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='SUBJECT' and external_id=p_assessment->>'subjectId';
  for alert in select value from jsonb_array_elements(coalesce(p_assessment->'alerts','[]'::jsonb)) loop
    insert into public.trust_alerts(id,alert_type,status,subject_type,subject_reference,enterprise_id,alert_title,alert_description,risk_level,severity,source,metadata,detected_at,triggering_event_id,assessment_id,drift_id,policy_id,policy_version,evidence_references,remediation_guidance)
    values((alert->>'alertId')::uuid,alert->>'alertType','open',p_assessment->>'subjectType',p_assessment->>'subjectId',enterprise,'Continuous trust drift detected',alert->>'remediationGuidance',alert->>'severity',alert->>'severity','continuous_trust_runtime',jsonb_build_object('ruleBound',true),now(),nullif(p_assessment->>'sourceEventId','')::uuid,assessment,(alert->>'driftId')::uuid,p_assessment->>'policyId',p_assessment->>'policyVersion',array(select jsonb_array_elements_text(alert->'evidenceReferences')),alert->>'remediationGuidance') on conflict(id) do nothing;
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values(enterprise,'ALERT',alert->>'alertId',p_assessment->>'domainKey','Continuous trust alert',jsonb_build_object('severity',alert->>'severity','state','open')) on conflict do nothing;
    select node_id into alert_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='ALERT' and external_id=alert->>'alertId';
    if subject_node is not null and alert_node is not null then insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,subject_node,alert_node,'ALERTED_BY') on conflict do nothing; end if;
  end loop;
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary) values(enterprise,p_assessment->>'subjectId',p_assessment->>'domainKey','CONTINUOUS_TRUST_ASSESSMENT',assessment::text,(p_assessment->>'evaluatedAt')::timestamptz,jsonb_build_object('score',p_assessment->>'score','confidence',p_assessment->>'confidence','freshness',p_assessment->>'evidenceFreshness','transitionType',p_assessment->>'transitionType','reasonCodes',p_assessment->'reasonCodes','riskFlags',p_assessment->'riskFlags')) on conflict do nothing;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(enterprise,'CONTINUOUS_TRUST_ASSESSMENT_APPLIED','system:continuous-trust-runtime','CONTINUOUS_TRUST_ASSESSMENT',assessment::text,p_correlation_id,jsonb_build_object('durationMs',coalesce((p_assessment->>'evaluationDurationMs')::integer,0),'driftCount',jsonb_array_length(coalesce(p_assessment->'drift','[]'::jsonb)),'alertCount',jsonb_array_length(coalesce(p_assessment->'alerts','[]'::jsonb)),'staleEvidenceCount',coalesce((p_assessment->>'staleEvidenceCount')::integer,0)));
  return result||jsonb_build_object('assessmentId',assessment);
end $$;
revoke all on function public.apply_continuous_trust_assessment_v1(jsonb,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.apply_continuous_trust_assessment_v1(jsonb,jsonb,jsonb,jsonb,uuid) to service_role;

create or replace function public.transition_continuous_trust_alert_v1(p_enterprise_id uuid,p_alert_id uuid,p_actor_id uuid,p_next_state text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_state text; updated public.trust_alerts%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'Continuous Trust alert service path required'; end if;
  if p_next_state not in ('acknowledged','investigating','resolved','dismissed') then raise exception 'Invalid alert state'; end if;
  select status into current_state from public.trust_alerts where id=p_alert_id and enterprise_id=p_enterprise_id for update;
  if current_state is null then raise exception 'Alert not found'; end if;
  if current_state in ('resolved','dismissed') and p_next_state<>current_state then raise exception 'Closed alert transition denied'; end if;
  update public.trust_alerts set status=p_next_state,reviewed_by=p_actor_id::text,acknowledged_at=case when p_next_state='acknowledged' then coalesce(acknowledged_at,now()) else acknowledged_at end,resolved_at=case when p_next_state in ('resolved','dismissed') then coalesce(resolved_at,now()) else resolved_at end,metadata=metadata||jsonb_build_object('resolutionNote',left(coalesce(p_note,''),500)),updated_at=now() where id=p_alert_id and enterprise_id=p_enterprise_id returning * into updated;
  return jsonb_build_object('id',updated.id,'status',updated.status,'acknowledgedAt',updated.acknowledged_at,'resolvedAt',updated.resolved_at);
end $$;
revoke all on function public.transition_continuous_trust_alert_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.transition_continuous_trust_alert_v1(uuid,uuid,uuid,text,text) to service_role;

comment on table public.continuous_trust_assessments is 'Immutable continuous assessment context linked to the authoritative Trust State decision.';
comment on table public.trust_drift_findings is 'Rule-bound drift findings; not an unstructured log and never an authorization authority.';
comment on function public.apply_continuous_trust_assessment_v1(jsonb,jsonb,jsonb,jsonb,uuid) is 'Calls the sole Trust State mutation boundary, then atomically projects assessment, drift, alerts, memory and graph context.';
