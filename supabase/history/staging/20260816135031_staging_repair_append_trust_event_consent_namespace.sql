create or replace function public.append_trust_event_v1(
  p_event jsonb,
  p_envelope_id uuid,
  p_correlation_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_enterprise uuid;
  v_event_id uuid;
  v_expected_sequence bigint;
  v_expected_previous text;
  v_current_head public.trust_event_chain_heads%rowtype;
  v_reference text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted ingestion path required';
  end if;
  if p_event is null
     or jsonb_typeof(p_event) <> 'object'
     or p_correlation_id is null then
    raise exception 'Invalid canonical event request';
  end if;

  begin
    v_enterprise := (p_event ->> 'enterpriseId')::uuid;
    v_event_id := (p_event ->> 'eventId')::uuid;
    v_expected_sequence := (p_event ->> 'sequence')::bigint;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Invalid canonical event identifiers or sequence';
  end;

  v_expected_previous := nullif(p_event ->> 'previousHash', '');

  if v_enterprise is null
     or v_event_id is null
     or v_expected_sequence is null
     or not exists (
       select 1 from public.trust_workspaces where id = v_enterprise
     )
     or p_event ->> 'schemaVersion' <> 'trust-event-v1'
     or p_event ->> 'canonicalization' <> 'RFC8785-JCS'
     or p_event ->> 'hashAlgorithm' <> 'SHA-256'
     or (p_event ->> 'eventHash') !~ '^[a-f0-9]{64}$'
     or (
       v_expected_previous is not null
       and v_expected_previous !~ '^[a-f0-9]{64}$'
     )
     or (p_event #>> '{subject,type}') not in (
       'HUMAN', 'AI_AGENT', 'SERVICE', 'DEVICE', 'WORKLOAD',
       'ORGANIZATION', 'UNKNOWN'
     )
     or nullif(p_event #>> '{subject,id}', '') is null
     or (p_event #>> '{actor,type}') not in (
       'USER', 'AI_AGENT', 'SERVICE', 'SYSTEM', 'ADMINISTRATOR',
       'PROVIDER', 'UNKNOWN'
     )
     or nullif(p_event #>> '{actor,id}', '') is null
     or (p_event #>> '{provider,protocol}') not in (
       'HMAC', 'SIGNED_JWT', 'PUBLIC_KEY_SIGNATURE',
       'CHALLENGE_RESPONSE', 'OAUTH_PROTECTED', 'MTLS',
       'UNSIGNED', 'UNSUPPORTED'
     )
     or nullif(p_event #>> '{provider,key}', '') is null
     or (p_event ->> 'eventType') !~
       '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system|consent)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$'
     or jsonb_typeof(p_event -> 'normalizedFacts') <> 'object'
     or jsonb_typeof(p_event -> 'reasonCodes') <> 'array'
     or jsonb_typeof(p_event -> 'evidenceReferences') <> 'array' then
    raise exception 'Invalid canonical event metadata';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_enterprise::text || ':default', 17)
  );

  insert into public.trust_event_chain_heads(
    enterprise_id,
    partition_key
  )
  values (v_enterprise, 'default')
  on conflict (enterprise_id, partition_key) do nothing;

  select *
    into v_current_head
  from public.trust_event_chain_heads
  where enterprise_id = v_enterprise
    and partition_key = 'default'
  for update;

  if v_expected_sequence <> v_current_head.last_sequence + 1
     or coalesce(v_expected_previous, '') <>
       coalesce(v_current_head.last_event_hash, '') then
    return 'CHAIN_CONFLICT';
  end if;

  insert into public.trust_events (
    id,
    event_id,
    enterprise_id,
    schema_version,
    event_type,
    actor_type,
    actor_label,
    event_source,
    subject_type,
    subject_id,
    workflow_id,
    session_id,
    authority_id,
    provider_key,
    provider_protocol,
    provider_event_id,
    provider_transaction_id,
    provider_delivery_id,
    normalized_facts,
    reason_codes,
    evidence_references,
    occurred_at,
    received_at,
    sequence,
    previous_hash,
    event_hash,
    canonicalization,
    hash_algorithm,
    canonical_event,
    late,
    supersedes_event_id,
    metadata,
    created_at
  )
  values (
    v_event_id,
    v_event_id,
    v_enterprise,
    'trust-event-v1',
    p_event ->> 'eventType',
    p_event #>> '{actor,type}',
    p_event #>> '{actor,id}',
    'trust-event-gateway',
    p_event #>> '{subject,type}',
    p_event #>> '{subject,id}',
    nullif(p_event #>> '{workflow,id}', ''),
    nullif(p_event #>> '{session,id}', ''),
    nullif(p_event #>> '{authority,id}', ''),
    p_event #>> '{provider,key}',
    p_event #>> '{provider,protocol}',
    nullif(p_event #>> '{provider,eventId}', ''),
    nullif(p_event #>> '{provider,transactionId}', ''),
    nullif(p_event #>> '{provider,deliveryId}', ''),
    p_event -> 'normalizedFacts',
    array(
      select jsonb_array_elements_text(p_event -> 'reasonCodes')
    ),
    array(
      select jsonb_array_elements_text(p_event -> 'evidenceReferences')
    ),
    (p_event ->> 'occurredAt')::timestamptz,
    (p_event ->> 'receivedAt')::timestamptz,
    v_expected_sequence,
    v_expected_previous,
    p_event ->> 'eventHash',
    p_event ->> 'canonicalization',
    p_event ->> 'hashAlgorithm',
    p_event,
    coalesce((p_event #>> '{ordering,late}')::boolean, false),
    nullif(p_event #>> '{ordering,supersedesEventId}', '')::uuid,
    jsonb_build_object('canonical', true),
    now()
  );

  insert into public.trust_event_links(
    enterprise_id,
    event_id,
    link_type,
    target_id
  )
  values (
    v_enterprise,
    v_event_id,
    'SUBJECT',
    p_event #>> '{subject,id}'
  );

  if nullif(p_event #>> '{workflow,id}', '') is not null then
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      v_enterprise, v_event_id, 'WORKFLOW',
      p_event #>> '{workflow,id}'
    );
  end if;

  if nullif(p_event #>> '{session,id}', '') is not null then
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      v_enterprise, v_event_id, 'SESSION',
      p_event #>> '{session,id}'
    );
  end if;

  if nullif(p_event #>> '{authority,id}', '') is not null then
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      v_enterprise, v_event_id, 'AUTHORITY',
      p_event #>> '{authority,id}'
    );
  end if;

  for v_reference in
    select jsonb_array_elements_text(p_event -> 'evidenceReferences')
  loop
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      v_enterprise, v_event_id, 'EVIDENCE', v_reference
    )
    on conflict (enterprise_id, event_id, link_type, target_id)
    do nothing;
  end loop;

  update public.trust_event_chain_heads
  set
    last_sequence = v_expected_sequence,
    last_event_id = v_event_id,
    last_event_hash = p_event ->> 'eventHash',
    updated_at = now()
  where enterprise_id = v_enterprise
    and partition_key = 'default';

  insert into public.trust_event_audit(
    enterprise_id,
    envelope_id,
    event_id,
    action,
    disposition,
    correlation_id,
    metadata
  )
  values (
    v_enterprise,
    p_envelope_id,
    v_event_id,
    'CANONICAL_EVENT_APPENDED',
    'ACCEPTED',
    p_correlation_id,
    jsonb_build_object(
      'sequence', v_expected_sequence,
      'eventHash', p_event ->> 'eventHash'
    )
  );

  return 'APPENDED';
end;
$function$;