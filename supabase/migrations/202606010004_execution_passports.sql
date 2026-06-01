-- Execution Passport V1
-- High-risk execution requests connect identity, intent, evidence, approval and audit history.

create table if not exists public.execution_passports (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid,
  intent_id uuid,
  execution_summary text,
  execution_type text,
  risk_level text default 'medium',
  approval_required boolean default true,
  evidence_required boolean default true,
  status text default 'pending_review',
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.execution_passports from anon;
grant select, insert, update on table public.execution_passports to authenticated;

alter table public.execution_passports enable row level security;

drop policy if exists "authenticated manage execution_passports" on public.execution_passports;

create policy "authenticated manage execution_passports" on public.execution_passports
  for all
  to authenticated
  using (true)
  with check (true);
