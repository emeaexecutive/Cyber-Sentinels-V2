-- Enterprise AI Trust & Governance Layer
-- Enterprise-first certification, alert, agent registry and timeline support.

create table if not exists public.trust_certifications (
  id uuid primary key default gen_random_uuid(),
  certification_type text not null,
  status text not null default 'pending',
  trust_score integer not null default 50,
  risk_level text not null default 'medium',
  verification_method text,
  subject_type text,
  subject_id uuid,
  enterprise_id uuid,
  issued_at timestamptz default now(),
  expires_at timestamptz,
  reviewed_by text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_certifications_type_check check (
    certification_type in (
      'verified_human',
      'verified_executive',
      'verified_ai_agent',
      'verified_recruiter',
      'verified_workflow',
      'verified_enterprise'
    )
  ),
  constraint trust_certifications_status_check check (
    status in ('pending', 'verified', 'failed', 'revoked')
  ),
  constraint trust_certifications_score_check check (trust_score between 0 and 100)
);

create table if not exists public.trust_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  status text not null default 'active',
  subject_type text,
  subject_id uuid,
  enterprise_id uuid,
  alert_title text not null,
  alert_description text,
  risk_level text not null default 'medium',
  source text default 'cyber_sentinels',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  reviewed_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_alerts_type_check check (
    alert_type in (
      'live_trust_alert',
      'behavioural_drift',
      'verification_failure',
      'suspicious_login',
      'suspicious_activity',
      'ai_agent_permission_escalation',
      'workflow_anomaly',
      'synthetic_identity_flag'
    )
  ),
  constraint trust_alerts_status_check check (
    status in ('active', 'in_review', 'resolved', 'dismissed')
  )
);

alter table public.ai_agents add column if not exists owner_name text;
alter table public.ai_agents add column if not exists owner_email text;
alter table public.ai_agents add column if not exists enterprise_id uuid;
alter table public.ai_agents add column if not exists agent_type text default 'enterprise_assistant';
alter table public.ai_agents add column if not exists capabilities jsonb not null default '[]'::jsonb;
alter table public.ai_agents add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.ai_agents add column if not exists trust_score integer not null default 50;
alter table public.ai_agents add column if not exists status text not null default 'pending';
alter table public.ai_agents add column if not exists created_at timestamptz default now();
alter table public.ai_agents add column if not exists last_activity_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_agents_trust_score_check'
  ) then
    alter table public.ai_agents
      add constraint ai_agents_trust_score_check
      check (trust_score between 0 and 100) not valid;
  end if;
end
$$;

create table if not exists public.provenance_events (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid,
  event_type text not null,
  event_title text not null,
  event_description text,
  risk_level text not null default 'low',
  created_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint provenance_events_subject_check check (
    subject_type in ('human', 'ai_agent', 'workflow', 'enterprise')
  )
);

alter table public.trust_certifications
  add column if not exists created_by uuid default auth.uid();
alter table public.trust_certifications
  add column if not exists certification_type text;
alter table public.trust_certifications
  add column if not exists status text default 'pending';
alter table public.trust_certifications
  add column if not exists subject_type text;
alter table public.trust_certifications
  add column if not exists subject_id uuid;
alter table public.trust_certifications
  add column if not exists created_at timestamptz default now();

alter table public.trust_alerts
  add column if not exists created_by uuid default auth.uid();
alter table public.trust_alerts
  add column if not exists alert_type text;
alter table public.trust_alerts
  add column if not exists status text default 'active';
alter table public.trust_alerts
  add column if not exists subject_type text;
alter table public.trust_alerts
  add column if not exists subject_id uuid;
alter table public.trust_alerts
  add column if not exists created_at timestamptz default now();

create index if not exists trust_certifications_type_status_idx
  on public.trust_certifications (certification_type, status, created_at desc);

create index if not exists trust_certifications_subject_idx
  on public.trust_certifications (subject_type, subject_id, created_at desc);

create index if not exists trust_certifications_created_by_idx
  on public.trust_certifications (created_by, created_at desc);

create index if not exists trust_alerts_type_status_idx
  on public.trust_alerts (alert_type, status, created_at desc);

create index if not exists trust_alerts_subject_idx
  on public.trust_alerts (subject_type, subject_id, created_at desc);

create index if not exists trust_alerts_created_by_idx
  on public.trust_alerts (created_by, created_at desc);

create index if not exists ai_agents_enterprise_status_idx
  on public.ai_agents (enterprise_id, status, created_at desc);

create index if not exists ai_agents_owner_email_idx
  on public.ai_agents (owner_email, created_at desc);

create index if not exists provenance_events_subject_idx
  on public.provenance_events (subject_type, subject_id, created_at desc);

create index if not exists provenance_events_type_idx
  on public.provenance_events (event_type, risk_level, created_at desc);

revoke all on table public.trust_certifications from anon;
revoke all on table public.trust_alerts from anon;
revoke all on table public.provenance_events from anon;

grant select, insert, update on table public.trust_certifications to authenticated;
grant select, insert, update on table public.trust_alerts to authenticated;
grant select, insert on table public.provenance_events to authenticated;
grant all privileges on table public.trust_certifications to service_role;
grant all privileges on table public.trust_alerts to service_role;
grant all privileges on table public.provenance_events to service_role;

alter table public.trust_certifications enable row level security;
alter table public.trust_alerts enable row level security;
alter table public.provenance_events enable row level security;

drop policy if exists "authenticated manage own trust certifications" on public.trust_certifications;
create policy "authenticated manage own trust certifications"
on public.trust_certifications
for all
to authenticated
using (created_by = auth.uid() or created_by is null)
with check (created_by = auth.uid() or created_by is null);

drop policy if exists "authenticated manage own trust alerts" on public.trust_alerts;
create policy "authenticated manage own trust alerts"
on public.trust_alerts
for all
to authenticated
using (created_by = auth.uid() or created_by is null)
with check (created_by = auth.uid() or created_by is null);

drop policy if exists "authenticated read provenance events" on public.provenance_events;
create policy "authenticated read provenance events"
on public.provenance_events
for select
to authenticated
using (true);

drop policy if exists "authenticated insert provenance events" on public.provenance_events;
create policy "authenticated insert provenance events"
on public.provenance_events
for insert
to authenticated
with check (true);
