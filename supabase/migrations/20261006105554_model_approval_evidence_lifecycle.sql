-- Controlled approval reuses the evidence ledger. No public approval endpoint or client write grant.
create or replace function public.preserve_model_approval_evidence_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.source_type = 'CYBER_SENTINELS_MODEL_APPROVAL_REGISTRY'
    or (tg_op = 'UPDATE' and new.source_type = 'CYBER_SENTINELS_MODEL_APPROVAL_REGISTRY') then
    raise exception 'Model approval evidence is append-only; record a superseding state';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger preserve_model_approval_evidence_v1
before update or delete on public.evidence_objects
for each row execute function public.preserve_model_approval_evidence_v1();

create or replace function public.remember_model_approval_evidence_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare prior jsonb;
begin
  if new.source_type <> 'CYBER_SENTINELS_MODEL_APPROVAL_REGISTRY' then return new; end if;
  if new.evidence_type <> 'MODEL_APPROVAL_STATE' or not new.server_verified
    or new.provider_key <> 'cyber_sentinels_native'
    or new.source_key <> 'CYBER_SENTINELS_MODEL_APPROVAL_REGISTRY'
    or new.normalized_facts->>'enterpriseId' is distinct from new.enterprise_id::text
    or new.normalized_facts->>'agentId' is distinct from new.subject_id
    or coalesce(new.normalized_facts->>'status','') not in ('APPROVED','UNAPPROVED','REVOKED')
    or coalesce(new.normalized_facts->>'approvalAuthority','') not like 'operator:%' then
    raise exception 'Invalid controlled model approval record';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.enterprise_id::text || ':' || new.subject_id, 106));
  select normalized_facts into prior from public.evidence_objects
    where enterprise_id = new.enterprise_id and subject_id = new.subject_id
      and source_type = new.source_type and id <> new.id
    order by created_at desc, id desc limit 1;
  if prior is null or prior->>'status' is distinct from new.normalized_facts->>'status'
    or prior->'baseline' is distinct from new.normalized_facts->'baseline' then
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
    values(new.enterprise_id,new.subject_id,'AI_AGENT','MODEL_APPROVAL_' || (new.normalized_facts->>'status'),new.evidence_id::text,new.occurred_at,
      jsonb_build_object('recordedStatus',new.normalized_facts->>'status','approvalAuthority',new.normalized_facts->>'approvalAuthority',
        'modelId',new.normalized_facts->'baseline'->>'modelId','evidenceReference',new.evidence_id,'evidenceDigest',new.payload_hash,
        'provenance','CONTROLLED_REGISTRY_NOT_PROVIDER_ATTESTATION','validityEvaluatedAtDecisionTime',true));
  end if;
  return new;
end $$;

create trigger remember_model_approval_evidence_v1
after insert on public.evidence_objects
for each row execute function public.remember_model_approval_evidence_v1();

revoke all on function public.preserve_model_approval_evidence_v1() from public, anon, authenticated;
revoke all on function public.remember_model_approval_evidence_v1() from public, anon, authenticated;
grant execute on function public.preserve_model_approval_evidence_v1() to service_role;
grant execute on function public.remember_model_approval_evidence_v1() to service_role;
