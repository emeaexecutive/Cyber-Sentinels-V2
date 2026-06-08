-- Operational Governance Engine V1
-- Explainable policies and human-governed review actions.

create table if not exists public.governance_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.trust_workspaces(id) on delete cascade,
  name text,
  description text,
  trigger_type text,
  severity text default 'medium',
  action_type text,
  requires_human_review boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.governance_actions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid references public.governance_policies(id) on delete cascade,
  subject_type text,
  subject_id uuid,
  action_status text default 'pending',
  assigned_to uuid,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  constraint governance_actions_status_check check (
    action_status in ('pending', 'in_review', 'escalated', 'approved', 'rejected', 'resolved')
  )
);

create index if not exists governance_policies_workspace_idx
  on public.governance_policies (workspace_id, trigger_type, created_at desc);

create index if not exists governance_actions_policy_idx
  on public.governance_actions (policy_id, action_status, created_at desc);

create index if not exists governance_actions_subject_idx
  on public.governance_actions (subject_type, subject_id, created_at desc);

create index if not exists governance_actions_assigned_idx
  on public.governance_actions (assigned_to, action_status, created_at desc);

revoke all on table public.governance_policies from anon;
revoke all on table public.governance_actions from anon;

grant select, insert, update on table public.governance_policies to authenticated;
grant select, insert, update on table public.governance_actions to authenticated;
grant all privileges on table public.governance_policies to service_role;
grant all privileges on table public.governance_actions to service_role;

alter table public.governance_policies enable row level security;
alter table public.governance_actions enable row level security;

drop policy if exists "authenticated manage governance_policies" on public.governance_policies;
drop policy if exists "authenticated manage governance_actions" on public.governance_actions;

create policy "authenticated manage governance_policies"
  on public.governance_policies
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage governance_actions"
  on public.governance_actions
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.ensure_governance_policy(
  policy_name text,
  policy_description text,
  policy_trigger_type text,
  policy_severity text,
  policy_action_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
begin
  select id into existing_id
  from public.governance_policies
  where workspace_id is null
    and trigger_type = policy_trigger_type
    and action_type = policy_action_type
  order by created_at asc
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.governance_policies (
    name,
    description,
    trigger_type,
    severity,
    action_type,
    requires_human_review
  )
  values (
    policy_name,
    policy_description,
    policy_trigger_type,
    policy_severity,
    policy_action_type,
    true
  )
  returning id into existing_id;

  return existing_id;
end;
$$;

create or replace function public.create_governance_action_if_needed(
  policy_id_input uuid,
  subject_type_input text,
  subject_id_input uuid,
  status_input text,
  notes_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
begin
  if subject_id_input is null then
    return null;
  end if;

  select id into existing_id
  from public.governance_actions
  where policy_id = policy_id_input
    and subject_type = subject_type_input
    and subject_id = subject_id_input
    and action_status in ('pending', 'in_review', 'escalated')
  order by created_at desc
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.governance_actions (
    policy_id,
    subject_type,
    subject_id,
    action_status,
    resolution_notes
  )
  values (
    policy_id_input,
    subject_type_input,
    subject_id_input,
    status_input,
    notes_input
  )
  returning id into existing_id;

  return existing_id;
end;
$$;

create or replace function public.record_governance_action_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_row public.governance_policies%rowtype;
begin
  select * into policy_row from public.governance_policies where id = new.policy_id;

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
    new.subject_type,
    new.subject_id,
    'governance_action_created',
    'Governance action created',
    coalesce(policy_row.description, 'A governance policy created a human review action.'),
    'governance_engine',
    new.assigned_to,
    jsonb_build_object(
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'policy_name', policy_row.name,
      'trigger_type', policy_row.trigger_type,
      'action_type', policy_row.action_type,
      'resolution_notes', new.resolution_notes
    ),
    case when coalesce(policy_row.severity, 'medium') in ('high', 'critical') then 'review' else 'info' end,
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
    'governance_policy',
    new.policy_id,
    'escalated_to',
    coalesce(new.subject_type, 'workflow'),
    new.subject_id,
    coalesce(policy_row.severity, 'medium'),
    coalesce(policy_row.description, 'Governance policy triggered human review.'),
    coalesce(new.created_at, now())
  );

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'governance_action_created',
    'governance_engine',
    jsonb_build_object(
      'governance_action_id', new.id,
      'policy_id', new.policy_id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'status', new.action_status
    ),
    coalesce(new.created_at, now())
  );

  return new;
end;
$$;

create or replace function public.record_governance_action_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.action_status is distinct from new.action_status
    or old.resolution_notes is distinct from new.resolution_notes then
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
      new.subject_type,
      new.subject_id,
      'governance_decision_flow_updated',
      'Governance decision flow updated',
      'A human reviewer updated the governance action status or resolution notes.',
      'human_reviewer',
      new.assigned_to,
      jsonb_build_object(
        'governance_action_id', new.id,
        'policy_id', new.policy_id,
        'previous_status', old.action_status,
        'new_status', new.action_status,
        'resolution_notes', new.resolution_notes
      ),
      case when new.action_status = 'escalated' then 'review' else 'info' end,
      now()
    );

    insert into public.audit_logs (event_type, actor, metadata, created_at)
    values (
      'governance_action_updated',
      coalesce(new.assigned_to::text, 'human_reviewer'),
      jsonb_build_object(
        'governance_action_id', new.id,
        'policy_id', new.policy_id,
        'previous_status', old.action_status,
        'new_status', new.action_status,
        'resolution_notes', new.resolution_notes
      ),
      now()
    );
  end if;

  return new;
