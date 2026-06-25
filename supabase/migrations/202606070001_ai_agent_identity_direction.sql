create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  organization_name text,
  owner_user_id uuid,
  owner_email text,
  agent_name text not null,
  declared_purpose text,
  verification_status text not null default 'concept_review',
  operational_scope text,
  provenance_notes text,
  governance_workflow_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_activity (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.ai_agents(id) on delete cascade,
  activity_type text not null,
  signed_action_ref text,
  provenance_ref text,
  review_status text not null default 'recorded',
  actor_email text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ai_agents add column if not exists owner_user_id uuid;
alter table public.ai_agents add column if not exists owner_email text;
alter table public.ai_agents add column if not exists created_at timestamptz default now();
alter table public.agent_activity add column if not exists agent_id uuid references public.ai_agents(id) on delete cascade;

create index if not exists ai_agents_owner_user_id_idx
on public.ai_agents (owner_user_id);

create index if not exists agent_activity_agent_id_idx
on public.agent_activity (agent_id);

alter table public.ai_agents enable row level security;
alter table public.agent_activity enable row level security;

revoke all on table public.ai_agents from anon;
revoke all on table public.agent_activity from anon;

grant select, insert, update on table public.ai_agents to authenticated;
grant select, insert on table public.agent_activity to authenticated;
grant all privileges on table public.ai_agents to service_role;
grant all privileges on table public.agent_activity to service_role;

drop policy if exists "users manage own ai agents" on public.ai_agents;
create policy "users manage own ai agents"
on public.ai_agents
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "users read own agent activity" on public.agent_activity;
create policy "users read own agent activity"
on public.agent_activity
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_agents
    where ai_agents.id = agent_activity.agent_id
    and ai_agents.owner_user_id = auth.uid()
  )
);

drop policy if exists "users insert own agent activity" on public.agent_activity;
create policy "users insert own agent activity"
on public.agent_activity
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ai_agents
    where ai_agents.id = agent_activity.agent_id
    and ai_agents.owner_user_id = auth.uid()
  )
);
