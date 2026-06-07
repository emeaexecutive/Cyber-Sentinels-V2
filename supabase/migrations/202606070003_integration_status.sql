create table if not exists public.integration_status (
  id uuid primary key default gen_random_uuid(),
  provider text,
  status text,
  purpose text,
  required_env jsonb default '[]'::jsonb,
  risk_level text,
  notes text,
  checked_at timestamptz default now()
);

create index if not exists integration_status_provider_checked_idx
on public.integration_status (provider, checked_at desc);

alter table public.integration_status enable row level security;

revoke all on table public.integration_status from anon;
grant select, insert on table public.integration_status to authenticated;
grant all privileges on table public.integration_status to service_role;

drop policy if exists "admin read integration status" on public.integration_status;
drop policy if exists "admin insert integration status" on public.integration_status;

create policy "admin read integration status"
on public.integration_status
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

create policy "admin insert integration status"
on public.integration_status
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);
