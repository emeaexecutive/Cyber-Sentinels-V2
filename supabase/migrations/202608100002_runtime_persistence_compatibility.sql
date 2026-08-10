-- Close runtime compatibility gaps exposed by the authenticated product proof.
-- Canonical workflow identifiers are text, while the legacy Replay subject key
-- is UUID. Anchor transaction Replay to the canonical transaction UUID.

create or replace function public.normalize_legacy_evidence_object_v1()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
begin
  new.evidence_id:=coalesce(new.evidence_id,new.id);
  new.domain_key:=coalesce(new.domain_key,'IDENTITY');
  new.subject_id:=coalesce(new.subject_id,'legacy-evidence:'||new.id::text);
  new.subject_type:=coalesce(new.subject_type,'UNKNOWN');
  new.evidence_type:=coalesce(new.evidence_type,new.evidence_classification);
  new.source_type:=coalesce(new.source_type,'LEGACY_NORMALIZED_LEDGER');
  new.source_key:=coalesce(new.source_key,new.provider_key);
  new.result:=coalesce(new.result,'INCONCLUSIVE');
  new.assurance_level:=coalesce(new.assurance_level,'NONE');
  new.cryptographically_verified:=coalesce(new.cryptographically_verified,false);
  new.server_verified:=coalesce(new.server_verified,false);
  new.received_at:=coalesce(new.received_at,new.occurred_at,new.created_at,now());
  new.observed_at:=coalesce(new.observed_at,new.occurred_at,new.received_at,new.created_at,now());
  new.expires_at:=coalesce(new.expires_at,new.retention_expires_at);
  new.payload_hash:=coalesce(new.payload_hash,encode(digest(new.normalized_facts::text,'sha256'),'hex'));
  new.canonicalization:=coalesce(new.canonicalization,'JCS');
  new.hash_algorithm:=coalesce(new.hash_algorithm,'SHA-256');
  new.reason_codes:=coalesce(new.reason_codes,array['LEGACY_EVIDENCE_FAIL_CLOSED']);
  return new;
end $$;

create or replace function public.append_canonical_trust_transaction_replay_v1(
  p_enterprise_id uuid,
  p_transaction_id uuid,
  p_actor_id uuid,
  p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare tx public.canonical_trust_transactions%rowtype; replay uuid; payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical transaction Replay service path required'; end if;
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'Canonical transaction scope mismatch'; end if;
  if tx.replay_reference is not null then return jsonb_build_object('status','DUPLICATE','replayReference',tx.replay_reference); end if;
  insert into public.trust_replay_sessions(subject_type,subject_id,workspace_id,owner_user_id,correlation_id,canonical_transaction_id,replay_summary,generated_by)
  values('trust_transaction',p_transaction_id,p_enterprise_id,p_actor_id,p_correlation_id,p_transaction_id,tx.decision||': '||array_to_string(tx.reason_codes,', '),'canonical_trust_transaction') returning id into replay;
  update public.canonical_trust_transactions set replay_reference=replay,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'replayReference',replay,'decision',tx.decision);
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'REPLAY_WRITTEN',p_actor_id,'Chronology appended after decision persistence and graph linkage.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','replayReference',replay);
end $$;

revoke all on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid) to service_role;
