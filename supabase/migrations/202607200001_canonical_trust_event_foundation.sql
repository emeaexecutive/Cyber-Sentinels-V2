-- EPIC 17.1D: Canonical Trust Event v1 foundation.
-- Forward-only and additive. Existing non-canonical trust_events remain readable,
-- while canonical rows are tenant-scoped, immutable and appended by trusted RPC.

alter table public.trust_events
  add column if not exists event_id uuid,
  add column if not exists enterprise_id uuid references public.trust_workspaces(id) on delete restrict,
  add column if not exists schema_version text,
  add column if not exists subject_type text,
  add column if not exists subject_id text,
  add column if not exists workflow_id text,
  add column if not exists session_id text,
  add column if not exists authority_id text,
  add column if not exists provider_key text,
  add column if not exists provider_protocol text,
  add column if not exists provider_event_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists provider_delivery_id text,
  add column if not exists normalized_facts jsonb,
  add column if not exists reason_codes text[] not null default '{}',
  add column if not exists evidence_references text[] not null default '{}',
  add column if not exists occurred_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists sequence bigint,
  add column if not exists previous_hash text,
  add column if not exists event_hash text,
  add column if not exists canonicalization text,
  add column if not exists hash_algorithm text,
  add column if not exists canonical_event jsonb,
  add column if not exists late boolean not null default false,
  add column if not exists supersedes_event_id uuid;

create unique index if not exists trust_events_event_id_unique_idx on public.trust_events(event_id) where event_id is not null;
create unique index if not exists trust_events_enterprise_sequence_unique_idx on public.trust_events(enterprise_id, sequence) where schema_version = 'trust-event-v1';
create unique index if not exists trust_events_enterprise_hash_unique_idx on public.trust_events(enterprise_id, event_hash) where schema_version = 'trust-event-v1';
create index if not exists trust_events_subject_v1_idx on public.trust_events(enterprise_id, subject_id, occurred_at desc) where schema_version = 'trust-event-v1';
create index if not exists trust_events_workflow_v1_idx on public.trust_events(enterprise_id, workflow_id, occurred_at desc) where schema_version = 'trust-event-v1';
create index if not exists trust_events_session_v1_idx on public.trust_events(enterprise_id, session_id, occurred_at desc) where schema_version = 'trust-event-v1';

-- Existing legacy rows are intentionally exempt. NOT VALID avoids retroactively
-- scanning them while still enforcing the canonical contract for every new row,
-- including trusted service-role writes made outside the append RPC.
alter table public.trust_events
  add constraint trust_events_v1_required_fields_check check (
    schema_version is distinct from 'trust-event-v1' or (
      event_id is not null and enterprise_id is not null and event_type is not null and
      subject_id is not null and actor_label is not null and provider_key is not null and
      normalized_facts is not null and occurred_at is not null and received_at is not null and
      sequence is not null and event_hash is not null and canonical_event is not null
    )
  ) not valid,
  add constraint trust_events_v1_event_type_check check (
    schema_version is distinct from 'trust-event-v1' or
    event_type ~ '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$'
  ) not valid,
  add constraint trust_events_v1_subject_type_check check (
    schema_version is distinct from 'trust-event-v1' or
    subject_type in ('HUMAN','AI_AGENT','SERVICE','DEVICE','WORKLOAD','ORGANIZATION','UNKNOWN')
  ) not valid,
  add constraint trust_events_v1_actor_type_check check (
    schema_version is distinct from 'trust-event-v1' or
    actor_type in ('USER','AI_AGENT','SERVICE','SYSTEM','ADMINISTRATOR','PROVIDER','UNKNOWN')
  ) not valid,
  add constraint trust_events_v1_protocol_check check (
    schema_version is distinct from 'trust-event-v1' or
    provider_protocol in ('HMAC','SIGNED_JWT','PUBLIC_KEY_SIGNATURE','CHALLENGE_RESPONSE','OAUTH_PROTECTED','MTLS','UNSIGNED','UNSUPPORTED')
  ) not valid,
  add constraint trust_events_v1_integrity_check check (
    schema_version is distinct from 'trust-event-v1' or (
      sequence > 0 and event_hash ~ '^[a-f0-9]{64}$' and
      (previous_hash is null or previous_hash ~ '^[a-f0-9]{64}$') and
      canonicalization = 'RFC8785-JCS' and hash_algorithm = 'SHA-256' and
      jsonb_typeof(canonical_event) = 'object' and jsonb_typeof(normalized_facts) = 'object'
    )
  ) not valid;

