-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 3: additive canonical Trust Event v1 storage and append helper.

begin;

do $reconciliation_gate$
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_TRUST_FAILED: app.reconciliation.environment must equal staging';
  end if;
  if not exists (
    select 1
    from public.schema_reconciliation_runs
    where reconciliation_key = '202607300002_reconciliation_ledger'
      and status = 'completed'
  ) then
    raise exception
      'RECONCILIATION_TRUST_FAILED: completed ledger phase is required';
  end if;
  if to_regclass('public.trust_event_chain_heads') is not null
     or to_regclass('public.trust_event_envelopes') is not null
     or to_regclass('public.trust_event_links') is not null
     or to_regclass('public.trust_event_audit') is not null then
    raise exception
      'RECONCILIATION_TRUST_FAILED: canonical trust table name collision detected';
  end if;
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'user_can_access_trust_workspace_v2',
        'identity_workspace_role_v2',
        'append_trust_event_v1',
        'prevent_canonical_trust_history_mutation_v2',
        'prevent_trust_event_audit_mutation_v2'
      )
  ) then
    raise exception
      'RECONCILIATION_TRUST_FAILED: canonical trust helper name collision detected';
  end if;
end
$reconciliation_gate$;

create function public.user_can_access_trust_workspace_v2(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.trust_workspaces tw
    where tw.id = p_workspace_id
      and (
        tw.created_by = auth.uid()
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = tw.id
            and wm.user_id = auth.uid()
        )
      )
  );
$function$;

