create table if not exists public.runtime_validation_logs (
  id uuid primary key default gen_random_uuid(),
  deployment_state text not null,
  health_percent integer not null,
  critical_blockers text[] default '{}'::text[],
  warnings text[] default '{}'::text[],
  summary jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists runtime_validation_logs_created_idx
on public.runtime_validation_logs (created_at desc);

create index if not exists runtime_validation_logs_state_created_idx
on public.runtime_validation_logs (deployment_state, created_at desc);

alter table public.runtime_validation_logs enable row level security;

revoke all on table public.runtime_validation_logs from anon;
grant select, insert on table public.runtime_validation_logs to authenticated;
grant all privileges on table public.runtime_validation_logs to service_role;

drop policy if exists "admin read runtime validation logs" on public.runtime_validation_logs;
drop policy if exists "admin insert runtime validation logs" on public.runtime_validation_logs;

create policy "admin read runtime validation logs"
on public.runtime_validation_logs
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

create policy "admin insert runtime validation logs"
on public.runtime_validation_logs
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);