end;
$$;

create or replace function public.governance_from_trust_algorithm_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_id_value uuid;
begin
  if coalesce(new.score, 100) < 60 then
    policy_id_value := public.ensure_governance_policy(
      'Trust score threshold review',
      'Trust score fell below the operational review threshold and requires human governance review.',
      'trust_score_below_threshold',
      'high',
      'review_required'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      new.subject_type,
      new.subject_id,
      'pending',
      coalesce(new.explanation, 'Deterministic trust score is below threshold.')
    );
  end if;

  return new;
end;
$$;

create or replace function public.governance_from_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_id_value uuid;
  row_data jsonb := to_jsonb(new);
  subject_type_value text;
  subject_id_value uuid;
begin
  if lower(coalesce(new.event, '')) like '%risk%'
    or lower(coalesce(new.event, '')) like '%review%'
    or lower(coalesce(new.event, '')) like '%escalat%'
    or lower(coalesce(new.event, '')) like '%anomaly%' then
    subject_type_value := public.trust_timeline_subject_type(row_data);
    subject_id_value := public.trust_timeline_subject_id(row_data);
    policy_id_value := public.ensure_governance_policy(
      'Unresolved signal review',
      'A signal indicates unresolved risk or review need and requires human governance review.',
      'unresolved_signal_detected',
      'medium',
      'signal_review'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      subject_type_value,
      subject_id_value,
      'pending',
      new.event
    );
  end if;

  return new;
end;
$$;

create or replace function public.governance_from_agent_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_id_value uuid;
  activity_text text := lower(
    coalesce(new.activity_type, '') || ' ' ||
    coalesce(new.review_status, '') || ' ' ||
    coalesce(new.signed_action_ref, '') || ' ' ||
    coalesce(new.provenance_ref, '')
  );
begin
  if activity_text like '%suspicious%'
    or activity_text like '%unknown%'
    or activity_text like '%unsigned%'
    or activity_text like '%escalat%'
    or activity_text like '%review%' then
    policy_id_value := public.ensure_governance_policy(
      'Suspicious agent activity review',
      'Agent activity indicates suspicious or high-risk behavior and requires human governance review.',
      'suspicious_agent_activity_detected',
      'high',
      'agent_activity_review'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      'agent',
      new.agent_id,
      'escalated',
      coalesce(new.activity_type, 'Suspicious or high-risk agent activity detected.')
    );
  end if;

  return new;
end;
$$;

create or replace function public.governance_from_ai_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_id_value uuid;
  row_data jsonb := to_jsonb(new);
  subject_type_value text;
  subject_id_value uuid;
begin
  if new.event_type in (
    'governance_recommendation_created',
    'anomaly_review_recommended'
  ) then
    subject_type_value := public.trust_timeline_subject_type(row_data);
    subject_id_value := public.trust_timeline_subject_id(row_data);
    policy_id_value := public.ensure_governance_policy(
      'AI-assisted escalation review',
      'AI-assisted analysis recommended review or escalation. Human governance remains authoritative.',
      'ai_assisted_escalation_recommended',
      case when new.event_type = 'anomaly_review_recommended' then 'high' else 'medium' end,
      'human_review_required'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      subject_type_value,
      subject_id_value,
      case when new.event_type = 'anomaly_review_recommended' then 'escalated' else 'pending' end,
      'AI-assisted recommendation requires human governance review.'
    );
  end if;

  return new;
end;
$$;

create or replace function public.governance_from_case_missing_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_id_value uuid;
begin
  if lower(coalesce(new.title, '') || ' ' || coalesce(new.description, '')) like '%missing evidence%'
    or lower(coalesce(new.title, '') || ' ' || coalesce(new.description, '')) like '%evidence missing%'
    or new.status = 'escalated' then
    policy_id_value := public.ensure_governance_policy(
      'Missing evidence escalation',
      'A workflow appears to be missing required evidence or has been escalated for evidence review.',
      'missing_evidence_escalation',
      case when new.status = 'escalated' then 'high' else 'medium' end,
      'request_evidence'
    );

    perform public.create_governance_action_if_needed(
      policy_id_value,
      'trust_case',
      new.id,
      case when new.status = 'escalated' then 'escalated' else 'pending' end,
      'Evidence completeness needs human review.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists governance_action_created_records on public.governance_actions;
create trigger governance_action_created_records
  after insert on public.governance_actions
  for each row execute function public.record_governance_action_created();

drop trigger if exists governance_action_updated_records on public.governance_actions;
create trigger governance_action_updated_records
  after update on public.governance_actions
  for each row execute function public.record_governance_action_updated();

drop trigger if exists governance_trust_algorithm_run on public.trust_algorithm_runs;
create trigger governance_trust_algorithm_run
  after insert on public.trust_algorithm_runs
  for each row execute function public.governance_from_trust_algorithm_run();

drop trigger if exists governance_signal_insert on public.signals;
create trigger governance_signal_insert
  after insert on public.signals
  for each row execute function public.governance_from_signal();

drop trigger if exists governance_agent_activity_insert on public.agent_activity;
create trigger governance_agent_activity_insert
  after insert on public.agent_activity
  for each row execute function public.governance_from_agent_activity();

drop trigger if exists governance_ai_audit_insert on public.audit_logs;
create trigger governance_ai_audit_insert
  after insert on public.audit_logs
  for each row execute function public.governance_from_ai_audit();

drop trigger if exists governance_case_missing_evidence on public.trust_cases;
create trigger governance_case_missing_evidence
  after insert or update on public.trust_cases
  for each row execute function public.governance_from_case_missing_evidence();
