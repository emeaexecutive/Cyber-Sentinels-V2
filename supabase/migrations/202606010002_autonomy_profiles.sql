-- Autonomy Governance Engine V1
-- Profiles define what agents and workflows may observe, advise, approve or execute.

create table if not exists public.autonomy_profiles (
  id uuid primary key default gen_random_uuid(),
  subject_name text,
  subject_type text,
  autonomy_level text,
  approval_required boolean default true,
  risk_level text,
  status text default 'active',
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.autonomy_profiles from anon;
grant select, insert, update on table public.autonomy_profiles to authenticated;

alter table public.autonomy_profiles enable row level security;

drop policy if exists "authenticated manage autonomy_profiles" on public.autonomy_profiles;

create policy "authenticated manage autonomy_profiles" on public.autonomy_profiles
  for all
  to authenticated
  using (true)
  with check (true);
