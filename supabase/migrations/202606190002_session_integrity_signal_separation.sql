-- Session Integrity & Injection Risk Signal Separation
-- Liveness, deepfake risk, injection risk, channel integrity and session anomaly
-- risk remain separate, explainable inputs to human-governed verification.

create table if not exists public.session_integrity_checks (
  id uuid primary key default gen_random_uuid(),
  interview_session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  identity_verification_state text not null default 'pending',
  overall_status text not null default 'pending',
  manual_review_required boolean not null default false,
  evidence_source text not null default 'operator_input',
  evidence jsonb not null default '{}'::jsonb,
  review_summary text,
  created_at timestamptz not null default now(),
  constraint session_integrity_status_check check (
    overall_status in ('pending', 'reviewable', 'needs_review')
  )
);

create table if not exists public.injection_risk_events (
  id uuid primary key default gen_random_uuid(),
  session_integrity_check_id uuid not null references public.session_integrity_checks(id) on delete cascade,
  interview_session_id uuid not null references public.interview_sessions(id) on delete cascade,
  risk_level text not null default 'unknown',
  risk_score integer,
  explanation text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint injection_risk_level_check check (risk_level in ('low', 'medium', 'high', 'unknown')),
  constraint injection_risk_score_check check (risk_score is null or risk_score between 0 and 100)
);

create table if not exists public.verification_signals (
  id uuid primary key default gen_random_uuid(),
  session_integrity_check_id uuid not null references public.session_integrity_checks(id) on delete cascade,
  interview_session_id uuid not null references public.interview_sessions(id) on delete cascade,
  category text not null,
  signal_status text not null,
  risk_level text not null default 'unknown',
  confidence_score integer,
  explanation text not null,
  badge_label text not null,
  requires_manual_review boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint verification_signals_category_check check (
    category in (
      'liveness_check',
      'deepfake_risk',
      'injection_risk',
      'device_channel_integrity',
      'session_anomaly',
      'manual_review_required'
    )
  ),
  constraint verification_signals_risk_check check (risk_level in ('low', 'medium', 'high', 'unknown')),
  constraint verification_signals_score_check check (confidence_score is null or confidence_score between 0 and 100)
);

create table if not exists public.device_channel_evidence (
  id uuid primary key default gen_random_uuid(),
  session_integrity_check_id uuid not null references public.session_integrity_checks(id) on delete cascade,
  interview_session_id uuid not null references public.interview_sessions(id) on delete cascade,
  integrity_state text not null default 'pending',
  evidence_source text not null default 'operator_input',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_integrity_checks_session_idx
  on public.session_integrity_checks (interview_session_id, created_at desc);
create index if not exists verification_signals_session_idx
  on public.verification_signals (interview_session_id, category, created_at desc);
create index if not exists injection_risk_events_session_idx
  on public.injection_risk_events (interview_session_id, created_at desc);
create index if not exists device_channel_evidence_session_idx
  on public.device_channel_evidence (interview_session_id, created_at desc);

revoke all on table public.session_integrity_checks from anon;
revoke all on table public.injection_risk_events from anon;
revoke all on table public.verification_signals from anon;
revoke all on table public.device_channel_evidence from anon;

grant select, insert on table public.session_integrity_checks to authenticated;
grant select, insert on table public.injection_risk_events to authenticated;
grant select, insert on table public.verification_signals to authenticated;
grant select, insert on table public.device_channel_evidence to authenticated;
grant all privileges on table public.session_integrity_checks to service_role;
grant all privileges on table public.injection_risk_events to service_role;
grant all privileges on table public.verification_signals to service_role;
grant all privileges on table public.device_channel_evidence to service_role;

alter table public.session_integrity_checks enable row level security;
alter table public.injection_risk_events enable row level security;
alter table public.verification_signals enable row level security;
alter table public.device_channel_evidence enable row level security;

drop policy if exists "session integrity owner access" on public.session_integrity_checks;
create policy "session integrity owner access" on public.session_integrity_checks
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.interview_sessions
      where interview_sessions.id = session_integrity_checks.interview_session_id
      and interview_sessions.user_id = auth.uid()
    )
  );

