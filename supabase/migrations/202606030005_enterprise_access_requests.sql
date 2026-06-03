create table if not exists public.enterprise_access_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  work_email text,
  company text,
  role text,
  company_size text,
  current_problem text,
  ai_usage_level text,
  use_case text,
  message text,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.enterprise_access_requests add column if not exists company_size text;
alter table public.enterprise_access_requests add column if not exists current_problem text;
alter table public.enterprise_access_requests add column if not exists ai_usage_level text;

alter table public.enterprise_access_requests enable row level security;

grant insert on table public.enterprise_access_requests to anon;
grant select, insert, update on table public.enterprise_access_requests to authenticated;

drop policy if exists "public insert enterprise access requests" on public.enterprise_access_requests;
drop policy if exists "authenticated manage enterprise access requests" on public.enterprise_access_requests;

create policy "public insert enterprise access requests"
on public.enterprise_access_requests
for insert
to anon
with check (true);

create policy "authenticated manage enterprise access requests"
on public.enterprise_access_requests
for all
to authenticated
using (true)
with check (true);