create table if not exists public.trust_event_envelopes (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete restrict,
  provider_key text not null,
  protocol text not null default 'UNSUPPORTED',
  provider_event_id text,
  transaction_id text,
  delivery_id text,
  nonce text,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  provider_sequence bigint,
  idempotency_key text not null,
  request_hash text not null,
  processing_disposition text not null default 'INCONCLUSIVE',
  reason_codes text[] not null default '{}',
  result_event_ids uuid[] not null default '{}',
  correlation_id uuid not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trust_event_envelope_protocol_check check (protocol in ('HMAC','SIGNED_JWT','PUBLIC_KEY_SIGNATURE','CHALLENGE_RESPONSE','OAUTH_PROTECTED','MTLS','UNSIGNED','UNSUPPORTED')),
  constraint trust_event_envelope_hash_check check (request_hash ~ '^[a-f0-9]{64}$'),
  constraint trust_event_envelope_disposition_check check (processing_disposition in ('ACCEPTED','DUPLICATE','REJECTED_SIGNATURE','REJECTED_TIMESTAMP','REJECTED_REPLAY','REJECTED_SCHEMA','REJECTED_TENANT','BLOCKED_PROVIDER','INCONCLUSIVE','FAILED'))
);
create unique index if not exists trust_event_envelope_idempotency_idx on public.trust_event_envelopes(enterprise_id, provider_key, idempotency_key) where enterprise_id is not null;
create unique index if not exists trust_event_envelope_provider_event_idx on public.trust_event_envelopes(enterprise_id, provider_key, provider_event_id) where enterprise_id is not null and provider_event_id is not null;
create unique index if not exists trust_event_envelope_delivery_idx on public.trust_event_envelopes(enterprise_id, provider_key, delivery_id) where enterprise_id is not null and delivery_id is not null;
create unique index if not exists trust_event_envelope_nonce_idx on public.trust_event_envelopes(enterprise_id, provider_key, nonce) where enterprise_id is not null and nonce is not null;
create index if not exists trust_event_envelope_provider_refs_idx on public.trust_event_envelopes(enterprise_id, provider_key, provider_event_id, transaction_id, delivery_id);

