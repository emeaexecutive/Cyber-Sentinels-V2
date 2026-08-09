-- Native delegated authority between independently verified Operational Entities.
-- This extends Trust Contracts (Authority Lineage), the canonical Evidence Graph,
-- native Replay and Trust Memory. It creates no parallel identity or decision engine.

alter table public.trust_contracts add column if not exists revoked_at timestamptz;

-- Trust Contract content stays immutable. Only the explicit current revocation
-- projection may transition once from active to revoked.
drop trigger if exists trust_contracts_append_only on public.trust_contracts;
update public.trust_contracts set revoked_at=coalesce(revoked_at,created_at) where revocation_state='revoked';
alter table public.trust_contracts add constraint trust_contracts_revocation_timestamp_check
  check(revocation_state='revoked' or revoked_at is null);
create or replace function public.preserve_trust_contract_content_v2() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Trust Contract history is immutable'; end if;
  if old.contract_id<>new.contract_id or old.enterprise_id<>new.enterprise_id or old.subject_type<>new.subject_type or old.subject_id<>new.subject_id
    or old.workflow_id<>new.workflow_id or old.authorized_objective<>new.authorized_objective or old.contract is distinct from new.contract
    or old.policy_version<>new.policy_version or old.issued_at<>new.issued_at or old.expires_at<>new.expires_at
    or old.supersedes_contract_id is distinct from new.supersedes_contract_id or old.record_hash<>new.record_hash
    or old.correlation_id<>new.correlation_id or old.actor_id<>new.actor_id or old.created_at<>new.created_at
  then raise exception 'Trust Contract content is immutable'; end if;
  if old.revocation_state='revoked' or new.revocation_state<>'revoked' or new.revoked_at is null then raise exception 'Trust Contract revocation is monotonic'; end if;
  return new;
end $$;
create trigger trust_contracts_preserve_content before update or delete on public.trust_contracts for each row execute function public.preserve_trust_contract_content_v2();

create table public.operational_entity_authority_delegations (
  delegation_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  delegator_operational_entity_id text not null,
  delegate_operational_entity_id text not null,
  parent_authority_id uuid not null,
  parent_delegation_id uuid references public.operational_entity_authority_delegations(delegation_id) on delete restrict,
  objective text not null,
  permitted_actions text[] not null,
  permitted_tools text[] not null,
  permitted_targets text[] not null,
  environments text[] not null,
  data_boundary text not null check(data_boundary in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  financial_limit bigint check(financial_limit is null or financial_limit>=0),
  execution_limit bigint check(execution_limit is null or execution_limit>=0),
  can_redelegate boolean not null default false,
  maximum_delegation_depth integer not null default 0 check(maximum_delegation_depth between 0 and 16),
  delegation_depth integer not null check(delegation_depth between 1 and 16),
  issued_at timestamptz not null,
  not_before timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  policy_version text not null,
  authority_version text not null,
  nonce text not null,
  signing_key_id text not null,
  delegation_digest text not null check(delegation_digest ~ '^[a-f0-9]{64}$'),
  signature text not null,
  status text not null check(status in ('PENDING','ACTIVE','EXPIRED','REVOKED','SUPERSEDED','REJECTED')),
  policy_decision text check(policy_decision is null or policy_decision in ('ACTIVATE','REVIEW','REJECT')),
  policy_reason_codes text[] not null default '{}',
  evidence_references text[] not null default '{}',
  proposed_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(enterprise_id,delegator_operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,delegate_operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,parent_authority_id) references public.trust_contracts(enterprise_id,contract_id) on delete restrict,
  check(delegator_operational_entity_id<>delegate_operational_entity_id),
  check(not_before>=issued_at and expires_at>not_before),
  check((status='REVOKED')=(revoked_at is not null)),
  unique(enterprise_id,delegation_digest),
  unique(enterprise_id,parent_authority_id,delegate_operational_entity_id,authority_version)
);
create index operational_entity_authority_delegations_delegator_idx on public.operational_entity_authority_delegations(enterprise_id,delegator_operational_entity_id,status,issued_at desc);
create index operational_entity_authority_delegations_delegate_idx on public.operational_entity_authority_delegations(enterprise_id,delegate_operational_entity_id,status,issued_at desc);
create index operational_entity_authority_delegations_parent_idx on public.operational_entity_authority_delegations(enterprise_id,parent_authority_id,parent_delegation_id);

create table public.operational_entity_delegation_acceptances (
  acceptance_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  delegation_id uuid not null references public.operational_entity_authority_delegations(delegation_id) on delete restrict,
  delegation_digest text not null check(delegation_digest ~ '^[a-f0-9]{64}$'),
  delegate_operational_entity_id text not null,
  credential_id uuid not null references public.operational_entity_native_credentials(credential_id) on delete restrict,
  credential_fingerprint text not null check(credential_fingerprint ~ '^[a-f0-9]{64}$'),
  manifest_id uuid not null references public.operational_entity_manifests(manifest_id) on delete restrict,
  manifest_digest text not null check(manifest_digest ~ '^[a-f0-9]{64}$'),
  signing_key_id text not null,
  accepted_at timestamptz not null,
  nonce text not null,
  signature text not null,
  acceptance_digest text not null check(acceptance_digest ~ '^[a-f0-9]{64}$'),
  accepted_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,delegate_operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,delegation_id),
  unique(enterprise_id,acceptance_digest)
);

create table public.operational_entity_delegated_action_evaluations (
  evaluation_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  delegation_id uuid not null references public.operational_entity_authority_delegations(delegation_id) on delete restrict,
  delegate_operational_entity_id text not null,
  canonical_transaction_id uuid,
  action_type text not null,
  action_target text not null,
  action_tool text not null,
  environment text not null,
  decision text not null check(decision in ('ALLOW','REVIEW','DENY')),
  reason_codes text[] not null,
  authority_lineage jsonb not null check(jsonb_typeof(authority_lineage)='array'),
  decision_snapshot jsonb not null check(jsonb_typeof(decision_snapshot)='object'),
  decision_digest text not null check(decision_digest ~ '^[a-f0-9]{64}$'),
  evaluated_at timestamptz not null,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,delegate_operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(enterprise_id,canonical_transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  unique(enterprise_id,decision_digest)
);

do $$ declare table_name text; begin foreach table_name in array array[
  'operational_entity_authority_delegations','operational_entity_delegation_acceptances','operational_entity_delegated_action_evaluations'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id))','tenant reads '||table_name,table_name);
end loop; end $$;

create trigger operational_entity_delegation_acceptances_append_only before update or delete on public.operational_entity_delegation_acceptances for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger operational_entity_delegated_action_evaluations_append_only before update or delete on public.operational_entity_delegated_action_evaluations for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.preserve_authority_delegation_payload_v1() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'Authority delegation history is immutable'; end if;
  if old.enterprise_id<>new.enterprise_id or old.delegator_operational_entity_id<>new.delegator_operational_entity_id
    or old.delegate_operational_entity_id<>new.delegate_operational_entity_id or old.parent_authority_id<>new.parent_authority_id
    or old.parent_delegation_id is distinct from new.parent_delegation_id or old.objective<>new.objective
    or old.permitted_actions is distinct from new.permitted_actions or old.permitted_tools is distinct from new.permitted_tools
    or old.permitted_targets is distinct from new.permitted_targets or old.environments is distinct from new.environments
    or old.data_boundary<>new.data_boundary or old.financial_limit is distinct from new.financial_limit
    or old.execution_limit is distinct from new.execution_limit or old.can_redelegate<>new.can_redelegate
    or old.maximum_delegation_depth<>new.maximum_delegation_depth or old.delegation_depth<>new.delegation_depth
    or old.issued_at<>new.issued_at or old.not_before<>new.not_before or old.expires_at<>new.expires_at
    or old.policy_version<>new.policy_version or old.authority_version<>new.authority_version or old.nonce<>new.nonce
    or old.signing_key_id<>new.signing_key_id or old.delegation_digest<>new.delegation_digest or old.signature<>new.signature
    or old.evidence_references is distinct from new.evidence_references or old.proposed_by<>new.proposed_by
  then raise exception 'Signed authority delegation payload is immutable'; end if;
  return new;
