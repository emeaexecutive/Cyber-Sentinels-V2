-- Operational Notifications & Human Coordination Layer
-- Adds calm, high-value operational notifications without external email dependencies.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  notification_type text,
  title text,
  message text,
  severity text default 'info',
  read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists notification_type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists severity text default 'info';
alter table public.notifications add column if not exists read boolean default false;
alter table public.notifications add column if not exists metadata jsonb default '{}';
alter table public.notifications add column if not exists created_at timestamptz default now();
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists is_read boolean default false;

update public.notifications
set message = coalesce(message, body),
    read = coalesce(read, is_read, false),
    severity = coalesce(severity, 'info')
where message is null
   or read is null
   or severity is null;

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read, created_at desc);

create index if not exists notifications_type_idx
  on public.notifications (notification_type, created_at desc);

alter table public.trust_cases add column if not exists assigned_by uuid;
alter table public.trust_cases add column if not exists assigned_at timestamptz;
alter table public.trust_cases add column if not exists escalation_chain jsonb default '[]';

alter table public.governance_actions add column if not exists assigned_by uuid;
alter table public.governance_actions add column if not exists assigned_at timestamptz;
alter table public.governance_actions add column if not exists escalation_chain jsonb default '[]';

revoke all on table public.notifications from anon;
grant select, insert, update on table public.notifications to authenticated;
grant all privileges on table public.notifications to service_role;
alter table public.notifications enable row level security;

drop policy if exists "users manage own notifications" on public.notifications;
drop policy if exists "admin manage notifications" on public.notifications;

create policy "users read own notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "users update own notifications"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users create own notifications"
  on public.notifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "admin manage notifications"
  on public.notifications
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create or replace function public.notification_insert(
  target_user_id uuid,
  notification_kind text,
  notification_title text,
  notification_message text,
  notification_severity text default 'info',
  notification_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return;
  end if;

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
    target_user_id,
    notification_kind,
    notification_title,
    notification_message,
    notification_message,
    coalesce(notification_severity, 'info'),
    false,
    false,
    coalesce(notification_metadata, '{}'::jsonb) || jsonb_build_object('email_ready', false),
    now()
  );

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
    coalesce(notification_metadata ->> 'subject_type', 'notification'),
    public.trust_timeline_safe_uuid(notification_metadata ->> 'subject_id'),
    'notification_created',
    notification_title,
    notification_message,
    'system',
    target_user_id,
    coalesce(notification_metadata, '{}'::jsonb) || jsonb_build_object('notification_type', notification_kind),
    coalesce(notification_severity, 'info'),
    now()
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'notification_created',
    'system',
    coalesce(notification_metadata, '{}'::jsonb) || jsonb_build_object(
      'user_id', target_user_id,
      'notification_type', notification_kind,
      'title', notification_title
    ),
    now()
  );

  if public.trust_timeline_safe_uuid(notification_metadata ->> 'subject_id') is not null then
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
      'notification',
      notifications.id,
      'notifies_about',
      coalesce(notification_metadata ->> 'subject_type', 'operational_record'),
      public.trust_timeline_safe_uuid(notification_metadata ->> 'subject_id'),
      'high',
      'Notification was created to coordinate human review for the linked operational trust record.',
      now()
    from public.notifications
    where notifications.user_id = target_user_id
      and notifications.notification_type = notification_kind
      and notifications.title = notification_title
    order by notifications.created_at desc
    limit 1;
  end if;
end;
$$;

create or replace function public.notify_governance_action_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notification_insert(
    new.assigned_to,
    'governance_review_assigned',
    'Governance review assigned',
    'A governance review has been assigned for human review.',
    case when lower(coalesce(new.action_status, 'pending')) = 'escalated' then 'review' else 'info' end,
    jsonb_build_object(
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'action_status', new.action_status,
      'coordination_trigger', 'governance_assignment'
    )
  );
  return new;
end;
$$;

