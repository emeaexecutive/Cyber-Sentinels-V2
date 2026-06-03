-- AI Trust Event Pipeline Foundation

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text,
  owner_user_id uuid,
  purpose text,
  model_provider text,
  model_name text,
  permission_scope text,
  status text default 'pending',
  trust_score numeric default 50,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.agents add column if not exists name text;
alter table public.agents add column if not exists owner_email text;
alter table public.agents add column if not exists owner_user_id uuid;
alter table public.agents add column if not exists purpose text;
alter table public.agents add column if not exists model_provider text;
alter table public.agents add column if not exists model_name text;
alter table public.agents add column if not exists permission_scope text;
alter table public.agents add column if not exists status text default 'pending';
alter table public.agents add column if not exists trust_score numeric default 50;
alter table public.agents add column if not exists metadata jsonb default '{}';
alter table public.agents add column if not exists created_at timestamptz default now();
alter table public.agents add column if not exists updated_at timestamptz default now();
alter table public.agents add column if not exists agent_name text;
alter table public.agents add column if not exists agent_type text;
alter table public.agents add column if not exists owner_name text;
alter table public.agents add column if not exists declared_purpose text;
alter table public.agents add column if not exists model_family text;
alter table public.agents add column if not exists permissions jsonb default '[]';
alter table public.agents add column if not exists risk_level text default 'medium';
alter table public.agents add column if not exists origin_trace_score numeric default 50;
alter table public.agents add column if not exists policy_status text default 'pending_policy_review';
alter table public.agents add column if not exists last_verified_at timestamptz;

create table if not exists public.trust_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text,
  actor_id uuid,
  actor_label text,
  event_type text not null,
  event_source text,
  risk_level text default 'low',
  case_id uuid,
  passport_id uuid,
  agent_id uuid,
  evidence_id uuid,
  decision_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.agent_permissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid,
  permission_name text,
  permission_scope text,
  risk_level text default 'medium',
  status text default 'active',
  created_by text,
  created_at timestamptz default now()
);

revoke all on table public.agents from anon;
revoke all on table public.trust_events from anon;
revoke all on table public.agent_permissions from anon;

grant select, insert, update on table public.agents to authenticated;
grant select, insert on table public.trust_events to authenticated;
grant select, insert, update on table public.agent_permissions to authenticated;

alter table public.agents enable row level security;
alter table public.trust_events enable row level security;
alter table public.agent_permissions enable row level security;

drop policy if exists "users manage own agents" on public.agents;
drop policy if exists "users read own trust_events" on public.trust_events;
drop policy if exists "users create own trust_events" on public.trust_events;
drop policy if exists "users read own agent_permissions" on public.agent_permissions;
drop policy if exists "users create own agent_permissions" on public.agent_permissions;
drop policy if exists "admin manage agents" on public.agents;
drop policy if exists "admin manage trust_events" on public.trust_events;
drop policy if exists "admin manage agent_permissions" on public.agent_permissions;

create policy "users manage own agents"
  on public.agents
  for all
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "users read own trust_events"
  on public.trust_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.agents
      where agents.id = trust_events.agent_id
      and agents.owner_user_id = auth.uid()
    )
    or metadata ->> 'owner_user_id' = auth.uid()::text
  );

create policy "users create own trust_events"
  on public.trust_events
  for insert
  to authenticated
  with check (
    agent_id is null
    or exists (
      select 1 from public.agents
      where agents.id = trust_events.agent_id
      and agents.owner_user_id = auth.uid()
    )
  );

create policy "users read own agent_permissions"
  on public.agent_permissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.agents
      where agents.id = agent_permissions.agent_id
      and agents.owner_user_id = auth.uid()
    )
  );

create policy "users create own agent_permissions"
  on public.agent_permissions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.agents
      where agents.id = agent_permissions.agent_id
      and agents.owner_user_id = auth.uid()
    )
  );

create policy "admin manage agents"
  on public.agents
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create policy "admin manage trust_events"
  on public.trust_events
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create policy "admin manage agent_permissions"
  on public.agent_permissions
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );
