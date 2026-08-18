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

-- Reconcile the earlier Production Hopae tables without discarding their
-- provider-native columns or payload history.
alter table public.hopae_verifications
  add column if not exists owner_user_id uuid,
  add column if not exists owner_email text,
  add column if not exists redirect_uri text,
  add column if not exists normalized_user_data jsonb,
  add column if not exists identity_assurance_uplift integer default 0,
  add column if not exists provenance_confidence boolean default false,
  add column if not exists upstream_identity_proof jsonb,
  add column if not exists passport_id uuid,
  add column if not exists trust_report_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hopae_verifications'
      and column_name = 'user_id'
  ) then
    execute 'update public.hopae_verifications set owner_user_id = coalesce(owner_user_id, user_id)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hopae_verifications'
      and column_name = 'normalized_user'
  ) then
    execute 'update public.hopae_verifications set normalized_user_data = coalesce(normalized_user_data, normalized_user)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hopae_verifications'
      and column_name = 'cyber_passport_id'
  ) then
    execute 'update public.hopae_verifications set passport_id = coalesce(passport_id, cyber_passport_id)';
  end if;
end
$$;

update public.hopae_verifications
set provider_id = coalesce(provider_id, 'hopae_connect'),
    flow_details = coalesce(flow_details, '{}'::jsonb),
    match_data = coalesce(match_data, '{}'::jsonb),
    normalized_user_data = coalesce(normalized_user_data, '{}'::jsonb),
    identity_assurance_uplift = coalesce(identity_assurance_uplift, 0),
    provenance_confidence = coalesce(provenance_confidence, false),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where provider_id is null
   or flow_details is null
   or match_data is null
   or normalized_user_data is null
   or identity_assurance_uplift is null
   or provenance_confidence is null
   or passport_id is null
   or created_at is null
   or updated_at is null;

alter table public.hopae_webhook_events
  add column if not exists event_id text,
  add column if not exists signature_timestamp bigint,
  add column if not exists raw_event jsonb,
  add column if not exists processed_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hopae_webhook_events'
      and column_name = 'payload'
  ) then
    execute 'update public.hopae_webhook_events set raw_event = coalesce(raw_event, payload)';
  end if;
end
$$;

update public.hopae_webhook_events
set signature_timestamp = coalesce(
      signature_timestamp,
      extract(epoch from coalesce(received_at, now()))::bigint
    ),
    raw_event = coalesce(raw_event, '{}'::jsonb),
    received_at = coalesce(received_at, now())
where signature_timestamp is null
   or raw_event is null
   or received_at is null;

alter table public.hopae_webhook_events
  alter column signature_timestamp set not null,
  alter column raw_event set not null,
  alter column received_at set not null;

create unique index if not exists hopae_verifications_verification_id_uidx
  on public.hopae_verifications (verification_id);
create unique index if not exists hopae_webhook_events_event_id_uidx
  on public.hopae_webhook_events (event_id) where event_id is not null;

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
