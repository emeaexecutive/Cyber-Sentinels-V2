-- Product closure: one tenant-isolated, evidence-backed trust transaction.
-- This composes existing Trust Objects, Trust Contracts, provider evidence,
-- Trust Fabric decisions, Evidence Graph, Replay and Trust Memory. It does not
-- introduce another trust engine or retain raw provider/action payloads.
create extension if not exists pgcrypto;

alter table public.evidence_graph_nodes add column if not exists correlation_id uuid;
alter table public.evidence_graph_edges add column if not exists correlation_id uuid;
alter table public.trust_memory_index add column if not exists correlation_id uuid;
alter table public.trust_replay_sessions add column if not exists canonical_transaction_id uuid;
create unique index if not exists trust_replay_canonical_transaction_uidx
  on public.trust_replay_sessions(canonical_transaction_id)
  where canonical_transaction_id is not null;

create table public.canonical_trust_transactions (
  transaction_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  actor_id uuid not null,
  actor_type text not null check(actor_type in ('human','ai_agent')),
  subject_type text not null,
  subject_id text not null,
  workflow_id text not null,
  action_type text not null,
  action_purpose text not null,
  action_resource text not null,
  action_environment text not null,
  request_digest text not null check(request_digest ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null,
  correlation_id uuid not null,
  requested_at timestamptz not null,
  decision text not null check(decision in ('ALLOW','REVIEW','DENY')),
  trust_state text not null check(trust_state in ('verified','degraded','suspended')),
  decision_id uuid not null,
  authority_reference text not null,
  authority_lineage_references jsonb not null default '[]'::jsonb check(jsonb_typeof(authority_lineage_references)='array'),
  policy_id text not null,
  policy_version text not null,
  policy_hash text not null check(policy_hash ~ '^[a-f0-9]{64}$'),
  evidence_references jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence_references)='array'),
  evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
  evidence_complete boolean not null,
  evidence_fresh boolean not null,
  reason_codes text[] not null default '{}',
  previous_transaction_id uuid,
  changed_conditions text[] not null default '{}',
  material_change boolean not null,
  evidence_graph_reference uuid,
  replay_reference uuid,
  trust_memory_reference uuid,
  external_state text not null default 'NOT_REQUESTED' check(external_state in ('NOT_REQUESTED','NOT_CONFIGURED','REQUESTED','ACKNOWLEDGED','SUCCEEDED','FAILED','UNKNOWN')),
  external_request_reference uuid,
  external_acknowledgement_reference uuid,
  external_outcome_reference uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(enterprise_id,transaction_id),
  unique(enterprise_id,idempotency_key),
  unique(enterprise_id,correlation_id),
  foreign key(enterprise_id,previous_transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  check(previous_transaction_id is null or previous_transaction_id<>transaction_id)
);
create index canonical_trust_transactions_subject_idx on public.canonical_trust_transactions(enterprise_id,subject_type,subject_id,requested_at desc);
create index canonical_trust_transactions_decision_idx on public.canonical_trust_transactions(enterprise_id,decision,requested_at desc);

create table public.canonical_trust_transaction_events (
  event_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  transaction_id uuid not null,
  event_type text not null check(event_type in ('DECISION_PERSISTED','EVIDENCE_GRAPH_LINKED','REPLAY_WRITTEN','TRUST_MEMORY_WRITTEN','EXTERNAL_EXECUTION_REQUESTED','EXTERNAL_ACKNOWLEDGED','EXTERNAL_OUTCOME_RECORDED')),
  actor_id uuid not null,
  reason text not null,
  evidence_references jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence_references)='array'),
  authority_reference text not null,
  policy_id text not null,
  policy_version text not null,
  correlation_id uuid not null,
  record_digest text not null check(record_digest ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  unique(enterprise_id,transaction_id,event_type,record_digest)
);
create index canonical_transaction_events_timeline_idx on public.canonical_trust_transaction_events(enterprise_id,transaction_id,occurred_at,event_id);

create table public.external_action_requests (
  request_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  transaction_id uuid not null,
  decision_id uuid not null,
  action_type text not null,
  action_resource text not null,
  request_digest text not null check(request_digest ~ '^[a-f0-9]{64}$'),
  relay_configured boolean not null,
  status text not null check(status in ('NOT_CONFIGURED','REQUESTED')),
  idempotency_key text not null,
  actor_id uuid not null,
  correlation_id uuid not null,
  requested_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  unique(enterprise_id,transaction_id),
  unique(enterprise_id,idempotency_key)
);

