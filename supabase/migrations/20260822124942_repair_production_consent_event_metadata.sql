-- Repair the canonical Trust Event validator so the already-registered
-- consent namespace can pass through the service-role-only append boundary.
-- The function body intentionally matches the live Production definition
-- except for adding `consent` to the event-type namespace allow-list.
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
  enterprise uuid := (p_event ->> 'enterpriseId')::uuid;
  event_uuid uuid := (p_event ->> 'eventId')::uuid;
  current_head public.trust_event_chain_heads%rowtype;
  expected_sequence bigint := (p_event ->> 'sequence')::bigint;
  expected_previous text := p_event ->> 'previousHash';
  ref text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted ingestion path required';
  end if;

  if p_event ->> 'schemaVersion' <> 'trust-event-v1'
     or p_event ->> 'canonicalization' <> 'RFC8785-JCS'
     or p_event ->> 'hashAlgorithm' <> 'SHA-256'
     or (p_event ->> 'eventHash') !~ '^[a-f0-9]{64}$'
     or (p_event #>> '{subject,type}') not in (
       'HUMAN', 'AI_AGENT', 'SERVICE', 'DEVICE', 'WORKLOAD',
       'ORGANIZATION', 'UNKNOWN'
     )
     or (p_event #>> '{actor,type}') not in (
       'USER', 'AI_AGENT', 'SERVICE', 'SYSTEM', 'ADMINISTRATOR',
       'PROVIDER', 'UNKNOWN'
     )
     or (p_event #>> '{provider,protocol}') not in (
       'HMAC', 'SIGNED_JWT', 'PUBLIC_KEY_SIGNATURE',
       'CHALLENGE_RESPONSE', 'OAUTH_PROTECTED', 'MTLS',
       'UNSIGNED', 'UNSUPPORTED'
     )
     or (p_event ->> 'eventType') !~
       '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system|consent)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$'
     or jsonb_typeof(p_event -> 'normalizedFacts') <> 'object'
     or jsonb_typeof(p_event -> 'reasonCodes') <> 'array'
     or jsonb_typeof(p_event -> 'evidenceReferences') <> 'array' then
    raise exception 'Invalid canonical event metadata';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(enterprise::text || ':default', 17)
  );

  insert into public.trust_event_chain_heads(
    enterprise_id,
    partition_key
  )
  values (enterprise, 'default')
  on conflict do nothing;

  select *
    into current_head
  from public.trust_event_chain_heads
  where enterprise_id = enterprise
    and partition_key = 'default'
  for update;

  if expected_sequence <> current_head.last_sequence + 1
     or coalesce(expected_previous, '') <>
       coalesce(current_head.last_event_hash, '') then
    return 'CHAIN_CONFLICT';
  end if;

  insert into public.trust_events(
    id, event_id, enterprise_id, schema_version, event_type,
    actor_type, actor_label, event_source, subject_type, subject_id,
    workflow_id, session_id, authority_id, provider_key,
    provider_protocol, provider_event_id, provider_transaction_id,
    provider_delivery_id, normalized_facts, reason_codes,
    evidence_references, occurred_at, received_at, sequence,
    previous_hash, event_hash, canonicalization, hash_algorithm,
    canonical_event, late, supersedes_event_id, metadata, created_at
  )
  values (
    event_uuid, event_uuid, enterprise, 'trust-event-v1',
    p_event ->> 'eventType', p_event #>> '{actor,type}',
    p_event #>> '{actor,id}', 'trust-event-gateway',
    p_event #>> '{subject,type}', p_event #>> '{subject,id}',
    p_event #>> '{workflow,id}', p_event #>> '{session,id}',
    p_event #>> '{authority,id}', p_event #>> '{provider,key}',
    p_event #>> '{provider,protocol}', p_event #>> '{provider,eventId}',
    p_event #>> '{provider,transactionId}',
    p_event #>> '{provider,deliveryId}', p_event -> 'normalizedFacts',
    array(select jsonb_array_elements_text(p_event -> 'reasonCodes')),
    array(select jsonb_array_elements_text(p_event -> 'evidenceReferences')),
    (p_event ->> 'occurredAt')::timestamptz,
    (p_event ->> 'receivedAt')::timestamptz, expected_sequence,
    expected_previous, p_event ->> 'eventHash',
    p_event ->> 'canonicalization', p_event ->> 'hashAlgorithm',
    p_event, coalesce((p_event #>> '{ordering,late}')::boolean, false),
    nullif(p_event #>> '{ordering,supersedesEventId}', '')::uuid,
    jsonb_build_object('canonical', true), now()
  );

  insert into public.trust_event_links(
    enterprise_id, event_id, link_type, target_id
  )
  values (
    enterprise, event_uuid, 'SUBJECT', p_event #>> '{subject,id}'
  );

  if p_event #>> '{workflow,id}' is not null then
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      enterprise, event_uuid, 'WORKFLOW', p_event #>> '{workflow,id}'
    );
  end if;

  if p_event #>> '{session,id}' is not null then
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      enterprise, event_uuid, 'SESSION', p_event #>> '{session,id}'
    );
  end if;

  if p_event #>> '{authority,id}' is not null then
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (
      enterprise, event_uuid, 'AUTHORITY',
      p_event #>> '{authority,id}'
    );
  end if;

  for ref in
    select jsonb_array_elements_text(p_event -> 'evidenceReferences')
  loop
    insert into public.trust_event_links(
      enterprise_id, event_id, link_type, target_id
    )
    values (enterprise, event_uuid, 'EVIDENCE', ref)
    on conflict do nothing;
  end loop;

  update public.trust_event_chain_heads
  set
    last_sequence = expected_sequence,
    last_event_id = event_uuid,
    last_event_hash = p_event ->> 'eventHash',
    updated_at = now()
  where enterprise_id = enterprise
    and partition_key = 'default';

  insert into public.trust_event_audit(
    enterprise_id, envelope_id, event_id, action, disposition,
    correlation_id, metadata
  )
  values (
    enterprise, p_envelope_id, event_uuid, 'CANONICAL_EVENT_APPENDED',
    'ACCEPTED', p_correlation_id,
    jsonb_build_object(
      'sequence', expected_sequence,
      'eventHash', p_event ->> 'eventHash'
    )
  );

  return 'APPENDED';
end;
$function$;

revoke all on function public.append_trust_event_v1(jsonb, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.append_trust_event_v1(jsonb, uuid, uuid)
  to service_role;
