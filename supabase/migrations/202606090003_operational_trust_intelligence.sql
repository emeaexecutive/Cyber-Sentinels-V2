-- Operational Trust Intelligence Layer V1
-- Explainable situational awareness for trust operations. No autonomous governance.

create table if not exists public.operational_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  subject_type text,
  subject_id uuid,
  event_type text,
  severity text default 'info',
  summary text,
  recommended_action text,
  requires_review boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists operational_intelligence_workspace_idx
  on public.operational_intelligence_events (workspace_id, severity, created_at desc);

create index if not exists operational_intelligence_subject_idx
  on public.operational_intelligence_events (subject_type, subject_id, created_at desc);

create index if not exists operational_intelligence_type_idx
  on public.operational_intelligence_events (event_type, requires_review, created_at desc);

revoke all on table public.operational_intelligence_events from anon;
grant select, insert on table public.operational_intelligence_events to authenticated;
grant all privileges on table public.operational_intelligence_events to service_role;

alter table public.operational_intelligence_events enable row level security;

drop policy if exists "authenticated read operational_intelligence_events" on public.operational_intelligence_events;
drop policy if exists "authenticated insert operational_intelligence_events" on public.operational_intelligence_events;

create policy "authenticated read operational_intelligence_events"
  on public.operational_intelligence_events
  for select
  to authenticated
  using (
    workspace_id is null
    or exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = operational_intelligence_events.workspace_id
        and trust_workspaces.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = operational_intelligence_events.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "authenticated insert operational_intelligence_events"
  on public.operational_intelligence_events
  for insert
  to authenticated
  with check (
    workspace_id is null
    or exists (
      select 1
      from public.trust_workspaces
      where trust_workspaces.id = operational_intelligence_events.workspace_id
        and trust_workspaces.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.workspace_members
      where workspace_members.workspace_id = operational_intelligence_events.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('admin', 'reviewer')
    )
  );

create or replace function public.operational_intelligence_record_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
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
    coalesce(new.subject_type, 'workflow'),
    new.subject_id,
    'operational_intelligence_event',
    coalesce(nullif(new.event_type, ''), 'Operational intelligence event'),
    coalesce(nullif(new.summary, ''), 'Operational intelligence was recorded for human review.'),
    'operational_intelligence',
    null,
    row_data,
    coalesce(nullif(new.severity, ''), 'info'),
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'operational_intelligence_event',
    'operational_intelligence',
    jsonb_build_object(
      'operational_intelligence_event_id', new.id,
      'workspace_id', new.workspace_id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'event_type', new.event_type,
      'severity', new.severity,
      'requires_review', new.requires_review,
      'operational_context', 'Explainable intelligence event recorded for workflow awareness and human governance.'
    ),
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
  select
    'operational_intelligence_event',
    new.id,
    'linked_to',
    new.subject_type,
    new.subject_id,
    coalesce(nullif(new.severity, ''), 'medium'),
    'Operational intelligence links this subject to explainable workflow health, governance or risk context.',
    coalesce(new.created_at, now())
  where new.subject_id is not null
    and new.subject_type is not null
    and not exists (
      select 1
      from public.trust_relationships existing
      where existing.source_type = 'operational_intelligence_event'
        and existing.source_id = new.id
        and existing.relationship_type = 'linked_to'
        and existing.target_type = new.subject_type
        and existing.target_id = new.subject_id
    );

  return new;
end;
$$;

create or replace function public.operational_intelligence_from_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_workspace uuid;
  normalized_status text := lower(coalesce(new.action_status, 'pending'));
begin
  if normalized_status not in ('pending', 'in_review', 'escalated') then
    return new;
  end if;

  select workspace_id into policy_workspace
  from public.governance_policies
  where id = new.policy_id;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    policy_workspace,
    new.subject_type,
    new.subject_id,
    case when normalized_status = 'escalated' then 'repeated_escalations' else 'unresolved_governance_action' end,
    case when normalized_status = 'escalated' then 'high' else 'review' end,
    'A governance action remains unresolved and may affect workflow health.',
    'Assign a human reviewer, confirm related evidence and resolve or defer the governance action.',
    true,
    jsonb_build_object(
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'action_status', new.action_status,
      'why_it_exists', 'Governance action is pending, in review or escalated.'
    ),
    now()
  where not exists (
    select 1
    from public.operational_intelligence_events existing
    where existing.event_type in ('unresolved_governance_action', 'repeated_escalations')
      and existing.subject_type is not distinct from new.subject_type
      and existing.subject_id is not distinct from new.subject_id
      and existing.metadata ->> 'governance_action_id' = new.id::text
  );

  return new;
end;
$$;

create or replace function public.operational_intelligence_from_trust_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text := lower(coalesce(new.status, 'open'));
begin
  if normalized_status not in ('open', 'in_review', 'escalated') then
    return new;
  end if;

  if normalized_status <> 'escalated'
    and coalesce(new.created_at, now()) > now() - interval '7 days'
  then
    return new;
  end if;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    new.workspace_id,
    'trust_case',
    new.id,
    case when normalized_status = 'escalated' then 'repeated_escalations' else 'stalled_verification_workflow' end,
    case when normalized_status = 'escalated' then 'high' else 'info' end,
    case
      when normalized_status = 'escalated' then 'A trust case is escalated and needs coordinated human review.'
      else 'A trust case has remained open or in review for at least seven days.'
    end,
    'Review case evidence, owner assignment, governance actions and next operational step.',
    normalized_status = 'escalated',
    jsonb_build_object(
      'trust_case_id', new.id,
      'status', new.status,
      'priority', new.priority,
      'why_it_exists', 'Trust case entered or remained in an active operational state.'
    ),
    now()
  where not exists (
    select 1
    from public.operational_intelligence_events existing
    where existing.subject_type = 'trust_case'
      and existing.subject_id = new.id
      and existing.event_type in ('stalled_verification_workflow', 'repeated_escalations')
      and existing.metadata ->> 'status' = new.status
  );

  return new;
end;
$$;

create or replace function public.operational_intelligence_from_interview_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(new.escalation_required, false) and coalesce(new.confidence_score, 0) < 50 then
    return new;
  end if;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    interview_sessions.workspace_id,
    'interview_session',
    new.interview_session_id,
    'elevated_risk_pattern',
    case when coalesce(new.escalation_required, false) then 'high' else 'review' end,
    'An interview integrity signal requires explainable operational review.',
    'Review the signal source, candidate provenance, recruiter state and governance action before deciding.',
    true,
    jsonb_build_object(
      'interview_risk_event_id', new.id,
      'signal_type', new.signal_type,
      'signal_source', new.signal_source,
      'confidence_score', new.confidence_score,
      'why_it_exists', 'Interview risk event was escalated or crossed the review confidence threshold.'
    ),
    now()
  from public.interview_sessions
  where interview_sessions.id = new.interview_session_id
    and not exists (
      select 1
      from public.operational_intelligence_events existing
      where existing.subject_type = 'interview_session'
        and existing.subject_id = new.interview_session_id
        and existing.metadata ->> 'interview_risk_event_id' = new.id::text
    );

  return new;
end;
$$;

create or replace function public.operational_intelligence_from_agent_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_activity text := lower(coalesce(new.activity_type, ''));
begin
  if normalized_activity not like '%suspicious%'
    and normalized_activity not like '%risk%'
    and normalized_activity not like '%unknown%'
    and normalized_activity not like '%failed%'
  then
    return new;
  end if;

  insert into public.operational_intelligence_events (
    workspace_id,
    subject_type,
    subject_id,
    event_type,
    severity,
    summary,
    recommended_action,
    requires_review,
    metadata,
    created_at
  )
  select
    null,
    'agent',
    new.agent_id,
    'suspicious_agent_activity',
    'review',
    'Agent activity wording indicates possible suspicious or unresolved operational context.',
    'Review agent verification state, owner relationship, activity provenance and governance controls.',
    true,
    jsonb_build_object(
      'agent_activity_id', new.id,
      'activity_type', new.activity_type,
      'why_it_exists', 'Agent activity type contains suspicious, risk, unknown or failed wording.'
    ),
    now()
  where not exists (
    select 1
    from public.operational_intelligence_events existing
    where existing.subject_type = 'agent'
      and existing.subject_id = new.agent_id
      and existing.metadata ->> 'agent_activity_id' = new.id::text
  );

  return new;
end;
$$;

drop trigger if exists operational_intelligence_event_integrity_insert on public.operational_intelligence_events;
create trigger operational_intelligence_event_integrity_insert
  after insert on public.operational_intelligence_events
  for each row execute function public.operational_intelligence_record_integrity();

drop trigger if exists operational_intelligence_governance_insert on public.governance_actions;
create trigger operational_intelligence_governance_insert
  after insert on public.governance_actions
  for each row execute function public.operational_intelligence_from_governance();

drop trigger if exists operational_intelligence_governance_update on public.governance_actions;
create trigger operational_intelligence_governance_update
  after update on public.governance_actions
  for each row execute function public.operational_intelligence_from_governance();

drop trigger if exists operational_intelligence_trust_case_insert on public.trust_cases;
create trigger operational_intelligence_trust_case_insert
  after insert on public.trust_cases
  for each row execute function public.operational_intelligence_from_trust_case();

drop trigger if exists operational_intelligence_trust_case_update on public.trust_cases;
create trigger operational_intelligence_trust_case_update
  after update on public.trust_cases
  for each row execute function public.operational_intelligence_from_trust_case();

drop trigger if exists operational_intelligence_interview_risk_insert on public.interview_risk_events;
create trigger operational_intelligence_interview_risk_insert
  after insert on public.interview_risk_events
  for each row execute function public.operational_intelligence_from_interview_risk();

drop trigger if exists operational_intelligence_agent_activity_insert on public.agent_activity;
create trigger operational_intelligence_agent_activity_insert
  after insert on public.agent_activity
  for each row execute function public.operational_intelligence_from_agent_activity();
