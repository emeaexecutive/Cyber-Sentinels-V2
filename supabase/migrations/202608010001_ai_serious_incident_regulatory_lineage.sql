-- EPIC 27: AI serious-incident evidence and regulatory reporting lineage.
-- Development migration only. Forward-only, tenant-scoped, and not applied by this change.

create extension if not exists pgcrypto;

create table public.incident_regulatory_assessments (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  ai_system_id text not null,
  agent_id text not null,
  incident_category text not null,
  jurisdiction text not null,
  initial_state text not null check(initial_state in ('draft','evidence_collection')),
  canonical_case jsonb not null check(jsonb_typeof(canonical_case)='object'),
  immutable_hash text not null check(immutable_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null,
  correlation_id uuid not null,
  created_at timestamptz not null,
  unique(enterprise_id,id),
  unique(enterprise_id,correlation_id)
);
create index incident_assessment_state_idx on public.incident_regulatory_assessments(enterprise_id,initial_state,created_at desc);
create index incident_assessment_system_idx on public.incident_regulatory_assessments(enterprise_id,ai_system_id,created_at desc);

create table public.incident_responsibility_roles (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  role_type text not null check(role_type in ('model_provider','system_provider','deployer','agent_developer','application_owner','system_owner','incident_owner','evaluation_sponsor','evaluation_operator','infrastructure_provider','sandbox_or_harness_provider','runtime_security_provider','identity_provider','access_provider','affected_customer','affected_third_party','incident_responder','technical_reviewer','security_reviewer','compliance_reviewer','legal_reviewer','data_protection_reviewer','external_adviser','regulator_liaison','executive_approver')),
  party_type text not null check(party_type in ('organization','human','provider','system')),
  party_reference text not null,
  authority_reference text,
  assigned_at timestamptz not null,
  assigned_by text not null,
  supersedes_role_id uuid,
  superseded_at timestamptz,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_role_id) references public.incident_responsibility_roles(enterprise_id,id) on delete restrict,
  check(supersedes_role_id is null or supersedes_role_id<>id)
);
create index incident_responsibility_party_idx on public.incident_responsibility_roles(enterprise_id,incident_id,party_reference,role_type) where superseded_at is null;

create table public.incident_chronology_events (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  event_type text not null,
  source text not null,
  source_type text not null,
  source_authority text not null,
  occurred_at timestamptz not null,
  timestamp_confidence text not null check(timestamp_confidence in ('confirmed','high','medium','low','unknown')),
  ingested_at timestamptz not null,
  ordering_confidence text not null check(ordering_confidence in ('confirmed','high','medium','low','unknown')),
  evidence_reference text,
  integrity_state text not null check(integrity_state in ('verified','unverified','invalid','unknown')),
  classification text not null check(classification in ('TECHNICAL EVIDENCE','PROVIDER ASSERTION','PROVIDER CONCLUSION','CYBER SENTINELS OPERATIONAL SCREENING','REVIEWER DECISION','LEGAL CONCLUSION','REGULATOR RESPONSE','CORRECTIVE ACTION')),
  summary text not null,
  containment_state text check(containment_state is null or containment_state in ('recommended','approved','requested','provider_acknowledged','attempted','provider_confirmed','independently_confirmed','partially_effective','failed','contradicted','outcome_unknown')),
  deadline_metadata jsonb check(deadline_metadata is null or (jsonb_typeof(deadline_metadata)='object' and deadline_metadata->>'sourceType' in ('reviewer_supplied','policy_supplied','externally_supplied') and nullif(deadline_metadata->>'ruleSource','') is not null and nullif(deadline_metadata->>'rationale','') is not null and nullif(deadline_metadata->>'timezone','') is not null and nullif(deadline_metadata->>'approvedBy','') is not null)),
  correlation_id uuid not null,
  supersedes_event_id uuid,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id),
  unique(enterprise_id,incident_id,correlation_id,event_type),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_event_id) references public.incident_chronology_events(enterprise_id,id) on delete restrict,
  check(supersedes_event_id is null or supersedes_event_id<>id),
  check(ingested_at>=occurred_at or ordering_confidence in ('low','unknown')),
  check(containment_state not in ('provider_confirmed','independently_confirmed','partially_effective','failed','contradicted') or evidence_reference is not null)
);
create index incident_chronology_idx on public.incident_chronology_events(enterprise_id,incident_id,occurred_at,id);

create table public.incident_evidence_snapshots (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  captured_at timestamptz not null,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  snapshot_digest text not null check(snapshot_digest ~ '^[a-f0-9]{64}$'),
  supersedes_snapshot_id uuid,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,id),
  unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_snapshot_id) references public.incident_evidence_snapshots(enterprise_id,id) on delete restrict,
  check(supersedes_snapshot_id is null or supersedes_snapshot_id<>id),
  check(not (snapshot ?| array['password','secret','token','cookie','credential','private_key','raw_payload','exploit_payload','full_prompt']))
);
create index incident_snapshot_idx on public.incident_evidence_snapshots(enterprise_id,incident_id,captured_at desc);