create table public.external_action_acknowledgements (
  acknowledgement_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  transaction_id uuid not null,
  request_id uuid not null,
  external_reference text not null,
  actor_id uuid not null,
  correlation_id uuid not null,
  acknowledged_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(request_id) references public.external_action_requests(request_id) on delete restrict,
  unique(enterprise_id,transaction_id,external_reference)
);

create table public.external_action_outcomes (
  outcome_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  transaction_id uuid not null,
  request_id uuid not null,
  outcome text not null check(outcome in ('SUCCEEDED','FAILED','UNKNOWN')),
  external_reference text,
  reason text not null,
  actor_id uuid not null,
  correlation_id uuid not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(request_id) references public.external_action_requests(request_id) on delete restrict
);
create unique index external_action_outcomes_idempotency_uidx on public.external_action_outcomes(enterprise_id,transaction_id,outcome,coalesce(external_reference,''),reason);

do $$ declare table_name text; begin foreach table_name in array array[
  'canonical_trust_transactions','canonical_trust_transaction_events','external_action_requests','external_action_acknowledgements','external_action_outcomes'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id))','tenant reads '||table_name,table_name);
end loop; end $$;

create trigger canonical_trust_transaction_events_append_only before update or delete on public.canonical_trust_transaction_events for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger external_action_requests_append_only before update or delete on public.external_action_requests for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger external_action_acknowledgements_append_only before update or delete on public.external_action_acknowledgements for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger external_action_outcomes_append_only before update or delete on public.external_action_outcomes for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.persist_canonical_trust_transaction_decision_v1(p_transaction jsonb,p_decision jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  enterprise uuid:=(p_transaction->>'enterpriseId')::uuid;
  transaction uuid:=(p_transaction->>'transactionId')::uuid;
  actor uuid:=(p_transaction->>'actorId')::uuid;
  correlation uuid:=(p_transaction->>'correlationId')::uuid;
  existing public.canonical_trust_transactions%rowtype;
  event_payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical trust transaction service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||(p_transaction->>'idempotencyKey'),89));
  select * into existing from public.canonical_trust_transactions where enterprise_id=enterprise and idempotency_key=p_transaction->>'idempotencyKey';
  if found then
    if existing.actor_id<>actor
      or existing.subject_type<>p_transaction->>'subjectType'
      or existing.subject_id<>p_transaction->>'subjectId'
      or existing.action_type<>p_transaction->>'actionType'
      or existing.action_purpose<>p_transaction->>'actionPurpose'
      or existing.action_resource<>p_transaction->>'actionResource'
      or existing.action_environment<>p_transaction->>'actionEnvironment'
      or existing.request_digest<>p_transaction->>'requestDigest'
    then raise exception 'Canonical transaction idempotency conflict'; end if;
    return jsonb_build_object('status','DUPLICATE','transactionId',existing.transaction_id,'decisionId',existing.decision_id);
  end if;
  if nullif(p_transaction->>'previousTransactionId','') is not null and not exists(select 1 from public.canonical_trust_transactions where enterprise_id=enterprise and transaction_id=(p_transaction->>'previousTransactionId')::uuid) then raise exception 'Previous transaction tenant mismatch'; end if;
  insert into public.canonical_trust_transactions(
    transaction_id,enterprise_id,actor_id,actor_type,subject_type,subject_id,workflow_id,
    action_type,action_purpose,action_resource,action_environment,request_digest,idempotency_key,
    correlation_id,requested_at,decision,trust_state,decision_id,authority_reference,
    authority_lineage_references,policy_id,policy_version,policy_hash,evidence_references,
    evidence_digest,evidence_complete,evidence_fresh,reason_codes,previous_transaction_id,
    changed_conditions,material_change
  ) values (
    transaction,enterprise,actor,p_transaction->>'actorType',p_transaction->>'subjectType',p_transaction->>'subjectId',p_transaction->>'workflowId',
    p_transaction->>'actionType',p_transaction->>'actionPurpose',p_transaction->>'actionResource',p_transaction->>'actionEnvironment',p_transaction->>'requestDigest',p_transaction->>'idempotencyKey',
    correlation,(p_transaction->>'requestedAt')::timestamptz,p_transaction->>'decision',p_transaction->>'trustState',(p_transaction->>'decisionId')::uuid,p_transaction->>'authorityReference',
    coalesce(p_transaction->'authorityLineageReferences','[]'::jsonb),p_transaction->>'policyId',p_transaction->>'policyVersion',p_transaction->>'policyHash',coalesce(p_transaction->'evidenceReferences','[]'::jsonb),
    p_transaction->>'evidenceDigest',(p_transaction->>'evidenceComplete')::boolean,(p_transaction->>'evidenceFresh')::boolean,array(select jsonb_array_elements_text(coalesce(p_transaction->'reasonCodes','[]'::jsonb))),nullif(p_transaction->>'previousTransactionId','')::uuid,
    array(select jsonb_array_elements_text(coalesce(p_transaction->'changedConditions','[]'::jsonb))),(p_transaction->>'materialChange')::boolean
  );
  insert into public.trust_fabric_decisions(decision_id,enterprise_id,subject_type,subject_id,workflow_id,decision_type,outcome,trust_state,policy_id,policy_version,envelope,superseded_decision_id,correlation_id,deterministic_digest,created_at,actor_id)
  values((p_decision->>'decisionId')::uuid,enterprise,p_decision#>>'{subject,type}',p_decision#>>'{subject,id}',nullif(p_decision->>'workflowId',''),p_decision->>'decisionType',p_decision->>'outcome',p_decision->>'trustState',p_decision->>'policyId',p_decision->>'policyVersion',p_decision,nullif(p_decision->>'supersededDecisionId','')::uuid,correlation,p_decision->>'deterministicDigest',(p_decision->>'createdAt')::timestamptz,actor);
  event_payload:=jsonb_build_object('transactionId',transaction,'decisionId',p_transaction->>'decisionId','decision',p_transaction->>'decision','trustState',p_transaction->>'trustState','evidenceDigest',p_transaction->>'evidenceDigest');
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(enterprise,transaction,'DECISION_PERSISTED',actor,array_to_string(array(select jsonb_array_elements_text(coalesce(p_transaction->'reasonCodes','[]'::jsonb))),'; '),coalesce(p_transaction->'evidenceReferences','[]'::jsonb),p_transaction->>'authorityReference',p_transaction->>'policyId',p_transaction->>'policyVersion',correlation,encode(digest(event_payload::text,'sha256'),'hex'),(p_transaction->>'requestedAt')::timestamptz);
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(enterprise,'CANONICAL_TRUST_DECISION_PERSISTED','user:'||actor::text,'CANONICAL_TRUST_TRANSACTION',transaction::text,correlation,event_payload);
  return jsonb_build_object('status','CREATED','transactionId',transaction,'decisionId',p_transaction->>'decisionId');
end $$;
revoke all on function public.persist_canonical_trust_transaction_decision_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.persist_canonical_trust_transaction_decision_v1(jsonb,jsonb) to service_role;

create or replace function public.extend_canonical_trust_transaction_graph_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tx public.canonical_trust_transactions%rowtype; subject_node uuid; tx_node uuid; decision_node uuid; authority_node uuid; policy_node uuid; evidence_node uuid; item jsonb; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical transaction graph service path required'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'Canonical transaction scope mismatch'; end if;
  if tx.evidence_graph_reference is not null then return jsonb_build_object('status','DUPLICATE','evidenceGraphReference',tx.evidence_graph_reference); end if;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'SUBJECT',tx.subject_id,'IDENTITY','Trust Object',jsonb_build_object('subjectType',tx.subject_type),p_correlation_id) on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'TRUST_TRANSACTION',tx.transaction_id::text,'WORKFLOW',tx.action_type,jsonb_build_object('decision',tx.decision,'requestDigest',tx.request_digest),p_correlation_id) on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'DECISION',tx.decision_id::text,'GOVERNANCE',tx.decision,jsonb_build_object('trustState',tx.trust_state),p_correlation_id) on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'AUTHORITY',tx.authority_reference,'AUTHORITY','Authority lineage',jsonb_build_object('reference',tx.authority_reference),p_correlation_id) on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'POLICY',tx.policy_id||':'||tx.policy_version,'GOVERNANCE','Policy version',jsonb_build_object('policyHash',tx.policy_hash),p_correlation_id) on conflict do nothing;
  select node_id into subject_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='SUBJECT' and external_id=tx.subject_id;
  select node_id into tx_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='TRUST_TRANSACTION' and external_id=tx.transaction_id::text;
  select node_id into decision_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='DECISION' and external_id=tx.decision_id::text;
  select node_id into authority_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='AUTHORITY' and external_id=tx.authority_reference;
  select node_id into policy_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='POLICY' and external_id=tx.policy_id||':'||tx.policy_version;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,correlation_id) values
    (p_enterprise_id,subject_node,tx_node,'PARTICIPATED_IN',p_correlation_id),
    (p_enterprise_id,tx_node,authority_node,'AUTHORIZED_BY',p_correlation_id),
    (p_enterprise_id,policy_node,decision_node,'APPLIES_TO',p_correlation_id),
    (p_enterprise_id,decision_node,tx_node,'RESULTED_IN',p_correlation_id)
  on conflict do nothing;
  for item in select value from jsonb_array_elements(tx.evidence_references) loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'EVIDENCE_REFERENCE',item->>'reference','IDENTITY',item->>'providerId',jsonb_build_object('providerEventId',item->>'providerEventId','sourceDigest',item->>'sourceDigest'),p_correlation_id) on conflict do nothing;
    select node_id into evidence_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='EVIDENCE_REFERENCE' and external_id=item->>'reference';
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,correlation_id) values(p_enterprise_id,evidence_node,decision_node,'SUPPORTED',p_correlation_id) on conflict do nothing;
  end loop;
  update public.canonical_trust_transactions set evidence_graph_reference=tx_node,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'evidenceGraphReference',tx_node);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'EVIDENCE_GRAPH_LINKED',p_actor_id,'Decision, authority, policy, Trust Object and normalized evidence references linked.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','evidenceGraphReference',tx_node);
