-- Trust Timeline & Provenance Layer V1
-- Operational provenance history for passports, workflows and AI agents.

create table if not exists public.trust_timeline_events (
  id uuid primary key default gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  event_type text,
  event_title text,
  event_summary text,
  actor_type text,
  actor_id uuid,
  metadata jsonb default '{}'::jsonb,
  severity text default 'info',
  created_at timestamptz default now()
);

create index if not exists trust_timeline_events_subject_idx
  on public.trust_timeline_events (subject_type, subject_id, created_at desc);

create index if not exists trust_timeline_events_type_idx
  on public.trust_timeline_events (event_type, created_at desc);

create index if not exists trust_timeline_events_severity_idx
  on public.trust_timeline_events (severity, created_at desc);

revoke all on table public.trust_timeline_events from anon;
grant select, insert on table public.trust_timeline_events to authenticated;
grant all privileges on table public.trust_timeline_events to service_role;

alter table public.trust_timeline_events enable row level security;

drop policy if exists "authenticated read trust_timeline_events" on public.trust_timeline_events;
drop policy if exists "authenticated insert trust_timeline_events" on public.trust_timeline_events;

create policy "authenticated read trust_timeline_events"
  on public.trust_timeline_events
  for select
  to authenticated
  using (true);

create policy "authenticated insert trust_timeline_events"
  on public.trust_timeline_events
  for insert
  to authenticated
  with check (true);

create or replace function public.trust_timeline_safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value is null or value = '' then
    return null;
  end if;

  return value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.trust_timeline_subject_type(row_data jsonb)
returns text
language sql
immutable
as $$
  select case
    when row_data ? 'agent_id' and nullif(row_data ->> 'agent_id', '') is not null then 'agent'
    when row_data -> 'metadata' ? 'agent_id' and nullif(row_data -> 'metadata' ->> 'agent_id', '') is not null then 'agent'
    when nullif(row_data ->> 'subject_type', '') is not null then row_data ->> 'subject_type'
    when nullif(row_data ->> 'passport_id', '') is not null then 'passport'
    when row_data -> 'metadata' ? 'passport_id' and nullif(row_data -> 'metadata' ->> 'passport_id', '') is not null then 'passport'
    when nullif(row_data ->> 'verification_case_id', '') is not null then 'verification_case'
    when row_data -> 'metadata' ? 'verification_case_id' and nullif(row_data -> 'metadata' ->> 'verification_case_id', '') is not null then 'verification_case'
    when nullif(row_data ->> 'source_type', '') is not null then row_data ->> 'source_type'
    else 'workflow'
  end;
$$;

create or replace function public.trust_timeline_subject_id(row_data jsonb)
returns uuid
language sql
immutable
as $$
  select public.trust_timeline_safe_uuid(coalesce(
    nullif(row_data ->> 'subject_id', ''),
    nullif(row_data ->> 'passport_id', ''),
    nullif(row_data -> 'metadata' ->> 'passport_id', ''),
    nullif(row_data ->> 'agent_id', ''),
    nullif(row_data -> 'metadata' ->> 'agent_id', ''),
    nullif(row_data ->> 'verification_case_id', ''),
    nullif(row_data -> 'metadata' ->> 'verification_case_id', ''),
    nullif(row_data ->> 'source_id', '')
  ));
$$;

create or replace function public.trust_timeline_actor_id(row_data jsonb)
returns uuid
language sql
immutable
as $$
  select public.trust_timeline_safe_uuid(coalesce(
    nullif(row_data ->> 'actor_id', ''),
    nullif(row_data ->> 'reviewed_by', ''),
    nullif(row_data -> 'metadata' ->> 'actor_id', ''),
    nullif(row_data -> 'metadata' ->> 'user_id', ''),
    nullif(row_data -> 'metadata' ->> 'owner_user_id', '')
  ));
$$;

create or replace function public.trust_timeline_safe_timestamptz(value text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if value is null or value = '' then
    return null;
  end if;

  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.trust_timeline_record_event(
  row_data jsonb,
  timeline_event_type text,
  timeline_title text,
  timeline_summary text,
  timeline_actor_type text default 'system',
  timeline_severity text default 'info'
)
returns void
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
    public.trust_timeline_subject_type(row_data),
    public.trust_timeline_subject_id(row_data),
    timeline_event_type,
    timeline_title,
    timeline_summary,
    timeline_actor_type,
    public.trust_timeline_actor_id(row_data),
    row_data,
    timeline_severity,
    coalesce(public.trust_timeline_safe_timestamptz(row_data ->> 'created_at'), now())
  );
end;
$$;

create or replace function public.trust_timeline_record_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'evidence_uploaded',
    'Evidence uploaded',
    'Evidence was added to the verification workflow for human review.',
    coalesce(nullif(row_data ->> 'uploaded_by', ''), 'user'),
    'info'
  );
  return new;
end;
$$;

