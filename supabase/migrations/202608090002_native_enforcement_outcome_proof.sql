-- Native enforcement and outcome proof for canonical trust transactions.
-- Decision-time truth remains immutable. Requests, acknowledgements, claims,
-- observations, contradictions and outcomes are independent append-only facts.
create extension if not exists pgcrypto;

-- Composite keys make tenant identity part of every downstream reference,
-- including for parent records whose globally unique UUID is already a key.
alter table public.operational_entity_authority_delegations add constraint operational_entity_authority_delegations_enterprise_id_delegation_id_key unique(enterprise_id,delegation_id);
alter table public.operational_entity_delegated_action_evaluations add constraint operational_entity_delegated_action_evaluations_enterprise_id_evaluation_id_key unique(enterprise_id,evaluation_id);

create table public.native_enforcement_decision_bindings (
  binding_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  evaluation_id uuid not null,
  transaction_id uuid not null,
  operational_entity_id text not null,
  decision_digest text not null check(decision_digest ~ '^[a-f0-9]{64}$'),
  bound_by uuid not null,
  bound_at timestamptz not null,
  binding_digest text not null check(binding_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,evaluation_id) references public.operational_entity_delegated_action_evaluations(enterprise_id,evaluation_id) on delete restrict,
  unique(enterprise_id,evaluation_id),
  unique(enterprise_id,transaction_id),
  unique(enterprise_id,binding_digest)
);