end $$;
create trigger operational_entity_authority_delegations_preserve_payload before update or delete on public.operational_entity_authority_delegations for each row execute function public.preserve_authority_delegation_payload_v1();

-- Extend the canonical graph vocabulary; do not create a delegation graph.
alter table public.evidence_graph_edges drop constraint if exists evidence_graph_edges_edge_type_check;
alter table public.evidence_graph_edges add constraint evidence_graph_edges_edge_type_check check(edge_type in (
  'ASSERTS','DERIVED_FROM','OBSERVED_BY','AUTHORIZED_BY','PARTICIPATED_IN','APPLIES_TO','SUPERSEDES','REVOKES','CONFLICTS_WITH','SUPPORTED','CHALLENGED','RESULTED_IN','TRIGGERED','ALERTED_BY','CORRELATED_WITH','REPLAYED_AS',
  'INVOLVES','OPERATED_AS','RAN_IN','CONTRADICTS','CAUSED_OR_PRECEDED','DETECTED_BY','AFFECTED','REQUESTED_FROM','CONTAINMENT_REQUESTED','ACKNOWLEDGED_BY','CONFIRMED_BY','INDEPENDENTLY_CONFIRMED_BY','SUPPORTS_TRIGGER','REVIEWED_BY','DECIDED_BY','INCLUDES','INCLUDED_IN_PACKAGE','SUBMITTED_TO','CORRECTED_BY','REMEDIATED_BY','VALIDATED_BY','RECORDED_IN_MEMORY','RECONSTRUCTED_BY_REPLAY',
  'ENTITY_DELEGATED_AUTHORITY','ENTITY_RECEIVED_DELEGATED_AUTHORITY','DELEGATION_DERIVED_FROM_AUTHORITY','DELEGATION_ACCEPTED_BY_ENTITY','ACTION_AUTHORIZED_BY_DELEGATION','DELEGATION_REVOKED','DELEGATION_EXPIRED'
));

alter table public.operational_entity_native_replay_events drop constraint if exists operational_entity_native_replay_events_event_type_check;
alter table public.operational_entity_native_replay_events add constraint operational_entity_native_replay_events_event_type_check check(event_type in (
  'MANIFEST_REGISTERED','CREDENTIAL_REGISTERED','CHALLENGE_ISSUED','CHALLENGE_VERIFIED','NATIVE_IDENTITY_VERIFIED','OWNER_CONFIRMED','RUNTIME_BOUND','BUILD_VERIFIED','ENTITY_CHANGED','CREDENTIAL_ROTATED','CREDENTIAL_REVOKED','VERIFICATION_EXPIRED','REVERIFICATION_COMPLETED','ENTITY_SUSPENDED','AUTHORITY_REVOKED','OWNER_REVOKED','MANIFEST_REVOKED',
  'ALPHA_VERIFIED','BETA_REGISTERED','BETA_VERIFIED','ALPHA_AUTHORITY_ISSUED','DELEGATION_PROPOSED','DELEGATION_VALIDATED','BETA_ACCEPTED','DELEGATION_ACTIVATED','BETA_ACTION_REQUESTED','BETA_ACTION_ALLOWED','BETA_ACTION_REVIEW_REQUIRED','BETA_ACTION_DENIED','BETA_SCOPE_VIOLATION_DENIED','PARENT_AUTHORITY_REVOKED','DELEGATION_INVALIDATED','DELEGATION_REVOKED'
));