end $$;
revoke all on function public.extend_canonical_trust_transaction_graph_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.extend_canonical_trust_transaction_graph_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.append_canonical_trust_transaction_replay_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tx public.canonical_trust_transactions%rowtype; replay uuid; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical transaction Replay service path required'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'Canonical transaction scope mismatch'; end if;
  if tx.replay_reference is not null then return jsonb_build_object('status','DUPLICATE','replayReference',tx.replay_reference); end if;
  insert into public.trust_replay_sessions(subject_type,subject_id,workspace_id,owner_user_id,correlation_id,canonical_transaction_id,replay_summary,generated_by)
  values('workflow',tx.workflow_id::uuid,p_enterprise_id,p_actor_id,p_correlation_id,p_transaction_id,tx.decision||': '||array_to_string(tx.reason_codes,', '),'canonical_trust_transaction') returning id into replay;
  update public.canonical_trust_transactions set replay_reference=replay,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'replayReference',replay,'decision',tx.decision);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'REPLAY_WRITTEN',p_actor_id,'Chronology appended after decision persistence and graph linkage.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','replayReference',replay);
end $$;
revoke all on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.emit_canonical_trust_transaction_memory_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tx public.canonical_trust_transactions%rowtype; memory uuid; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical transaction Trust Memory service path required'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id or not tx.material_change then raise exception 'Non-material Trust Memory write rejected'; end if;
  if tx.trust_memory_reference is not null then return jsonb_build_object('status','DUPLICATE','trustMemoryReference',tx.trust_memory_reference); end if;
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id)
  values(p_enterprise_id,tx.subject_id,'RUNTIME','CANONICAL_TRUST_TRANSACTION',p_transaction_id::text,tx.requested_at,jsonb_build_object('decision',tx.decision,'trustState',tx.trust_state,'changedConditions',tx.changed_conditions,'previousTransactionId',tx.previous_transaction_id),p_correlation_id) returning memory_id into memory;
  update public.canonical_trust_transactions set trust_memory_reference=memory,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'trustMemoryReference',memory,'changedConditions',tx.changed_conditions);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'TRUST_MEMORY_WRITTEN',p_actor_id,'Material trust state or condition change recorded.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','trustMemoryReference',memory);