create or replace function public.notify_governance_action_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    perform public.notification_insert(
      new.assigned_to,
      'governance_review_assigned',
      'Governance review reassigned',
      'A governance review has been reassigned for human review.',
      'info',
      jsonb_build_object(
        'subject_type', new.subject_type,
        'subject_id', new.subject_id,
        'governance_action_id', new.id,
        'previous_assigned_to', old.assigned_to,
        'assigned_to', new.assigned_to,
        'coordination_trigger', 'governance_reassignment'
      )
    );
  end if;

  if new.action_status = 'escalated' and new.action_status is distinct from old.action_status then
    perform public.notification_insert(
      new.assigned_to,
      'governance_escalation',
      'Governance action escalated',
      'A governance workflow was escalated and may require coordinated review.',
      'review',
      jsonb_build_object(
        'subject_type', new.subject_type,
        'subject_id', new.subject_id,
        'governance_action_id', new.id,
        'previous_status', old.action_status,
        'action_status', new.action_status,
        'coordination_trigger', 'governance_escalation'
      )
    );
  end if;

  if new.action_status = 'in_review'
     and new.resolution_notes ilike '%evidence%'
     and (new.action_status is distinct from old.action_status
          or new.resolution_notes is distinct from old.resolution_notes) then
    perform public.notification_insert(
      new.assigned_to,
      'evidence_request',
      'Additional evidence may be required',
      'A reviewer requested more evidence before the workflow can move forward.',
      'review',
      jsonb_build_object(
        'subject_type', new.subject_type,
        'subject_id', new.subject_id,
        'governance_action_id', new.id,
        'coordination_trigger', 'evidence_request'
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_trust_case_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    perform public.notification_insert(
      new.assigned_to,
      'trust_case_reviewer_assigned',
      'Trust case assigned',
      coalesce(new.title, 'A trust case') || ' was assigned for operational review.',
      'info',
      jsonb_build_object(
        'subject_type', 'trust_case',
        'subject_id', new.id,
        'workspace_id', new.workspace_id,
        'previous_assigned_to', old.assigned_to,
        'assigned_to', new.assigned_to,
        'coordination_trigger', 'case_assignment'
      )
    );
  end if;

  if new.status = 'escalated' and new.status is distinct from old.status then
    perform public.notification_insert(
      coalesce(new.assigned_to, new.created_by),
      'trust_case_escalation',
      'Trust case escalated',
      coalesce(new.title, 'A trust case') || ' was escalated for coordinated review.',
      'review',
      jsonb_build_object(
        'subject_type', 'trust_case',
        'subject_id', new.id,
        'workspace_id', new.workspace_id,
        'previous_status', old.status,
        'status', new.status,
        'coordination_trigger', 'case_escalation'
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_suspicious_agent_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if lower(coalesce(new.review_status, '')) not in ('suspicious', 'unknown', 'requires_review', 'high_risk')
     and lower(coalesce(new.activity_type, '')) not like '%suspicious%' then
    return new;
  end if;

  select owner_user_id into owner_id
  from public.ai_agents
  where id = new.agent_id;

  perform public.notification_insert(
    owner_id,
    'suspicious_agent_activity',
    'Agent activity requires review',
    'An AI agent activity record may require human operational review.',
    'review',
    jsonb_build_object(
      'subject_type', 'agent',
      'subject_id', new.agent_id,
      'agent_activity_id', new.id,
      'activity_type', new.activity_type,
      'review_status', new.review_status,
      'coordination_trigger', 'suspicious_agent_activity'
    )
  );

  return new;
end;
$$;

create or replace function public.notify_ai_recommendation_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type not in (
    'governance_recommendation_created',
    'anomaly_review_recommended',
    'ai_summary_generated'
  ) then
    return new;
  end if;

  perform public.notification_insert(
    public.trust_timeline_safe_uuid(new.metadata ->> 'assigned_to'),
    'ai_recommendation_review',
    'AI-assisted recommendation needs review',
    'An AI-assisted operational recommendation is available for human review.',
    'review',
    coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'subject_type', coalesce(new.metadata ->> 'subject_type', 'governance'),
      'subject_id', new.metadata ->> 'subject_id',
      'audit_log_id', new.id,
      'coordination_trigger', 'ai_recommendation_review'
    )
  );

  return new;
end;
$$;

drop trigger if exists notify_governance_action_insert on public.governance_actions;
create trigger notify_governance_action_insert
  after insert on public.governance_actions
  for each row execute function public.notify_governance_action_insert();

drop trigger if exists notify_governance_action_update on public.governance_actions;
create trigger notify_governance_action_update
  after update on public.governance_actions
  for each row execute function public.notify_governance_action_update();

drop trigger if exists notify_trust_case_update on public.trust_cases;
create trigger notify_trust_case_update
  after update on public.trust_cases
  for each row execute function public.notify_trust_case_update();

drop trigger if exists notify_suspicious_agent_activity on public.agent_activity;
create trigger notify_suspicious_agent_activity
  after insert on public.agent_activity
  for each row execute function public.notify_suspicious_agent_activity();

drop trigger if exists notify_ai_recommendation_audit on public.audit_logs;
create trigger notify_ai_recommendation_audit
  after insert on public.audit_logs
  for each row execute function public.notify_ai_recommendation_audit();
