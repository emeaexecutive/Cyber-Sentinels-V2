-- REVIEW ONLY: no hosted application is authorised by this file.
-- At-most-once dispatch. A committed claim is never leased, released or retried.
-- A crash after claim leaves UNKNOWN until independent reconciliation.
alter table public.native_enforcement_human_approvals add constraint native_human_approval_tenant_key unique(enterprise_id,approval_id);
create table public.native_enforcement_approval_scopes (
  approval_id uuid primary key references public.native_enforcement_human_approvals(approval_id),
  enterprise_id uuid not null,
  scope jsonb not null,
  unique(enterprise_id,approval_id),
  foreign key(enterprise_id,approval_id) references public.native_enforcement_human_approvals(enterprise_id,approval_id)
);
create table public.native_enforcement_dispatch_claims (
  enterprise_id uuid not null,
  transaction_id uuid not null,
  request_id uuid not null,
  approval_id uuid references public.native_enforcement_approval_scopes(approval_id),
  actor_id uuid not null,
  scope jsonb not null,
  claimed_at timestamptz not null default clock_timestamp(),
  primary key(enterprise_id,transaction_id),
  unique(request_id),
  unique(approval_id),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id),
  foreign key(enterprise_id,request_id) references public.native_enforcement_requests(enterprise_id,request_id),
  foreign key(enterprise_id,approval_id) references public.native_enforcement_approval_scopes(enterprise_id,approval_id)
);
alter table public.native_enforcement_approval_scopes enable row level security;
alter table public.native_enforcement_dispatch_claims enable row level security;
revoke all on public.native_enforcement_approval_scopes,public.native_enforcement_dispatch_claims from public,anon,authenticated,service_role;
grant select on public.native_enforcement_approval_scopes,public.native_enforcement_dispatch_claims to service_role;

create function public.native_enforcement_scope_v2(p_tenant uuid,p_actor uuid,p_transaction uuid,p_entity text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('tenant',t.enterprise_id,'actor',p_actor,'entity',t.operational_entity_id,
    'transaction',t.transaction_id,'evaluation',b.evaluation_id,'action',upper(t.action_type),'destination',t.action_resource,
    'environment',t.action_environment,'parametersDigest',t.request_digest,
    'policyId',t.policy_id,'policyVersion',t.policy_version,'decisionDigest',b.decision_digest,
    'authority',d.parent_authority_id,'delegation',d.delegation_id,'delegationPolicyVersion',d.policy_version,
    'consequence',upper(coalesce(t.decision_time_snapshot->>'consequence','LOW')))
  from public.canonical_trust_transactions t
  join public.native_enforcement_decision_bindings b on b.enterprise_id=t.enterprise_id and b.transaction_id=t.transaction_id and b.operational_entity_id=t.operational_entity_id
  join public.operational_entity_delegated_action_evaluations e on e.enterprise_id=b.enterprise_id and e.evaluation_id=b.evaluation_id and e.decision_digest=b.decision_digest
  join public.operational_entity_authority_delegations d on d.enterprise_id=e.enterprise_id and d.delegation_id=e.delegation_id and d.delegate_operational_entity_id=t.operational_entity_id
  where t.enterprise_id=p_tenant and t.transaction_id=p_transaction and t.operational_entity_id=p_entity and t.decision='ALLOW' and e.decision='ALLOW';
$$;

create function public.issue_native_enforcement_approval_v2(p_enterprise_id uuid,p_actor_id uuid,p_approval jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare s jsonb; a uuid:=(p_approval->>'approvalId')::uuid; expires timestamptz:=(p_approval->>'expiresAt')::timestamptz;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service path required'; end if;
  -- Lock canonical scope so issuance cannot race a concurrent transaction edit.
  perform 1 from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=(p_approval->>'transactionId')::uuid for update;
  s:=public.native_enforcement_scope_v2(p_enterprise_id,p_actor_id,(p_approval->>'transactionId')::uuid,p_approval->>'operationalEntityId');
  if s is null or p_actor_id is null or nullif(s->>'policyId','') is null or nullif(s->>'policyVersion','') is null
    or s->>'consequence' not in ('HIGH','CRITICAL') or p_actor_id is distinct from (p_approval->>'approvedBy')::uuid
    or expires<=clock_timestamp() or expires>clock_timestamp()+interval '15 minutes'
    or (p_approval->>'approvedAt')::timestamptz>clock_timestamp() then raise exception 'Approval scope or expiry invalid'; end if;
  insert into public.native_enforcement_human_approvals(approval_id,enterprise_id,transaction_id,operational_entity_id,action_digest,approved_by,approved_at,expires_at,non_transferable,approval_digest)
  values(a,p_enterprise_id,(p_approval->>'transactionId')::uuid,p_approval->>'operationalEntityId',p_approval->>'actionDigest',p_actor_id,(p_approval->>'approvedAt')::timestamptz,expires,true,p_approval->>'approvalDigest');
  insert into public.native_enforcement_approval_scopes values(a,p_enterprise_id,s);
  return jsonb_build_object('approvalId',a,'status','CREATED');
end $$;

create function public.claim_native_enforcement_dispatch_v2(p_enterprise_id uuid,p_actor_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.native_enforcement_requests%rowtype; a public.native_enforcement_human_approvals%rowtype;
  d public.operational_entity_authority_delegations%rowtype; parent public.trust_contracts%rowtype;
  v public.operational_entity_native_verifications%rowtype; s jsonb; bound jsonb; approval_uuid uuid; expected_fingerprint text; inserted uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service path required'; end if;
  select * into r from public.native_enforcement_requests where enterprise_id=p_enterprise_id and request_id=p_request_id;
  if r.request_id is null or r.actor_id is distinct from p_actor_id or r.request_state<>'REQUESTED' then
    return jsonb_build_object('claimed',false,'reason','DISPATCH_REQUEST_INVALID'); end if;
  -- Every key and every approval for this canonical transaction shares this lock.
  perform 1 from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=r.transaction_id for update;
  s:=public.native_enforcement_scope_v2(p_enterprise_id,p_actor_id,r.transaction_id,r.operational_entity_id);
  if s is null or s->>'evaluation' is distinct from r.evaluation_id::text or s->>'action' is distinct from r.action_type or s->>'destination' is distinct from r.action_target
    or s->>'environment' is distinct from r.environment or s->>'decisionDigest' is distinct from r.decision_digest
    or s->>'authority' is distinct from r.authority_id::text or s->>'delegation' is distinct from r.delegation_id::text
    or s->>'consequence' is distinct from r.consequence then return jsonb_build_object('claimed',false,'reason','DISPATCH_SCOPE_CHANGED'); end if;
  select * into d from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and delegation_id=r.delegation_id for update;
  select * into parent from public.trust_contracts where enterprise_id=p_enterprise_id and contract_id=r.authority_id for update;
  if d.status is distinct from 'ACTIVE' or d.revoked_at is not null or d.expires_at<=clock_timestamp()
    or parent.revocation_state is distinct from 'active' or parent.expires_at<=clock_timestamp() then
    return jsonb_build_object('claimed',false,'reason','DISPATCH_AUTHORITY_REVOKED'); end if;
  select * into v from public.operational_entity_native_verifications where enterprise_id=p_enterprise_id and operational_entity_id=r.operational_entity_id order by verified_at desc limit 1 for update;
  select decision_snapshot#>>'{beta,continuityFingerprint}' into expected_fingerprint from public.operational_entity_delegated_action_evaluations where enterprise_id=p_enterprise_id and evaluation_id=r.evaluation_id;
  if v.status is distinct from 'VERIFIED' or v.expires_at<=clock_timestamp() or v.runtime_binding is distinct from 'RUNTIME_MATCH'
    or (nullif(expected_fingerprint,'') is not null and v.continuity_fingerprint is distinct from expected_fingerprint)
    or not exists(select 1 from public.operational_entity_owner_bindings where enterprise_id=p_enterprise_id and operational_entity_id=r.operational_entity_id and state='CONFIRMED'
      and effective_from=(select max(effective_from) from public.operational_entity_owner_bindings where enterprise_id=p_enterprise_id and operational_entity_id=r.operational_entity_id)) then
    return jsonb_build_object('claimed',false,'reason','DISPATCH_IDENTITY_CHANGED'); end if;
  if r.consequence in ('HIGH','CRITICAL') then
    select * into a from public.native_enforcement_human_approvals where enterprise_id=p_enterprise_id and transaction_id=r.transaction_id and operational_entity_id=r.operational_entity_id and action_digest=r.action_digest for update;
    select scope into bound from public.native_enforcement_approval_scopes where enterprise_id=p_enterprise_id and approval_id=a.approval_id;
    if a.approval_id is null or bound is distinct from s or a.approved_by is distinct from p_actor_id
      or not a.non_transferable or a.approved_at>clock_timestamp() or a.expires_at<=clock_timestamp() then
      return jsonb_build_object('claimed',false,'reason','DISPATCH_APPROVAL_INVALID'); end if;
    approval_uuid:=a.approval_id;
  end if;
  insert into public.native_enforcement_dispatch_claims(enterprise_id,transaction_id,request_id,approval_id,actor_id,scope)
  values(p_enterprise_id,r.transaction_id,r.request_id,approval_uuid,p_actor_id,s)
  on conflict do nothing returning request_id into inserted;
  if inserted is null then return jsonb_build_object('claimed',false,'reason','DISPATCH_ALREADY_CONSUMED','outcome','UNKNOWN'); end if;
  return jsonb_build_object('claimed',true,'requestId',inserted,'outcome','UNKNOWN');
end $$;
revoke all on function public.native_enforcement_scope_v2(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.issue_native_enforcement_approval_v2(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.claim_native_enforcement_dispatch_v2(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.issue_native_enforcement_approval_v2(uuid,uuid,jsonb),public.claim_native_enforcement_dispatch_v2(uuid,uuid,uuid) to service_role;
