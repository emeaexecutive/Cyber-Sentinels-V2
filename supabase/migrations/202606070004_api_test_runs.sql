create table if not exists public.api_test_runs (
  id uuid primary key default gen_random_uuid(),
  test_name text,
  status text,
  safe_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists api_test_runs_name_created_idx
on public.api_test_runs (test_name, created_at desc);

alter table public.api_test_runs enable row level security;

revoke all on table public.api_test_runs from anon;
grant select, insert on table public.api_test_runs to authenticated;
grant all privileges on table public.api_test_runs to service_role;

drop policy if exists "admin read api test runs" on public.api_test_runs;
drop policy if exists "admin insert api test runs" on public.api_test_runs;

create policy "admin read api test runs"
on public.api_test_runs
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

create policy "admin insert api test runs"
on public.api_test_runs
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);
