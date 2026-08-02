-- Epic 16 Sprint 16.1B: provider abstraction and Hopae production adapter.
-- This extends the existing provider execution, callback ledger and RC1 trust
-- persistence path. Raw provider payloads, identity claims, documents,
-- biometrics, bearer tokens and secrets are intentionally not retained.

create table if not exists public.provider_registry (
  provider_id text primary key,
  display_name text not null,
  adapter_version text not null,
  api_version text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  enabled boolean not null default false,
  capabilities text[] not null default '{}',
  evidence_types text[] not null default '{}',
  callback_mode text not null check (callback_mode in ('signed_webhook', 'polling', 'hybrid')),
  polling_supported boolean not null default false,
  configured_state text not null check (configured_state in ('CONFIGURED', 'MISCONFIGURED', 'DISABLED', 'UNKNOWN')),
  health_status text not null default 'UNKNOWN' check (health_status in ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'MISCONFIGURED', 'UNKNOWN')),
  last_successful_call timestamptz,
  last_failed_call timestamptz,
  last_health_check timestamptz,
  timeout_ms integer not null check (timeout_ms between 1000 and 30000),
  retry_policy jsonb not null default '{}'::jsonb,
  retention_classification text not null,
  data_residency_notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_state_audit (
  audit_id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_registry(provider_id),
  previous_enabled boolean,
  enabled boolean not null,
  actor_id uuid not null,
  reason text not null,
  correlation_id uuid not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.provider_operational_health_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.provider_registry(provider_id),
  environment text not null check (environment in ('sandbox', 'production')),
  health_status text not null check (health_status in ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'MISCONFIGURED', 'UNKNOWN')),
  health_dimension text not null check (health_dimension in ('configuration', 'connectivity', 'execution', 'callback', 'evidence_pipeline')),
  reason text not null,
  latency_ms numeric check (latency_ms is null or latency_ms >= 0),
  rolling_success_rate numeric check (rolling_success_rate is null or rolling_success_rate between 0 and 1),
  callback_verification_failures integer not null default 0 check (callback_verification_failures >= 0),
  timeout_count integer not null default 0 check (timeout_count >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  rate_limit_count integer not null default 0 check (rate_limit_count >= 0),
  provider_request_id text,
  checked_at timestamptz not null default now(),
  retention_expires_at timestamptz not null default (now() + interval '90 days')
);

create table if not exists public.normalized_identity_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  tenant_id uuid not null references public.trust_workspaces(id) on delete cascade,
  trust_session_id uuid not null references public.trust_cases(id) on delete cascade,
  correlation_id uuid not null,
  provider_id text not null references public.provider_registry(provider_id),
  provider_session_id text not null,
  provider_event_id text not null,
  evidence_type text not null check (evidence_type in ('IDENTITY_SESSION', 'DOCUMENT_CHECK', 'LIVENESS_CHECK', 'FACE_MATCH_CHECK', 'ADDRESS_CHECK', 'AGE_CHECK', 'EMAIL_CHECK', 'PHONE_CHECK', 'PROVIDER_ASSERTION')),
  outcome text not null check (outcome in ('PASSED', 'FAILED', 'INCONCLUSIVE', 'NOT_PERFORMED', 'UNKNOWN')),
  assurance_level numeric,
  observed_at timestamptz not null,
  expires_at timestamptz,
  source_digest text not null check (source_digest ~ '^[a-f0-9]{64}$'),
  mapping_version text not null,
  attributes jsonb not null default '{}'::jsonb,
  limitations text[] not null default '{}',
  replay_reference uuid,
  evidence_graph_reference uuid,
  trust_memory_reference uuid,
  decision_reference text,
  retained_until timestamptz not null default (now() + interval '365 days'),
  created_at timestamptz not null default now(),
  check (attributes::text !~* '(access_token|id_token|client_secret|webhook_secret|document_image|biometric_template|face_image|passport_image)')
);

alter table public.provider_execution_records
  add column if not exists provider_session_id text,
  add column if not exists provider_request_id text;

alter table public.hopae_verifications
  add column if not exists provider_session_status text not null default 'CREATED'
    check (provider_session_status in ('CREATED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED', 'UNKNOWN')),
  add column if not exists last_polled_at timestamptz;

create index if not exists provider_state_audit_provider_idx on public.provider_state_audit (provider_id, changed_at desc);
create index if not exists provider_operational_health_snapshots_provider_idx on public.provider_operational_health_snapshots (provider_id, environment, health_dimension, checked_at desc);
create index if not exists normalized_identity_evidence_scope_idx on public.normalized_identity_evidence (tenant_id, trust_session_id, created_at desc);
create index if not exists normalized_identity_evidence_provider_idx on public.normalized_identity_evidence (provider_id, provider_session_id, created_at desc);
create unique index if not exists provider_execution_session_idx on public.provider_execution_records (provider_id, environment, provider_session_id) where provider_session_id is not null;

alter table public.provider_registry enable row level security;
alter table public.provider_state_audit enable row level security;
alter table public.provider_operational_health_snapshots enable row level security;
alter table public.normalized_identity_evidence enable row level security;

revoke all on public.provider_registry from anon, authenticated;
revoke all on public.provider_state_audit from anon, authenticated;
revoke all on public.provider_operational_health_snapshots from anon, authenticated;
revoke all on public.normalized_identity_evidence from anon, authenticated;
grant select on public.normalized_identity_evidence to authenticated;

drop policy if exists "tenant members read normalized identity evidence" on public.normalized_identity_evidence;
create policy "tenant members read normalized identity evidence" on public.normalized_identity_evidence
  for select to authenticated using (public.user_can_access_trust_workspace(tenant_id));

