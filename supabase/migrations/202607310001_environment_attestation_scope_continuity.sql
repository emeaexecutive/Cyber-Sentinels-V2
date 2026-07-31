-- EPIC 26: Environment Attestation and Scope Continuity.
-- Development migration only. Forward-only, tenant-scoped, and not applied by this change.

create extension if not exists pgcrypto;

create table public.execution_context_declarations (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  subject_type text not null check(length(subject_type) between 1 and 80),
  subject_id text not null check(length(subject_id) between 1 and 256),
  workflow_id text,
  execution_id text,
  environment_class text not null check(environment_class in ('simulation','development','staging','production','unknown')),
  internet_access_expected boolean not null,
  production_access_expected boolean not null,
  permitted_network_zones jsonb not null default '[]' check(jsonb_typeof(permitted_network_zones)='array'),
  permitted_domains jsonb not null default '[]' check(jsonb_typeof(permitted_domains)='array'),
  permitted_target_identifiers jsonb not null default '[]' check(jsonb_typeof(permitted_target_identifiers)='array'),
  test_harness_provider text,
  declaration_source_type text not null,
  declaration_source_id text not null,
  accountable_owner_type text not null,
  accountable_owner_id text not null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  declared_at timestamptz not null,
  evidence_reference text not null,
  integrity_metadata jsonb not null default '{}' check(jsonb_typeof(integrity_metadata)='object'),
  created_at timestamptz not null,
  unique(enterprise_id,id),
  unique(enterprise_id,execution_id),
  check(workflow_id is not null or execution_id is not null),
  check(valid_until>valid_from)
);
create index execution_context_subject_idx on public.execution_context_declarations(enterprise_id,subject_id,declared_at desc);
create index execution_context_execution_idx on public.execution_context_declarations(enterprise_id,execution_id) where execution_id is not null;

create table public.environment_attestations (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  execution_context_id uuid not null,
  subject_type text not null,
  subject_id text not null,
  observation_type text not null,
  observed_environment_class text not null check(observed_environment_class in ('simulation','development','staging','production','unknown')),
  internet_reachable boolean,
  production_reachable boolean,
  observed_network_zones jsonb not null default '[]' check(jsonb_typeof(observed_network_zones)='array'),
  observed_domains jsonb not null default '[]' check(jsonb_typeof(observed_domains)='array'),
  observed_target_identifiers jsonb not null default '[]' check(jsonb_typeof(observed_target_identifiers)='array'),
  egress_policy_state text not null check(egress_policy_state in ('enforced','degraded','not_enforced','unknown')),
  isolation_control_state text not null check(isolation_control_state in ('confirmed','degraded','absent','unknown')),
  monitoring_state text not null check(monitoring_state in ('available','degraded','unavailable','unknown')),
  attestation_source_type text not null check(attestation_source_type in ('provider_assertion','operator_assertion','harness_configuration','runtime_observation','independent_attestation')),
  attestation_source_id text not null,
  provider_or_third_party_identity text,
  source_authority text not null,
  observed_at timestamptz not null,
  received_at timestamptz not null,
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  freshness text not null check(freshness in ('current','stale','expired','unknown')),
  evidence_strength text not null check(evidence_strength in ('asserted','configured','observed','independently_attested','cryptographically_attested')),
  evidence_reference text not null,
  integrity_metadata jsonb not null default '{}' check(jsonb_typeof(integrity_metadata)='object'),
  supersedes_attestation_id uuid,
  created_at timestamptz not null,
  unique(enterprise_id,id),
  unique(enterprise_id,execution_context_id,attestation_source_type,attestation_source_id,evidence_reference),
  foreign key(enterprise_id,execution_context_id) references public.execution_context_declarations(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_attestation_id) references public.environment_attestations(enterprise_id,id) on delete restrict,
  check(received_at>=observed_at),
  check(evidence_strength<>'cryptographically_attested' or integrity_metadata->>'signatureVerified'='true'),
  check(attestation_source_type<>'provider_assertion' or provider_or_third_party_identity is not null)
);
create index environment_attestation_context_idx on public.environment_attestations(enterprise_id,execution_context_id,observed_at desc);
create index environment_attestation_subject_idx on public.environment_attestations(enterprise_id,subject_id,observed_at desc);