create table public.incident_impact_assessments (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  categories jsonb not null check(jsonb_typeof(categories)='array'),
  assessment jsonb not null check(jsonb_typeof(assessment)='object'),
  confidence text not null check(confidence in ('confirmed','high','medium','low','unknown')),
  independent_confirmation boolean not null,
  reviewer_confirmed boolean not null,
  assessed_at timestamptz not null,
  supersedes_impact_id uuid,
  correlation_id uuid not null,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_impact_id) references public.incident_impact_assessments(enterprise_id,id) on delete restrict,
  check(supersedes_impact_id is null or supersedes_impact_id<>id)
);
create index incident_impact_idx on public.incident_impact_assessments(enterprise_id,incident_id,assessed_at desc);

create table public.incident_regulatory_trigger_findings (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  outcome text not null check(outcome in ('no_known_trigger','potential_trigger','multiple_potential_triggers','insufficient_information','specialist_review_required')),
  label text not null check(label='OPERATIONAL SCREENING — NOT A LEGAL CONCLUSION'),
  reason_codes jsonb not null check(jsonb_typeof(reason_codes)='array'),
  potential_triggers jsonb not null check(jsonb_typeof(potential_triggers)='array'),
  missing_evidence jsonb not null check(jsonb_typeof(missing_evidence)='array'),
  recommended_reviewer_roles jsonb not null check(jsonb_typeof(recommended_reviewer_roles)='array'),
  policy_id text not null, policy_version text not null,
  evaluated_at timestamptz not null,
  result_digest text not null check(result_digest ~ '^[a-f0-9]{64}$'),
  supersedes_finding_id uuid,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_finding_id) references public.incident_regulatory_trigger_findings(enterprise_id,id) on delete restrict,
  check(supersedes_finding_id is null or supersedes_finding_id<>id)
);
create index incident_trigger_idx on public.incident_regulatory_trigger_findings(enterprise_id,incident_id,evaluated_at desc);

create table public.incident_reviewer_decisions (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  reviewer_id uuid not null,
  reviewer_role text not null check(reviewer_role in ('technical_reviewer','security_reviewer','system_owner','compliance_reviewer','legal_reviewer','data_protection_reviewer','executive_approver','external_adviser','regulator_liaison')),
  organizational_authority text not null,
  decision_type text not null check(decision_type in ('technical_finding','impact_assessment','regulatory_relevance_assessment','reporting_decision','submission_approval','corrective_action_approval','closure_approval','reopening_decision')),
  decision text not null,
  target_state text,
  approved_package_id uuid,
  rationale text not null,
  evidence_references jsonb not null check(jsonb_typeof(evidence_references)='array'),
  unresolved_issues jsonb not null check(jsonb_typeof(unresolved_issues)='array'),
  conditions jsonb not null check(jsonb_typeof(conditions)='array'),
  approval_chain jsonb not null check(jsonb_typeof(approval_chain)='array'),
  conflict_of_interest_declared boolean,
  decided_at timestamptz not null,
  supersedes_decision_id uuid,
  correlation_id uuid not null,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_decision_id) references public.incident_reviewer_decisions(enterprise_id,id) on delete restrict,
  check(supersedes_decision_id is null or supersedes_decision_id<>id)
);
create index incident_reviewer_decision_idx on public.incident_reviewer_decisions(enterprise_id,incident_id,decided_at desc);

create table public.incident_submission_packages (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  version integer not null check(version>0),
  state text not null check(state in ('internal_draft','reviewer_approved','regulator_ready','submitted','superseded')),
  package_payload jsonb not null check(jsonb_typeof(package_payload)='object'),
  package_digest text not null check(package_digest ~ '^[a-f0-9]{64}$'),
  export_schema_version text not null,
  exported_at timestamptz not null,
  approved_by_decision_id uuid,
  supersedes_package_id uuid,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,incident_id,version), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,approved_by_decision_id) references public.incident_reviewer_decisions(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_package_id) references public.incident_submission_packages(enterprise_id,id) on delete restrict,
  check(supersedes_package_id is null or supersedes_package_id<>id),
  check(state='internal_draft' or approved_by_decision_id is not null),
  check(not (package_payload ?| array['password','secret','token','cookie','credential','private_key','raw_payload','exploit_payload','full_prompt']))
);
create index incident_package_idx on public.incident_submission_packages(enterprise_id,incident_id,version desc);
alter table public.incident_reviewer_decisions add constraint incident_reviewer_decision_approved_package_fk foreign key(enterprise_id,approved_package_id) references public.incident_submission_packages(enterprise_id,id) on delete restrict;

