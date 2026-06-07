create table if not exists public.trust_algorithm_runs (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  score numeric,
  confidence_level text,
  positive_signals jsonb default '[]'::jsonb,
  negative_signals jsonb default '[]'::jsonb,
  missing_requirements jsonb default '[]'::jsonb,
  recommended_action text,
  explanation text,
  created_at timestamptz default now()
);

create index if not exists trust_algorithm_runs_subject_idx
on public.trust_algorithm_runs (subject_type, subject_id, created_at desc);

alter table public.trust_algorithm_runs enable row level security;

revoke all on table public.trust_algorithm_runs from anon;
grant select, insert on table public.trust_algorithm_runs to authenticated;
grant all privileges on table public.trust_algorithm_runs to service_role;

drop policy if exists "authenticated read trust algorithm runs" on public.trust_algorithm_runs;
drop policy if exists "authenticated insert trust algorithm runs" on public.trust_algorithm_runs;

create policy "authenticated read trust algorithm runs"
on public.trust_algorithm_runs
for select
to authenticated
using (true);

create policy "authenticated insert trust algorithm runs"
on public.trust_algorithm_runs
for insert
to authenticated
with check (subject_type in ('passport', 'agent'));