create table public.scope_authorization_leases (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  subject_type text not null check(subject_type in ('organization','human','ai_agent','machine_identity')),
  subject_id text not null,
  authorized_objective text not null,
  permitted_tools jsonb not null default '[]' check(jsonb_typeof(permitted_tools)='array'),
  permitted_actions jsonb not null default '[]' check(jsonb_typeof(permitted_actions)='array'),
  permitted_targets jsonb not null default '[]' check(jsonb_typeof(permitted_targets)='array'),
  permitted_environments jsonb not null default '[]' check(jsonb_typeof(permitted_environments)='array'),
  maximum_duration_seconds integer not null check(maximum_duration_seconds>0),
  maximum_action_count integer not null check(maximum_action_count>0),
  data_classification_boundary jsonb not null default '[]' check(jsonb_typeof(data_classification_boundary)='array'),
  approver_type text not null check(approver_type in ('organization','human','ai_agent','machine_identity')),
  approver_id text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  required_attestation_types jsonb not null default '[]' check(jsonb_typeof(required_attestation_types)='array'),
  contradiction_response_policy text not null check(contradiction_response_policy in ('require_human_approval','pause','deny','revoke_scope')),
  authority_reference text,
  evidence_references jsonb not null default '[]' check(jsonb_typeof(evidence_references)='array'),
  supersedes_lease_id uuid,
  created_at timestamptz not null default now(),
  unique(enterprise_id,id),
  foreign key(enterprise_id,supersedes_lease_id) references public.scope_authorization_leases(enterprise_id,id) on delete restrict,
  check(expires_at>issued_at),
  check(extract(epoch from expires_at-issued_at)<=maximum_duration_seconds),
  check((revoked_at is null and revocation_reason is null) or (revoked_at is not null and revocation_reason is not null))
);
create index scope_authorization_subject_idx on public.scope_authorization_leases(enterprise_id,subject_id,issued_at desc);
create index scope_authorization_active_idx on public.scope_authorization_leases(enterprise_id,subject_id,expires_at) where revoked_at is null;

create table public.scope_continuity_decisions (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  execution_context_id uuid not null,
  authorization_id uuid not null,
  requested_action jsonb not null check(jsonb_typeof(requested_action)='object'),
  evidence_availability text not null check(evidence_availability in ('sufficient','degraded','insufficient')),
  outcome text not null check(outcome in ('allow','allow_with_reduced_trust','require_human_approval','pause','deny','revoke_scope')),
  human_review_required boolean not null,
  reason_codes jsonb not null default '[]' check(jsonb_typeof(reason_codes)='array'),
  missing_evidence jsonb not null default '[]' check(jsonb_typeof(missing_evidence)='array'),
  evidence_references jsonb not null default '[]' check(jsonb_typeof(evidence_references)='array'),
  trust_impact jsonb not null check(jsonb_typeof(trust_impact)='object'),
  decision_timestamp timestamptz not null,
  decision_version text not null,
  policy_id text not null,
  policy_version text not null,
  correlation_id uuid not null,
  decision_hash text not null check(decision_hash ~ '^[a-f0-9]{64}$'),
  artifacts jsonb not null default '{}' check(jsonb_typeof(artifacts)='object'),
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,id),
  unique(enterprise_id,execution_context_id,correlation_id),
  foreign key(enterprise_id,execution_context_id) references public.execution_context_declarations(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,authorization_id) references public.scope_authorization_leases(enterprise_id,id) on delete restrict
);
create index scope_decision_context_idx on public.scope_continuity_decisions(enterprise_id,execution_context_id,decision_timestamp desc);
create index scope_decision_subject_lookup_idx on public.scope_continuity_decisions(enterprise_id,authorization_id,decision_timestamp desc);

create table public.scope_decision_attestations (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  decision_id uuid not null,
  attestation_id uuid not null,
  primary key(enterprise_id,decision_id,attestation_id),
  foreign key(enterprise_id,decision_id) references public.scope_continuity_decisions(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,attestation_id) references public.environment_attestations(enterprise_id,id) on delete restrict
);

