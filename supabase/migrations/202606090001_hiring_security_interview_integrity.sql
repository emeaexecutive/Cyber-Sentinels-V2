-- Hiring Security & Interview Integrity Layer
-- Additive schema alignment for hiring workflows on existing trust architecture.

alter table public.candidate_profiles add column if not exists provenance_status text default 'unknown';
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'candidate_profiles'
      and column_name = 'risk_level'
  ) then
    alter table public.candidate_profiles alter column risk_level set default 'unknown';
  end if;
end
$$;

alter table public.recruiter_profiles add column if not exists organization text;

alter table public.interview_sessions add column if not exists candidate_id uuid references public.candidate_profiles(id) on delete cascade;
alter table public.interview_sessions add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.interview_sessions add column if not exists session_status text default 'scheduled';
alter table public.interview_sessions add column if not exists integrity_status text default 'pending';
alter table public.interview_sessions add column if not exists risk_level text default 'unknown';

update public.interview_sessions
set candidate_id = coalesce(candidate_id, candidate_profile_id),
    session_status = coalesce(session_status, status, 'scheduled'),
    risk_level = coalesce(risk_level, 'unknown')
where candidate_id is null
   or session_status is null
   or risk_level is null;

create table if not exists public.interview_risk_events (
  id uuid primary key default gen_random_uuid(),
  interview_session_id uuid references public.interview_sessions(id) on delete cascade,
  signal_type text,
  signal_source text,
  confidence_score integer,
  risk_reason text,
  escalation_required boolean default false,
  created_at timestamptz default now()
);

create index if not exists interview_risk_events_session_idx
  on public.interview_risk_events (interview_session_id, created_at desc);

create index if not exists interview_risk_events_signal_idx
  on public.interview_risk_events (signal_type, escalation_required, created_at desc);

revoke all on table public.interview_risk_events from anon;
grant select, insert, update on table public.interview_risk_events to authenticated;
grant all privileges on table public.interview_risk_events to service_role;
alter table public.interview_risk_events enable row level security;

drop policy if exists "interview risk events owner select" on public.interview_risk_events;
drop policy if exists "interview risk events owner insert" on public.interview_risk_events;
drop policy if exists "interview risk events owner update" on public.interview_risk_events;

create policy "interview risk events owner select"
  on public.interview_risk_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.interview_sessions
      where interview_sessions.id = interview_risk_events.interview_session_id
      and interview_sessions.user_id = auth.uid()
    )
  );

create policy "interview risk events owner insert"
  on public.interview_risk_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.interview_sessions
      where interview_sessions.id = interview_risk_events.interview_session_id
      and interview_sessions.user_id = auth.uid()
    )
  );

create policy "interview risk events owner update"
  on public.interview_risk_events
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.interview_sessions
      where interview_sessions.id = interview_risk_events.interview_session_id
      and interview_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.interview_sessions
      where interview_sessions.id = interview_risk_events.interview_session_id
      and interview_sessions.user_id = auth.uid()
    )
  );

create or replace function public.hiring_risk_event_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.interview_sessions%rowtype;
  actor_id uuid;
  policy_id_value uuid;
  governance_action_id uuid;
begin
  select * into session_row
  from public.interview_sessions
  where id = new.interview_session_id;

  actor_id := session_row.user_id;

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
    'interview_session',
    new.interview_session_id,
    'interview_risk_event',
    'Interview risk event recorded',
    coalesce(new.risk_reason, 'A placeholder interview integrity signal was recorded for human review.'),
    'system',
    actor_id,
    jsonb_build_object(
      'interview_risk_event_id', new.id,
      'signal_type', new.signal_type,
      'signal_source', new.signal_source,
      'confidence_score', new.confidence_score,
      'escalation_required', new.escalation_required,
      'explainability', 'Placeholder signal only. No detection accuracy is claimed.'
    ),
    case when new.escalation_required then 'review' else 'info' end,
    new.created_at
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'interview_risk_event_recorded',
    coalesce(actor_id::text, 'system'),
    jsonb_build_object(
      'interview_session_id', new.interview_session_id,
      'interview_risk_event_id', new.id,
      'signal_type', new.signal_type,
      'signal_source', new.signal_source,
      'risk_reason', new.risk_reason,
      'escalation_required', new.escalation_required
    ),
    new.created_at
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
    'interview_risk_event',
    new.id,
    'generated_signal',
    'interview_session',
    new.interview_session_id,
    'medium',
    'Interview risk event is linked to the session for explainable hiring integrity review.',
    new.created_at
  );

  if new.escalation_required then
    select id into policy_id_value
    from public.governance_policies
    where trigger_type in ('interview_integrity_escalation', 'high-risk signal review', 'high_risk_signal_review')
    order by created_at desc
    limit 1;

    insert into public.governance_actions (
      policy_id,
      subject_type,
      subject_id,
      action_status,
      assigned_to,
      resolution_notes,
      created_at
    )
    values (
      policy_id_value,
      'interview_session',
      new.interview_session_id,
      'pending',
      actor_id,
      coalesce(new.risk_reason, 'Interview risk event requires human governance review.'),
      new.created_at
    )
    returning id into governance_action_id;

    insert into public.notifications (
      user_id,
      notification_type,
      title,
      message,
      body,
      severity,
      read,
      is_read,
      metadata,
      created_at
    )
    values (
      actor_id,
      'interview_integrity_review',
      'Interview integrity review required',
      'An interview risk event was escalated for human review.',
      'An interview risk event was escalated for human review.',
      'review',
      false,
      false,
      jsonb_build_object(
        'subject_type', 'interview_session',
        'subject_id', new.interview_session_id,
        'interview_risk_event_id', new.id,
        'governance_action_id', governance_action_id,
        'email_ready', false
      ),
      new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists hiring_risk_event_records on public.interview_risk_events;
create trigger hiring_risk_event_records
  after insert on public.interview_risk_events
  for each row execute function public.hiring_risk_event_records();
