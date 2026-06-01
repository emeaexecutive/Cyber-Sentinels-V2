-- State Verification Layer V1
-- Dynamic trust-state checks extend passports beyond static identity verification.

create table if not exists public.passport_state_checks (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid,
  identity_state text,
  evidence_state text,
  trust_state text,
  risk_movement text,
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.passport_state_checks from anon;
grant select, insert, update on table public.passport_state_checks to authenticated;

alter table public.passport_state_checks enable row level security;

drop policy if exists "authenticated manage passport_state_checks" on public.passport_state_checks;

create policy "authenticated manage passport_state_checks" on public.passport_state_checks
  for all
  to authenticated
  using (true)
  with check (true);
