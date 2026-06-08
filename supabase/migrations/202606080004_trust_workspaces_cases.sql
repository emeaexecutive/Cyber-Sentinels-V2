-- Trust Workspace & Operational Case Management V1
-- Collaborative workspaces for explainable trust operations.

create table if not exists public.trust_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text unique,
  description text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.trust_workspaces(id) on delete cascade,
  user_id uuid,
  role text default 'reviewer',
  created_at timestamptz default now(),
  constraint workspace_members_role_check check (role in ('admin', 'reviewer', 'observer'))
);

create table if not exists public.trust_cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.trust_workspaces(id) on delete cascade,
  title text,
  description text,
  status text default 'open',
  priority text default 'medium',
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz default now(),
  constraint trust_cases_status_check check (status in ('open', 'in_review', 'escalated', 'approved', 'rejected', 'closed')),
  constraint trust_cases_priority_check check (priority in ('low', 'medium', 'high', 'urgent'))
);

create table if not exists public.trust_case_relationships (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.trust_cases(id) on delete cascade,
  target_type text,
  target_id uuid,
  relationship_type text default 'linked_to',
  explanation text,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists trust_workspaces_created_by_idx
  on public.trust_workspaces (created_by, created_at desc);

create index if not exists workspace_members_workspace_idx
  on public.workspace_members (workspace_id, user_id);

create index if not exists trust_cases_workspace_idx
  on public.trust_cases (workspace_id, status, priority, created_at desc);

create index if not exists trust_case_relationships_case_idx
  on public.trust_case_relationships (case_id, target_type, created_at desc);

revoke all on table public.trust_workspaces from anon;
revoke all on table public.workspace_members from anon;
revoke all on table public.trust_cases from anon;
revoke all on table public.trust_case_relationships from anon;

grant select, insert, update on table public.trust_workspaces to authenticated;
grant select, insert, update on table public.workspace_members to authenticated;
grant select, insert, update on table public.trust_cases to authenticated;
grant select, insert, update on table public.trust_case_relationships to authenticated;

grant all privileges on table public.trust_workspaces to service_role;
grant all privileges on table public.workspace_members to service_role;
grant all privileges on table public.trust_cases to service_role;
grant all privileges on table public.trust_case_relationships to service_role;

alter table public.trust_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.trust_cases enable row level security;
alter table public.trust_case_relationships enable row level security;

drop policy if exists "authenticated manage trust_workspaces" on public.trust_workspaces;
drop policy if exists "authenticated manage workspace_members" on public.workspace_members;
drop policy if exists "authenticated manage trust_cases" on public.trust_cases;
drop policy if exists "authenticated manage trust_case_relationships" on public.trust_case_relationships;

create policy "authenticated manage trust_workspaces"
  on public.trust_workspaces
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage workspace_members"
  on public.workspace_members
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage trust_cases"
  on public.trust_cases
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage trust_case_relationships"
  on public.trust_case_relationships
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.record_trust_case_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    'trust_case',
    new.id,
    'trust_case_created',
    'Trust case created',
    'A trust operations case was opened for collaborative governance review.',
    'workspace_user',
    new.created_by,
    to_jsonb(new),
    case when new.priority in ('high', 'urgent') or new.status = 'escalated' then 'review' else 'info' end,
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'trust_case_created',
    coalesce(new.created_by::text, 'workspace'),
    jsonb_build_object(
      'trust_case_id', new.id,
      'workspace_id', new.workspace_id,
      'status', new.status,
      'priority', new.priority
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.record_trust_case_relationship_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trust_timeline_events (
    subject_type,
    subject_id,
    event_type,
    event_title,
    event_summary,
    actor_type,
    actor_id,
    metadata,
    severity,
    created_at
  )
  values (
    'trust_case',
    new.case_id,
    'trust_case_relationship_created',
    'Trust case relationship created',
    'A case was linked to operational trust evidence, signals, timelines, agents or governance records.',
    'workspace_user',
    new.created_by,
    to_jsonb(new),
    'info',
    coalesce(new.created_at, now())
  );

  insert into public.trust_relationships (
    source_type,
    source_id,
    relationship_type,
    target_type,
    target_id,
    confidence_level,
    explanation,
    created_at
  )
  values (
    'trust_case',
    new.case_id,
    coalesce(new.relationship_type, 'linked_to'),
    new.target_type,
    new.target_id,
    'high',
    coalesce(new.explanation, 'Trust case relationship created from workspace case management.'),
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'trust_case_relationship_created',
    coalesce(new.created_by::text, 'workspace'),
    jsonb_build_object(
      'trust_case_id', new.case_id,
      'target_type', new.target_type,
      'target_id', new.target_id,
      'relationship_type', new.relationship_type
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

drop trigger if exists trust_case_created_timeline on public.trust_cases;
create trigger trust_case_created_timeline
  after insert on public.trust_cases
  for each row execute function public.record_trust_case_created();

drop trigger if exists trust_case_relationship_created_timeline on public.trust_case_relationships;
create trigger trust_case_relationship_created_timeline
  after insert on public.trust_case_relationships
  for each row execute function public.record_trust_case_relationship_created();
