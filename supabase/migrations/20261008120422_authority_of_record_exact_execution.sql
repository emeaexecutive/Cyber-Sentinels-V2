-- Extend the canonical execution reservation; no parallel authority/receipt store.
-- Old request hashes and append-only history remain unchanged.
alter table public.native_enforcement_requests
  add column payload_digest text check(payload_digest is null or payload_digest ~ '^[a-f0-9]{64}$');
create or replace function public.reserve_native_enforcement_request_v1(
  p_enterprise_id uuid,p_actor_id uuid,p_request jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.native_enforcement_requests%rowtype; binding public.native_enforcement_decision_bindings%rowtype; evaluation public.operational_entity_delegated_action_evaluations%rowtype; tx public.canonical_trust_transactions%rowtype; delegation public.operational_entity_authority_delegations%rowtype; parent public.trust_contracts%rowtype; verification public.operational_entity_native_verifications%rowtype; approval public.native_enforcement_human_approvals%rowtype; state text:='REQUESTED'; reasons text[]:='{}'; expected_fingerprint text; payload jsonb; ancestor public.operational_entity_authority_delegations%rowtype; child public.operational_entity_authority_delegations%rowtype; seen uuid[];
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Native enforcement service path required'; end if;
  if not exists(select 1 from public.account_access_approvals where user_id=p_actor_id and status='APPROVED')
    or not exists(select 1 from public.trust_workspaces w where w.id=p_enterprise_id and
      (w.created_by=p_actor_id or exists(select 1 from public.workspace_members m where m.workspace_id=w.id and m.user_id=p_actor_id and m.role='admin')))
  then raise exception 'TENENTE_ADMIN_AUTHORITY_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||(p_request->>'idempotencyKey'),97));
  select * into existing from public.native_enforcement_requests where enterprise_id=p_enterprise_id and idempotency_key=p_request->>'idempotencyKey';
  if existing.request_id is not null then
    if existing.transaction_id is distinct from (p_request->>'transactionId')::uuid or existing.action_digest is distinct from p_request->>'actionDigest' or existing.decision_digest is distinct from p_request->>'decisionDigest' or existing.delegation_id is distinct from (p_request->>'delegationId')::uuid then raise exception 'ENFORCEMENT_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status','DUPLICATE','requestId',existing.request_id,'requestState',existing.request_state,'reasonCodes',to_jsonb(existing.reason_codes)); end if;
  select * into binding from public.native_enforcement_decision_bindings where enterprise_id=p_enterprise_id and evaluation_id=(p_request->>'evaluationId')::uuid and transaction_id=(p_request->>'transactionId')::uuid and operational_entity_id=p_request->>'operationalEntityId';
  if binding.binding_id is null or binding.decision_digest<>p_request->>'decisionDigest' then raise exception 'Bound decision digest mismatch'; end if;
  select * into evaluation from public.operational_entity_delegated_action_evaluations where enterprise_id=p_enterprise_id and evaluation_id=binding.evaluation_id for update;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=binding.transaction_id for update;
  if evaluation.decision<>'ALLOW' or tx.decision<>'ALLOW' then raise exception 'DENY or REVIEW cannot create an enforcement request'; end if;
  if lower(evaluation.action_type)<>lower(p_request->>'actionType') or evaluation.action_target<>p_request->>'actionTarget' or evaluation.environment<>p_request->>'environment' then raise exception 'Enforcement action differs from decision-time truth'; end if;
  if tx.request_digest is distinct from p_request->>'payloadDigest'
    or upper(tx.action_type) is distinct from p_request->>'actionType'
    or tx.action_resource is distinct from p_request->>'actionTarget'
    or tx.action_environment is distinct from p_request->>'environment'
    or evaluation.delegation_id is distinct from (p_request->>'delegationId')::uuid
  then raise exception 'ENFORCEMENT_EXACT_ACTION_MISMATCH'; end if;
  select * into delegation from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and delegation_id=(p_request->>'delegationId')::uuid and delegate_operational_entity_id=p_request->>'operationalEntityId' for update;
  select * into parent from public.trust_contracts where enterprise_id=p_enterprise_id and contract_id=(p_request->>'authorityId')::uuid for update;
  if delegation.delegation_id is null or parent.contract_id is null then raise exception 'Current authority lineage not found'; end if;
  if delegation.parent_authority_id is distinct from parent.contract_id then raise exception 'AUTHORITY_PARENT_MISMATCH'; end if;
  if delegation.status<>'ACTIVE' or delegation.revoked_at is not null or delegation.expires_at<=now() or parent.revocation_state<>'active' or parent.expires_at<=now() then state:='CANCELLED_AUTHORITY_CHANGED'; reasons:=array['ENFORCEMENT_CANCELLED_AUTHORITY_CHANGED']; end if;
  if not exists(select 1 from public.trust_policy_versions policy where (policy.enterprise_id=p_enterprise_id or policy.enterprise_id is null)
      and policy.policy_id=tx.policy_id and policy.version=tx.policy_version and policy.policy_hash=tx.policy_hash
      and policy.active and policy.valid_from<=now() and (policy.valid_until is null or policy.valid_until>now()))
  then state:='CANCELLED_AUTHORITY_CHANGED'; reasons:=array['TENENTE_POLICY_CHANGED']; end if;
  if delegation.not_before>now() or delegation.policy_version is distinct from parent.contract->>'policyVersion'
    or not (lower(p_request->>'actionType')=any(delegation.permitted_actions))
    or not ((p_request->>'actionTarget')=any(delegation.permitted_targets))
    or not ((p_request->>'environment')=any(delegation.environments))
    or not (evaluation.action_tool=any(delegation.permitted_tools))
    or (delegation.financial_limit is not null and coalesce((evaluation.decision_snapshot#>>'{action,financialAmount}')::numeric,0)>delegation.financial_limit)
  then state:='CANCELLED_AUTHORITY_CHANGED'; reasons:=array['TENENTE_SCOPE_OR_POLICY_CHANGED']; end if;
  child:=delegation; seen:=array[delegation.delegation_id];
  while child.parent_delegation_id is not null loop
    if child.parent_delegation_id=any(seen) or cardinality(seen)>16 then raise exception 'TENENTE_CHAIN_INVALID'; end if;
    select * into ancestor from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and delegation_id=child.parent_delegation_id for update;
    if ancestor.delegation_id is null then raise exception 'TENENTE_CHAIN_INVALID'; end if;
    seen:=array_append(seen,ancestor.delegation_id);
    if ancestor.status<>'ACTIVE' or ancestor.revoked_at is not null or ancestor.expires_at<=now() or ancestor.not_before>now()
      or not ancestor.can_redelegate or child.delegation_depth<>ancestor.delegation_depth+1
      or ancestor.delegate_operational_entity_id<>child.delegator_operational_entity_id
      or ancestor.parent_authority_id<>parent.contract_id
      or not child.permitted_actions<@ancestor.permitted_actions or not child.permitted_tools<@ancestor.permitted_tools
      or not child.permitted_targets<@ancestor.permitted_targets or not child.environments<@ancestor.environments
      or child.expires_at>ancestor.expires_at
      or (ancestor.financial_limit is not null and (child.financial_limit is null or child.financial_limit>ancestor.financial_limit))
    then state:='CANCELLED_AUTHORITY_CHANGED'; reasons:=array['TENENTE_PARENT_CHAIN_INACTIVE']; end if;
    child:=ancestor;
  end loop;
  select * into verification from public.operational_entity_native_verifications where enterprise_id=p_enterprise_id and operational_entity_id=p_request->>'operationalEntityId' order by verified_at desc limit 1 for update;
  expected_fingerprint:=evaluation.decision_snapshot#>>'{beta,continuityFingerprint}';
  if verification.verification_id is null or verification.status<>'VERIFIED' or verification.expires_at<=now() then state:='CANCELLED_RUNTIME_CHANGED'; reasons:=array['IDENTITY_OR_OWNER_NOT_CURRENT'];
  elsif verification.runtime_binding<>'RUNTIME_MATCH' or (nullif(expected_fingerprint,'') is not null and verification.continuity_fingerprint<>expected_fingerprint) then state:='CANCELLED_RUNTIME_CHANGED'; reasons:=array['ENFORCEMENT_CANCELLED_RUNTIME_CHANGED']; end if;
  if not exists(select 1 from public.operational_entity_native_credentials c where c.enterprise_id=p_enterprise_id
      and c.credential_id=verification.credential_id and c.state='ACTIVE' and c.revoked_at is null
      and c.valid_from<=now() and (c.expires_at is null or c.expires_at>now()))
    or (select owner_binding.state from public.operational_entity_owner_bindings owner_binding where owner_binding.enterprise_id=p_enterprise_id
      and owner_binding.operational_entity_id=p_request->>'operationalEntityId' order by owner_binding.effective_from desc limit 1) is distinct from 'CONFIRMED'
    or (select lifecycle_state from public.operational_entities where enterprise_id=p_enterprise_id
      and entity_id=p_request->>'operationalEntityId') is distinct from 'active'
  then state:='CANCELLED_RUNTIME_CHANGED'; reasons:=array['TENENTE_IDENTITY_OR_OWNER_INACTIVE']; end if;
  if (p_request->>'consequence') in ('HIGH','CRITICAL') then
    select * into approval from public.native_enforcement_human_approvals where enterprise_id=p_enterprise_id and transaction_id=binding.transaction_id and operational_entity_id=p_request->>'operationalEntityId' and action_digest=p_request->>'actionDigest' and non_transferable and approved_at<=now() and expires_at>now();
    if approval.approval_id is null then state:='REVIEW_REQUIRED'; reasons:=array['HUMAN_APPROVAL_REQUIRED']; end if;
  end if;
  payload:=p_request||jsonb_build_object('requestState',state,'reasonCodes',to_jsonb(reasons));
  insert into public.native_enforcement_requests(request_id,enterprise_id,transaction_id,evaluation_id,operational_entity_id,authority_id,delegation_id,action_type,action_target,environment,consequence,action_digest,decision_digest,idempotency_key,request_state,reason_codes,actor_id,requested_at,request_digest,payload_digest)
  values((p_request->>'requestId')::uuid,p_enterprise_id,binding.transaction_id,binding.evaluation_id,p_request->>'operationalEntityId',(p_request->>'authorityId')::uuid,(p_request->>'delegationId')::uuid,p_request->>'actionType',p_request->>'actionTarget',p_request->>'environment',p_request->>'consequence',p_request->>'actionDigest',p_request->>'decisionDigest',p_request->>'idempotencyKey',state,reasons,p_actor_id,(p_request->>'requestedAt')::timestamptz,encode(extensions.digest(payload::text,'sha256'),'hex'),tx.request_digest);
  return jsonb_build_object('status','CREATED','requestId',p_request->>'requestId','requestState',state,'reasonCodes',to_jsonb(reasons));
end $$;
revoke all on function public.reserve_native_enforcement_request_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_native_enforcement_request_v1(uuid,uuid,jsonb) to service_role;

alter table public.operational_entity_authority_delegations
  drop constraint operational_entity_authority_delegations_status_check;
alter table public.operational_entity_authority_delegations
  add constraint operational_entity_authority_delegations_status_check
  check(status in ('PENDING','ACTIVE','EXPIRED','REVOKED','SUPERSEDED','REJECTED','SUSPENDED'));

-- Preserve the existing event vocabulary and add one audited guardian event.
do $$ declare definition text; begin
  select pg_get_constraintdef(oid) into definition from pg_constraint
    where conrelid='public.operational_entity_native_replay_events'::regclass
    and conname='operational_entity_native_replay_events_event_type_check';
  if definition is null then raise exception 'Native Replay event contract missing'; end if;
  alter table public.operational_entity_native_replay_events drop constraint operational_entity_native_replay_events_event_type_check;
  execute 'alter table public.operational_entity_native_replay_events add constraint operational_entity_native_replay_events_event_type_check check (('
    || substring(definition from 7) || ') or event_type = ''TENENTE_AUTHORITY_RESTRICTED'')';
end $$;

create or replace function public.restrict_tenente_delegation_v1(
  p_enterprise_id uuid,p_actor_id uuid,p_entity_id text,p_delegation_id uuid,p_operation text,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.operational_entity_authority_delegations%rowtype;
  event_id uuid:=gen_random_uuid(); occurred timestamptz:=clock_timestamp(); payload jsonb; next_status text;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'TENENTE_SERVICE_PATH_REQUIRED'; end if;
  if p_operation not in ('SUSPEND','REVOKE') or p_operation is null
    or length(trim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'TENENTE_INVALID_RESTRICTION'; end if;
  if not exists(select 1 from public.account_access_approvals where user_id=p_actor_id and status='APPROVED')
    or not exists(select 1 from public.trust_workspaces w where w.id=p_enterprise_id and
      (w.created_by=p_actor_id or exists(select 1 from public.workspace_members m where m.workspace_id=w.id and m.user_id=p_actor_id and m.role='admin')))
  then raise exception 'TENENTE_ADMIN_AUTHORITY_REQUIRED'; end if;
  select * into item from public.operational_entity_authority_delegations
    where enterprise_id=p_enterprise_id and delegation_id=p_delegation_id
    and (delegator_operational_entity_id=p_entity_id or delegate_operational_entity_id=p_entity_id) for update;
  if item.delegation_id is null then raise exception 'TENENTE_DELEGATION_NOT_FOUND'; end if;
  next_status:=case when p_operation='SUSPEND' then 'SUSPENDED' else 'REVOKED' end;
  if item.status not in ('ACTIVE','PENDING','SUSPENDED') then raise exception 'TENENTE_AUTHORITY_TERMINAL'; end if;
  update public.operational_entity_authority_delegations set status=next_status,
    revoked_at=case when p_operation='REVOKE' then occurred else revoked_at end,
    revocation_reason=case when p_operation='REVOKE' then trim(p_reason) else revocation_reason end,updated_at=occurred
    where enterprise_id=p_enterprise_id and delegation_id=p_delegation_id;
  payload:=jsonb_build_object('delegationId',p_delegation_id,'operation',p_operation,'previousStatus',item.status,
    'status',next_status,'reason',trim(p_reason),'actorId',p_actor_id,'authority','workspace_admin','scopeDigest',item.delegation_digest);
  insert into public.operational_entity_native_replay_events(event_id,enterprise_id,operational_entity_id,event_type,actor_reference,attribution,evidence_references,reason_codes,payload,event_digest,occurred_at)
  values(event_id,p_enterprise_id,item.delegate_operational_entity_id,'TENENTE_AUTHORITY_RESTRICTED','user:'||p_actor_id,
    'CYBER_SENTINELS_INTERPRETATION',array['delegation:'||p_delegation_id],array['TENENTE_'||next_status],payload,
    encode(extensions.digest(payload::text,'sha256'),'hex'),occurred);
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
  values(p_enterprise_id,item.delegate_operational_entity_id,'AUTHORITY','TENENTE_AUTHORITY_RESTRICTED',event_id::text,occurred,payload);
  return payload||jsonb_build_object('evidenceReference','native-replay:'||event_id);
end $$;
revoke all on function public.restrict_tenente_delegation_v1(uuid,uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.restrict_tenente_delegation_v1(uuid,uuid,text,uuid,text,text) to service_role;
alter function public.restrict_tenente_delegation_v1(uuid,uuid,text,uuid,text,text) owner to postgres;