create or replace function public.trust_timeline_record_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'governance_decision',
    'Governance decision recorded',
    'A human governance decision was recorded against the workflow.',
    coalesce(nullif(row_data ->> 'actor', ''), 'human_reviewer'),
    case when lower(coalesce(row_data ->> 'decision', '')) in ('deny', 'manual_review', 'needs_more_evidence') then 'review' else 'info' end
  );
  return new;
end;
$$;

create or replace function public.trust_timeline_record_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'signal_generated',
    coalesce(nullif(row_data ->> 'event', ''), 'Signal generated'),
    'A trust signal was generated for operational review.',
    'system',
    case when lower(coalesce(row_data ->> 'event', '')) like '%risk%' then 'review' else 'info' end
  );
  return new;
end;
$$;

create or replace function public.trust_timeline_record_algorithm_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'trust_score_updated',
    'Trust score updated',
    'The deterministic trust algorithm recalculated the subject trust status.',
    'trust_algorithm_v1',
    case when lower(coalesce(row_data ->> 'confidence_level', '')) like '%risk%' then 'review' else 'info' end
  );
  return new;
end;
$$;

create or replace function public.trust_timeline_record_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'relationship_created',
    'Trust relationship created',
    'A source-to-target trust relationship was recorded for explainable provenance.',
    'relationship_registry',
    coalesce(nullif(row_data ->> 'confidence_level', ''), 'info')
  );
  return new;
end;
$$;

create or replace function public.trust_timeline_record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
  audit_type text := lower(coalesce(new.event_type, ''));
begin
  if audit_type in (
    'ai_summary_generated',
    'governance_recommendation_created',
    'anomaly_review_recommended'
  ) then
    perform public.trust_timeline_record_event(
      row_data,
      new.event_type,
      case
        when audit_type = 'ai_summary_generated' then 'AI-assisted summary generated'
        when audit_type = 'governance_recommendation_created' then 'Governance recommendation created'
        else 'Anomaly review recommended'
      end,
      'AI-assisted analysis produced operational context for human governance review. AI does not rewrite history.',
      coalesce(new.actor, 'ai_governance_assistant'),
      case when audit_type = 'anomaly_review_recommended' then 'review' else 'info' end
    );
  end if;
  return new;
end;
$$;

create or replace function public.trust_timeline_record_agent_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    'agent_activity_detected',
    coalesce(nullif(row_data ->> 'activity_type', ''), 'Agent activity detected'),
    'Agent activity was recorded for provenance and human governance visibility.',
    'agent',
    case when lower(coalesce(row_data ->> 'risk_level', '')) in ('high', 'critical') then 'review' else 'info' end
  );
  return new;
end;
$$;

create or replace function public.trust_timeline_record_trust_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  perform public.trust_timeline_record_event(
    row_data,
    coalesce(nullif(row_data ->> 'event_type', ''), 'operational_event'),
    coalesce(nullif(row_data ->> 'event_type', ''), 'Operational event'),
    'A trust event was recorded for operational provenance.',
    coalesce(nullif(row_data ->> 'actor_type', ''), 'system'),
    case when lower(coalesce(row_data ->> 'risk_level', '')) in ('high', 'critical') then 'review' else 'info' end
  );
  return new;
end;
$$;

drop trigger if exists trust_timeline_evidence_insert on public.evidence_files;
create trigger trust_timeline_evidence_insert
  after insert on public.evidence_files
  for each row execute function public.trust_timeline_record_evidence();

drop trigger if exists trust_timeline_decision_insert on public.decisions;
create trigger trust_timeline_decision_insert
  after insert on public.decisions
  for each row execute function public.trust_timeline_record_decision();

drop trigger if exists trust_timeline_signal_insert on public.signals;
create trigger trust_timeline_signal_insert
  after insert on public.signals
  for each row execute function public.trust_timeline_record_signal();

drop trigger if exists trust_timeline_algorithm_run_insert on public.trust_algorithm_runs;
create trigger trust_timeline_algorithm_run_insert
  after insert on public.trust_algorithm_runs
  for each row execute function public.trust_timeline_record_algorithm_run();

drop trigger if exists trust_timeline_relationship_insert on public.trust_relationships;
create trigger trust_timeline_relationship_insert
  after insert on public.trust_relationships
  for each row execute function public.trust_timeline_record_relationship();

drop trigger if exists trust_timeline_audit_insert on public.audit_logs;
create trigger trust_timeline_audit_insert
  after insert on public.audit_logs
  for each row execute function public.trust_timeline_record_audit();

drop trigger if exists trust_timeline_agent_activity_insert on public.agent_activity;
create trigger trust_timeline_agent_activity_insert
  after insert on public.agent_activity
  for each row execute function public.trust_timeline_record_agent_activity();

drop trigger if exists trust_timeline_trust_event_insert on public.trust_events;
create trigger trust_timeline_trust_event_insert
  after insert on public.trust_events
  for each row execute function public.trust_timeline_record_trust_event();