create or replace function public.register_native_agent_operational_entity_v1(
  p_enterprise_id uuid,p_actor_id uuid,p_entity jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare identifier text:=p_entity->>'entityId'; existing text;
begin
  if auth.role()<>'service_role' then raise exception 'Operational Entity service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text||':'||identifier,79));
  select entity_id into existing from public.operational_entities where enterprise_id=p_enterprise_id and entity_id=identifier;
  if existing is not null then return jsonb_build_object('status','DUPLICATE','operationalEntityId',existing); end if;
  insert into public.trust_subjects(enterprise_id,domain_key,subject_id,subject_type,display_label)
  values(p_enterprise_id,'AI_AGENT',identifier,'ai_agent',p_entity->>'displayReference')
  on conflict(enterprise_id,domain_key,subject_id) do nothing;
  insert into public.operational_entities(
    entity_id,enterprise_id,entity_type,display_reference,canonical_trust_object_id,lifecycle_state,accountable_owner_id,organization_reference,
    provider_references,external_identity_references,identity_profile_reference,current_authority_references,environment_references,workflow_references,
    current_trust_state,current_evidence_state,current_consequence_classification,canonical_digest
  ) values (
    identifier,p_enterprise_id,'ai_agent',p_entity->>'displayReference',identifier,'active',p_entity->>'accountableOwnerId',p_entity->>'organizationReference',
    '["provider:cyber-sentinels-native"]'::jsonb,'[]'::jsonb,'profile:'||identifier,'[]'::jsonb,
    jsonb_build_array(p_entity->>'environmentReference'),jsonb_build_array(p_entity->>'workflowReference'),
    'unknown','unknown','low',p_entity->>'canonicalDigest'
  );
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata)
  values(p_enterprise_id,'OPERATIONAL_ENTITY',identifier,'AI_AGENT',p_entity->>'displayReference',jsonb_build_object('nativeVerification','PENDING'))
  on conflict(enterprise_id,node_type,external_id) do nothing;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_enterprise_id,'NATIVE_AGENT_OPERATIONAL_ENTITY_REGISTERED','user:'||p_actor_id::text,'OPERATIONAL_ENTITY',identifier,gen_random_uuid(),jsonb_build_object('accountableOwnerId',p_entity->>'accountableOwnerId'));
  return jsonb_build_object('status','CREATED','operationalEntityId',identifier);
end $$;
revoke all on function public.register_native_agent_operational_entity_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_native_agent_operational_entity_v1(uuid,uuid,jsonb) to service_role;