create table public.native_enforcement_human_approvals (
  approval_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  operational_entity_id text not null,
  action_digest text not null check(action_digest ~ '^[a-f0-9]{64}$'),
  approved_by uuid not null,
  approved_at timestamptz not null,
  expires_at timestamptz not null,
  non_transferable boolean not null check(non_transferable),
  approval_digest text not null check(approval_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(expires_at>approved_at),
  unique(enterprise_id,transaction_id,action_digest),
  unique(enterprise_id,approval_digest)
);

create table public.native_enforcement_requests (
  request_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  evaluation_id uuid not null,
  operational_entity_id text not null,
  authority_id uuid not null,
  delegation_id uuid not null,
  action_type text not null,
  action_target text not null,
  environment text not null,
  consequence text not null check(consequence in ('LOW','MODERATE','HIGH','CRITICAL')),
  action_digest text not null check(action_digest ~ '^[a-f0-9]{64}$'),
  decision_digest text not null check(decision_digest ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null,
  request_state text not null check(request_state in ('REQUESTED','CANCELLED_AUTHORITY_CHANGED','CANCELLED_RUNTIME_CHANGED','REVIEW_REQUIRED')),
  reason_codes text[] not null default '{}',
  actor_id uuid not null,
  requested_at timestamptz not null,
  request_digest text not null check(request_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,authority_id) references public.trust_contracts(enterprise_id,contract_id) on delete restrict,
  foreign key(enterprise_id,evaluation_id) references public.operational_entity_delegated_action_evaluations(enterprise_id,evaluation_id) on delete restrict,
  foreign key(enterprise_id,delegation_id) references public.operational_entity_authority_delegations(enterprise_id,delegation_id) on delete restrict,
  unique(enterprise_id,request_id),
  unique(enterprise_id,idempotency_key),
  unique(enterprise_id,request_digest)
);
create index native_enforcement_requests_transaction_idx on public.native_enforcement_requests(enterprise_id,transaction_id,requested_at);

create table public.native_enforcement_acknowledgements (
  acknowledgement_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  request_id uuid not null,
  operational_entity_id text not null,
  status text not null check(status in ('ACCEPTED','REJECTED','FAILED','TIMEOUT','UNKNOWN')),
  action_digest text not null check(action_digest ~ '^[a-f0-9]{64}$'),
  target text not null,
  idempotency_key text not null,
  adapter_reference text,
  source_party_id text not null,
  reason_codes text[] not null default '{}',
  acknowledged_at timestamptz not null,
  acknowledgement_digest text not null check(acknowledgement_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id) on delete restrict,
  unique(enterprise_id,request_id,acknowledgement_digest)
);

create table public.native_execution_claims (
  claim_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  request_id uuid not null,
  operational_entity_id text not null,
  action_digest text not null check(action_digest ~ '^[a-f0-9]{64}$'),
  target text not null,
  idempotency_key text not null,
  result text not null check(result in ('SUCCEEDED','FAILED','UNKNOWN')),
  source_party_id text not null,
  claimed_at timestamptz not null,
  claim_digest text not null check(claim_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id) on delete restrict,
  unique(enterprise_id,claim_digest)
);

create table public.native_runtime_execution_observations (
  observation_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  request_id uuid not null,
  operational_entity_id text not null,
  action_digest text not null check(action_digest ~ '^[a-f0-9]{64}$'),
  target text not null,
  idempotency_key text not null,
  result text not null check(result in ('OBSERVED','NOT_OBSERVED','FAILED')),
  source_party_id text not null,
  observed_at timestamptz not null,
  observation_digest text not null check(observation_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id) on delete restrict,
  unique(enterprise_id,observation_digest)
);

-- This is the controlled destination's own persistence boundary, separate from
-- canonical trust-decision and enforcement evidence storage.
create table public.controlled_destination_records (
  record_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  destination_id text not null check(destination_id='controlled-repository-a'),
  transaction_id uuid not null,
  operational_entity_id text not null,
  action text not null check(action in ('READ','WRITE_TEST_RECORD')),
  target text not null check(target in ('repository:a','controlled-repository-a')),
  idempotency_key text not null,
  test_record jsonb,
  result text not null check(result in ('OBSERVED','FAILED')),
  occurred_at timestamptz not null,
  record_digest text not null check(record_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,destination_id,idempotency_key),
  unique(enterprise_id,record_digest)
);

create table public.native_destination_observations (
  observation_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  request_id uuid,
  operational_entity_id text not null,
  destination_id text not null,
  action text not null,
  target text not null,
  action_digest text not null check(action_digest ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  result text not null check(result in ('OBSERVED','FAILED')),
  destination_reference text not null,
  evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_mac text not null check(evidence_mac ~ '^[a-f0-9]{64}$'),
  source_party_id text not null,
  ingested_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id) on delete restrict,
  check(expires_at>observed_at),
  unique(enterprise_id,evidence_digest),
  unique(enterprise_id,destination_reference)
);
create index native_destination_observations_transaction_idx on public.native_destination_observations(enterprise_id,transaction_id,observed_at);

create table public.native_execution_contradictions (
  contradiction_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  request_id uuid,
  contradiction_code text not null,
  evidence_references text[] not null default '{}',
  detected_at timestamptz not null,
  contradiction_digest text not null check(contradiction_digest ~ '^[a-f0-9]{64}$'),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id) on delete restrict,
  unique(enterprise_id,contradiction_digest)
);

create table public.native_enforcement_outcomes (
  outcome_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  request_id uuid,
  operational_entity_id text not null,
  correlation_state text not null check(correlation_state in ('CONFIRMED','PARTIALLY_CONFIRMED','CONTRADICTED','UNCONFIRMED')),
  outcome text not null check(outcome in ('CONFIRMED','UNKNOWN','CONTROL_FAILURE_CRITICAL')),
  control_status text not null check(control_status in ('EFFECTIVE','UNKNOWN','CRITICAL_FAILURE')),
  reason_codes text[] not null default '{}',
  contradiction_codes text[] not null default '{}',
  evidence_independence text not null check(evidence_independence in ('SAME_PARTY','INDEPENDENT','UNKNOWN')),
  algorithm_versions text[] not null,
  correlation_digest text not null check(correlation_digest ~ '^[a-f0-9]{64}$'),
  incident_id uuid references public.incident_regulatory_assessments(id) on delete restrict,
  correlated_at timestamptz not null,
  created_by uuid not null,
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id) on delete restrict,
  unique(enterprise_id,correlation_digest)
);
create index native_enforcement_outcomes_transaction_idx on public.native_enforcement_outcomes(enterprise_id,transaction_id,correlated_at desc);

do $$ declare table_name text; begin foreach table_name in array array[
  'native_enforcement_decision_bindings','native_enforcement_human_approvals','native_enforcement_requests',
  'native_enforcement_acknowledgements','native_execution_claims','native_runtime_execution_observations',
  'controlled_destination_records','native_destination_observations','native_execution_contradictions','native_enforcement_outcomes'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id))','tenant reads '||table_name,table_name);
