-- EPIC 17.1: tenant-scoped Identity Signal Engine.
-- Additive only. Provider secrets and raw provider payloads are never stored here.

create table if not exists public.identity_subjects (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_type text not null,
  external_reference_hash text,
  display_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_subjects_type_check check (subject_type in ('human','agent','candidate','customer','employee','contractor','other')),
  constraint identity_subjects_external_hash_check check (external_reference_hash is null or external_reference_hash ~ '^[a-f0-9]{64}$')
);

create unique index if not exists identity_subject_external_reference_idx
  on public.identity_subjects (enterprise_id, subject_type, external_reference_hash)
  where external_reference_hash is not null;
create index if not exists identity_subject_enterprise_created_idx
  on public.identity_subjects (enterprise_id, created_at desc);

create table if not exists public.identity_verification_requests (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_id uuid not null references public.identity_subjects(id) on delete cascade,
  requested_signals text[] not null,
  purpose text not null,
  status text not null default 'PENDING',
  idempotency_key text not null,
  request_hash text not null,
  correlation_id uuid not null default gen_random_uuid(),
  requested_by uuid not null,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_verification_status_check check (status in ('PENDING','RUNNING','COMPLETED','PARTIAL','FAILED','CANCELLED')),
  constraint identity_verification_signals_check check (cardinality(requested_signals) between 1 and 16),
  constraint identity_verification_idempotency_check check (char_length(idempotency_key) between 8 and 160),
  constraint identity_verification_request_hash_check check (request_hash ~ '^[a-f0-9]{64}$')
);
create unique index if not exists identity_verification_idempotency_idx
  on public.identity_verification_requests (enterprise_id, idempotency_key);
create index if not exists identity_verification_subject_created_idx
  on public.identity_verification_requests (enterprise_id, subject_id, created_at desc);

create table if not exists public.identity_provider_capabilities (
  provider_id text not null,
  signal_type text not null,
  provider_name text not null,
  implementation_status text not null,
  runtime_status text not null,
  server_verified boolean not null default false,
  required_configuration text[] not null default '{}',
  limitations text[] not null default '{}',
  documentation_url text,
  updated_at timestamptz not null default now(),
  primary key (provider_id, signal_type),
  constraint identity_provider_implementation_check check (implementation_status in ('IMPLEMENTED','PARTIALLY_IMPLEMENTED','DOCUMENTED_ONLY','MISSING')),
  constraint identity_provider_runtime_check check (runtime_status in ('AVAILABLE','BLOCKED_BY_CREDENTIALS','BLOCKED_BY_EXTERNAL_CONFIGURATION','DISABLED','UNSUPPORTED'))
);

create table if not exists public.identity_provider_transactions (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  verification_request_id uuid not null references public.identity_verification_requests(id) on delete cascade,
  provider_id text not null,
  signal_type text not null,
  provider_session_id text,
  provider_request_id text,
  status text not null,
  attempt_count integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  latency_ms integer,
  error_code text,
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint identity_provider_transaction_status_check check (status in ('PENDING','RUNNING','SUCCEEDED','INCONCLUSIVE','BLOCKED','UNAVAILABLE','FAILED')),
  constraint identity_provider_transaction_latency_check check (latency_ms is null or latency_ms >= 0)
);
create index if not exists identity_provider_transaction_request_idx
  on public.identity_provider_transactions (enterprise_id, verification_request_id, created_at);

create table if not exists public.identity_signal_evidence (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_id uuid not null references public.identity_subjects(id) on delete cascade,
  verification_request_id uuid not null references public.identity_verification_requests(id) on delete cascade,
  provider_transaction_id uuid references public.identity_provider_transactions(id) on delete set null,
  signal_type text not null,
  provider_id text not null,
  outcome text not null,
  confidence numeric(5,2) not null default 0,
  server_verified boolean not null default false,
  source_digest text,
  reason_codes text[] not null default '{}',
  limitations text[] not null default '{}',
  attributes jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint identity_signal_outcome_check check (outcome in ('VERIFIED','FAILED','INCONCLUSIVE','UNAVAILABLE','BLOCKED','UNSUPPORTED')),
  constraint identity_signal_confidence_check check (confidence between 0 and 100),
  constraint identity_signal_digest_check check (source_digest is null or source_digest ~ '^[a-f0-9]{64}$')
);
create index if not exists identity_signal_subject_idx
  on public.identity_signal_evidence (enterprise_id, subject_id, observed_at desc);
create index if not exists identity_signal_request_idx
  on public.identity_signal_evidence (enterprise_id, verification_request_id, created_at);

create table if not exists public.identity_confidence_results (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_id uuid not null references public.identity_subjects(id) on delete cascade,
  verification_request_id uuid not null references public.identity_verification_requests(id) on delete cascade,
  score numeric(5,2) not null,
  band text not null,
  status text not null,
  verified_signal_count integer not null default 0,
  total_signal_count integer not null default 0,
  reason_codes text[] not null default '{}',
  methodology_version text not null,
  computed_at timestamptz not null default now(),
  constraint identity_confidence_score_check check (score between 0 and 100),
  constraint identity_confidence_band_check check (band in ('NONE','LOW','MODERATE','HIGH','VERY_HIGH')),
  constraint identity_confidence_status_check check (status in ('INSUFFICIENT_EVIDENCE','PROVISIONAL','ESTABLISHED'))
);
create unique index if not exists identity_confidence_request_idx
  on public.identity_confidence_results (verification_request_id);
