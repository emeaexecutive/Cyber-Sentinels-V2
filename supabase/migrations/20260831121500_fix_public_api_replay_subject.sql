-- Public API workflows use opaque namespaced identifiers, while the shared
-- Replay session subject column is UUID-backed. Preserve the canonical
-- transaction UUID as the Replay subject instead of casting workflow_id.

create or replace function public.append_canonical_trust_transaction_replay_v1(
  p_enterprise_id uuid,
  p_transaction_id uuid,
  p_actor_id uuid,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  tx public.canonical_trust_transactions%rowtype;
  replay uuid;
  payload jsonb;
  item jsonb;
  artifact_replay jsonb;
begin
  select * into tx
  from public.canonical_trust_transactions
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id
  for update;

  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then
    raise exception 'Canonical transaction scope mismatch';
  end if;
  if tx.replay_reference is not null then
    return jsonb_build_object('status','DUPLICATE','replayReference',tx.replay_reference);
  end if;

  artifact_replay:=coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,replayEvents}','[]'::jsonb)
    ||coalesce(tx.decision_time_snapshot#>'{trustTwin,replayEvents}',tx.decision_time_snapshot#>'{trustForecast,replayEvents}','[]'::jsonb);

  insert into public.trust_replay_sessions(
    subject_type,subject_id,workspace_id,owner_user_id,correlation_id,
    canonical_transaction_id,replay_summary,generated_by
  ) values(
    'trust_transaction',p_transaction_id,p_enterprise_id,p_actor_id,p_correlation_id,
    p_transaction_id,tx.decision||': '||array_to_string(tx.reason_codes,', ')
      ||case when jsonb_array_length(artifact_replay)>0
        then ' | trust intelligence events: '||jsonb_array_length(artifact_replay)::text
        else '' end,
    'canonical_trust_transaction'
  ) returning id into replay;

  for item in select value from jsonb_array_elements(artifact_replay) loop
    insert into public.canonical_trust_transaction_events(
      enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
      authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
    ) values(
      p_enterprise_id,p_transaction_id,item->>'eventType',p_actor_id,
      coalesce(item->'details','{}'::jsonb)::text,
      coalesce(item->'evidenceReferences','[]'::jsonb),tx.authority_reference,
      tx.policy_id,tx.policy_version,p_correlation_id,
      encode(extensions.digest(item::text,'sha256'),'hex'),
      coalesce((item->>'occurredAt')::timestamptz,tx.requested_at)
    );
  end loop;

  update public.canonical_trust_transactions
  set replay_reference=replay,updated_at=now()
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;

  payload:=jsonb_build_object(
    'transactionId',p_transaction_id,
    'replayReference',replay,
    'decision',tx.decision,
    'trustIntelligenceEvents',jsonb_array_length(artifact_replay)
  );
  insert into public.canonical_trust_transaction_events(
    enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
    authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
  ) values(
    p_enterprise_id,p_transaction_id,'REPLAY_WRITTEN',p_actor_id,
    'Chronology appended after canonical decision persistence and graph linkage.',
    tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,
    p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now()
  );

  return jsonb_build_object('status','CREATED','replayReference',replay);
end $$;

revoke all on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid)
  to service_role;

comment on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid)
  is 'Appends canonical Replay using the transaction UUID as the shared Replay subject; opaque workflow identifiers are never cast to UUID.';