insert into public.provider_registry (
  provider_id, display_name, adapter_version, api_version, environment, enabled,
  capabilities, evidence_types, callback_mode, polling_supported, configured_state,
  health_status, timeout_ms, retry_policy, retention_classification, data_residency_notes
) values (
  'hopae_connect', 'Hopae Connect', 'pal-hopae-1.0.0', 'connect-v1', 'sandbox', false,
  array['identity_verification', 'eid_assurance', 'provenance'],
  array['IDENTITY_SESSION', 'PROVIDER_ASSERTION'], 'hybrid', true, 'DISABLED',
  'UNKNOWN', 8000, '{"safe_methods_only":true,"maximum_retries":2}'::jsonb,
  'normalized_evidence_only',
  'Deployment owners must confirm Hopae plan, eID coverage and regional processing terms before production enablement.'
) on conflict (provider_id) do nothing;

create or replace function public.set_provider_enabled(
  target_provider_id text,
  target_enabled boolean,
  target_actor_id uuid,
  target_reason text,
  target_correlation_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare previous_value boolean;
begin
  if nullif(trim(target_reason), '') is null then raise exception 'Provider state change reason is required'; end if;
  select enabled into previous_value from public.provider_registry where provider_id = target_provider_id for update;
  if previous_value is null then raise exception 'Provider not found'; end if;
  update public.provider_registry
    set enabled = target_enabled,
        configured_state = case when target_enabled then 'CONFIGURED' else 'DISABLED' end,
        updated_at = now()
    where provider_id = target_provider_id;
  insert into public.provider_state_audit (provider_id, previous_enabled, enabled, actor_id, reason, correlation_id)
    values (target_provider_id, previous_value, target_enabled, target_actor_id, target_reason, target_correlation_id);
end;
$$;

revoke all on function public.set_provider_enabled(text,boolean,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.set_provider_enabled(text,boolean,uuid,text,uuid) to service_role;

create or replace function public.persist_provider_identity_evidence(
  verification_row_id uuid,
  provider_event_id text,
  provider_event_type text,
  provider_verification_id text,
  provider_signature_timestamp bigint,
  provider_event_digest text,
  normalized_identity_evidence_input jsonb,
  normalized_evidence_input jsonb,
  evidence_quality_input jsonb,
  assessment_input jsonb,
  evidence_pack_input jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  evidence_row_id uuid;
begin
  result := public.persist_rc1_trust_assessment(
    verification_row_id, provider_event_id, provider_event_type,
    provider_verification_id, provider_signature_timestamp, provider_event_digest,
    normalized_evidence_input, evidence_quality_input, assessment_input, evidence_pack_input
  );
  if coalesce((result ->> 'duplicate')::boolean, false) then return result; end if;

  insert into public.normalized_identity_evidence (
    idempotency_key, tenant_id, trust_session_id, correlation_id, provider_id,
    provider_session_id, provider_event_id, evidence_type, outcome, assurance_level,
    observed_at, expires_at, source_digest, mapping_version, attributes, limitations,
    replay_reference, evidence_graph_reference, trust_memory_reference, decision_reference
  ) values (
    normalized_identity_evidence_input ->> 'idempotencyKey',
    (normalized_identity_evidence_input ->> 'tenantId')::uuid,
    (normalized_identity_evidence_input ->> 'trustSessionId')::uuid,
    (normalized_identity_evidence_input ->> 'correlationId')::uuid,
    normalized_identity_evidence_input ->> 'provider',
    normalized_identity_evidence_input ->> 'providerSessionId',
    normalized_identity_evidence_input ->> 'providerEventId',
    normalized_identity_evidence_input ->> 'evidenceType',
    normalized_identity_evidence_input ->> 'outcome',
    nullif(normalized_identity_evidence_input ->> 'assuranceLevel', '')::numeric,
    (normalized_identity_evidence_input ->> 'observedAt')::timestamptz,
    nullif(normalized_identity_evidence_input ->> 'expiresAt', '')::timestamptz,
    normalized_identity_evidence_input ->> 'sourceDigest',
    normalized_identity_evidence_input ->> 'mappingVersion',
    coalesce(normalized_identity_evidence_input -> 'attributes', '{}'::jsonb),
    array(select jsonb_array_elements_text(coalesce(normalized_identity_evidence_input -> 'limitations', '[]'::jsonb))),
    nullif(result ->> 'replay_reference', '')::uuid,
    nullif(result ->> 'evidence_graph_reference', '')::uuid,
    nullif(result ->> 'trust_memory_reference', '')::uuid,
    assessment_input ->> 'trust_decision'
  ) returning evidence_id into evidence_row_id;

  update public.hopae_verifications
    set provider_session_status = case normalized_identity_evidence_input ->> 'outcome'
      when 'PASSED' then 'COMPLETED'
      when 'FAILED' then 'FAILED'
      else provider_session_status
    end,
    updated_at = now()
    where id = verification_row_id;

  return result || jsonb_build_object('normalized_identity_evidence_reference', evidence_row_id);
end;
$$;

revoke all on function public.persist_provider_identity_evidence(uuid,text,text,text,bigint,text,jsonb,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.persist_provider_identity_evidence(uuid,text,text,text,bigint,text,jsonb,jsonb,jsonb,jsonb,jsonb) to service_role;

comment on table public.provider_registry is 'Governed provider metadata. Secrets remain in deployment configuration and are never stored here.';
comment on table public.normalized_identity_evidence is 'Provider-neutral evidence and raw-payload digest only; no raw identity provider payload or identity document may be retained.';