create table public.incident_external_submissions (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  package_id uuid not null,
  state text not null check(state in ('prepared','internally_approved','transferred','acknowledged','rejected','returned_for_clarification','supplemented','closed')),
  destination_authority text not null, jurisdiction text not null, submission_channel text not null,
  external_reference text, submitted_at timestamptz, submitting_actor text,
  package_version integer not null, package_digest text not null check(package_digest ~ '^[a-f0-9]{64}$'),
  acknowledgement_reference text, acknowledgement_at timestamptz, follow_up_deadline timestamptz,
  limitations jsonb not null check(jsonb_typeof(limitations)='array'),
  supersedes_submission_id uuid,
  correlation_id uuid not null,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,package_id) references public.incident_submission_packages(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_submission_id) references public.incident_external_submissions(enterprise_id,id) on delete restrict,
  check(supersedes_submission_id is null or supersedes_submission_id<>id)
);
create index incident_submission_idx on public.incident_external_submissions(enterprise_id,incident_id,submitted_at desc nulls last);

create table public.incident_corrective_actions (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  action_type text not null, action_owner text not null, accountable_approver text not null,
  target_date timestamptz, completion_date timestamptz,
  completion_evidence_references jsonb not null check(jsonb_typeof(completion_evidence_references)='array'),
  validation_evidence_references jsonb not null check(jsonb_typeof(validation_evidence_references)='array'),
  residual_risk text not null,
  reviewer_approval_decision_id uuid,
  effectiveness_state text not null check(effectiveness_state in ('planned','in_progress','completed_unvalidated','validated','ineffective','unknown')),
  linked_contradiction_reference text, linked_finding_reference text, linked_package_reference text,
  supersedes_corrective_action_id uuid,
  correlation_id uuid not null,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,reviewer_approval_decision_id) references public.incident_reviewer_decisions(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_corrective_action_id) references public.incident_corrective_actions(enterprise_id,id) on delete restrict,
  check(supersedes_corrective_action_id is null or supersedes_corrective_action_id<>id),
  check(effectiveness_state not in ('completed_unvalidated','validated') or jsonb_array_length(completion_evidence_references)>0),
  check(effectiveness_state<>'validated' or jsonb_array_length(validation_evidence_references)>0)
);
create index incident_corrective_action_idx on public.incident_corrective_actions(enterprise_id,incident_id,effectiveness_state,created_at desc);

create table public.incident_evidence_supersessions (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  incident_id uuid not null,
  record_type text not null, original_record_id uuid not null, corrected_record_id uuid not null,
  correction_reason text not null, correcting_actor uuid not null, evidence_references jsonb not null check(jsonb_typeof(evidence_references)='array'),
  approved_by_decision_id uuid, corrected_at timestamptz not null, correlation_id uuid not null,
  record_hash text not null check(record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,id), unique(enterprise_id,record_type,original_record_id,corrected_record_id), unique(enterprise_id,incident_id,correlation_id),
  foreign key(enterprise_id,incident_id) references public.incident_regulatory_assessments(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,approved_by_decision_id) references public.incident_reviewer_decisions(enterprise_id,id) on delete restrict,
  check(original_record_id<>corrected_record_id)
);

-- The canonical Evidence Graph is extended; no second graph is created.
alter table public.evidence_graph_edges drop constraint if exists evidence_graph_edges_edge_type_check;
alter table public.evidence_graph_edges add constraint evidence_graph_edges_edge_type_check check(edge_type in (
  'ASSERTS','DERIVED_FROM','OBSERVED_BY','AUTHORIZED_BY','PARTICIPATED_IN','APPLIES_TO','SUPERSEDES','REVOKES','CONFLICTS_WITH','SUPPORTED','CHALLENGED','RESULTED_IN',
  'INVOLVES','OPERATED_AS','RAN_IN','CONTRADICTS','CAUSED_OR_PRECEDED','DETECTED_BY','AFFECTED','CONTAINMENT_REQUESTED','ACKNOWLEDGED_BY','CONFIRMED_BY','INDEPENDENTLY_CONFIRMED_BY','SUPPORTS_TRIGGER','REVIEWED_BY','DECIDED_BY','INCLUDED_IN_PACKAGE','SUBMITTED_TO','CORRECTED_BY','REMEDIATED_BY','VALIDATED_BY','RECORDED_IN_MEMORY','RECONSTRUCTED_BY_REPLAY'
));

do $$ declare table_name text; begin
  foreach table_name in array array[
    'incident_regulatory_assessments','incident_responsibility_roles','incident_chronology_events','incident_evidence_snapshots','incident_impact_assessments',
    'incident_regulatory_trigger_findings','incident_reviewer_decisions','incident_submission_packages','incident_external_submissions','incident_corrective_actions','incident_evidence_supersessions'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon,authenticated',table_name);
    execute format('grant all privileges on public.%I to service_role',table_name);
    execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id))','tenant reads '||table_name,table_name);
  end loop;
end $$;
grant select on public.incident_regulatory_assessments,public.incident_responsibility_roles,public.incident_chronology_events,public.incident_evidence_snapshots,public.incident_impact_assessments,public.incident_regulatory_trigger_findings,public.incident_reviewer_decisions,public.incident_submission_packages,public.incident_external_submissions,public.incident_corrective_actions,public.incident_evidence_supersessions to authenticated;

create or replace function public.prevent_serious_incident_history_mutation() returns trigger language plpgsql security definer set search_path=public as $$
begin raise exception 'Serious-incident evidence is append-only; create a correction or superseding record'; end $$;
revoke all on function public.prevent_serious_incident_history_mutation() from public,anon,authenticated;
do $$ declare table_name text; begin foreach table_name in array array['incident_regulatory_assessments','incident_responsibility_roles','incident_chronology_events','incident_evidence_snapshots','incident_impact_assessments','incident_regulatory_trigger_findings','incident_reviewer_decisions','incident_submission_packages','incident_external_submissions','incident_corrective_actions','incident_evidence_supersessions'] loop execute format('create trigger %I_serious_incident_append_only before update or delete on public.%I for each row execute function public.prevent_serious_incident_history_mutation()',table_name,table_name); end loop; end $$;

create or replace view public.incident_reporting_replay with (security_invoker=true) as
select id,enterprise_id,incident_id,event_type as stage,classification,source_type,source as source_identity,occurred_at,timestamp_confidence,ordering_confidence,evidence_reference,integrity_state,correlation_id,summary,true as evidenced from public.incident_chronology_events
union all
select id,enterprise_id,incident_id,'potential_regulatory_relevance','CYBER SENTINELS OPERATIONAL SCREENING','deterministic_operational_screening','Cyber Sentinels',evaluated_at,'confirmed','high','screening:'||id::text,'verified',correlation_id,label||': '||outcome,true from public.incident_regulatory_trigger_findings
union all
select id,enterprise_id,incident_id,decision_type,case when reviewer_role='legal_reviewer' then 'LEGAL CONCLUSION' else 'REVIEWER DECISION' end,'authorized_reviewer',reviewer_id::text,decided_at,'confirmed','high','decision:'||id::text,'verified',correlation_id,decision,true from public.incident_reviewer_decisions
union all
select id,enterprise_id,incident_id,'submission_package','REVIEWER DECISION','evidence_package','package:'||id::text,exported_at,'confirmed','high','package:'||id::text,'verified',correlation_id,'Evidence package version '||version::text||' recorded as '||state,true from public.incident_submission_packages
union all
select id,enterprise_id,incident_id,'external_submission','REGULATOR RESPONSE','external_submission_record',destination_authority,coalesce(submitted_at,created_at),'confirmed','high','submission:'||id::text,'verified',correlation_id,'External submission state: '||state,true from public.incident_external_submissions
union all
select id,enterprise_id,incident_id,'corrective_action','CORRECTIVE ACTION','corrective_action',action_owner,created_at,'confirmed','high','corrective-action:'||id::text,'verified',correlation_id,action_type||': '||effectiveness_state,true from public.incident_corrective_actions;
revoke all on public.incident_reporting_replay from anon,authenticated;
grant select on public.incident_reporting_replay to authenticated;