create function public.identity_workspace_role_v2(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select case
    when exists (
      select 1
      from public.trust_workspaces tw
      where tw.id = p_workspace_id
        and tw.created_by = auth.uid()
    ) then 'owner'
    else (
      select wm.role
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.user_id = auth.uid()
      order by
        case wm.role
          when 'owner' then 1
          when 'admin' then 2
          when 'reviewer' then 3
          else 4
        end,
        wm.id
      limit 1
    )
  end;
$function$;

revoke all on function public.user_can_access_trust_workspace_v2(uuid) from public;
revoke all on function public.user_can_access_trust_workspace_v2(uuid) from anon;
revoke all on function public.identity_workspace_role_v2(uuid) from public;
revoke all on function public.identity_workspace_role_v2(uuid) from anon;
grant execute on function public.user_can_access_trust_workspace_v2(uuid)
  to authenticated, service_role;
grant execute on function public.identity_workspace_role_v2(uuid)
  to authenticated, service_role;

alter table public.trust_events
  add column event_id uuid,
  add column enterprise_id uuid references public.trust_workspaces(id) on delete restrict,
  add column schema_version text,
  add column subject_type text,
  add column subject_id text,
  add column workflow_id text,
  add column session_id text,
  add column authority_id text,
  add column provider_key text,
  add column provider_protocol text,
  add column provider_event_id text,
  add column provider_transaction_id text,
  add column provider_delivery_id text,
  add column normalized_facts jsonb,
  add column reason_codes text[] not null default '{}',
  add column evidence_references text[] not null default '{}',
  add column occurred_at timestamptz,
  add column received_at timestamptz,
  add column sequence bigint,
  add column previous_hash text,
  add column event_hash text,
  add column canonicalization text,
  add column hash_algorithm text,
  add column canonical_event jsonb,
  add column late boolean not null default false,
  add column supersedes_event_id uuid;

create unique index trust_events_event_id_v1_unique_idx
  on public.trust_events(event_id)
  where event_id is not null;
create unique index trust_events_enterprise_sequence_v1_unique_idx
  on public.trust_events(enterprise_id, sequence)
  where schema_version = 'trust-event-v1';
create unique index trust_events_enterprise_hash_v1_unique_idx
  on public.trust_events(enterprise_id, event_hash)
  where schema_version = 'trust-event-v1';
create index trust_events_subject_v1_reconciliation_idx
  on public.trust_events(enterprise_id, subject_id, occurred_at desc)
  where schema_version = 'trust-event-v1';
create index trust_events_workflow_v1_reconciliation_idx
  on public.trust_events(enterprise_id, workflow_id, occurred_at desc)
  where schema_version = 'trust-event-v1';
create index trust_events_session_v1_reconciliation_idx
  on public.trust_events(enterprise_id, session_id, occurred_at desc)
  where schema_version = 'trust-event-v1';

alter table public.trust_events
  add constraint trust_events_v1_required_fields_reconciliation_check
  check (
    schema_version is distinct from 'trust-event-v1'
    or (
      event_id is not null
      and enterprise_id is not null
      and event_type is not null
      and subject_id is not null
      and actor_label is not null
      and provider_key is not null
      and normalized_facts is not null
      and occurred_at is not null
      and received_at is not null
      and sequence is not null
      and event_hash is not null
      and canonical_event is not null
    )
  ) not valid,
  add constraint trust_events_v1_event_type_reconciliation_check
  check (
    schema_version is distinct from 'trust-event-v1'
    or event_type ~
      '^(identity|device|session|authority|workflow|runtime|security|governance|provider|system|consent)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$'
  ) not valid,
  add constraint trust_events_v1_subject_type_reconciliation_check
  check (
    schema_version is distinct from 'trust-event-v1'
    or subject_type in (
      'HUMAN', 'AI_AGENT', 'SERVICE', 'DEVICE', 'WORKLOAD',
      'ORGANIZATION', 'UNKNOWN'
    )
  ) not valid,
  add constraint trust_events_v1_actor_type_reconciliation_check
  check (
    schema_version is distinct from 'trust-event-v1'
    or actor_type in (
      'USER', 'AI_AGENT', 'SERVICE', 'SYSTEM', 'ADMINISTRATOR',
      'PROVIDER', 'UNKNOWN'
    )
  ) not valid,
  add constraint trust_events_v1_protocol_reconciliation_check
  check (
    schema_version is distinct from 'trust-event-v1'
    or provider_protocol in (
      'HMAC', 'SIGNED_JWT', 'PUBLIC_KEY_SIGNATURE',
      'CHALLENGE_RESPONSE', 'OAUTH_PROTECTED', 'MTLS',
      'UNSIGNED', 'UNSUPPORTED'
    )
  ) not valid,
  add constraint trust_events_v1_integrity_reconciliation_check
  check (
    schema_version is distinct from 'trust-event-v1'
    or (
      sequence > 0
      and event_hash ~ '^[a-f0-9]{64}$'
      and (previous_hash is null or previous_hash ~ '^[a-f0-9]{64}$')
      and canonicalization = 'RFC8785-JCS'
      and hash_algorithm = 'SHA-256'
      and jsonb_typeof(canonical_event) = 'object'
      and jsonb_typeof(normalized_facts) = 'object'
    )
  ) not valid;

create table public.trust_event_envelopes (
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
  constraint trust_event_envelope_protocol_reconciliation_check
    check (
      protocol in (
        'HMAC', 'SIGNED_JWT', 'PUBLIC_KEY_SIGNATURE',
        'CHALLENGE_RESPONSE', 'OAUTH_PROTECTED', 'MTLS',
        'UNSIGNED', 'UNSUPPORTED'
      )
    ),
  constraint trust_event_envelope_hash_reconciliation_check
    check (request_hash ~ '^[a-f0-9]{64}$'),
  constraint trust_event_envelope_disposition_reconciliation_check
    check (
      processing_disposition in (
        'ACCEPTED', 'DUPLICATE', 'REJECTED_SIGNATURE',
        'REJECTED_TIMESTAMP', 'REJECTED_REPLAY', 'REJECTED_SCHEMA',
        'REJECTED_TENANT', 'BLOCKED_PROVIDER', 'INCONCLUSIVE', 'FAILED'
      )
    )
);

create unique index trust_event_envelope_idempotency_reconciliation_idx
  on public.trust_event_envelopes(
    enterprise_id, provider_key, idempotency_key
  )
  where enterprise_id is not null;
create unique index trust_event_envelope_provider_event_reconciliation_idx
  on public.trust_event_envelopes(
    enterprise_id, provider_key, provider_event_id
  )
  where enterprise_id is not null and provider_event_id is not null;
create unique index trust_event_envelope_delivery_reconciliation_idx
  on public.trust_event_envelopes(
    enterprise_id, provider_key, delivery_id
  )
  where enterprise_id is not null and delivery_id is not null;
create unique index trust_event_envelope_nonce_reconciliation_idx
  on public.trust_event_envelopes(enterprise_id, provider_key, nonce)
  where enterprise_id is not null and nonce is not null;

create table public.trust_event_chain_heads (
  enterprise_id uuid not null
    references public.trust_workspaces(id) on delete cascade,
  partition_key text not null default 'default',
  last_sequence bigint not null default 0,
  last_event_id uuid references public.trust_events(id) on delete restrict,
  last_event_hash text,
  updated_at timestamptz not null default now(),
  primary key (enterprise_id, partition_key),
  constraint trust_event_chain_head_hash_reconciliation_check
    check (
      last_event_hash is null
      or last_event_hash ~ '^[a-f0-9]{64}$'
    ),
  constraint trust_event_chain_head_sequence_reconciliation_check
    check (last_sequence >= 0)
);

create table public.trust_event_links (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null
    references public.trust_workspaces(id) on delete cascade,
  event_id uuid not null references public.trust_events(id) on delete restrict,
  link_type text not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  constraint trust_event_links_type_reconciliation_check
    check (
      link_type in (
        'SUBJECT', 'WORKFLOW', 'SESSION', 'AUTHORITY', 'EVIDENCE'
      )
    ),
  unique (enterprise_id, event_id, link_type, target_id)
);

create index trust_event_links_target_reconciliation_idx
  on public.trust_event_links(enterprise_id, link_type, target_id);

create table public.trust_event_audit (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid references public.trust_workspaces(id) on delete restrict,
  envelope_id uuid
    references public.trust_event_envelopes(id) on delete restrict,
  event_id uuid references public.trust_events(id) on delete restrict,
  action text not null,
  disposition text,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint trust_event_audit_metadata_reconciliation_check
    check (jsonb_typeof(metadata) = 'object')
);

create index trust_event_audit_enterprise_reconciliation_idx
  on public.trust_event_audit(enterprise_id, created_at desc);

alter table public.trust_event_envelopes enable row level security;
alter table public.trust_event_envelopes force row level security;
alter table public.trust_event_chain_heads enable row level security;
alter table public.trust_event_chain_heads force row level security;
alter table public.trust_event_links enable row level security;
alter table public.trust_event_links force row level security;
alter table public.trust_event_audit enable row level security;
alter table public.trust_event_audit force row level security;

revoke all on table public.trust_event_envelopes from public, anon, authenticated;
revoke all on table public.trust_event_chain_heads from public, anon, authenticated;
revoke all on table public.trust_event_links from public, anon, authenticated;
revoke all on table public.trust_event_audit from public, anon, authenticated;

grant all privileges on table public.trust_event_envelopes to service_role;
grant all privileges on table public.trust_event_chain_heads to service_role;
grant all privileges on table public.trust_event_links to service_role;
grant all privileges on table public.trust_event_audit to service_role;
grant all privileges on table public.trust_events to service_role;

grant select on table public.trust_event_envelopes to authenticated;
grant select on table public.trust_event_chain_heads to authenticated;
grant select on table public.trust_event_links to authenticated;
grant select on table public.trust_event_audit to authenticated;

drop policy "users create own trust_events" on public.trust_events;
drop policy "admin manage trust_events" on public.trust_events;

create policy "users create own trust_events"
on public.trust_events
for insert
to authenticated
with check (
  schema_version is distinct from 'trust-event-v1'
  and (
    agent_id is null
    or exists (
      select 1
      from public.agents
      where agents.id = trust_events.agent_id
        and agents.owner_user_id = auth.uid()
    )
  )
);

create policy "admin manage trust_events"
on public.trust_events
for all
to authenticated
using (
  schema_version is distinct from 'trust-event-v1'
  and (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
)
with check (
  schema_version is distinct from 'trust-event-v1'
  and (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
);

create policy "tenant members read canonical trust events v2"
on public.trust_events
for select
to authenticated
using (
  schema_version = 'trust-event-v1'
  and public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read trust event envelopes v2"
on public.trust_event_envelopes
for select
to authenticated
using (
  enterprise_id is not null
  and public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read trust event chain heads v2"
on public.trust_event_chain_heads
for select
to authenticated
using (public.user_can_access_trust_workspace_v2(enterprise_id));

create policy "tenant members read trust event links v2"
on public.trust_event_links
for select
to authenticated
using (public.user_can_access_trust_workspace_v2(enterprise_id));

create policy "tenant members read trust event audit v2"
on public.trust_event_audit
for select
to authenticated
using (
  enterprise_id is not null
  and public.user_can_access_trust_workspace_v2(enterprise_id)
);

create function public.prevent_canonical_trust_history_mutation_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if old.schema_version = 'trust-event-v1' then
    raise exception 'Canonical Trust Events are append-only';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create trigger canonical_trust_events_append_only
before update or delete on public.trust_events
for each row
execute function public.prevent_canonical_trust_history_mutation_v2();

create function public.prevent_trust_event_audit_mutation_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception 'Trust Event audit records are append-only';
end;
$function$;

create trigger trust_event_audit_append_only
before update or delete on public.trust_event_audit
for each row
execute function public.prevent_trust_event_audit_mutation_v2();

create function public.append_trust_event_v1(
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

revoke all on function public.append_trust_event_v1(jsonb, uuid, uuid)
  from public;
revoke all on function public.append_trust_event_v1(jsonb, uuid, uuid)
  from anon;
revoke all on function public.append_trust_event_v1(jsonb, uuid, uuid)
  from authenticated;
grant execute on function public.append_trust_event_v1(jsonb, uuid, uuid)
  to service_role;

revoke all on function public.prevent_canonical_trust_history_mutation_v2()
  from public, anon, authenticated;
revoke all on function public.prevent_trust_event_audit_mutation_v2()
  from public, anon, authenticated;

comment on table public.trust_event_chain_heads is
  'NOT APPROVED FOR PRODUCTION. Staging-tested canonical Trust Event chain head.';
comment on function public.append_trust_event_v1(jsonb, uuid, uuid) is
  'NOT APPROVED FOR PRODUCTION. Service-role-only canonical Trust Event append path.';

insert into public.schema_reconciliation_runs(
  reconciliation_key,
  phase,
  status,
  completed_at,
  metadata
)
values (
  '202607300003_canonical_trust_foundation',
  'canonical_trust_foundation',
  'completed',
  clock_timestamp(),
  jsonb_build_object(
    'legacyTrustEventsPreserved', true,
    'legacyRowsBackfilled', 0,
    'canonicalTablesCreated', 4,
    'versionedWorkspaceHelpersCreated', 2
  )
);

commit;