create table public.context_contradiction_events (
  id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  execution_context_id uuid not null,
  decision_id uuid not null,
  contradiction_type text not null check(contradiction_type in ('declared_simulation_observed_production','unexpected_internet_access','unexpected_production_access','unapproved_target_reachable','isolation_configuration_drift','provider_assertion_contradicted','missing_required_attestation','stale_attestation','monitoring_unavailable','agent_context_ambiguity_detected','agent_continued_after_context_ambiguity','independent_detection_absent')),
  severity text not null check(severity in ('informational','material','critical','emergency')),
  reason_code text not null,
  evidence_references jsonb not null default '[]' check(jsonb_typeof(evidence_references)='array'),
  detected_by text not null,
  detected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(enterprise_id,id),
  foreign key(enterprise_id,execution_context_id) references public.execution_context_declarations(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,decision_id) references public.scope_continuity_decisions(enterprise_id,id) on delete restrict
);
create index context_contradiction_context_idx on public.context_contradiction_events(enterprise_id,execution_context_id,detected_at desc);
create index context_contradiction_decision_idx on public.context_contradiction_events(enterprise_id,decision_id,detected_at);

create table public.scope_continuity_reviewer_actions (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  decision_id uuid not null,
  reviewer_id uuid not null,
  action text not null check(action in ('approved','denied','contained','acknowledged','correction_recorded')),
  rationale_reference text not null,
  occurred_at timestamptz not null,
  correlation_id uuid not null,
  supersedes_action_id uuid,
  unique(enterprise_id,id),
  foreign key(enterprise_id,decision_id) references public.scope_continuity_decisions(enterprise_id,id) on delete restrict,
  foreign key(enterprise_id,supersedes_action_id) references public.scope_continuity_reviewer_actions(enterprise_id,id) on delete restrict
);

create or replace view public.scope_continuity_replay with (security_invoker=true) as
select d.id,d.enterprise_id,d.id as execution_context_id,'declared_environment'::text as stage,'ASSERTED'::text as label,
  d.declaration_source_type as source_type,d.declaration_source_id as source_identity,d.declared_at as occurred_at,
  'asserted'::text as evidence_strength,coalesce(d.integrity_metadata->>'status','unknown') as integrity_status,
  null::uuid as correlation_id,d.evidence_reference,'Environment declared as '||d.environment_class as summary,true as evidenced
from public.execution_context_declarations d
union all
select a.id,a.enterprise_id,a.execution_context_id,
  case when a.attestation_source_type='independent_attestation' then 'independent_attestation' else 'runtime_observation' end,
  case when a.evidence_strength in ('independently_attested','cryptographically_attested') then 'INDEPENDENTLY_ATTESTED' when a.evidence_strength='configured' then 'CONFIGURED' else 'OBSERVED' end,
  a.attestation_source_type,a.attestation_source_id,a.observed_at,a.evidence_strength,coalesce(a.integrity_metadata->>'status','unknown'),null::uuid,a.evidence_reference,
  a.observation_type||' recorded '||a.observed_environment_class,true
from public.environment_attestations a
union all
select c.id,c.enterprise_id,c.execution_context_id,'contradiction','INFERRED','scope_continuity_policy',c.detected_by,c.detected_at,'observed','verified',d.correlation_id,
  null,c.contradiction_type||' ('||c.severity||')',true
from public.context_contradiction_events c join public.scope_continuity_decisions d on d.enterprise_id=c.enterprise_id and d.id=c.decision_id
union all
select d.id,d.enterprise_id,d.execution_context_id,'scope_decision','DECIDED','deterministic_policy_engine','scope-continuity-policy-engine',d.decision_timestamp,'observed','verified',d.correlation_id,
  'decision:'||d.id::text,'Scope decision: '||d.outcome,true
from public.scope_continuity_decisions d
union all
select r.id,r.enterprise_id,d.execution_context_id,'human_review','OBSERVED','governance_review',r.reviewer_id::text,r.occurred_at,'observed','verified',r.correlation_id,
  r.rationale_reference,'Human review action: '||r.action,true
from public.scope_continuity_reviewer_actions r join public.scope_continuity_decisions d on d.enterprise_id=r.enterprise_id and d.id=r.decision_id;