end $$;
revoke all on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.request_canonical_external_execution_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid,p_configured boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tx public.canonical_trust_transactions%rowtype; request uuid; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical external execution service path required'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id or tx.decision<>'ALLOW' then raise exception 'External execution requires a tenant-scoped ALLOW decision'; end if;
  select request_id into request from public.external_action_requests where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  if request is not null then return jsonb_build_object('status','DUPLICATE','requestReference',request); end if;
  insert into public.external_action_requests(enterprise_id,transaction_id,decision_id,action_type,action_resource,request_digest,relay_configured,status,idempotency_key,actor_id,correlation_id,requested_at)
  values(p_enterprise_id,p_transaction_id,tx.decision_id,tx.action_type,tx.action_resource,tx.request_digest,p_configured,case when p_configured then 'REQUESTED' else 'NOT_CONFIGURED' end,tx.idempotency_key,p_actor_id,p_correlation_id,now()) returning request_id into request;
  update public.canonical_trust_transactions set external_state=case when p_configured then 'REQUESTED' else 'NOT_CONFIGURED' end,external_request_reference=request,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'requestReference',request,'configured',p_configured);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'EXTERNAL_EXECUTION_REQUESTED',p_actor_id,case when p_configured then 'Approved action submitted to the configured relay.' else 'Approved action retained; no relay is configured.' end,tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','requestReference',request);
end $$;
revoke all on function public.request_canonical_external_execution_v1(uuid,uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.request_canonical_external_execution_v1(uuid,uuid,uuid,uuid,boolean) to service_role;

create or replace function public.record_canonical_external_acknowledgement_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid,p_external_reference text,p_acknowledged_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tx public.canonical_trust_transactions%rowtype; request uuid; acknowledgement uuid; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical external acknowledgement service path required'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.decision<>'ALLOW' or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'External acknowledgement scope mismatch'; end if;
  select request_id into request from public.external_action_requests where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id and status='REQUESTED';
  if request is null then raise exception 'External request was not sent'; end if;
  select acknowledgement_id into acknowledgement from public.external_action_acknowledgements where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id and external_reference=p_external_reference;
  if acknowledgement is not null then return jsonb_build_object('status','DUPLICATE','acknowledgementReference',acknowledgement); end if;
  insert into public.external_action_acknowledgements(enterprise_id,transaction_id,request_id,external_reference,actor_id,correlation_id,acknowledged_at)
  values(p_enterprise_id,p_transaction_id,request,p_external_reference,p_actor_id,p_correlation_id,p_acknowledged_at) returning acknowledgement_id into acknowledgement;
  update public.canonical_trust_transactions set external_state='ACKNOWLEDGED',external_acknowledgement_reference=acknowledgement,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'acknowledgementReference',acknowledgement,'externalReference',p_external_reference);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'EXTERNAL_ACKNOWLEDGED',p_actor_id,'The relay acknowledged receipt; this is not a terminal outcome.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),p_acknowledged_at);
  return jsonb_build_object('status','CREATED','acknowledgementReference',acknowledgement);
end $$;
revoke all on function public.record_canonical_external_acknowledgement_v1(uuid,uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_canonical_external_acknowledgement_v1(uuid,uuid,uuid,uuid,text,timestamptz) to service_role;

create or replace function public.record_canonical_external_outcome_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid,p_outcome text,p_external_reference text,p_occurred_at timestamptz,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tx public.canonical_trust_transactions%rowtype; request uuid; outcome_reference uuid; payload jsonb;
begin
  if auth.role()<>'service_role' or p_outcome not in ('SUCCEEDED','FAILED','UNKNOWN') then raise exception 'Canonical external outcome input invalid'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.decision<>'ALLOW' or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'External outcome scope mismatch'; end if;
  select request_id into request from public.external_action_requests where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  if request is null then raise exception 'External request record is missing'; end if;
  select outcome_id into outcome_reference from public.external_action_outcomes where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id and outcome=p_outcome and coalesce(external_reference,'')=coalesce(p_external_reference,'') and reason=p_reason;
  if outcome_reference is not null then return jsonb_build_object('status','DUPLICATE','outcomeReference',outcome_reference); end if;
  insert into public.external_action_outcomes(enterprise_id,transaction_id,request_id,outcome,external_reference,reason,actor_id,correlation_id,occurred_at)
  values(p_enterprise_id,p_transaction_id,request,p_outcome,nullif(p_external_reference,''),left(p_reason,500),p_actor_id,p_correlation_id,p_occurred_at) returning outcome_id into outcome_reference;
  update public.canonical_trust_transactions set external_state=p_outcome,external_outcome_reference=outcome_reference,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'outcomeReference',outcome_reference,'outcome',p_outcome,'externalReference',p_external_reference);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'EXTERNAL_OUTCOME_RECORDED',p_actor_id,left(p_reason,500),tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),p_occurred_at);
  return jsonb_build_object('status','CREATED','outcomeReference',outcome_reference);
end $$;
revoke all on function public.record_canonical_external_outcome_v1(uuid,uuid,uuid,uuid,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.record_canonical_external_outcome_v1(uuid,uuid,uuid,uuid,text,text,timestamptz,text) to service_role;

comment on table public.canonical_trust_transactions is 'Canonical receipt index for one evidence-backed action transaction. Raw provider and action payloads are excluded.';
comment on table public.external_action_acknowledgements is 'Transport acknowledgement only; acknowledgement must never be represented as an external action outcome.';
comment on table public.external_action_outcomes is 'External action outcome ledger. UNKNOWN remains visible and may be followed by a later evidence-backed terminal result.';
