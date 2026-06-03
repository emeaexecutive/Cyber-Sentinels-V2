-- Legal Privacy Data Rights V1

create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text,
  requester_email text,
  requester_user_id uuid,
  details text,
  status text default 'open',
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

revoke all on table public.data_rights_requests from anon;
grant select, insert, update on table public.data_rights_requests to authenticated;

alter table public.data_rights_requests enable row level security;

drop policy if exists "authenticated manage data_rights_requests" on public.data_rights_requests;

create policy "authenticated manage data_rights_requests"
  on public.data_rights_requests
  for all
  to authenticated
  using (true)
  with check (true);