end loop; end $$;

do $$ declare table_name text; begin foreach table_name in array array[
  'native_enforcement_decision_bindings','native_enforcement_human_approvals','native_enforcement_requests',
  'native_enforcement_acknowledgements','native_execution_claims','native_runtime_execution_observations',
  'controlled_destination_records','native_destination_observations','native_execution_contradictions','native_enforcement_outcomes'
] loop execute format('create trigger %I before update or delete on public.%I for each row execute function public.prevent_trust_architecture_history_mutation()',table_name||'_append_only',table_name); end loop; end $$;

create or replace function public.bind_native_enforcement_decision_v1(
  p_enterprise_id uuid,p_evaluation_id uuid,p_transaction_id uuid,p_operational_entity_id text,p_actor_id uuid,p_bound_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare evaluation public.operational_entity_delegated_action_evaluations%rowtype; tx public.canonical_trust_transactions%rowtype; binding uuid; payload jsonb; record_hash text;
begin
  if auth.role()<>'service_role' then raise exception 'Native enforcement service path required'; end if;
  select * into evaluation from public.operational_entity_delegated_action_evaluations where enterprise_id=p_enterprise_id and evaluation_id=p_evaluation_id and delegate_operational_entity_id=p_operational_entity_id;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id and operational_entity_id=p_operational_entity_id;
  if evaluation.evaluation_id is null or tx.transaction_id is null then raise exception 'Tenant-scoped decision binding not found'; end if;
  if evaluation.decision<>tx.decision or lower(evaluation.action_type)<>lower(tx.action_type) or evaluation.action_target<>tx.action_resource or evaluation.environment<>tx.action_environment then raise exception 'Canonical decision binding mismatch'; end if;
  select binding_id into binding from public.native_enforcement_decision_bindings where enterprise_id=p_enterprise_id and evaluation_id=p_evaluation_id;
  if binding is not null then return jsonb_build_object('status','DUPLICATE','bindingId',binding); end if;
  binding:=gen_random_uuid(); payload:=jsonb_build_object('bindingId',binding,'enterpriseId',p_enterprise_id,'evaluationId',p_evaluation_id,'transactionId',p_transaction_id,'entityId',p_operational_entity_id,'decisionDigest',evaluation.decision_digest,'boundAt',p_bound_at);
  record_hash:=encode(digest(payload::text,'sha256'),'hex');
  insert into public.native_enforcement_decision_bindings(binding_id,enterprise_id,evaluation_id,transaction_id,operational_entity_id,decision_digest,bound_by,bound_at,binding_digest)
  values(binding,p_enterprise_id,p_evaluation_id,p_transaction_id,p_operational_entity_id,evaluation.decision_digest,p_actor_id,p_bound_at,record_hash);
  return jsonb_build_object('status','CREATED','bindingId',binding,'decisionDigest',evaluation.decision_digest);
end $$;
revoke all on function public.bind_native_enforcement_decision_v1(uuid,uuid,uuid,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.bind_native_enforcement_decision_v1(uuid,uuid,uuid,text,uuid,timestamptz) to service_role;

-- Serializes idempotency and revalidates authority plus continuity immediately
-- before a provider-neutral request may cross the enforcement boundary.
create or replace function public.reserve_native_enforcement_request_v1(
  p_enterprise_id uuid,p_actor_id uuid,p_request jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.native_enforcement_requests%rowtype; binding public.native_enforcement_decision_bindings%rowtype; evaluation public.operational_entity_delegated_action_evaluations%rowtype; tx public.canonical_trust_transactions%rowtype; delegation public.operational_entity_authority_delegations%rowtype; parent public.trust_contracts%rowtype; verification public.operational_entity_native_verifications%rowtype; approval public.native_enforcement_human_approvals%rowtype; state text:='REQUESTED'; reasons text[]:='{}'; expected_fingerprint text; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Native enforcement service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||(p_request->>'idempotencyKey'),97));
  select * into existing from public.native_enforcement_requests where enterprise_id=p_enterprise_id and idempotency_key=p_request->>'idempotencyKey';
  if existing.request_id is not null then return jsonb_build_object('status','DUPLICATE','requestId',existing.request_id,'requestState',existing.request_state,'reasonCodes',to_jsonb(existing.reason_codes)); end if;
  select * into binding from public.native_enforcement_decision_bindings where enterprise_id=p_enterprise_id and evaluation_id=(p_request->>'evaluationId')::uuid and transaction_id=(p_request->>'transactionId')::uuid and operational_entity_id=p_request->>'operationalEntityId';
  if binding.binding_id is null or binding.decision_digest<>p_request->>'decisionDigest' then raise exception 'Bound decision digest mismatch'; end if;
  select * into evaluation from public.operational_entity_delegated_action_evaluations where enterprise_id=p_enterprise_id and evaluation_id=binding.evaluation_id for update;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=binding.transaction_id for update;
  if evaluation.decision<>'ALLOW' or tx.decision<>'ALLOW' then raise exception 'DENY or REVIEW cannot create an enforcement request'; end if;
  if lower(evaluation.action_type)<>lower(p_request->>'actionType') or evaluation.action_target<>p_request->>'actionTarget' or evaluation.environment<>p_request->>'environment' then raise exception 'Enforcement action differs from decision-time truth'; end if;
  select * into delegation from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and delegation_id=(p_request->>'delegationId')::uuid and delegate_operational_entity_id=p_request->>'operationalEntityId' for update;
  select * into parent from public.trust_contracts where enterprise_id=p_enterprise_id and contract_id=(p_request->>'authorityId')::uuid for update;
  if delegation.delegation_id is null or parent.contract_id is null then raise exception 'Current authority lineage not found'; end if;
  if delegation.status<>'ACTIVE' or delegation.revoked_at is not null or delegation.expires_at<=now() or parent.revocation_state<>'active' or parent.expires_at<=now() then state:='CANCELLED_AUTHORITY_CHANGED'; reasons:=array['ENFORCEMENT_CANCELLED_AUTHORITY_CHANGED']; end if;
  select * into verification from public.operational_entity_native_verifications where enterprise_id=p_enterprise_id and operational_entity_id=p_request->>'operationalEntityId' order by verified_at desc limit 1 for update;
  expected_fingerprint:=evaluation.decision_snapshot#>>'{beta,continuityFingerprint}';
  if verification.verification_id is null or verification.status<>'VERIFIED' or verification.expires_at<=now() then state:='CANCELLED_RUNTIME_CHANGED'; reasons:=array['IDENTITY_OR_OWNER_NOT_CURRENT'];
  elsif verification.runtime_binding<>'RUNTIME_MATCH' or (nullif(expected_fingerprint,'') is not null and verification.continuity_fingerprint<>expected_fingerprint) then state:='CANCELLED_RUNTIME_CHANGED'; reasons:=array['ENFORCEMENT_CANCELLED_RUNTIME_CHANGED']; end if;
  if (p_request->>'consequence') in ('HIGH','CRITICAL') then
    select * into approval from public.native_enforcement_human_approvals where enterprise_id=p_enterprise_id and transaction_id=binding.transaction_id and operational_entity_id=p_request->>'operationalEntityId' and action_digest=p_request->>'actionDigest' and non_transferable and approved_at<=now() and expires_at>now();
    if approval.approval_id is null then state:='REVIEW_REQUIRED'; reasons:=array['HUMAN_APPROVAL_REQUIRED']; end if;
  end if;
  payload:=p_request||jsonb_build_object('requestState',state,'reasonCodes',to_jsonb(reasons));
  insert into public.native_enforcement_requests(request_id,enterprise_id,transaction_id,evaluation_id,operational_entity_id,authority_id,delegation_id,action_type,action_target,environment,consequence,action_digest,decision_digest,idempotency_key,request_state,reason_codes,actor_id,requested_at,request_digest)
  values((p_request->>'requestId')::uuid,p_enterprise_id,binding.transaction_id,binding.evaluation_id,p_request->>'operationalEntityId',(p_request->>'authorityId')::uuid,(p_request->>'delegationId')::uuid,p_request->>'actionType',p_request->>'actionTarget',p_request->>'environment',p_request->>'consequence',p_request->>'actionDigest',p_request->>'decisionDigest',p_request->>'idempotencyKey',state,reasons,p_actor_id,(p_request->>'requestedAt')::timestamptz,encode(digest(payload::text,'sha256'),'hex'));
  return jsonb_build_object('status','CREATED','requestId',p_request->>'requestId','requestState',state,'reasonCodes',to_jsonb(reasons));
end $$;
revoke all on function public.reserve_native_enforcement_request_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_native_enforcement_request_v1(uuid,uuid,jsonb) to service_role;

create or replace function public.persist_native_enforcement_correlation_v1(
  p_enterprise_id uuid,p_actor_id uuid,p_entity_id text,p_transaction_id uuid,p_request_id uuid,p_correlation jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare outcome_id uuid:=(p_correlation->>'outcomeId')::uuid; existing_outcome_id uuid; incident_id uuid; contradiction jsonb; event_id uuid; occurred timestamptz:=(p_correlation->>'correlatedAt')::timestamptz; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Native enforcement service path required'; end if;
  if not exists(select 1 from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id and operational_entity_id=p_entity_id) then raise exception 'Tenant-scoped canonical transaction not found'; end if;
  select native_enforcement_outcomes.outcome_id into existing_outcome_id from public.native_enforcement_outcomes where enterprise_id=p_enterprise_id and correlation_digest=p_correlation->>'correlationDigest';
  if existing_outcome_id is not null then return jsonb_build_object('status','DUPLICATE','outcomeId',existing_outcome_id,'correlationDigest',p_correlation->>'correlationDigest'); end if;
  for contradiction in select value from jsonb_array_elements(coalesce(p_correlation->'contradictions','[]'::jsonb)) loop
    insert into public.native_execution_contradictions(contradiction_id,enterprise_id,transaction_id,request_id,contradiction_code,evidence_references,detected_at,contradiction_digest)
    values((contradiction->>'contradictionId')::uuid,p_enterprise_id,p_transaction_id,p_request_id,contradiction->>'code',array(select jsonb_array_elements_text(coalesce(contradiction->'evidenceReferences','[]'::jsonb))),occurred,contradiction->>'digest') on conflict do nothing;
  end loop;
  if p_correlation->>'outcome'='CONTROL_FAILURE_CRITICAL' then
    incident_id:=(p_correlation->>'incidentId')::uuid;
    payload:=jsonb_build_object('incidentId',incident_id,'transactionId',p_transaction_id,'entityId',p_entity_id,'category','EXECUTION_OCCURRED_AFTER_DENY','evidence',p_correlation->'evidenceReferences');
    insert into public.incident_regulatory_assessments(id,enterprise_id,ai_system_id,agent_id,incident_category,jurisdiction,initial_state,canonical_case,immutable_hash,created_by,correlation_id,created_at)
    values(incident_id,p_enterprise_id,p_entity_id,p_entity_id,'control_failure','internal','evidence_collection',payload,encode(digest(payload::text,'sha256'),'hex'),p_actor_id,outcome_id,occurred) on conflict do nothing;
    event_id:=gen_random_uuid(); payload:=jsonb_build_object('eventId',event_id,'incidentId',incident_id,'transactionId',p_transaction_id,'reason','EXECUTION_OCCURRED_AFTER_DENY');
    insert into public.incident_chronology_events(id,enterprise_id,incident_id,event_type,source,source_type,source_authority,occurred_at,timestamp_confidence,ingested_at,ordering_confidence,evidence_reference,integrity_state,classification,summary,containment_state,correlation_id,record_hash)
    values(event_id,p_enterprise_id,incident_id,'control_failure_detected','Cyber Sentinels','deterministic_correlation','execution-correlation-v1',occurred,'confirmed',now(),'confirmed','transaction:'||p_transaction_id::text,'verified','TECHNICAL EVIDENCE','Execution evidence was observed after an immutable DENY decision.','contradicted',outcome_id,encode(digest(payload::text,'sha256'),'hex')) on conflict do nothing;
  end if;
  insert into public.native_enforcement_outcomes(outcome_id,enterprise_id,transaction_id,request_id,operational_entity_id,correlation_state,outcome,control_status,reason_codes,contradiction_codes,evidence_independence,algorithm_versions,correlation_digest,incident_id,correlated_at,created_by)
  values(outcome_id,p_enterprise_id,p_transaction_id,p_request_id,p_entity_id,p_correlation->>'state',p_correlation->>'outcome',p_correlation->>'controlStatus',array(select jsonb_array_elements_text(p_correlation->'reasonCodes')),array(select jsonb_array_elements_text(p_correlation->'contradictionCodes')),p_correlation->>'evidenceIndependence',array(select jsonb_array_elements_text(p_correlation->'algorithmVersions')),p_correlation->>'correlationDigest',incident_id,occurred,p_actor_id);
  if p_correlation->>'outcome'='CONTROL_FAILURE_CRITICAL' or (p_correlation->'reasonCodes') ?| array['AUTHORITY_CHANGED_BEFORE_EXECUTION','EXECUTION_EVIDENCE_CONFLICT','REPEATED_ENFORCEMENT_FAILURE','DESTINATION_EVIDENCE_LOST','CONTROL_RECOVERY_CONFIRMED'] then
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id)
    values(p_enterprise_id,p_entity_id,'RUNTIME',case
      when p_correlation->>'outcome'='CONTROL_FAILURE_CRITICAL' then 'EXECUTION_AFTER_DENY'
      when (p_correlation->'reasonCodes') ? 'EXECUTION_EVIDENCE_CONFLICT' then 'EXECUTION_CONTRADICTION'
      when (p_correlation->'reasonCodes') ? 'REPEATED_ENFORCEMENT_FAILURE' then 'REPEATED_ENFORCEMENT_FAILURE'
      when (p_correlation->'reasonCodes') ? 'DESTINATION_EVIDENCE_LOST' then 'DESTINATION_EVIDENCE_LOST'
      when (p_correlation->'reasonCodes') ? 'AUTHORITY_CHANGED_BEFORE_EXECUTION' then 'AUTHORITY_CHANGED_BEFORE_EXECUTION'
      else 'CONTROL_RECOVERY_CONFIRMED' end,
      outcome_id::text,occurred,jsonb_build_object('transactionId',p_transaction_id,'outcome',p_correlation->>'outcome','reasonCodes',p_correlation->'reasonCodes','contradictionCodes',p_correlation->'contradictionCodes'),outcome_id) on conflict do nothing;
  end if;
  payload:=jsonb_build_object('outcomeId',outcome_id,'transactionId',p_transaction_id,'state',p_correlation->>'state','outcome',p_correlation->>'outcome');
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  select p_enterprise_id,p_transaction_id,'NATIVE_OUTCOME_CORRELATED',p_actor_id,'Native enforcement evidence correlated without rewriting decision-time truth.',coalesce(p_correlation->'evidenceReferences','[]'::jsonb),authority_reference,policy_id,policy_version,outcome_id,encode(digest(payload::text,'sha256'),'hex'),occurred from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  return jsonb_build_object('status','CREATED','outcomeId',outcome_id,'incidentId',incident_id);
end $$;
revoke all on function public.persist_native_enforcement_correlation_v1(uuid,uuid,text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.persist_native_enforcement_correlation_v1(uuid,uuid,text,uuid,uuid,jsonb) to service_role;

alter table public.canonical_trust_transaction_events drop constraint if exists canonical_trust_transaction_events_event_type_check;
alter table public.canonical_trust_transaction_events add constraint canonical_trust_transaction_events_event_type_check check(event_type in ('DECISION_PERSISTED','EVIDENCE_GRAPH_LINKED','REPLAY_WRITTEN','TRUST_MEMORY_WRITTEN','EXTERNAL_EXECUTION_REQUESTED','EXTERNAL_ACKNOWLEDGED','EXTERNAL_OUTCOME_RECORDED','NATIVE_ENFORCEMENT_REQUESTED','NATIVE_ENFORCEMENT_ACKNOWLEDGED','DESTINATION_OBSERVED','NATIVE_OUTCOME_CORRELATED','CONTROL_FAILURE_DETECTED'));

alter table public.operational_entity_native_replay_events drop constraint if exists operational_entity_native_replay_events_event_type_check;
alter table public.operational_entity_native_replay_events add constraint operational_entity_native_replay_events_event_type_check check(event_type in (
  'MANIFEST_REGISTERED','CREDENTIAL_REGISTERED','CHALLENGE_ISSUED','CHALLENGE_VERIFIED','NATIVE_IDENTITY_VERIFIED','OWNER_CONFIRMED','RUNTIME_BOUND','BUILD_VERIFIED','ENTITY_CHANGED','CREDENTIAL_ROTATED','CREDENTIAL_REVOKED','VERIFICATION_EXPIRED','REVERIFICATION_COMPLETED','ENTITY_SUSPENDED','AUTHORITY_REVOKED','OWNER_REVOKED','MANIFEST_REVOKED',
  'ALPHA_VERIFIED','BETA_REGISTERED','BETA_VERIFIED','ALPHA_AUTHORITY_ISSUED','DELEGATION_PROPOSED','DELEGATION_VALIDATED','BETA_ACCEPTED','DELEGATION_ACTIVATED','BETA_ACTION_REQUESTED','BETA_ACTION_ALLOWED','BETA_ACTION_REVIEW_REQUIRED','BETA_ACTION_DENIED','BETA_SCOPE_VIOLATION_DENIED','PARENT_AUTHORITY_REVOKED','DELEGATION_INVALIDATED','DELEGATION_REVOKED',
  'DELEGATED_AUTHORITY_VALID','ACTION_REQUESTED','DECISION_ALLOW','DECISION_DENY','HUMAN_APPROVAL_RECORDED','ENFORCEMENT_REQUESTED','ENFORCEMENT_ACKNOWLEDGED','DESTINATION_OBSERVED','OUTCOME_CONFIRMED','UNAUTHORIZED_EXECUTION_OBSERVED','CONTROL_FAILURE_DETECTED','AUTHORITY_CHANGED_BEFORE_EXECUTION','CONTROL_RECOVERY_CONFIRMED'
));

alter table public.evidence_graph_edges drop constraint if exists evidence_graph_edges_edge_type_check;
alter table public.evidence_graph_edges add constraint evidence_graph_edges_edge_type_check check(edge_type in (
  'ASSERTS','DERIVED_FROM','OBSERVED_BY','AUTHORIZED_BY','PARTICIPATED_IN','APPLIES_TO','SUPERSEDES','REVOKES','CONFLICTS_WITH','SUPPORTED','CHALLENGED','RESULTED_IN','TRIGGERED','ALERTED_BY','CORRELATED_WITH','REPLAYED_AS',
  'INVOLVES','OPERATED_AS','RAN_IN','CONTRADICTS','CAUSED_OR_PRECEDED','DETECTED_BY','AFFECTED','REQUESTED_FROM','CONTAINMENT_REQUESTED','ACKNOWLEDGED_BY','CONFIRMED_BY','INDEPENDENTLY_CONFIRMED_BY','SUPPORTS_TRIGGER','REVIEWED_BY','DECIDED_BY','INCLUDES','INCLUDED_IN_PACKAGE','SUBMITTED_TO','CORRECTED_BY','REMEDIATED_BY','VALIDATED_BY','RECORDED_IN_MEMORY','RECONSTRUCTED_BY_REPLAY',
  'ENTITY_DELEGATED_AUTHORITY','ENTITY_RECEIVED_DELEGATED_AUTHORITY','DELEGATION_DERIVED_FROM_AUTHORITY','DELEGATION_ACCEPTED_BY_ENTITY','ACTION_AUTHORIZED_BY_DELEGATION','DELEGATION_REVOKED','DELEGATION_EXPIRED',
  'ENFORCEMENT_REQUESTED_FOR','ACKNOWLEDGES_REQUEST','CLAIMS_EXECUTION_OF','RUNTIME_OBSERVED_EXECUTION','DESTINATION_OBSERVED_EXECUTION','OUTCOME_CORRELATED_FROM','CONTROL_FAILURE_FOR'
));

comment on table public.controlled_destination_records is 'Safe internal destination A. Persistence is deliberately separate from trust-decision and enforcement evidence tables.';
comment on table public.native_enforcement_outcomes is 'Evidence-derived outcome correlation. ALLOW is never represented as proof of execution.';
comment on function public.reserve_native_enforcement_request_v1(uuid,uuid,jsonb) is 'Atomic current-authority, identity, continuity, human-approval and idempotency boundary immediately before enforcement.';
