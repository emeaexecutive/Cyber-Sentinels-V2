-- Customer Zero closure for the existing public API authority and human-review
-- architecture. This migration creates no parallel identity, authority,
-- decision, evidence, review, Replay, or graph store.

alter table public.api_keys
  add column if not exists authority_management_boundary jsonb;
alter table public.api_keys
  add column if not exists rotation_request_id uuid;

create unique index if not exists api_keys_rotation_request_uidx
  on public.api_keys(tenant_id,rotated_from_id,rotation_request_id)
  where rotated_from_id is not null and rotation_request_id is not null;

alter table public.api_keys
  drop constraint if exists api_keys_scope_v1_check;
alter table public.api_keys
  add constraint api_keys_scope_v1_check check(
    scopes <@ array[
      'agents:write','agents:verify','authority:read','authority:write',
      'trust:request','trust:read','evidence:write','outcomes:write',
      'review:read','review:write'
    ]::text[]
  );

alter table public.api_keys
  add constraint api_keys_authority_boundary_v1_check check(
    authority_management_boundary is null or (
      jsonb_typeof(authority_management_boundary)='object'
      and jsonb_typeof(authority_management_boundary->'actions')='array'
      and jsonb_typeof(authority_management_boundary->'target_prefixes')='array'
      and jsonb_typeof(authority_management_boundary->'purposes')='array'
      and jsonb_typeof(authority_management_boundary->'environments')='array'
      and (authority_management_boundary->>'max_ttl_seconds')::integer between 300 and 7776000
    )
  );