create index if not exists identity_confidence_subject_idx
  on public.identity_confidence_results (enterprise_id, subject_id, computed_at desc);

create table if not exists public.identity_audit_events (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  subject_id uuid references public.identity_subjects(id) on delete set null,
  verification_request_id uuid references public.identity_verification_requests(id) on delete set null,
  actor_id uuid,
  actor_type text not null,
  event_type text not null,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint identity_audit_actor_check check (actor_type in ('USER','SYSTEM','PROVIDER'))
);
create index if not exists identity_audit_enterprise_created_idx
  on public.identity_audit_events (enterprise_id, created_at desc);

create or replace function public.identity_workspace_role(workspace_reference uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.trust_workspaces w where w.id = workspace_reference and w.created_by = auth.uid()) then 'owner'
    else (select m.role from public.workspace_members m where m.workspace_id = workspace_reference and m.user_id = auth.uid() limit 1)
  end;
$$;
revoke all on function public.identity_workspace_role(uuid) from public, anon;
grant execute on function public.identity_workspace_role(uuid) to authenticated, service_role;

create or replace function public.prevent_identity_audit_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Identity audit events are append-only';
end;
$$;
drop trigger if exists identity_audit_append_only on public.identity_audit_events;
create trigger identity_audit_append_only before update or delete on public.identity_audit_events
  for each row execute function public.prevent_identity_audit_mutation();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'identity_subjects','identity_verification_requests','identity_provider_capabilities',
    'identity_provider_transactions','identity_signal_evidence','identity_confidence_results','identity_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant all privileges on public.%I to service_role', table_name);
  end loop;
end $$;

grant select on public.identity_subjects, public.identity_verification_requests,
  public.identity_provider_capabilities, public.identity_provider_transactions,
  public.identity_signal_evidence, public.identity_confidence_results,
  public.identity_audit_events to authenticated;

create policy "authenticated read provider capabilities" on public.identity_provider_capabilities
  for select to authenticated using (true);
create policy "tenant members read identity subjects" on public.identity_subjects
  for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read identity verification requests" on public.identity_verification_requests
  for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read identity provider transactions" on public.identity_provider_transactions
  for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read identity signal evidence" on public.identity_signal_evidence
  for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read identity confidence results" on public.identity_confidence_results
  for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));
create policy "tenant members read identity audit events" on public.identity_audit_events
  for select to authenticated using (public.user_can_access_trust_workspace(enterprise_id));

insert into public.identity_provider_capabilities
  (provider_id, signal_type, provider_name, implementation_status, runtime_status, server_verified, required_configuration, limitations)
values
  ('hopae_connect','GOVERNMENT_ID','Hopae Connect','IMPLEMENTED','BLOCKED_BY_CREDENTIALS',true,array['HOPAE_CLIENT_ID','HOPAE_CLIENT_SECRET','HOPAE_PROVIDER_ID','HOPAE_WEBHOOK_SECRET'],array['Availability is deployment- and tenant-configuration dependent.']),
  ('hopae_connect','IDENTITY_ASSERTION','Hopae Connect','IMPLEMENTED','BLOCKED_BY_CREDENTIALS',true,array['HOPAE_CLIENT_ID','HOPAE_CLIENT_SECRET','HOPAE_PROVIDER_ID','HOPAE_WEBHOOK_SECRET'],array['Signed callback and upstream retrieval are required before evidence is trusted.']),
  ('world_id','PROOF_OF_PERSONHOOD','World ID','PARTIALLY_IMPLEMENTED','BLOCKED_BY_EXTERNAL_CONFIGURATION',false,array['WORLD_ID_APP_ID','WORLD_ID_ACTION'],array['Proof shape is accepted, but no server verification exchange is connected.']),
  ('email','EMAIL_OWNERSHIP','Email ownership provider','MISSING','DISABLED',false,'{}',array['No provider is configured.']),
  ('phone','PHONE_OWNERSHIP','Phone ownership provider','MISSING','DISABLED',false,'{}',array['No provider is configured.']),
  ('ip_reputation','IP_REPUTATION','IP reputation provider','MISSING','DISABLED',false,'{}',array['A request IP hash is not a reputation result.']),
  ('network_anonymity','NETWORK_ANONYMITY','Network anonymity provider','MISSING','DISABLED',false,'{}',array['No VPN, proxy, or Tor provider is configured.']),
  ('geolocation','GEOLOCATION','Geolocation provider','MISSING','DISABLED',false,'{}',array['No geolocation provider is configured.']),
  ('device_context','DEVICE_CONTEXT','Native device context','PARTIALLY_IMPLEMENTED','BLOCKED_BY_EXTERNAL_CONFIGURATION',false,array['SECURITY_HASH_SECRET'],array['Client-reported context is untrusted and cannot verify identity.'])
on conflict (provider_id, signal_type) do update set
  provider_name = excluded.provider_name,
  implementation_status = excluded.implementation_status,
  runtime_status = excluded.runtime_status,
  server_verified = excluded.server_verified,
  required_configuration = excluded.required_configuration,
  limitations = excluded.limitations,
  updated_at = now();

comment on table public.identity_signal_evidence is 'Normalized identity signal evidence only; raw provider proofs and secrets are prohibited.';
comment on table public.identity_confidence_results is 'Provisional identity confidence. It is not an authorization decision.';
