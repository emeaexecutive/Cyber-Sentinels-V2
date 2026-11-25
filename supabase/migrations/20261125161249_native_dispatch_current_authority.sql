create or replace function public.native_enforcement_scope_v2(p_tenant uuid,p_actor uuid,p_transaction uuid,p_entity text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('tenant',t.enterprise_id,'actor',p_actor,'entity',t.operational_entity_id,
    'transaction',t.transaction_id,'evaluation',b.evaluation_id,'action',upper(t.action_type),'destination',t.action_resource,
    'environment',t.action_environment,'parametersDigest',t.request_digest,
    'policyHash',t.policy_hash,'policyId',t.policy_id,'policyVersion',t.policy_version,'decisionDigest',b.decision_digest,
    'authority',d.parent_authority_id,'delegation',d.delegation_id,'delegationPolicyVersion',d.policy_version,
    'consequence',upper(coalesce(t.decision_time_snapshot->>'consequence','LOW')))
  from public.canonical_trust_transactions t
  join public.native_enforcement_decision_bindings b on b.enterprise_id=t.enterprise_id and b.transaction_id=t.transaction_id and b.operational_entity_id=t.operational_entity_id
  join public.operational_entity_delegated_action_evaluations e on e.enterprise_id=b.enterprise_id and e.evaluation_id=b.evaluation_id and e.decision_digest=b.decision_digest
  join public.operational_entity_authority_delegations d on d.enterprise_id=e.enterprise_id and d.delegation_id=e.delegation_id and d.delegate_operational_entity_id=t.operational_entity_id
  where t.enterprise_id=p_tenant and t.transaction_id=p_transaction and t.operational_entity_id=p_entity and t.decision='ALLOW' and e.decision='ALLOW';
$$;

-- Security repair: serialise current authority changes with the controlled effect.
-- Applying this file is a separate hosted change; no Production application is implied.
create function public.native_dispatch_mutation_lock_v3() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare old_t uuid; new_t uuid; t uuid;
begin
  if TG_OP <> 'INSERT' then old_t := OLD.enterprise_id; end if;
  if TG_OP <> 'DELETE' then new_t := NEW.enterprise_id; end if;
  if (TG_OP <> 'INSERT' and old_t is null) or (TG_OP <> 'DELETE' and new_t is null) then
    perform pg_advisory_xact_lock(hashtextextended('tenente:global-policy:v3',0));
  else
    perform pg_advisory_xact_lock_shared(hashtextextended('tenente:global-policy:v3',0));
    for t in select distinct v from unnest(array[old_t,new_t]) v where v is not null order by v loop
      perform pg_advisory_xact_lock(hashtextextended('tenente:tenant:v3:'||t::text,0));
    end loop;
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end $$;
revoke all on function public.native_dispatch_mutation_lock_v3() from public,anon,authenticated,service_role;
do $$ declare relation text; begin
  foreach relation in array array['canonical_trust_transactions','native_enforcement_decision_bindings',
    'operational_entity_delegated_action_evaluations','operational_entity_authority_delegations','trust_contracts',
    'operational_entity_native_verifications','operational_entity_native_credentials','native_entity_identity_evidence',
    'operational_entities','operational_entity_owner_bindings','trust_policy_versions','native_enforcement_human_approvals',
    'native_enforcement_approval_scopes','native_enforcement_requests'] loop
    execute format('create trigger native_dispatch_mutation_lock_v3 before insert or update or delete on public.%I for each row execute function public.native_dispatch_mutation_lock_v3()',relation);
  end loop;
end $$;

create function public.revalidate_native_enforcement_dispatch_v3(p_enterprise_id uuid,p_actor_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.native_enforcement_requests%rowtype; claimed public.native_enforcement_dispatch_claims%rowtype;
  child public.operational_entity_authority_delegations%rowtype; ancestor public.operational_entity_authority_delegations%rowtype;
  parent public.trust_contracts%rowtype; v public.operational_entity_native_verifications%rowtype;
  tx public.canonical_trust_transactions%rowtype; evaluation public.operational_entity_delegated_action_evaluations%rowtype;
  seen uuid[]; owner_binding public.operational_entity_owner_bindings%rowtype; scope jsonb; a public.native_enforcement_human_approvals%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service path required'; end if;
  if p_enterprise_id is null or p_actor_id is null or p_request_id is null then raise exception 'Bound scope required'; end if;
  perform pg_advisory_xact_lock_shared(hashtextextended('tenente:global-policy:v3',0));
  perform pg_advisory_xact_lock(hashtextextended('tenente:tenant:v3:'||p_enterprise_id::text,0));
  select * into r from public.native_enforcement_requests where enterprise_id=p_enterprise_id and request_id=p_request_id;
  select * into claimed from public.native_enforcement_dispatch_claims where enterprise_id=p_enterprise_id and request_id=p_request_id;
  if r.request_id is null or claimed.request_id is null or r.actor_id is distinct from p_actor_id
    or claimed.actor_id is distinct from p_actor_id or r.request_state is distinct from 'REQUESTED' then
    return jsonb_build_object('allowed',false,'reason','DISPATCH_REQUEST_INVALID'); end if;
  scope := public.native_enforcement_scope_v2(p_enterprise_id,p_actor_id,r.transaction_id,r.operational_entity_id);
  if scope is null or scope is distinct from claimed.scope or scope->>'evaluation' is distinct from r.evaluation_id::text
    or scope->>'authority' is distinct from r.authority_id::text or scope->>'delegation' is distinct from r.delegation_id::text
    or scope->>'action' is distinct from r.action_type or scope->>'destination' is distinct from r.action_target
    or scope->>'environment' is distinct from r.environment or scope->>'decisionDigest' is distinct from r.decision_digest
    or scope->>'consequence' is distinct from r.consequence then
    return jsonb_build_object('allowed',false,'reason','DISPATCH_SCOPE_CHANGED'); end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=r.transaction_id;
  select * into evaluation from public.operational_entity_delegated_action_evaluations where enterprise_id=p_enterprise_id and evaluation_id=r.evaluation_id;
  select * into parent from public.trust_contracts where enterprise_id=p_enterprise_id and contract_id=r.authority_id;
  select * into child from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and delegation_id=r.delegation_id;
  if parent.contract_id is null or child.delegation_id is null or parent.revocation_state is distinct from 'active'
    or parent.expires_at is null or parent.expires_at<=clock_timestamp() or child.delegate_operational_entity_id is distinct from r.operational_entity_id
    or child.policy_version is distinct from parent.contract->>'policyVersion'
    or not coalesce(lower(r.action_type)=any(child.permitted_actions),false)
    or not coalesce(r.action_target=any(child.permitted_targets),false)
    or not coalesce(r.environment=any(child.environments),false)
    or not coalesce(evaluation.action_tool=any(child.permitted_tools),false)
    or (child.financial_limit is not null and coalesce((evaluation.decision_snapshot#>>'{action,financialAmount}')::numeric,0)>child.financial_limit)
    or (child.execution_limit is not null and coalesce((evaluation.decision_snapshot#>>'{action,executionCount}')::numeric,1)>child.execution_limit)
    or coalesce(evaluation.decision_snapshot#>>'{action,dataBoundary}','PUBLIC') not in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')
    or array_position(array['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'],coalesce(evaluation.decision_snapshot#>>'{action,dataBoundary}','PUBLIC'))
      >array_position(array['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'],child.data_boundary) then
    return jsonb_build_object('allowed',false,'reason','DISPATCH_AUTHORITY_REVOKED'); end if;
  if not exists(select 1 from public.trust_policy_versions policy where (policy.enterprise_id=p_enterprise_id or policy.enterprise_id is null)
    and policy.policy_id=tx.policy_id and policy.version=tx.policy_version and policy.policy_hash=tx.policy_hash
    and policy.active and policy.valid_from<=clock_timestamp() and (policy.valid_until is null or policy.valid_until>clock_timestamp())) then
    return jsonb_build_object('allowed',false,'reason','DISPATCH_POLICY_CHANGED'); end if;
  seen := array[]::uuid[];
  loop
    if child.delegation_id=any(seen) or cardinality(seen)>16 or child.status is distinct from 'ACTIVE'
      or child.revoked_at is not null or child.not_before is null or child.not_before>clock_timestamp()
      or child.expires_at is null or child.expires_at<=clock_timestamp() or child.parent_authority_id is distinct from parent.contract_id
      or child.delegation_depth is null or child.maximum_delegation_depth is null or child.delegation_depth<0
      or child.delegation_depth>child.maximum_delegation_depth or child.data_boundary is null
      or child.data_boundary not in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED') then
      return jsonb_build_object('allowed',false,'reason','DISPATCH_PARENT_CHAIN_INACTIVE'); end if;
    seen:=array_append(seen,child.delegation_id);
    exit when child.parent_delegation_id is null;
    select * into ancestor from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and delegation_id=child.parent_delegation_id;
    if ancestor.delegation_id is null or not coalesce(ancestor.can_redelegate,false)
      or child.delegation_depth is distinct from ancestor.delegation_depth+1
      or ancestor.maximum_delegation_depth is null or child.delegation_depth>ancestor.maximum_delegation_depth
      or child.maximum_delegation_depth>ancestor.maximum_delegation_depth or ancestor.data_boundary is null
      or ancestor.data_boundary not in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')
      or array_position(array['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'],child.data_boundary)
        >array_position(array['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'],ancestor.data_boundary)
      or child.delegator_operational_entity_id is distinct from ancestor.delegate_operational_entity_id
      or not coalesce(child.permitted_actions<@ancestor.permitted_actions,false)
      or not coalesce(child.permitted_tools<@ancestor.permitted_tools,false)
      or not coalesce(child.permitted_targets<@ancestor.permitted_targets,false)
      or not coalesce(child.environments<@ancestor.environments,false)
      or child.not_before<ancestor.not_before or child.expires_at>ancestor.expires_at
      or (ancestor.financial_limit is not null and (child.financial_limit is null or child.financial_limit>ancestor.financial_limit))
      or (ancestor.execution_limit is not null and (child.execution_limit is null or child.execution_limit>ancestor.execution_limit)) then
      return jsonb_build_object('allowed',false,'reason','DISPATCH_PARENT_CHAIN_INACTIVE'); end if;
    child:=ancestor;
  end loop;
  select * into v from public.operational_entity_native_verifications where enterprise_id=p_enterprise_id and operational_entity_id=r.operational_entity_id order by verified_at desc limit 1;
  select * into owner_binding from public.operational_entity_owner_bindings where enterprise_id=p_enterprise_id and operational_entity_id=r.operational_entity_id order by effective_from desc limit 1;
  if v.verification_id is null or v.status is distinct from 'VERIFIED' or v.expires_at is null or v.expires_at<=clock_timestamp()
    or v.runtime_binding is distinct from 'RUNTIME_MATCH'
    or (nullif(evaluation.decision_snapshot#>>'{beta,continuityFingerprint}','') is not null and v.continuity_fingerprint is distinct from evaluation.decision_snapshot#>>'{beta,continuityFingerprint}')
    or not exists(select 1 from public.operational_entity_native_credentials c where c.enterprise_id=p_enterprise_id and c.operational_entity_id=r.operational_entity_id
      and c.credential_id=v.credential_id and c.state='ACTIVE' and c.revoked_at is null and c.valid_from<=clock_timestamp() and (c.expires_at is null or c.expires_at>clock_timestamp()))
    or not exists(select 1 from public.native_entity_identity_evidence e where e.enterprise_id=p_enterprise_id and e.operational_entity_id=r.operational_entity_id
      and e.verification_id=v.verification_id and e.revoked_at is null and e.expires_at>clock_timestamp())
    or (select lifecycle_state from public.operational_entities where enterprise_id=p_enterprise_id and entity_id=r.operational_entity_id) is distinct from 'active'
    or owner_binding.state is distinct from 'CONFIRMED' or owner_binding.effective_from is null or owner_binding.effective_from>clock_timestamp()
    or (owner_binding.effective_to is not null and owner_binding.effective_to<=clock_timestamp()) then
    return jsonb_build_object('allowed',false,'reason','DISPATCH_IDENTITY_CHANGED'); end if;
  if r.consequence in ('HIGH','CRITICAL') then
    select * into a from public.native_enforcement_human_approvals where enterprise_id=p_enterprise_id and approval_id=claimed.approval_id;
    if a.approval_id is null or a.expires_at<=clock_timestamp() or a.approved_at>clock_timestamp() or not a.non_transferable
      or a.approved_by is distinct from p_actor_id or a.action_digest is distinct from r.action_digest
      or (select s.scope from public.native_enforcement_approval_scopes s where s.enterprise_id=p_enterprise_id and s.approval_id=a.approval_id) is distinct from scope then
      return jsonb_build_object('allowed',false,'reason','DISPATCH_APPROVAL_INVALID'); end if;
  end if;
  return jsonb_build_object('allowed',true);
end $$;

create function public.claim_native_enforcement_dispatch_v3(p_enterprise_id uuid,p_actor_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare claimed jsonb; checked jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service path required'; end if;
  perform pg_advisory_xact_lock_shared(hashtextextended('tenente:global-policy:v3',0));
  perform pg_advisory_xact_lock(hashtextextended('tenente:tenant:v3:'||p_enterprise_id::text,0));
  claimed:=public.claim_native_enforcement_dispatch_v2(p_enterprise_id,p_actor_id,p_request_id);
  if claimed->>'claimed' is distinct from 'true' then return claimed; end if;
  checked:=public.revalidate_native_enforcement_dispatch_v3(p_enterprise_id,p_actor_id,p_request_id);
  if checked->>'allowed' is distinct from 'true' then return jsonb_build_object('claimed',false,'reason',checked->>'reason'); end if;
  return claimed;
end $$;

create function public.execute_controlled_native_destination_v3(p_enterprise_id uuid,p_actor_id uuid,p_request_id uuid,p_record jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare checked jsonb; r public.native_enforcement_requests%rowtype; prior public.controlled_destination_records%rowtype;
begin
  checked:=public.revalidate_native_enforcement_dispatch_v3(p_enterprise_id,p_actor_id,p_request_id);
  if checked->>'allowed' is distinct from 'true' then return checked; end if;
  select * into r from public.native_enforcement_requests where enterprise_id=p_enterprise_id and request_id=p_request_id;
  if r.action_target not in ('repository:a','controlled-repository-a') or r.action_type not in ('READ','WRITE_TEST_RECORD')
    or p_record->>'enterprise_id' is distinct from p_enterprise_id::text or p_record->>'transaction_id' is distinct from r.transaction_id::text
    or p_record->>'operational_entity_id' is distinct from r.operational_entity_id or p_record->>'action' is distinct from r.action_type
    or p_record->>'target' is distinct from r.action_target or p_record->>'idempotency_key' is distinct from r.idempotency_key
    or p_record->>'destination_id' is distinct from 'controlled-repository-a'
    or p_record->>'occurred_at' is null or abs(extract(epoch from clock_timestamp()-(p_record->>'occurred_at')::timestamptz))>60 then
    return jsonb_build_object('allowed',false,'reason','CONTROLLED_DESTINATION_SCOPE_REJECTED'); end if;
  insert into public.controlled_destination_records(record_id,enterprise_id,destination_id,transaction_id,operational_entity_id,action,target,idempotency_key,test_record,result,occurred_at,record_digest)
  values((p_record->>'record_id')::uuid,p_enterprise_id,'controlled-repository-a',r.transaction_id,r.operational_entity_id,r.action_type,r.action_target,r.idempotency_key,
    case when r.action_type='WRITE_TEST_RECORD' then jsonb_build_object('type','CONTROLLED_TEST_RECORD','transactionId',r.transaction_id) else null end,
    'OBSERVED',(p_record->>'occurred_at')::timestamptz,p_record->>'record_digest') on conflict(enterprise_id,destination_id,idempotency_key) do nothing;
  select * into prior from public.controlled_destination_records where enterprise_id=p_enterprise_id and destination_id='controlled-repository-a' and idempotency_key=r.idempotency_key;
  if prior.transaction_id is distinct from r.transaction_id or prior.operational_entity_id is distinct from r.operational_entity_id
    or prior.action is distinct from r.action_type or prior.target is distinct from r.action_target then raise exception 'DESTINATION_IDEMPOTENCY_CONFLICT'; end if;
  if prior.result is distinct from 'OBSERVED' then return jsonb_build_object('allowed',false,'reason','CONTROLLED_DESTINATION_NOT_OBSERVED'); end if;
  return jsonb_build_object('allowed',true,'recordId',prior.record_id,'occurredAt',prior.occurred_at);
end $$;
revoke all on function public.revalidate_native_enforcement_dispatch_v3(uuid,uuid,uuid),public.claim_native_enforcement_dispatch_v3(uuid,uuid,uuid),public.execute_controlled_native_destination_v3(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.revalidate_native_enforcement_dispatch_v3(uuid,uuid,uuid),public.claim_native_enforcement_dispatch_v3(uuid,uuid,uuid),public.execute_controlled_native_destination_v3(uuid,uuid,uuid,jsonb) to service_role;
-- The application service path cannot bypass atomic current-state enforcement.
revoke all on public.controlled_destination_records from service_role;
grant select on public.controlled_destination_records to service_role;