create or replace function public.rotate_public_api_key_v1(
  p_tenant_id uuid,
  p_key_id uuid,
  p_actor_user_id uuid,
  p_rotation_request_id uuid,
  p_new_prefix text,
  p_new_hash text,
  p_expires_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  source_key public.api_keys%rowtype;
  replacement public.api_keys%rowtype;
  effective_expiry timestamptz;
  now_at timestamptz:=clock_timestamp();
begin
  if auth.role()<>'service_role' then
    raise exception using errcode='P0001',message='API_KEY_ROTATION_FORBIDDEN';
  end if;
  if p_tenant_id is null or p_key_id is null or p_actor_user_id is null or p_rotation_request_id is null
    or p_new_prefix !~ '^cs_(test|live)_[A-Za-z0-9_-]{12}$'
    or p_new_hash !~ '^scrypt[$][A-Za-z0-9_-]{22}[$][A-Za-z0-9_-]{43}$'
  then
    raise exception using errcode='22023',message='API_KEY_ROTATION_INPUT_INVALID';
  end if;
  if not exists(
    select 1 from public.trust_workspaces workspace
    where workspace.id=p_tenant_id and (
      workspace.created_by=p_actor_user_id or exists(
        select 1 from public.workspace_members member
        where member.workspace_id=workspace.id and member.user_id=p_actor_user_id and member.role='admin'
      )
    )
  ) then
    raise exception using errcode='P0001',message='API_KEY_ROTATION_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||':'||p_key_id::text,73));
  select * into source_key from public.api_keys
    where tenant_id=p_tenant_id and id=p_key_id for update;
  if source_key.id is null then
    raise exception using errcode='P0001',message='API_KEY_NOT_FOUND';
  end if;

  if source_key.status<>'active' or source_key.revoked_at is not null then
    select * into replacement from public.api_keys
      where tenant_id=p_tenant_id and rotated_from_id=p_key_id and rotation_request_id=p_rotation_request_id;
    if replacement.id is null then
      raise exception using errcode='P0001',message='API_KEY_INACTIVE';
    end if;
    return jsonb_build_object(
      'idempotentReplay',true,
      'key',jsonb_build_object(
        'id',replacement.id,'client_id',replacement.client_id,'label',replacement.label,
        'key_prefix',replacement.key_prefix,'status',replacement.status,'scopes',replacement.scopes,
        'expires_at',replacement.expires_at,'last_used_at',replacement.last_used_at,
        'usage_count',replacement.usage_count,'rate_limit_status',replacement.rate_limit_status,
        'created_at',replacement.created_at,'revoked_at',replacement.revoked_at,
        'rotated_from_id',replacement.rotated_from_id,'rotation_request_id',replacement.rotation_request_id,
        'authority_management_boundary',replacement.authority_management_boundary
      )
    );
  end if;
  if source_key.expires_at is not null and source_key.expires_at<=now_at then
    raise exception using errcode='P0001',message='API_KEY_EXPIRED';
  end if;
  effective_expiry:=coalesce(p_expires_at,source_key.expires_at);
  if effective_expiry is not null and effective_expiry<=now_at then
    raise exception using errcode='22023',message='API_KEY_ROTATION_INPUT_INVALID';
  end if;

  insert into public.api_keys(
    tenant_id,client_id,owner_user_id,user_id,user_email,created_by,label,key_prefix,key_hash,
    status,scopes,authority_management_boundary,expires_at,usage_count,rate_limit_status,
    rotated_from_id,rotation_request_id,created_at,updated_at
  ) values(
    source_key.tenant_id,source_key.client_id,source_key.owner_user_id,source_key.user_id,
    source_key.user_email,source_key.created_by,source_key.label,p_new_prefix,p_new_hash,
    'active',source_key.scopes,source_key.authority_management_boundary,effective_expiry,0,'normal',
    source_key.id,p_rotation_request_id,now_at,now_at
  ) returning * into replacement;

  update public.api_keys set status='revoked',revoked_at=now_at,updated_at=now_at
    where tenant_id=p_tenant_id and id=source_key.id and status='active' and revoked_at is null;
  if not found then
    raise exception using errcode='40001',message='API_KEY_ROTATION_CONFLICT';
  end if;

  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values(
    p_tenant_id,'PUBLIC_API_KEY_ROTATED','user:'||p_actor_user_id::text,'API_KEY',replacement.id::text,
    p_rotation_request_id,jsonb_build_object('previousKeyId',source_key.id,'clientId',source_key.client_id)
  );

  return jsonb_build_object(
    'idempotentReplay',false,
    'key',jsonb_build_object(
      'id',replacement.id,'client_id',replacement.client_id,'label',replacement.label,
      'key_prefix',replacement.key_prefix,'status',replacement.status,'scopes',replacement.scopes,
      'expires_at',replacement.expires_at,'last_used_at',replacement.last_used_at,
      'usage_count',replacement.usage_count,'rate_limit_status',replacement.rate_limit_status,
      'created_at',replacement.created_at,'revoked_at',replacement.revoked_at,
      'rotated_from_id',replacement.rotated_from_id,'rotation_request_id',replacement.rotation_request_id,
      'authority_management_boundary',replacement.authority_management_boundary
    )
  );
end $$;
revoke all on function public.rotate_public_api_key_v1(uuid,uuid,uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.rotate_public_api_key_v1(uuid,uuid,uuid,uuid,text,text,timestamptz) to service_role;

alter table public.trust_manual_reviews
  add column if not exists original_transaction_id uuid,
  add column if not exists requested_client_id uuid,
  add column if not exists reviewer_principal_id uuid,
  add column if not exists correlation_id uuid,
  add column if not exists expires_at timestamptz,
  add column if not exists evidence_reference text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='trust_manual_reviews_original_transaction_fkey'
      and conrelid='public.trust_manual_reviews'::regclass
  ) then
    alter table public.trust_manual_reviews
      add constraint trust_manual_reviews_original_transaction_fkey
      foreign key(tenant_id,original_transaction_id)
      references public.canonical_trust_transactions(enterprise_id,transaction_id)
      on delete restrict;
  end if;
end $$;

create unique index if not exists trust_manual_reviews_public_transaction_uidx
  on public.trust_manual_reviews(tenant_id,original_transaction_id)
  where original_transaction_id is not null;
create index if not exists trust_manual_reviews_public_client_idx
  on public.trust_manual_reviews(tenant_id,requested_client_id,status,created_at desc)
  where requested_client_id is not null;

alter table public.canonical_trust_transaction_events
  drop constraint if exists canonical_trust_transaction_events_event_type_check;
alter table public.canonical_trust_transaction_events
  add constraint canonical_trust_transaction_events_event_type_check check(event_type in (
    'DECISION_PERSISTED','EVIDENCE_GRAPH_LINKED','REPLAY_WRITTEN','TRUST_MEMORY_WRITTEN',
    'EXTERNAL_EXECUTION_REQUESTED','EXTERNAL_ACKNOWLEDGED','EXTERNAL_OUTCOME_RECORDED',
    'NATIVE_ENFORCEMENT_REQUESTED','NATIVE_ENFORCEMENT_ACKNOWLEDGED','DESTINATION_OBSERVED',
    'NATIVE_OUTCOME_CORRELATED','CONTROL_FAILURE_DETECTED','REVIEW_REQUESTED','REVIEW_RESOLVED'
  ));

create or replace function public.public_api_key_has_current_role_v1(
  p_tenant_id uuid,p_key_id uuid,p_client_id uuid,p_roles text[]
) returns boolean
language sql security definer set search_path=''
as $$
  select exists(
    select 1
    from public.api_keys key
    join public.trust_workspaces workspace on workspace.id=key.tenant_id
    where key.id=p_key_id and key.tenant_id=p_tenant_id and key.client_id=p_client_id
      and key.status='active' and key.revoked_at is null
      and (key.expires_at is null or key.expires_at>clock_timestamp())
      and (
        (workspace.created_by=key.created_by and 'owner'=any(p_roles))
        or exists(
          select 1 from public.workspace_members member
          where member.workspace_id=p_tenant_id and member.user_id=key.created_by
            and member.role=any(p_roles)
        )
      )
  );
$$;
revoke all on function public.public_api_key_has_current_role_v1(uuid,uuid,uuid,text[]) from public,anon,authenticated;
grant execute on function public.public_api_key_has_current_role_v1(uuid,uuid,uuid,text[]) to service_role;

create or replace function public.persist_public_api_authority_v1(
  p_tenant_id uuid,p_key_id uuid,p_client_id uuid,p_agent_id text,
  p_contract jsonb,p_record_hash text,p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  key public.api_keys%rowtype;
  previous public.trust_contracts%rowtype;
  identifier uuid:=(p_contract->>'contractId')::uuid;
  issued timestamptz:=(p_contract->>'issuedAt')::timestamptz;
  expires timestamptz:=(p_contract->>'expiresAt')::timestamptz;
  max_ttl integer;
  target_value text:=p_contract#>>'{authorityScope,permittedTargets,0}';
begin
  if auth.role()<>'service_role' then raise exception 'Public API authority service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||':'||p_agent_id,93));
  select * into key from public.api_keys
    where id=p_key_id and tenant_id=p_tenant_id and client_id=p_client_id for update;
  if key.id is null or not ('authority:write'=any(key.scopes))
    or not public.public_api_key_has_current_role_v1(p_tenant_id,p_key_id,p_client_id,array['owner','admin'])
  then raise exception 'Authority administration forbidden'; end if;
  if key.authority_management_boundary is null then raise exception 'Authority management boundary required'; end if;
  if not exists(select 1 from public.public_api_agent_bindings binding where binding.tenant_id=p_tenant_id and binding.client_id=p_client_id and binding.operational_entity_id=p_agent_id)
  then raise exception 'Agent is not owned by this API client'; end if;
  if not exists(select 1 from public.native_entity_identity_evidence evidence where evidence.enterprise_id=p_tenant_id and evidence.operational_entity_id=p_agent_id and evidence.revoked_at is null and evidence.expires_at>clock_timestamp())
  then raise exception 'Verified current agent identity required'; end if;
  if p_contract#>>'{subject,type}'<>'ai_agent' or p_contract#>>'{subject,id}'<>p_agent_id
    or p_contract->>'revocationState'<>'active' or p_contract->>'issuer'<>'tenant-admin:'||key.created_by::text
    or p_contract->>'approver'<>'api-client:'||p_client_id::text
  then raise exception 'Authority contract scope mismatch'; end if;
  if issued<clock_timestamp()-interval '60 seconds' or issued>clock_timestamp()+interval '5 minutes'
  then raise exception 'Authority backdating or scheduling window denied'; end if;
  max_ttl:=(key.authority_management_boundary->>'max_ttl_seconds')::integer;
  if expires<=issued or expires>issued+make_interval(secs=>max_ttl)
  then raise exception 'Authority expiry exceeds management boundary'; end if;
  if not (p_contract->>'authorizedObjective' in (select jsonb_array_elements_text(key.authority_management_boundary->'purposes')))
    or not (p_contract#>>'{authorityScope,permittedActions,0}' in (select jsonb_array_elements_text(key.authority_management_boundary->'actions')))
    or not (p_contract#>>'{authorityScope,environments,0}' in (select jsonb_array_elements_text(key.authority_management_boundary->'environments')))
    or not exists(select 1 from jsonb_array_elements_text(key.authority_management_boundary->'target_prefixes') prefix where target_value like prefix||'%')
  then raise exception 'Authority grant exceeds management boundary'; end if;
  if p_record_hash !~ '^[a-f0-9]{64}$' then raise exception 'Authority record digest invalid'; end if;

  select * into previous from public.trust_contracts
    where enterprise_id=p_tenant_id and subject_type='ai_agent' and subject_id=p_agent_id
    order by issued_at desc,created_at desc limit 1 for update;
  if previous.contract_id is null and nullif(p_contract->>'supersedesContractId','') is not null
    or previous.contract_id is not null and nullif(p_contract->>'supersedesContractId','')::uuid is distinct from previous.contract_id
  then raise exception 'Authority version conflict'; end if;

  perform public.persist_trust_contract_v1(p_tenant_id,key.created_by,p_contract,p_record_hash,p_correlation_id);
  if previous.contract_id is not null and previous.revocation_state='active' then
    update public.trust_contracts set revocation_state='revoked',revoked_at=clock_timestamp()
      where enterprise_id=p_tenant_id and contract_id=previous.contract_id and revocation_state='active';
  end if;
  update public.operational_entities set current_authority_references=jsonb_build_array(identifier::text),updated_at=clock_timestamp()
    where enterprise_id=p_tenant_id and entity_id=p_agent_id;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_tenant_id,'PUBLIC_API_AUTHORITY_GRANTED','user:'||key.created_by::text,'TRUST_CONTRACT',identifier::text,p_correlation_id,
    jsonb_build_object('apiClientId',p_client_id,'agentId',p_agent_id,'supersedesContractId',previous.contract_id,'recordHash',p_record_hash));
  return jsonb_build_object('status','CREATED','authorityId',identifier,'authorityVersion',p_contract->>'authorityVersion','supersedesAuthorityId',previous.contract_id);
end $$;
revoke all on function public.persist_public_api_authority_v1(uuid,uuid,uuid,text,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.persist_public_api_authority_v1(uuid,uuid,uuid,text,jsonb,text,uuid) to service_role;

create or replace function public.revoke_public_api_authority_v1(
  p_tenant_id uuid,p_key_id uuid,p_client_id uuid,p_agent_id text,
  p_authority_id uuid,p_reason text,p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare key public.api_keys%rowtype; authority public.trust_contracts%rowtype; result jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Public API authority service path required'; end if;
  if length(trim(coalesce(p_reason,'')))<1 or length(p_reason)>500 then raise exception 'Bounded revocation reason required'; end if;
  select * into key from public.api_keys where id=p_key_id and tenant_id=p_tenant_id and client_id=p_client_id;
  if key.id is null or not ('authority:write'=any(key.scopes))
    or not public.public_api_key_has_current_role_v1(p_tenant_id,p_key_id,p_client_id,array['owner','admin'])
  then raise exception 'Authority administration forbidden'; end if;
  if not exists(select 1 from public.public_api_agent_bindings binding where binding.tenant_id=p_tenant_id and binding.client_id=p_client_id and binding.operational_entity_id=p_agent_id)
  then raise exception 'Agent is not owned by this API client'; end if;
  select * into authority from public.trust_contracts where enterprise_id=p_tenant_id and contract_id=p_authority_id and subject_type='ai_agent' and subject_id=p_agent_id for update;
  if authority.contract_id is null then raise exception 'Authority not found'; end if;
  result:=public.revoke_trust_contract_with_delegation_cascade_v1(p_tenant_id,p_authority_id,key.created_by,left(trim(p_reason),500));
  update public.operational_entities set current_authority_references='[]'::jsonb,updated_at=clock_timestamp()
    where enterprise_id=p_tenant_id and entity_id=p_agent_id and current_authority_references @> jsonb_build_array(p_authority_id::text);
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_tenant_id,'PUBLIC_API_AUTHORITY_REVOKED','user:'||key.created_by::text,'TRUST_CONTRACT',p_authority_id::text,p_correlation_id,jsonb_build_object('apiClientId',p_client_id,'reason',left(trim(p_reason),500)));
  return result||jsonb_build_object('authorityId',p_authority_id,'correlationId',p_correlation_id);
end $$;
revoke all on function public.revoke_public_api_authority_v1(uuid,uuid,uuid,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.revoke_public_api_authority_v1(uuid,uuid,uuid,text,uuid,text,uuid) to service_role;

create or replace function public.create_public_api_review_v1(
  p_tenant_id uuid,p_client_id uuid,p_review_id uuid,p_transaction_id uuid,
  p_correlation_id uuid,p_reason text,p_expires_at timestamptz
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare tx public.canonical_trust_transactions%rowtype; digest text;
begin
  if auth.role()<>'service_role' then raise exception 'Public API review service path required'; end if;
  select * into tx from public.canonical_trust_transactions
    where enterprise_id=p_tenant_id and transaction_id=p_transaction_id and actor_id=p_client_id and decision='REVIEW' for update;
  if tx.transaction_id is null or tx.decision_id<>p_review_id then raise exception 'Canonical REVIEW transaction not found'; end if;
  insert into public.trust_manual_reviews(id,tenant_id,entity_id,status,requested_by,reason,signal_ids,created_at,original_transaction_id,requested_client_id,correlation_id,expires_at,evidence_reference)
  values(p_review_id,p_tenant_id,tx.operational_entity_id,'REQUESTED',p_client_id,left(p_reason,1000),'{}',clock_timestamp(),p_transaction_id,p_client_id,p_correlation_id,p_expires_at,'transaction:'||p_transaction_id::text)
  on conflict(tenant_id,id) do nothing;
  if not found then return jsonb_build_object('status','DUPLICATE','reviewReference',p_review_id); end if;
  insert into public.trust_manual_review_history(tenant_id,review_id,previous_status,new_status,actor_id,reason)
  values(p_tenant_id,p_review_id,null,'REQUESTED',p_client_id,'Canonical Trust Fabric REVIEW requested external governance resolution.');
  digest:=encode(extensions.digest(jsonb_build_object('reviewReference',p_review_id,'transactionId',p_transaction_id,'status','REQUESTED')::text,'sha256'),'hex');
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_tenant_id,p_transaction_id,'REVIEW_REQUESTED',p_client_id,'Canonical REVIEW entered the governed human-review lifecycle.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,digest,clock_timestamp());
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_tenant_id,'PUBLIC_API_REVIEW_REQUESTED','api-client:'||p_client_id::text,'MANUAL_REVIEW',p_review_id::text,p_correlation_id,jsonb_build_object('transactionId',p_transaction_id));
  return jsonb_build_object('status','CREATED','reviewReference',p_review_id,'expiresAt',p_expires_at);
end $$;
revoke all on function public.create_public_api_review_v1(uuid,uuid,uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.create_public_api_review_v1(uuid,uuid,uuid,uuid,uuid,text,timestamptz) to service_role;

create or replace function public.resolve_canonical_manual_review_v1(
  p_tenant_id uuid,p_reviewer_user_id uuid,p_expected_client_id uuid,p_review_id uuid,
  p_resolution text,p_reason text,p_evidence_reference text,p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare review public.trust_manual_reviews%rowtype; tx public.canonical_trust_transactions%rowtype; authority public.trust_contracts%rowtype; digest text; completed timestamptz:=clock_timestamp();
begin
  if auth.role()<>'service_role' then raise exception 'Canonical review service path required'; end if;
  if p_resolution not in ('APPROVED','REJECTED') or length(trim(coalesce(p_reason,'')))<1 or length(p_reason)>1000 or length(trim(coalesce(p_evidence_reference,'')))<1 or length(p_evidence_reference)>240
  then raise exception 'Invalid review resolution'; end if;
  if not exists(
    select 1 from public.trust_workspaces workspace where workspace.id=p_tenant_id and (
      workspace.created_by=p_reviewer_user_id or exists(
        select 1 from public.workspace_members member where member.workspace_id=p_tenant_id
          and member.user_id=p_reviewer_user_id and member.role in ('admin','reviewer')
      )
    )
  ) then raise exception 'Review resolution forbidden'; end if;
  select * into review from public.trust_manual_reviews where tenant_id=p_tenant_id and id=p_review_id
    and (p_expected_client_id is null or requested_client_id=p_expected_client_id) for update;
  if review.id is null then raise exception 'Review not found'; end if;
  if p_reviewer_user_id=review.requested_client_id or (review.assigned_to is not null and review.assigned_to<>p_reviewer_user_id)
  then raise exception 'Reviewer assignment forbidden'; end if;
  if review.status in ('APPROVED','REJECTED','CANCELLED') then raise exception 'Review already resolved'; end if;
  if review.expires_at is null or review.expires_at<=completed then raise exception 'Review expired'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_tenant_id
    and transaction_id=review.original_transaction_id and decision='REVIEW'
    and (p_expected_client_id is null or actor_id=p_expected_client_id);
  if tx.transaction_id is null then raise exception 'Original REVIEW transaction not found'; end if;
  select * into authority from public.trust_contracts where enterprise_id=p_tenant_id and contract_id=tx.authority_reference::uuid and subject_id=review.entity_id;
  if authority.contract_id is null or authority.revocation_state<>'active' or authority.expires_at<=completed
  then raise exception 'Review authority is not current'; end if;
  insert into public.trust_manual_review_history(tenant_id,review_id,previous_status,new_status,actor_id,reason)
  values(p_tenant_id,p_review_id,review.status,'IN_REVIEW',p_reviewer_user_id,'Authorized reviewer accepted the review assignment.');
  insert into public.trust_manual_review_history(tenant_id,review_id,previous_status,new_status,actor_id,reason)
  values(p_tenant_id,p_review_id,'IN_REVIEW',p_resolution,p_reviewer_user_id,left(trim(p_reason),1000));
  update public.trust_manual_reviews set status=p_resolution,assigned_to=p_reviewer_user_id,reviewer_principal_id=p_reviewer_user_id,
    decision=p_resolution,decision_reason=left(trim(p_reason),1000),completed_at=completed,evidence_reference=trim(p_evidence_reference),correlation_id=p_correlation_id
    where tenant_id=p_tenant_id and id=p_review_id;
  digest:=encode(extensions.digest(jsonb_build_object('reviewReference',p_review_id,'transactionId',tx.transaction_id,'resolution',p_resolution,'reviewer',p_reviewer_user_id,'evidenceReference',p_evidence_reference,'completedAt',completed)::text,'sha256'),'hex');
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_tenant_id,tx.transaction_id,'REVIEW_RESOLVED',p_reviewer_user_id,'Human review resolution recorded; the original canonical decision remains REVIEW.',tx.evidence_references||jsonb_build_array(p_evidence_reference),tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,digest,completed);
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(p_tenant_id,'PUBLIC_API_REVIEW_'||p_resolution,'reviewer:'||p_reviewer_user_id::text,'MANUAL_REVIEW',p_review_id::text,p_correlation_id,jsonb_build_object('transactionId',tx.transaction_id,'evidenceReference',p_evidence_reference,'originalDecision','REVIEW'));
  return jsonb_build_object('status',p_resolution,'reviewReference',p_review_id,'originalTransactionId',tx.transaction_id,'originalDecision','REVIEW','resolvedAt',completed,'reviewerPrincipalId',p_reviewer_user_id,'evidenceReference',p_evidence_reference);
end $$;
revoke all on function public.resolve_canonical_manual_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.resolve_canonical_manual_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid) to service_role;

create or replace function public.resolve_public_api_review_v1(
  p_tenant_id uuid,p_key_id uuid,p_client_id uuid,p_review_id uuid,
  p_resolution text,p_reason text,p_evidence_reference text,p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare key public.api_keys%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'Public API review service path required'; end if;
  select * into key from public.api_keys where id=p_key_id and tenant_id=p_tenant_id and client_id=p_client_id;
  if key.id is null or not ('review:write'=any(key.scopes))
    or not public.public_api_key_has_current_role_v1(p_tenant_id,p_key_id,p_client_id,array['owner','admin','reviewer'])
  then raise exception 'Review resolution forbidden'; end if;
  return public.resolve_canonical_manual_review_v1(p_tenant_id,key.created_by,p_client_id,p_review_id,p_resolution,p_reason,p_evidence_reference,p_correlation_id);
end $$;
revoke all on function public.resolve_public_api_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.resolve_public_api_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid) to service_role;

comment on column public.api_keys.authority_management_boundary is 'Tenant administrator-issued boundary for authority mutations. API scope alone never establishes business authority.';
comment on function public.persist_public_api_authority_v1(uuid,uuid,uuid,text,jsonb,text,uuid) is 'Persists a bounded, version-linked Trust Contract through the existing canonical authority store after tenant, client, role, identity, and management-boundary checks.';
comment on function public.resolve_public_api_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid) is 'Records a governed resolution linked to an immutable original REVIEW transaction; it never rewrites the canonical decision.';

create or replace function public.public_api_readiness_v1() returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  item text;
  missing_tables text[]:='{}';
  missing_functions text[]:='{}';
begin
  if auth.role()<>'service_role' then raise exception 'Public API readiness service path required'; end if;
  foreach item in array array[
    'public.api_keys','public.public_api_rate_limit_windows','public.canonical_trust_transactions',
    'public.canonical_trust_transaction_events','public.evidence_objects','public.trust_contracts',
    'public.trust_manual_reviews','public.trust_manual_review_history','public.trust_architecture_audit_log'
  ] loop
    if to_regclass(item) is null then missing_tables:=array_append(missing_tables,item); end if;
  end loop;
  foreach item in array array[
    'public.consume_public_api_rate_limit_v1(uuid,uuid,text,integer,integer)',
    'public.persist_canonical_trust_transaction_decision_v1(jsonb,jsonb)',
    'public.persist_public_api_authority_v1(uuid,uuid,uuid,text,jsonb,text,uuid)',
    'public.revoke_public_api_authority_v1(uuid,uuid,uuid,text,uuid,text,uuid)',
    'public.create_public_api_review_v1(uuid,uuid,uuid,uuid,uuid,text,timestamp with time zone)',
    'public.resolve_canonical_manual_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid)',
    'public.resolve_public_api_review_v1(uuid,uuid,uuid,uuid,text,text,text,uuid)',
    'public.rotate_public_api_key_v1(uuid,uuid,uuid,uuid,text,text,timestamp with time zone)'
  ] loop
    if to_regprocedure(item) is null then missing_functions:=array_append(missing_functions,item); end if;
  end loop;
  return jsonb_build_object(
    'ready',cardinality(missing_tables)=0 and cardinality(missing_functions)=0,
    'missingTables',to_jsonb(missing_tables),
    'missingFunctions',to_jsonb(missing_functions)
  );
end $$;
revoke all on function public.public_api_readiness_v1() from public,anon,authenticated;
grant execute on function public.public_api_readiness_v1() to service_role;

comment on column public.api_keys.rotation_request_id is 'Idempotency identifier for an atomic API-key rotation; raw replacement material is never persisted.';
comment on function public.rotate_public_api_key_v1(uuid,uuid,uuid,uuid,text,text,timestamptz) is 'Atomically inserts one replacement, revokes its predecessor, and records an audit event. Same-request retries return the existing replacement metadata.';
comment on function public.public_api_readiness_v1() is 'Read-only service-role probe for the canonical public API persistence, authority, review, rate-limit, and key-rotation contract.';