do $$ declare table_name text; begin
  foreach table_name in array array[
    'execution_context_declarations','environment_attestations','scope_authorization_leases','scope_continuity_decisions',
    'scope_decision_attestations','context_contradiction_events','scope_continuity_reviewer_actions'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon,authenticated',table_name);
    execute format('grant all privileges on public.%I to service_role',table_name);
  end loop;
end $$;
revoke all on public.scope_continuity_replay from anon,authenticated;
grant select on public.execution_context_declarations,public.environment_attestations,public.scope_authorization_leases,public.scope_continuity_decisions,public.scope_decision_attestations,public.context_contradiction_events,public.scope_continuity_reviewer_actions,public.scope_continuity_replay to authenticated;

create policy "tenant reads execution contexts" on public.execution_context_declarations for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads environment attestations" on public.environment_attestations for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads scope leases" on public.scope_authorization_leases for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads scope decisions" on public.scope_continuity_decisions for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads decision attestations" on public.scope_decision_attestations for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads context contradictions" on public.context_contradiction_events for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant reads scope reviewer actions" on public.scope_continuity_reviewer_actions for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id));

create or replace function public.prevent_scope_continuity_history_mutation() returns trigger language plpgsql security definer set search_path=public as $$
begin raise exception 'Scope Continuity evidence is append-only; record a superseding item instead'; end $$;
revoke all on function public.prevent_scope_continuity_history_mutation() from public,anon,authenticated;
do $$ declare table_name text; begin
  foreach table_name in array array['execution_context_declarations','environment_attestations','scope_authorization_leases','scope_continuity_decisions','scope_decision_attestations','context_contradiction_events','scope_continuity_reviewer_actions'] loop
    execute format('create trigger %I_scope_append_only before update or delete on public.%I for each row execute function public.prevent_scope_continuity_history_mutation()',table_name,table_name);
  end loop;
end $$;

