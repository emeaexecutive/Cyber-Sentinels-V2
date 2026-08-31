-- PostgreSQL can bind the JSON text-extraction operator after text
-- concatenation in this expression. Extract the event ID first so the
-- canonical Trust Memory source identifier is always plain text.

create or replace function public.emit_canonical_trust_transaction_memory_v1(
  p_enterprise_id uuid,
  p_transaction_id uuid,
  p_actor_id uuid,
  p_correlation_id uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  tx public.canonical_trust_transactions%rowtype;
  memory uuid;
  payload jsonb;
  item jsonb;
  artifact_memory jsonb;
  memory_domain text;
begin
  select * into tx
  from public.canonical_trust_transactions
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id
  for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id or not tx.material_change then
    raise exception 'Non-material Trust Memory write rejected';
  end if;
  if tx.trust_memory_reference is not null then
    return jsonb_build_object('status','DUPLICATE','trustMemoryReference',tx.trust_memory_reference);
  end if;
  artifact_memory:=
    coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,trustMemoryEvents}','[]'::jsonb)
    || coalesce(
      tx.decision_time_snapshot#>'{trustTwin,trustMemoryEvents}',
      tx.decision_time_snapshot#>'{trustForecast,trustMemoryEvents}',
      '[]'::jsonb
    );
  insert into public.trust_memory_index(
    enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id
  ) values(
    p_enterprise_id,tx.subject_id,'RUNTIME','CANONICAL_TRUST_TRANSACTION',p_transaction_id::text,
    tx.requested_at,
    jsonb_build_object(
      'decision',tx.decision,
      'trustState',tx.trust_state,
      'changedConditions',tx.changed_conditions,
      'previousTransactionId',tx.previous_transaction_id,
      'trustIntelligenceEventCount',jsonb_array_length(artifact_memory)
    ),
    p_correlation_id
  ) returning memory_id into memory;
  for item in select value from jsonb_array_elements(artifact_memory) loop
    memory_domain:=case
      when item->>'eventType' like 'FORECAST_%'
        or item->>'eventType' like 'TRUST_%'
        or item->>'eventType'='DEPLOYMENT_HELD'
      then 'GOVERNANCE'
      else 'AUTHORITY'
    end;
    insert into public.trust_memory_index(
      enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id
    ) values(
      p_enterprise_id,
      tx.subject_id,
      memory_domain,
      item->>'eventType',
      p_transaction_id::text || ':' || (item->>'eventId'),
      coalesce((item->>'occurredAt')::timestamptz,tx.requested_at),
      jsonb_build_object(
        'canonicalTransactionId',p_transaction_id,
        'evidenceReferences',coalesce(item->'evidenceReferences','[]'::jsonb),
        'knownAtForecastTime',true
      ),
      p_correlation_id
    ) on conflict do nothing;
  end loop;
  update public.canonical_trust_transactions
  set trust_memory_reference=memory,updated_at=now()
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object(
    'transactionId',p_transaction_id,
    'trustMemoryReference',memory,
    'changedConditions',tx.changed_conditions,
    'trustIntelligenceEvents',jsonb_array_length(artifact_memory)
  );
  insert into public.canonical_trust_transaction_events(
    enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
    authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
  ) values(
    p_enterprise_id,p_transaction_id,'TRUST_MEMORY_WRITTEN',p_actor_id,
    'Material trust state, authority integrity, or forecast change recorded.',
    tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,
    p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now()
  );
  return jsonb_build_object('status','CREATED','trustMemoryReference',memory);
end $$;

revoke all on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid)
  to service_role;

comment on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid)
  is 'Writes canonical decision-time Trust Memory projections with an unambiguous text source identifier.';