create table if not exists public.trust_event_chain_heads (
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  partition_key text not null default 'default',
  last_sequence bigint not null default 0,
  last_event_id uuid references public.trust_events(id) on delete restrict,
  last_event_hash text,
  updated_at timestamptz not null default now(),
  primary key (enterprise_id, partition_key),
  constraint trust_event_chain_head_hash_check check (last_event_hash is null or last_event_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.trust_event_links (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  event_id uuid not null references public.trust_events(id) on delete restrict,
  link_type text not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  unique (enterprise_id, event_id, link_type, target_id)
);
create index if not exists trust_event_links_target_idx on public.trust_event_links(enterprise_id, link_type, target_id);

create table if not exists public.trust_event_audit (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete restrict,
  envelope_id uuid references public.trust_event_envelopes(id) on delete restrict,
  event_id uuid references public.trust_events(id) on delete restrict,
  action text not null,
  disposition text,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists trust_event_audit_enterprise_idx on public.trust_event_audit(enterprise_id, created_at desc);

create table if not exists public.evidence_objects (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  envelope_id uuid references public.trust_event_envelopes(id) on delete restrict,
  provider_key text not null,
  evidence_classification text not null,
  storage_boundary text not null,
  object_reference text,
  object_encrypted boolean not null default false,
  normalized_facts jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  retention_expires_at timestamptz,
  legal_hold boolean not null default false,
  created_at timestamptz not null default now(),
  constraint evidence_object_boundary_check check (storage_boundary in ('NORMALIZED_LEDGER','EVIDENCE_VAULT')),
  constraint evidence_vault_encryption_check check (storage_boundary <> 'EVIDENCE_VAULT' or (object_reference is not null and object_encrypted))
);
create index if not exists evidence_objects_enterprise_idx on public.evidence_objects(enterprise_id, created_at desc);

create table if not exists public.evidence_object_access (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  evidence_object_id uuid not null references public.evidence_objects(id) on delete cascade,
  principal_type text not null,
  principal_id uuid,
  access_level text not null,
  purpose text not null,
  expires_at timestamptz,
  granted_by uuid,
  created_at timestamptz not null default now(),
  constraint evidence_access_level_check check (access_level in ('METADATA','NORMALIZED','VAULT_READ'))
);
create index if not exists evidence_object_access_principal_idx on public.evidence_object_access(enterprise_id, evidence_object_id, principal_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['trust_event_envelopes','trust_events','trust_event_links','trust_event_chain_heads','trust_event_audit','evidence_objects','evidence_object_access'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant all privileges on public.%I to service_role', table_name);
  end loop;
end $$;

grant select on public.trust_event_envelopes, public.trust_events, public.trust_event_links,
  public.trust_event_chain_heads, public.trust_event_audit, public.evidence_objects,
  public.evidence_object_access to authenticated;
grant insert on public.trust_events to authenticated;

drop policy if exists "users create own trust_events" on public.trust_events;
drop policy if exists "admin manage trust_events" on public.trust_events;
drop policy if exists "tenant members read canonical trust events" on public.trust_events;
create policy "tenant members read canonical trust events" on public.trust_events for select to authenticated
  using (schema_version = 'trust-event-v1' and public.user_can_access_trust_workspace(enterprise_id));
create policy "users create own trust_events" on public.trust_events for insert to authenticated
  with check (
    schema_version is distinct from 'trust-event-v1' and
    (agent_id is null or exists (
      select 1 from public.agents
      where agents.id = trust_events.agent_id and agents.owner_user_id = auth.uid()
    ))
  );
create policy "admin manage trust_events" on public.trust_events for all to authenticated
  using (
    schema_version is distinct from 'trust-event-v1' and
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    schema_version is distinct from 'trust-event-v1' and
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
create policy "tenant members read trust event envelopes" on public.trust_event_envelopes for select to authenticated
  using (enterprise_id is not null and public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read trust event links" on public.trust_event_links for select to authenticated
  using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read trust event chain heads" on public.trust_event_chain_heads for select to authenticated
  using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read trust event audit" on public.trust_event_audit for select to authenticated
  using (enterprise_id is not null and public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read evidence metadata" on public.evidence_objects for select to authenticated
  using (public.user_can_access_trust_workspace(enterprise_id) and storage_boundary = 'NORMALIZED_LEDGER');
create policy "authorized principals read evidence access" on public.evidence_object_access for select to authenticated
  using (public.user_can_access_trust_workspace(enterprise_id) and (principal_id = auth.uid() or public.identity_workspace_role(enterprise_id) in ('owner','admin')));

create or replace function public.prevent_canonical_trust_history_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.schema_version = 'trust-event-v1' then raise exception 'Canonical Trust Events are append-only'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists canonical_trust_events_append_only on public.trust_events;
create trigger canonical_trust_events_append_only before update or delete on public.trust_events
  for each row execute function public.prevent_canonical_trust_history_mutation();

create or replace function public.prevent_trust_event_audit_mutation()
returns trigger language plpgsql security definer set search_path = public as $$ begin raise exception 'Trust Event audit records are append-only'; end $$;
drop trigger if exists trust_event_audit_append_only on public.trust_event_audit;
create trigger trust_event_audit_append_only before update or delete on public.trust_event_audit
  for each row execute function public.prevent_trust_event_audit_mutation();

create or replace function public.prevent_finalized_trust_event_envelope_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or old.processed_at is not null then raise exception 'Finalized Trust Event envelopes are immutable'; end if;
  return new;
end $$;
drop trigger if exists finalized_trust_event_envelopes_immutable on public.trust_event_envelopes;
create trigger finalized_trust_event_envelopes_immutable before update or delete on public.trust_event_envelopes
  for each row execute function public.prevent_finalized_trust_event_envelope_mutation();

create or replace function public.reserve_trust_event_envelope_v1(
  p_enterprise_id uuid, p_provider_key text, p_idempotency_key text, p_request_hash text,
  p_provider_event_id text, p_transaction_id text, p_delivery_id text, p_nonce text,
  p_occurred_at timestamptz, p_received_at timestamptz, p_provider_sequence bigint, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare existing public.trust_event_envelopes%rowtype; inserted_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted ingestion path required'; end if;
  -- Serialize reservation by tenant and provider so competing nonce, delivery and
  -- provider-event keys cannot race through separate idempotency-key locks.
  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text || ':' || p_provider_key, 17));
  select * into existing from public.trust_event_envelopes
    where enterprise_id = p_enterprise_id and provider_key = p_provider_key and idempotency_key = p_idempotency_key for update;
  if found then
    if existing.request_hash = p_request_hash then
      return jsonb_build_object('status','DUPLICATE','envelopeId',existing.id,'eventIds',existing.result_event_ids,'disposition',existing.processing_disposition);
    end if;
    return jsonb_build_object('status','CONFLICT','envelopeId',existing.id);
  end if;
  if p_provider_event_id is not null then
    select * into existing from public.trust_event_envelopes where enterprise_id=p_enterprise_id and provider_key=p_provider_key and provider_event_id=p_provider_event_id for update;
    if found then
      if existing.request_hash=p_request_hash then return jsonb_build_object('status','DUPLICATE','envelopeId',existing.id,'eventIds',existing.result_event_ids,'disposition',existing.processing_disposition); end if;
      return jsonb_build_object('status','CONFLICT','envelopeId',existing.id);
    end if;
  end if;
  if p_delivery_id is not null then
    select * into existing from public.trust_event_envelopes where enterprise_id=p_enterprise_id and provider_key=p_provider_key and delivery_id=p_delivery_id for update;
    if found then
      if existing.request_hash=p_request_hash then return jsonb_build_object('status','DUPLICATE','envelopeId',existing.id,'eventIds',existing.result_event_ids,'disposition',existing.processing_disposition); end if;
      return jsonb_build_object('status','CONFLICT','envelopeId',existing.id);
    end if;
  end if;
  if p_nonce is not null and exists(select 1 from public.trust_event_envelopes where enterprise_id = p_enterprise_id and provider_key = p_provider_key and nonce = p_nonce) then
    select id into inserted_id from public.trust_event_envelopes where enterprise_id = p_enterprise_id and provider_key = p_provider_key and nonce = p_nonce limit 1;
    return jsonb_build_object('status','REPLAY','envelopeId',inserted_id);
  end if;
  insert into public.trust_event_envelopes(enterprise_id,provider_key,protocol,provider_event_id,transaction_id,delivery_id,nonce,occurred_at,received_at,provider_sequence,idempotency_key,request_hash,processing_disposition,correlation_id)
  values(p_enterprise_id,p_provider_key,case when p_provider_key='hopae_connect' then 'HMAC' when p_provider_key='world_id' then 'CHALLENGE_RESPONSE' else 'UNSUPPORTED' end,p_provider_event_id,p_transaction_id,p_delivery_id,p_nonce,p_occurred_at,p_received_at,p_provider_sequence,p_idempotency_key,p_request_hash,'INCONCLUSIVE',p_correlation_id)
  returning id into inserted_id;
  insert into public.trust_event_audit(enterprise_id,envelope_id,action,disposition,correlation_id,metadata)
  values(p_enterprise_id,inserted_id,'ENVELOPE_RESERVED','INCONCLUSIVE',p_correlation_id,jsonb_build_object('providerKey',p_provider_key));
  return jsonb_build_object('status','NEW','envelopeId',inserted_id);
end $$;

create or replace function public.append_trust_event_v1(p_event jsonb, p_envelope_id uuid, p_correlation_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare enterprise uuid := (p_event->>'enterpriseId')::uuid; event_uuid uuid := (p_event->>'eventId')::uuid; current_head public.trust_event_chain_heads%rowtype; expected_sequence bigint := (p_event->>'sequence')::bigint; expected_previous text := p_event->>'previousHash'; ref text;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted ingestion path required'; end if;
  if p_event->>'schemaVersion' <> 'trust-event-v1' or
     p_event->>'canonicalization' <> 'RFC8785-JCS' or
     p_event->>'hashAlgorithm' <> 'SHA-256' or
     (p_event->>'eventHash') !~ '^[a-f0-9]{64}$' or
     (p_event#>>'{subject,type}') not in ('HUMAN','AI_AGENT','SERVICE','DEVICE','WORKLOAD','ORGANIZATION','UNKNOWN') or
     (p_event#>>'{actor,type}') not in ('USER','AI_AGENT','SERVICE','SYSTEM','ADMINISTRATOR','PROVIDER','UNKNOWN') or
     (p_event#>>'{provider,protocol}') not in ('HMAC','SIGNED_JWT','PUBLIC_KEY_SIGNATURE','CHALLENGE_RESPONSE','OAUTH_PROTECTED','MTLS','UNSIGNED','UNSUPPORTED') or
     (p_event->>'eventType') !~ '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$' or
     jsonb_typeof(p_event->'normalizedFacts') <> 'object' or
     jsonb_typeof(p_event->'reasonCodes') <> 'array' or
     jsonb_typeof(p_event->'evidenceReferences') <> 'array' then
    raise exception 'Invalid canonical event metadata';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text || ':default', 17));
  insert into public.trust_event_chain_heads(enterprise_id,partition_key) values(enterprise,'default') on conflict do nothing;
  select * into current_head from public.trust_event_chain_heads where enterprise_id=enterprise and partition_key='default' for update;
  if expected_sequence <> current_head.last_sequence + 1 or coalesce(expected_previous,'') <> coalesce(current_head.last_event_hash,'') then return 'CHAIN_CONFLICT'; end if;
  insert into public.trust_events(id,event_id,enterprise_id,schema_version,event_type,actor_type,actor_label,event_source,subject_type,subject_id,workflow_id,session_id,authority_id,provider_key,provider_protocol,provider_event_id,provider_transaction_id,provider_delivery_id,normalized_facts,reason_codes,evidence_references,occurred_at,received_at,sequence,previous_hash,event_hash,canonicalization,hash_algorithm,canonical_event,late,supersedes_event_id,metadata,created_at)
  values(event_uuid,event_uuid,enterprise,'trust-event-v1',p_event->>'eventType',p_event#>>'{actor,type}',p_event#>>'{actor,id}','trust-event-gateway',p_event#>>'{subject,type}',p_event#>>'{subject,id}',p_event#>>'{workflow,id}',p_event#>>'{session,id}',p_event#>>'{authority,id}',p_event#>>'{provider,key}',p_event#>>'{provider,protocol}',p_event#>>'{provider,eventId}',p_event#>>'{provider,transactionId}',p_event#>>'{provider,deliveryId}',p_event->'normalizedFacts',array(select jsonb_array_elements_text(p_event->'reasonCodes')),array(select jsonb_array_elements_text(p_event->'evidenceReferences')),(p_event->>'occurredAt')::timestamptz,(p_event->>'receivedAt')::timestamptz,expected_sequence,expected_previous,p_event->>'eventHash',p_event->>'canonicalization',p_event->>'hashAlgorithm',p_event,coalesce((p_event#>>'{ordering,late}')::boolean,false),nullif(p_event#>>'{ordering,supersedesEventId}','')::uuid,jsonb_build_object('canonical',true),now());
  insert into public.trust_event_links(enterprise_id,event_id,link_type,target_id) values(enterprise,event_uuid,'SUBJECT',p_event#>>'{subject,id}');
  if p_event#>>'{workflow,id}' is not null then insert into public.trust_event_links(enterprise_id,event_id,link_type,target_id) values(enterprise,event_uuid,'WORKFLOW',p_event#>>'{workflow,id}'); end if;
  if p_event#>>'{session,id}' is not null then insert into public.trust_event_links(enterprise_id,event_id,link_type,target_id) values(enterprise,event_uuid,'SESSION',p_event#>>'{session,id}'); end if;
  if p_event#>>'{authority,id}' is not null then insert into public.trust_event_links(enterprise_id,event_id,link_type,target_id) values(enterprise,event_uuid,'AUTHORITY',p_event#>>'{authority,id}'); end if;
  for ref in select jsonb_array_elements_text(p_event->'evidenceReferences') loop insert into public.trust_event_links(enterprise_id,event_id,link_type,target_id) values(enterprise,event_uuid,'EVIDENCE',ref) on conflict do nothing; end loop;
  update public.trust_event_chain_heads set last_sequence=expected_sequence,last_event_id=event_uuid,last_event_hash=p_event->>'eventHash',updated_at=now() where enterprise_id=enterprise and partition_key='default';
  insert into public.trust_event_audit(enterprise_id,envelope_id,event_id,action,disposition,correlation_id,metadata) values(enterprise,p_envelope_id,event_uuid,'CANONICAL_EVENT_APPENDED','ACCEPTED',p_correlation_id,jsonb_build_object('sequence',expected_sequence,'eventHash',p_event->>'eventHash'));
  return 'APPENDED';
end $$;

revoke all on function public.reserve_trust_event_envelope_v1(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,bigint,uuid) from public, anon, authenticated;
revoke all on function public.append_trust_event_v1(jsonb,uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_trust_event_envelope_v1(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,bigint,uuid) to service_role;
grant execute on function public.append_trust_event_v1(jsonb,uuid,uuid) to service_role;

comment on table public.trust_event_envelopes is 'Provider envelope metadata and SHA-256 request digest only. Raw payload retention is prohibited.';
comment on table public.evidence_objects is 'Evidence Vault boundary: normalized facts may remain in-ledger; raw evidence requires an encrypted object reference and explicit access policy.';
comment on column public.trust_events.canonical_event is 'Canonical Trust Event v1 object. eventHash covers RFC8785-JCS serialization with eventHash omitted.';