create or replace function public.persist_scope_continuity_decision_v1(
  p_input jsonb,
  p_decision jsonb,
  p_artifacts jsonb,
  p_actor_id uuid,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  enterprise uuid := (p_input#>>'{declaration,enterpriseId}')::uuid;
  context_id uuid := (p_input#>>'{declaration,id}')::uuid;
  lease_id uuid := (p_input#>>'{authorization,id}')::uuid;
  decision_id uuid := (p_decision->>'id')::uuid;
  item jsonb;
  existing public.scope_continuity_decisions;
  context_node uuid;
  lease_node uuid;
  decision_node uuid;
  item_node uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Scope Continuity service path required'; end if;
  if p_correlation_id<>(p_decision->>'correlationId')::uuid then raise exception 'Scope Continuity correlation mismatch'; end if;
  if exists(select 1 from public.scope_continuity_decisions where enterprise_id=enterprise and execution_context_id=context_id and correlation_id=p_correlation_id) then
    select * into existing from public.scope_continuity_decisions where enterprise_id=enterprise and execution_context_id=context_id and correlation_id=p_correlation_id;
    return jsonb_build_object('decisionId',existing.id,'outcome',existing.outcome,'idempotentReplay',true);
  end if;

  insert into public.execution_context_declarations(
    id,enterprise_id,subject_type,subject_id,workflow_id,execution_id,environment_class,internet_access_expected,production_access_expected,
    permitted_network_zones,permitted_domains,permitted_target_identifiers,test_harness_provider,declaration_source_type,declaration_source_id,
    accountable_owner_type,accountable_owner_id,valid_from,valid_until,declared_at,evidence_reference,integrity_metadata,created_at
  ) values (
    context_id,enterprise,p_input#>>'{declaration,subjectType}',p_input#>>'{declaration,subjectId}',nullif(p_input#>>'{declaration,workflowId}',''),nullif(p_input#>>'{declaration,executionId}',''),p_input#>>'{declaration,environmentClass}',
    (p_input#>>'{declaration,internetAccessExpected}')::boolean,(p_input#>>'{declaration,productionAccessExpected}')::boolean,p_input#>'{declaration,permittedNetworkZones}',p_input#>'{declaration,permittedDomains}',p_input#>'{declaration,permittedTargetIdentifiers}',
    nullif(p_input#>>'{declaration,testHarnessProvider}',''),p_input#>>'{declaration,declarationSourceType}',p_input#>>'{declaration,declarationSourceId}',p_input#>>'{declaration,accountableOwnerType}',p_input#>>'{declaration,accountableOwnerId}',
    (p_input#>>'{declaration,validFrom}')::timestamptz,(p_input#>>'{declaration,validUntil}')::timestamptz,(p_input#>>'{declaration,declaredAt}')::timestamptz,p_input#>>'{declaration,evidenceReference}',p_input#>'{declaration,integrityMetadata}',(p_input#>>'{declaration,createdAt}')::timestamptz
  ) on conflict(enterprise_id,id) do nothing;

  for item in select value from jsonb_array_elements(p_input->'attestations') loop
    if (item->>'enterpriseId')::uuid<>enterprise or (item->>'executionContextId')::uuid<>context_id then raise exception 'Cross-tenant attestation reference rejected'; end if;
    insert into public.environment_attestations(
      id,enterprise_id,execution_context_id,subject_type,subject_id,observation_type,observed_environment_class,internet_reachable,production_reachable,observed_network_zones,observed_domains,observed_target_identifiers,
      egress_policy_state,isolation_control_state,monitoring_state,attestation_source_type,attestation_source_id,provider_or_third_party_identity,source_authority,observed_at,received_at,confidence,freshness,evidence_strength,evidence_reference,integrity_metadata,supersedes_attestation_id,created_at
    ) values (
      (item->>'id')::uuid,enterprise,context_id,item->>'subjectType',item->>'subjectId',item->>'observationType',item->>'observedEnvironmentClass',nullif(item->>'internetReachable','')::boolean,nullif(item->>'productionReachable','')::boolean,item->'observedNetworkZones',item->'observedDomains',item->'observedTargetIdentifiers',
      item->>'egressPolicyState',item->>'isolationControlState',item->>'monitoringState',item->>'attestationSourceType',item->>'attestationSourceId',nullif(item->>'providerOrThirdPartyIdentity',''),item->>'sourceAuthority',(item->>'observedAt')::timestamptz,(item->>'receivedAt')::timestamptz,(item->>'confidence')::numeric,item->>'freshness',item->>'evidenceStrength',item->>'evidenceReference',item->'integrityMetadata',nullif(item->>'supersedesAttestationId','')::uuid,(item->>'createdAt')::timestamptz
    ) on conflict(enterprise_id,id) do nothing;
  end loop;

  insert into public.scope_authorization_leases(id,enterprise_id,subject_type,subject_id,authorized_objective,permitted_tools,permitted_actions,permitted_targets,permitted_environments,maximum_duration_seconds,maximum_action_count,data_classification_boundary,approver_type,approver_id,issued_at,expires_at,revoked_at,revocation_reason,required_attestation_types,contradiction_response_policy,authority_reference,evidence_references)
  values(lease_id,enterprise,p_input#>>'{authorization,subjectType}',p_input#>>'{authorization,subjectId}',p_input#>>'{authorization,authorizedObjective}',p_input#>'{authorization,permittedTools}',p_input#>'{authorization,permittedActions}',p_input#>'{authorization,permittedTargets}',p_input#>'{authorization,permittedEnvironments}',(p_input#>>'{authorization,maximumDurationSeconds}')::integer,(p_input#>>'{authorization,maximumActionCount}')::integer,p_input#>'{authorization,dataClassificationBoundary}',p_input#>>'{authorization,approverType}',p_input#>>'{authorization,approverId}',(p_input#>>'{authorization,issuedAt}')::timestamptz,(p_input#>>'{authorization,expiresAt}')::timestamptz,nullif(p_input#>>'{authorization,revokedAt}','')::timestamptz,nullif(p_input#>>'{authorization,revocationReason}',''),p_input#>'{authorization,requiredAttestationTypes}',p_input#>>'{authorization,contradictionResponsePolicy}',nullif(p_input#>>'{authorization,authorityReference}',''),p_input#>'{authorization,evidenceReferences}')
  on conflict(enterprise_id,id) do nothing;

  insert into public.scope_continuity_decisions(id,enterprise_id,execution_context_id,authorization_id,requested_action,evidence_availability,outcome,human_review_required,reason_codes,missing_evidence,evidence_references,trust_impact,decision_timestamp,decision_version,policy_id,policy_version,correlation_id,decision_hash,artifacts,actor_id)
  values(decision_id,enterprise,context_id,lease_id,p_decision->'requestedAction',p_decision->>'evidenceAvailability',p_decision->>'outcome',(p_decision->>'humanReviewRequired')::boolean,p_decision->'reasonCodes',p_decision->'missingEvidence',p_decision->'evidenceReferences',p_decision->'trustImpact',(p_decision->>'decisionTimestamp')::timestamptz,p_decision->>'decisionVersion',p_decision->>'policyId',p_decision->>'policyVersion',p_correlation_id,p_decision->>'decisionHash',p_artifacts,p_actor_id);

  for item in select value from jsonb_array_elements(p_input->'attestations') loop
    insert into public.scope_decision_attestations(enterprise_id,decision_id,attestation_id) values(enterprise,decision_id,(item->>'id')::uuid);
  end loop;
  for item in select value from jsonb_array_elements(p_decision->'contradictions') loop
    insert into public.context_contradiction_events(id,enterprise_id,execution_context_id,decision_id,contradiction_type,severity,reason_code,evidence_references,detected_by,detected_at)
    values((item->>'id')::uuid,enterprise,context_id,decision_id,item->>'type',item->>'severity',item->>'reasonCode',item->'evidenceReferences',item->>'detectedBy',(item->>'detectedAt')::timestamptz);
  end loop;

  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
  values(enterprise,p_input#>>'{declaration,subjectId}','RUNTIME','SCOPE_CONTINUITY_DECISION',decision_id::text,(p_decision->>'decisionTimestamp')::timestamptz,jsonb_build_object('outcome',p_decision->>'outcome','trustImpact',p_decision->'trustImpact','reasonCodes',p_decision->'reasonCodes')) on conflict do nothing;

  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values
    (enterprise,'EXECUTION_CONTEXT',context_id::text,'RUNTIME','Execution context',jsonb_build_object('environmentClass',p_input#>>'{declaration,environmentClass}')),
    (enterprise,'AUTHORIZATION',lease_id::text,'AUTHORITY','Scope authorization','{}'),
    (enterprise,'SCOPE_DECISION',decision_id::text,'RUNTIME',p_decision->>'outcome',jsonb_build_object('trustState',p_decision#>>'{trustImpact,nextState}'))
  on conflict do nothing;
  select node_id into context_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='EXECUTION_CONTEXT' and external_id=context_id::text;
  select node_id into lease_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='AUTHORIZATION' and external_id=lease_id::text;
  select node_id into decision_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='SCOPE_DECISION' and external_id=decision_id::text;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,lease_node,context_node,'AUTHORIZED_BY'),(enterprise,context_node,decision_node,'RESULTED_IN') on conflict do nothing;
  for item in select value from jsonb_array_elements(p_input->'attestations') loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values(enterprise,'ENVIRONMENT_ATTESTATION',item->>'id','RUNTIME',item->>'observationType',jsonb_build_object('sourceType',item->>'attestationSourceType','evidenceStrength',item->>'evidenceStrength')) on conflict do nothing;
    select node_id into item_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='ENVIRONMENT_ATTESTATION' and external_id=item->>'id';
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,item_node,context_node,'OBSERVED_BY') on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_decision->'contradictions') loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values(enterprise,'CONTRADICTION',item->>'id','RUNTIME',item->>'type',jsonb_build_object('severity',item->>'severity')) on conflict do nothing;
    select node_id into item_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='CONTRADICTION' and external_id=item->>'id';
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,item_node,decision_node,'CONFLICTS_WITH') on conflict do nothing;
  end loop;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(enterprise,'SCOPE_CONTINUITY_EVALUATED','user:'||p_actor_id::text,'SCOPE_CONTINUITY_DECISION',decision_id::text,p_correlation_id,jsonb_build_object('outcome',p_decision->>'outcome','decisionHash',p_decision->>'decisionHash'));
  return jsonb_build_object('decisionId',decision_id,'outcome',p_decision->>'outcome','idempotentReplay',false);
end $$;
revoke all on function public.persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid) to service_role;

comment on table public.environment_attestations is 'Append-only attributed environment observations and assertions. Provider assertions are not independent evidence.';
comment on table public.scope_continuity_decisions is 'Deterministic Scope Continuity decisions derived from recorded declaration, authority and attestation inputs.';
comment on view public.scope_continuity_replay is 'Tenant-scoped replay projection. It includes only evidenced events and never invents an external action.';