create or replace function public.persist_serious_incident_case_v1(p_case jsonb,p_screening jsonb,p_artifacts jsonb,p_actor_id uuid,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid := (p_case->>'enterpriseId')::uuid; incident uuid := (p_case->>'id')::uuid; case_hash text := encode(digest(convert_to(p_case::text,'UTF8'),'sha256'),'hex'); item jsonb; item_hash text; incident_node uuid; system_node uuid; snapshot_node uuid; trigger_node uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||incident::text,0));
  if exists(select 1 from public.incident_regulatory_assessments where enterprise_id=enterprise and id=incident) then
    if exists(select 1 from public.incident_regulatory_assessments where enterprise_id=enterprise and id=incident and immutable_hash=case_hash) then return jsonb_build_object('incidentId',incident,'idempotentReplay',true); end if;
    raise exception 'Conflicting serious-incident identifier';
  end if;
  insert into public.incident_regulatory_assessments(id,enterprise_id,ai_system_id,agent_id,incident_category,jurisdiction,initial_state,canonical_case,immutable_hash,created_by,correlation_id,created_at)
  values(incident,enterprise,p_case#>>'{identity,aiSystemId}',p_case#>>'{identity,agentId}',p_case#>>'{regulatoryContext,incidentCategory}',p_case#>>'{regulatoryContext,jurisdiction}',p_case->>'state',p_case,case_hash,p_actor_id,p_correlation_id,(p_case->>'createdAt')::timestamptz);
  for item in select value from jsonb_array_elements(p_case->'responsibilityRoles') loop
    item_hash:=encode(digest(convert_to(item::text,'UTF8'),'sha256'),'hex');
    insert into public.incident_responsibility_roles(id,enterprise_id,incident_id,role_type,party_type,party_reference,authority_reference,assigned_at,assigned_by,supersedes_role_id,record_hash)
    values((item->>'id')::uuid,enterprise,incident,item->>'roleType',item->>'partyType',item->>'partyReference',nullif(item->>'authorityReference',''),(item->>'assignedAt')::timestamptz,item->>'assignedBy',nullif(item->>'supersedesRoleId','')::uuid,item_hash);
  end loop;
  insert into public.incident_evidence_snapshots(id,enterprise_id,incident_id,captured_at,snapshot,snapshot_digest,supersedes_snapshot_id,correlation_id)
  values((p_case#>>'{evidenceSnapshot,id}')::uuid,enterprise,incident,(p_case#>>'{evidenceSnapshot,capturedAt}')::timestamptz,p_case->'evidenceSnapshot',encode(digest(convert_to((p_case->'evidenceSnapshot')::text,'UTF8'),'sha256'),'hex'),nullif(p_case#>>'{evidenceSnapshot,supersedesSnapshotId}','')::uuid,p_correlation_id);
  insert into public.incident_regulatory_trigger_findings(id,enterprise_id,incident_id,outcome,label,reason_codes,potential_triggers,missing_evidence,recommended_reviewer_roles,policy_id,policy_version,evaluated_at,result_digest,correlation_id)
  values((p_screening->>'id')::uuid,enterprise,incident,p_screening->>'outcome',p_screening->>'label',p_screening->'reasonCodes',p_screening->'potentialTriggers',p_screening->'missingEvidence',p_screening->'recommendedReviewerRoles',p_screening->>'policyId',p_screening->>'policyVersion',(p_screening->>'evaluatedAt')::timestamptz,p_screening->>'resultDigest',p_correlation_id);
  for item in select value from jsonb_array_elements(p_artifacts->'replay') loop
    item_hash:=encode(digest(convert_to(item::text,'UTF8'),'sha256'),'hex');
    insert into public.incident_chronology_events(id,enterprise_id,incident_id,event_type,source,source_type,source_authority,occurred_at,timestamp_confidence,ingested_at,ordering_confidence,evidence_reference,integrity_state,classification,summary,containment_state,deadline_metadata,correlation_id,supersedes_event_id,record_hash)
    values((item->>'id')::uuid,enterprise,incident,item->>'eventType',item->>'source',item->>'sourceType',item->>'sourceAuthority',(item->>'occurredAt')::timestamptz,item->>'timestampConfidence',(item->>'ingestedAt')::timestamptz,item->>'orderingConfidence',nullif(item->>'evidenceReference',''),item->>'integrityState',item->>'classification',item->>'summary',nullif(item->>'containmentState',''),item->'deadlineMetadata',(item->>'correlationId')::uuid,nullif(item->>'supersedesEventId','')::uuid,item_hash)
    on conflict(enterprise_id,incident_id,correlation_id,event_type) do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_artifacts->'trustMemory') loop
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary) values(enterprise,item->>'subject','GOVERNANCE',upper(item->>'eventKind'),incident::text||':'||item->>'eventKind',(item->>'occurredAt')::timestamptz,jsonb_build_object('incidentId',incident,'evidenceReferences',item->'evidenceReferences','decisionAuthority',item->'decisionAuthority','reason',item->>'reason')) on conflict do nothing;
  end loop;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values
    (enterprise,'INCIDENT',incident::text,'GOVERNANCE',p_case#>>'{regulatoryContext,incidentCategory}',jsonb_build_object('jurisdiction',p_case#>>'{regulatoryContext,jurisdiction}')),
    (enterprise,'AI_SYSTEM',p_case#>>'{identity,aiSystemId}','IDENTITY',p_case#>>'{identity,aiSystemId}',jsonb_build_object('modelVersion',p_case#>>'{identity,modelVersion}')),
    (enterprise,'INCIDENT_EVIDENCE_SNAPSHOT',p_case#>>'{evidenceSnapshot,id}','EVIDENCE','Evidence at incident','{}'),
    (enterprise,'REGULATORY_TRIGGER_FINDING',p_screening->>'id','GOVERNANCE',p_screening->>'outcome',jsonb_build_object('legalConclusion',false)) on conflict do nothing;
  select node_id into incident_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='INCIDENT' and external_id=incident::text;
  select node_id into system_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='AI_SYSTEM' and external_id=p_case#>>'{identity,aiSystemId}';
  select node_id into snapshot_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='INCIDENT_EVIDENCE_SNAPSHOT' and external_id=p_case#>>'{evidenceSnapshot,id}';
  select node_id into trigger_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='REGULATORY_TRIGGER_FINDING' and external_id=p_screening->>'id';
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,incident_node,system_node,'INVOLVES'),(enterprise,incident_node,snapshot_node,'OBSERVED_BY'),(enterprise,trigger_node,incident_node,'SUPPORTS_TRIGGER') on conflict do nothing;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(enterprise,'SERIOUS_INCIDENT_OPENED','user:'||p_actor_id::text,'INCIDENT',incident::text,p_correlation_id,jsonb_build_object('screeningOutcome',p_screening->>'outcome','caseHash',case_hash));
  return jsonb_build_object('incidentId',incident,'screeningId',p_screening->>'id','idempotentReplay',false);
end $$;
revoke all on function public.persist_serious_incident_case_v1(jsonb,jsonb,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.persist_serious_incident_case_v1(jsonb,jsonb,jsonb,uuid,uuid) to service_role;

create or replace function public.append_serious_incident_record_v1(p_enterprise_id uuid,p_incident_id uuid,p_kind text,p_record jsonb,p_actor_id uuid,p_correlation_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare record_id uuid := (p_record->>'id')::uuid; record_hash text := encode(digest(convert_to(p_record::text,'UTF8'),'sha256'),'hex'); existing_hash text; role_value text; package_row public.incident_submission_packages%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.incident_regulatory_assessments where enterprise_id=p_enterprise_id and id=p_incident_id) then raise exception 'Incident not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||p_incident_id::text||p_kind||p_correlation_id::text,0));
  if p_kind='chronology' then select e.record_hash into existing_hash from public.incident_chronology_events e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id and e.event_type=p_record->>'eventType';
  elsif p_kind='impact' then select e.record_hash into existing_hash from public.incident_impact_assessments e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  elsif p_kind='reviewer_decision' then select e.record_hash into existing_hash from public.incident_reviewer_decisions e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  elsif p_kind='submission_package' then select e.package_digest into existing_hash from public.incident_submission_packages e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  elsif p_kind='external_submission' then select e.record_hash into existing_hash from public.incident_external_submissions e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  elsif p_kind='corrective_action' then select e.record_hash into existing_hash from public.incident_corrective_actions e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  elsif p_kind='evidence_snapshot' then select e.snapshot_digest into existing_hash from public.incident_evidence_snapshots e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  elsif p_kind='evidence_supersession' then select e.record_hash into existing_hash from public.incident_evidence_supersessions e where e.enterprise_id=p_enterprise_id and e.incident_id=p_incident_id and e.correlation_id=p_correlation_id;
  end if;
  if existing_hash is not null then
    if existing_hash=case when p_kind='submission_package' then p_record->>'packageDigest' when p_kind='evidence_snapshot' then encode(digest(convert_to(p_record::text,'UTF8'),'sha256'),'hex') else record_hash end then return jsonb_build_object('incidentId',p_incident_id,'recordId',record_id,'kind',p_kind,'idempotentReplay',true); end if;
    raise exception 'Serious-incident idempotency conflict';
  end if;
  if p_kind='chronology' then
    insert into public.incident_chronology_events(id,enterprise_id,incident_id,event_type,source,source_type,source_authority,occurred_at,timestamp_confidence,ingested_at,ordering_confidence,evidence_reference,integrity_state,classification,summary,containment_state,deadline_metadata,correlation_id,supersedes_event_id,record_hash)
    values(record_id,p_enterprise_id,p_incident_id,p_record->>'eventType',p_record->>'source',p_record->>'sourceType',p_record->>'sourceAuthority',(p_record->>'occurredAt')::timestamptz,p_record->>'timestampConfidence',(p_record->>'ingestedAt')::timestamptz,p_record->>'orderingConfidence',nullif(p_record->>'evidenceReference',''),p_record->>'integrityState',p_record->>'classification',p_record->>'summary',nullif(p_record->>'containmentState',''),p_record->'deadlineMetadata',p_correlation_id,nullif(p_record->>'supersedesEventId','')::uuid,record_hash);
  elsif p_kind='impact' then
    insert into public.incident_impact_assessments(id,enterprise_id,incident_id,categories,assessment,confidence,independent_confirmation,reviewer_confirmed,assessed_at,supersedes_impact_id,correlation_id,record_hash)
    values(record_id,p_enterprise_id,p_incident_id,p_record->'categories',p_record,p_record->>'confidence',(p_record->>'independentConfirmation')::boolean,(p_record->>'reviewerConfirmed')::boolean,(p_record->>'assessedAt')::timestamptz,nullif(p_record->>'supersedesImpactId','')::uuid,p_correlation_id,record_hash);
  elsif p_kind='reviewer_decision' then
    role_value:=p_record->>'reviewerRole';
    if not exists(select 1 from public.incident_responsibility_roles where enterprise_id=p_enterprise_id and incident_id=p_incident_id and party_reference=p_actor_id::text and role_type=role_value and superseded_at is null) then raise exception 'Reviewer assignment required'; end if;
    if (p_record->>'targetState') in ('reporting_required','not_reportable','submitted','resolved') and role_value not in ('legal_reviewer','compliance_reviewer','data_protection_reviewer','executive_approver') then raise exception 'Protected state reviewer required'; end if;
    if p_record->>'targetState'='submitted' and (not exists(select 1 from public.incident_submission_packages where enterprise_id=p_enterprise_id and incident_id=p_incident_id and id=(p_record->>'approvedPackageId')::uuid and state in ('reviewer_approved','regulator_ready','submitted')) or not exists(select 1 from public.incident_external_submissions where enterprise_id=p_enterprise_id and incident_id=p_incident_id and package_id=(p_record->>'approvedPackageId')::uuid and state in ('transferred','acknowledged','supplemented','closed'))) then raise exception 'Submitted state requires approved package and external submission evidence'; end if;
    insert into public.incident_reviewer_decisions(id,enterprise_id,incident_id,reviewer_id,reviewer_role,organizational_authority,decision_type,decision,target_state,approved_package_id,rationale,evidence_references,unresolved_issues,conditions,approval_chain,conflict_of_interest_declared,decided_at,supersedes_decision_id,correlation_id,record_hash)
    values(record_id,p_enterprise_id,p_incident_id,p_actor_id,role_value,p_record->>'organizationalAuthority',p_record->>'decisionType',p_record->>'decision',nullif(p_record->>'targetState',''),nullif(p_record->>'approvedPackageId','')::uuid,p_record->>'rationale',p_record->'evidenceReferences',p_record->'unresolvedIssues',p_record->'conditions',p_record->'approvalChain',nullif(p_record->>'conflictOfInterestDeclared','')::boolean,(p_record->>'decidedAt')::timestamptz,nullif(p_record->>'supersedesDecisionId','')::uuid,p_correlation_id,record_hash);
  elsif p_kind='submission_package' then
    if p_record->>'state'<>'internal_draft' and not exists(select 1 from public.incident_reviewer_decisions where enterprise_id=p_enterprise_id and incident_id=p_incident_id and id=(p_record->>'approvedByDecisionId')::uuid and decision_type='submission_approval' and reviewer_role in ('compliance_reviewer','legal_reviewer','executive_approver')) then raise exception 'Authorized package approval required'; end if;
    insert into public.incident_submission_packages(id,enterprise_id,incident_id,version,state,package_payload,package_digest,export_schema_version,exported_at,approved_by_decision_id,supersedes_package_id,correlation_id)
    values(record_id,p_enterprise_id,p_incident_id,(p_record->>'version')::integer,p_record->>'state',p_record->'machineReadable',p_record->>'packageDigest',p_record->>'exportSchemaVersion',(p_record->>'exportedAt')::timestamptz,nullif(p_record->>'approvedByDecisionId','')::uuid,nullif(p_record->>'supersedesPackageId','')::uuid,p_correlation_id);
  elsif p_kind='external_submission' then
    if not exists(select 1 from public.incident_responsibility_roles where enterprise_id=p_enterprise_id and incident_id=p_incident_id and party_reference=p_actor_id::text and role_type in ('regulator_liaison','executive_approver') and superseded_at is null) then raise exception 'Authorized submission actor required'; end if;
    select * into package_row from public.incident_submission_packages where enterprise_id=p_enterprise_id and incident_id=p_incident_id and id=(p_record->>'packageId')::uuid;
    if package_row.id is null or package_row.state not in ('reviewer_approved','regulator_ready','submitted') or package_row.package_digest<>p_record->>'packageDigest' then raise exception 'Approved immutable package required'; end if;
    insert into public.incident_external_submissions(id,enterprise_id,incident_id,package_id,state,destination_authority,jurisdiction,submission_channel,external_reference,submitted_at,submitting_actor,package_version,package_digest,acknowledgement_reference,acknowledgement_at,follow_up_deadline,limitations,supersedes_submission_id,correlation_id,record_hash)
    values(record_id,p_enterprise_id,p_incident_id,(p_record->>'packageId')::uuid,p_record->>'state',p_record->>'destinationAuthority',p_record->>'jurisdiction',p_record->>'submissionChannel',nullif(p_record->>'externalReference',''),nullif(p_record->>'submittedAt','')::timestamptz,nullif(p_record->>'submittingActor',''),(p_record->>'packageVersion')::integer,p_record->>'packageDigest',nullif(p_record->>'acknowledgementReference',''),nullif(p_record->>'acknowledgementAt','')::timestamptz,nullif(p_record->>'followUpDeadline','')::timestamptz,p_record->'limitations',nullif(p_record->>'supersedesSubmissionId','')::uuid,p_correlation_id,record_hash);
  elsif p_kind='corrective_action' then
    insert into public.incident_corrective_actions(id,enterprise_id,incident_id,action_type,action_owner,accountable_approver,target_date,completion_date,completion_evidence_references,validation_evidence_references,residual_risk,reviewer_approval_decision_id,effectiveness_state,linked_contradiction_reference,linked_finding_reference,linked_package_reference,supersedes_corrective_action_id,correlation_id,record_hash)
    values(record_id,p_enterprise_id,p_incident_id,p_record->>'actionType',p_record->>'actionOwner',p_record->>'accountableApprover',nullif(p_record->>'targetDate','')::timestamptz,nullif(p_record->>'completionDate','')::timestamptz,p_record->'completionEvidenceReferences',p_record->'validationEvidenceReferences',p_record->>'residualRisk',nullif(p_record->>'reviewerApprovalDecisionId','')::uuid,p_record->>'effectivenessState',nullif(p_record->>'linkedContradictionReference',''),nullif(p_record->>'linkedFindingReference',''),nullif(p_record->>'linkedPackageReference',''),nullif(p_record->>'supersedesCorrectiveActionId','')::uuid,p_correlation_id,record_hash);
  elsif p_kind='evidence_snapshot' then
    if nullif(p_record->>'supersedesSnapshotId','') is null then raise exception 'Evidence snapshot supersession required'; end if;
    insert into public.incident_evidence_snapshots(id,enterprise_id,incident_id,captured_at,snapshot,snapshot_digest,supersedes_snapshot_id,correlation_id) values(record_id,p_enterprise_id,p_incident_id,(p_record->>'capturedAt')::timestamptz,p_record,record_hash,(p_record->>'supersedesSnapshotId')::uuid,p_correlation_id);
  elsif p_kind='evidence_supersession' then
    insert into public.incident_evidence_supersessions(id,enterprise_id,incident_id,record_type,original_record_id,corrected_record_id,correction_reason,correcting_actor,evidence_references,approved_by_decision_id,corrected_at,correlation_id,record_hash)
    values(record_id,p_enterprise_id,p_incident_id,p_record->>'recordType',(p_record->>'originalRecordId')::uuid,(p_record->>'correctedRecordId')::uuid,p_record->>'correctionReason',p_actor_id,p_record->'evidenceReferences',nullif(p_record->>'approvedByDecisionId','')::uuid,(p_record->>'correctedAt')::timestamptz,p_correlation_id,record_hash);
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary) values(p_enterprise_id,p_incident_id::text,'GOVERNANCE',case p_record->>'recordType' when 'responsibility_attribution' then 'RESPONSIBILITY_ATTRIBUTION_REVISED' when 'incident_classification' then 'INCIDENT_CLASSIFICATION_REVISED' else 'PROVIDER_EVIDENCE_CORRECTED' end,record_id::text,(p_record->>'correctedAt')::timestamptz,jsonb_build_object('incidentId',p_incident_id,'originalRecordId',p_record->>'originalRecordId','correctedRecordId',p_record->>'correctedRecordId','evidenceReferences',p_record->'evidenceReferences','reason',p_record->>'correctionReason')) on conflict do nothing;
  else raise exception 'Unsupported serious-incident record kind'; end if;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(p_enterprise_id,'SERIOUS_INCIDENT_RECORD_APPENDED','user:'||p_actor_id::text,upper(p_kind),record_id::text,p_correlation_id,jsonb_build_object('incidentId',p_incident_id,'recordHash',record_hash));
  return jsonb_build_object('incidentId',p_incident_id,'recordId',record_id,'kind',p_kind,'idempotentReplay',false);
end $$;
revoke all on function public.append_serious_incident_record_v1(uuid,uuid,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.append_serious_incident_record_v1(uuid,uuid,text,jsonb,uuid,uuid) to service_role;

comment on view public.incident_reporting_replay is 'Tenant-safe serious-incident chronology that preserves technical, provider, screening, reviewer, legal, regulator and corrective-action classifications without inventing causality.';
comment on table public.incident_submission_packages is 'Immutable evidence packages. regulator_ready means internally prepared and approved, not legally sufficient.';
