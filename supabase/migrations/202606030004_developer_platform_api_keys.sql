-- Developer Platform & SDK Foundation

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  label text,
  key_hash text,
  status text default 'active',
  last_used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.api_keys add column if not exists owner_user_id uuid;
alter table public.api_keys add column if not exists label text;
alter table public.api_keys add column if not exists key_hash text;
alter table public.api_keys add column if not exists status text default 'active';
alter table public.api_keys add column if not exists last_used_at timestamptz;
alter table public.api_keys add column if not exists created_at timestamptz default now();

-- Compatibility with the existing Developer Console placeholder helper.
alter table public.api_keys add column if not exists user_id uuid;
alter table public.api_keys add column if not exists user_email text;
alter table public.api_keys add column if not exists key_prefix text;
alter table public.api_keys add column if not exists usage_count integer default 0;
alter table public.api_keys add column if not exists rate_limit_status text default 'normal';

revoke all on table public.api_keys from anon;
grant select, insert, update on table public.api_keys to authenticated;

alter table public.api_keys enable row level security;

drop policy if exists "users manage own api_keys" on public.api_keys;
drop policy if exists "admin manage api_keys" on public.api_keys;

create policy "users manage own api_keys"
  on public.api_keys
  for all
  to authenticated
  using (
    owner_user_id = auth.uid()
    or user_id = auth.uid()
  )
  with check (
    owner_user_id = auth.uid()
    or user_id = auth.uid()
  );

create policy "admin manage api_keys"
  on public.api_keys
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
