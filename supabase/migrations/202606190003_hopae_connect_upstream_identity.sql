-- Optional Hopae Connect upstream identity proof records.
-- Cyber Sentinels remains the trust governance and final decision layer.

create table if not exists public.hopae_verifications (
  id uuid primary key default gen_random_uuid(),
  verification_id text not null unique,
  owner_user_id uuid not null,
  owner_email text,
  status text not null default 'pending',
  provider_id text not null,
  flow_type text,
  flow_details jsonb not null default '{}'::jsonb,
  redirect_uri text,
  match_data jsonb not null default '{}'::jsonb,
  normalized_user_data jsonb,
  provenance jsonb,
  verification_model text,
  hopae_loa integer,
  acr text,
  amr jsonb,
  identity_assurance_uplift integer not null default 0,
  provenance_confidence boolean not null default false,
  upstream_identity_proof jsonb,
  passport_id uuid,
  trust_report_id uuid,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hopae_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_type text,
  verification_id text,
  signature_timestamp bigint not null,
  raw_event jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists hopae_verifications_owner_idx
  on public.hopae_verifications (owner_user_id, created_at desc);
create index if not exists hopae_webhook_verification_idx
  on public.hopae_webhook_events (verification_id, received_at desc);

alter table public.hopae_verifications enable row level security;
alter table public.hopae_webhook_events enable row level security;
revoke all on public.hopae_verifications from anon;
revoke all on public.hopae_webhook_events from anon, authenticated;
grant select, insert, update on public.hopae_verifications to authenticated;

drop policy if exists "users manage own hopae verifications" on public.hopae_verifications;
create policy "users manage own hopae verifications"
  on public.hopae_verifications for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

alter table public.passports add column if not exists identity_assurance_score integer default 0;
alter table public.passports add column if not exists upstream_identity_proofs jsonb default '[]'::jsonb;
alter table public.trust_reports add column if not exists identity_assurance_score integer default 0;
alter table public.trust_reports add column if not exists upstream_identity_proofs jsonb default '[]'::jsonb;