drop policy if exists "session integrity child signal access" on public.verification_signals;
create policy "session integrity child signal access" on public.verification_signals
  for all to authenticated
  using (exists (select 1 from public.session_integrity_checks c where c.id = verification_signals.session_integrity_check_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.session_integrity_checks c where c.id = verification_signals.session_integrity_check_id and c.user_id = auth.uid()));

drop policy if exists "session integrity injection access" on public.injection_risk_events;
create policy "session integrity injection access" on public.injection_risk_events
  for all to authenticated
  using (exists (select 1 from public.session_integrity_checks c where c.id = injection_risk_events.session_integrity_check_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.session_integrity_checks c where c.id = injection_risk_events.session_integrity_check_id and c.user_id = auth.uid()));

drop policy if exists "session integrity channel evidence access" on public.device_channel_evidence;
create policy "session integrity channel evidence access" on public.device_channel_evidence
  for all to authenticated
  using (exists (select 1 from public.session_integrity_checks c where c.id = device_channel_evidence.session_integrity_check_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.session_integrity_checks c where c.id = device_channel_evidence.session_integrity_check_id and c.user_id = auth.uid()));

create or replace function public.record_session_integrity_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'session_integrity_check_created',
    new.user_id::text,
    jsonb_build_object(
      'session_integrity_check_id', new.id,
      'interview_session_id', new.interview_session_id,
      'overall_status', new.overall_status,
      'manual_review_required', new.manual_review_required
    ),
    new.created_at
  );

  insert into public.trust_timeline_events (
    subject_type, subject_id, event_type, event_title, event_summary,
    actor_type, actor_id, metadata, severity, created_at
  ) values (
    'interview_session',
    new.interview_session_id,
    'session_integrity_review',
    'Session integrity review recorded',
    coalesce(new.review_summary, 'Separate liveness, media-risk, injection-risk, channel-integrity and anomaly signals were recorded.'),
    'reviewer',
    new.user_id,
    jsonb_build_object('session_integrity_check_id', new.id, 'manual_review_required', new.manual_review_required),
    case when new.manual_review_required then 'review' else 'info' end,
    new.created_at
  );

  return new;
end;
$$;

drop trigger if exists session_integrity_check_records on public.session_integrity_checks;
create trigger session_integrity_check_records
  after insert on public.session_integrity_checks
  for each row execute function public.record_session_integrity_check();

create or replace function public.record_session_verification_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  check_row public.session_integrity_checks%rowtype;
  policy_id_value uuid;
begin
  select * into check_row from public.session_integrity_checks where id = new.session_integrity_check_id;

  if new.requires_manual_review or new.risk_level in ('medium', 'high') or new.signal_status = 'failed' then
    insert into public.signals (event, metadata, created_at)
    values (
      'Session integrity verification flag',
      jsonb_build_object(
        'session_integrity_check_id', new.session_integrity_check_id,
        'interview_session_id', new.interview_session_id,
        'category', new.category,
        'risk_level', new.risk_level,
        'explanation', new.explanation
      ),
      new.created_at
    );
  end if;

  if new.category = 'manual_review_required' and new.signal_status = 'required' then
    select id into policy_id_value
    from public.governance_policies
    where trigger_type in ('session_integrity_review', 'high_risk_signal_review')
    order by created_at desc
    limit 1;

    insert into public.governance_actions (
      policy_id, subject_type, subject_id, action_status, assigned_to,
      resolution_notes, created_at
    ) values (
      policy_id_value,
      'interview_session',
      new.interview_session_id,
      'pending',
      check_row.user_id,
      new.explanation,
      new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists session_verification_signal_records on public.verification_signals;
create trigger session_verification_signal_records
  after insert on public.verification_signals
  for each row execute function public.record_session_verification_flag();