-- Acceptance is serialized against both the delegation and Beta's current
-- native identity. A second acceptance cannot create another active edge.
create or replace function public.accept_operational_entity_delegation_v1(
  p_enterprise_id uuid,p_delegation_id uuid,p_delegate_operational_entity_id text,p_actor_id uuid,p_acceptance jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare delegation public.operational_entity_authority_delegations%rowtype; active_verification record; existing uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Delegated authority service path required'; end if;
  select * into delegation from public.operational_entity_authority_delegations
  where enterprise_id=p_enterprise_id and delegation_id=p_delegation_id and delegate_operational_entity_id=p_delegate_operational_entity_id for update;
  if delegation.delegation_id is null then raise exception 'Tenant-scoped delegation not found'; end if;
  if delegation.status<>'PENDING' or delegation.policy_decision<>'ACTIVATE' or delegation.revoked_at is not null or delegation.expires_at<=now() then raise exception 'Delegation is not eligible for acceptance'; end if;
  if delegation.delegation_digest<>p_acceptance->>'delegationDigest' then raise exception 'Delegation digest mismatch'; end if;
  select v.verification_id,v.credential_id,v.manifest_id,v.credential_fingerprint,v.manifest_digest,v.expires_at,c.signing_key_id,c.state
  into active_verification from public.operational_entity_native_verifications v
  join public.operational_entity_native_credentials c on c.credential_id=v.credential_id
  join public.operational_entity_manifests m on m.manifest_id=v.manifest_id
  where v.enterprise_id=p_enterprise_id and v.operational_entity_id=p_delegate_operational_entity_id and v.status='VERIFIED'
    and v.expires_at>now() and c.state='ACTIVE' and m.status='ACTIVE'
  order by v.verified_at desc limit 1 for update of c,m;
  if active_verification.verification_id is null then raise exception 'Current Beta identity proof required'; end if;
  if active_verification.credential_fingerprint<>p_acceptance->>'credentialFingerprint'
    or active_verification.manifest_digest<>p_acceptance->>'manifestDigest'
    or active_verification.signing_key_id<>p_acceptance->>'signingKeyId' then raise exception 'Acceptance identity binding mismatch'; end if;
  select acceptance_id into existing from public.operational_entity_delegation_acceptances where enterprise_id=p_enterprise_id and delegation_id=p_delegation_id;
  if existing is not null then return jsonb_build_object('status','DUPLICATE','acceptanceId',existing); end if;
  insert into public.operational_entity_delegation_acceptances(
    acceptance_id,enterprise_id,delegation_id,delegation_digest,delegate_operational_entity_id,credential_id,credential_fingerprint,
    manifest_id,manifest_digest,signing_key_id,accepted_at,nonce,signature,acceptance_digest,accepted_by
  ) values (
    (p_acceptance->>'acceptanceId')::uuid,p_enterprise_id,p_delegation_id,p_acceptance->>'delegationDigest',p_delegate_operational_entity_id,
    active_verification.credential_id,p_acceptance->>'credentialFingerprint',active_verification.manifest_id,p_acceptance->>'manifestDigest',
    p_acceptance->>'signingKeyId',(p_acceptance->>'acceptedAt')::timestamptz,p_acceptance->>'nonce',p_acceptance->>'signature',p_acceptance->>'acceptanceDigest',p_actor_id
  );
  update public.operational_entity_authority_delegations set status='ACTIVE',updated_at=now() where enterprise_id=p_enterprise_id and delegation_id=p_delegation_id and status='PENDING';
  return jsonb_build_object('status','ACTIVE','acceptanceId',p_acceptance->>'acceptanceId');
end $$;
revoke all on function public.accept_operational_entity_delegation_v1(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.accept_operational_entity_delegation_v1(uuid,uuid,text,uuid,jsonb) to service_role;

-- This is the authorization race boundary. The parent Trust Contract and the
-- delegation are locked and re-read in the same transaction that stores the
-- decision snapshot. A stale ALLOW supplied by an application is downgraded.
create or replace function public.persist_delegated_action_evaluation_v1(
  p_enterprise_id uuid,p_delegation_id uuid,p_delegate_operational_entity_id text,p_actor_id uuid,p_evaluation jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare delegation public.operational_entity_authority_delegations%rowtype; parent_state text; parent_expiry timestamptz; final_decision text; final_reasons text[];
begin
  if auth.role()<>'service_role' then raise exception 'Delegated authority service path required'; end if;
  select * into delegation from public.operational_entity_authority_delegations
  where enterprise_id=p_enterprise_id and delegation_id=p_delegation_id and delegate_operational_entity_id=p_delegate_operational_entity_id for update;
  if delegation.delegation_id is null then raise exception 'Tenant-scoped delegation not found'; end if;
  select revocation_state,expires_at into parent_state,parent_expiry from public.trust_contracts
  where enterprise_id=p_enterprise_id and contract_id=delegation.parent_authority_id for update;
  if parent_state is null then raise exception 'Parent authority not found'; end if;
  final_decision:=p_evaluation->>'decision';
  final_reasons:=array(select jsonb_array_elements_text(p_evaluation->'reasonCodes'));
  if delegation.status<>'ACTIVE' or delegation.revoked_at is not null or delegation.expires_at<=now() then
    final_decision:='DENY'; final_reasons:=array_append(final_reasons,case when delegation.revoked_at is not null then 'DELEGATION_REVOKED' else 'DELEGATION_EXPIRED' end);
  end if;
  if parent_state<>'active' or parent_expiry<=now() then
    final_decision:='DENY'; final_reasons:=array_append(final_reasons,case when parent_state='revoked' then 'PARENT_AUTHORITY_REVOKED' else 'PARENT_AUTHORITY_EXPIRED' end);
  end if;
  insert into public.operational_entity_delegated_action_evaluations(
    evaluation_id,enterprise_id,delegation_id,delegate_operational_entity_id,canonical_transaction_id,action_type,action_target,action_tool,
    environment,decision,reason_codes,authority_lineage,decision_snapshot,decision_digest,evaluated_at,actor_id
  ) values (
    (p_evaluation->>'evaluationId')::uuid,p_enterprise_id,p_delegation_id,p_delegate_operational_entity_id,nullif(p_evaluation->>'canonicalTransactionId','')::uuid,
    p_evaluation->>'actionType',p_evaluation->>'actionTarget',p_evaluation->>'actionTool',p_evaluation->>'environment',final_decision,
    (select array_agg(distinct reason order by reason) from unnest(final_reasons) reason),p_evaluation->'authorityLineage',p_evaluation->'decisionSnapshot',
    p_evaluation->>'decisionDigest',(p_evaluation->>'evaluatedAt')::timestamptz,p_actor_id
  );
  return jsonb_build_object('status','CREATED','evaluationId',p_evaluation->>'evaluationId','decision',final_decision,'reasonCodes',to_jsonb(final_reasons));
end $$;
revoke all on function public.persist_delegated_action_evaluation_v1(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.persist_delegated_action_evaluation_v1(uuid,uuid,text,uuid,jsonb) to service_role;

create or replace function public.revoke_trust_contract_with_delegation_cascade_v1(
  p_enterprise_id uuid,p_parent_authority_id uuid,p_actor_id uuid,p_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare contract public.trust_contracts%rowtype; affected jsonb; occurred timestamptz:=now();
begin
  if auth.role()<>'service_role' then raise exception 'Delegated authority service path required'; end if;
  if length(trim(coalesce(p_reason,'')))<1 or length(p_reason)>500 then raise exception 'A bounded revocation reason is required'; end if;
  select * into contract from public.trust_contracts where enterprise_id=p_enterprise_id and contract_id=p_parent_authority_id for update;
  if contract.contract_id is null then raise exception 'Parent authority not found'; end if;
  if contract.revocation_state='revoked' then
    return jsonb_build_object('status','DUPLICATE','parentAuthorityId',p_parent_authority_id,'revokedAt',contract.revoked_at);
  end if;
  update public.trust_contracts set revocation_state='revoked',revoked_at=occurred where enterprise_id=p_enterprise_id and contract_id=p_parent_authority_id and revocation_state='active';
  select coalesce(jsonb_agg(jsonb_build_object('delegationId',delegation_id,'delegateOperationalEntityId',delegate_operational_entity_id)),'[]'::jsonb)
    into affected from public.operational_entity_authority_delegations where enterprise_id=p_enterprise_id and parent_authority_id=p_parent_authority_id and status='ACTIVE';
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_enterprise_id,'PARENT_AUTHORITY_REVOKED','user:'||p_actor_id::text,'TRUST_CONTRACT',p_parent_authority_id::text,gen_random_uuid(),jsonb_build_object('reason',p_reason,'affectedDelegations',affected));
  return jsonb_build_object('status','REVOKED','parentAuthorityId',p_parent_authority_id,'revokedAt',occurred,'affectedDelegations',affected);
end $$;
revoke all on function public.revoke_trust_contract_with_delegation_cascade_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.revoke_trust_contract_with_delegation_cascade_v1(uuid,uuid,uuid,text) to service_role;

comment on table public.operational_entity_authority_delegations is 'Signed, attenuated authority-lineage edges between canonical Operational Entities; identity remains separately proven.';
comment on function public.persist_delegated_action_evaluation_v1 is 'Transaction-safe current-authority gate used before any delegated ALLOW may request execution.';
