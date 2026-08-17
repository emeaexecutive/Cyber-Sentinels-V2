-- Track + Block V1 is a bounded workflow projection over the canonical Trust
-- Fabric. Evidence, decisions, graph, Replay and Trust Memory remain in their
-- existing stores.
create extension if not exists pgcrypto;

create table if not exists public.protected_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.trust_workspaces(id) on delete restrict,
  workflow_type text not null check(workflow_type in ('candidate_interview','candidate_assessment','employee_onboarding','privileged_access','agent_action','financial_approval','other')),
  subject_entity_id text not null,
  policy_reference text not null,
  consent_reference uuid references public.consent_receipts(receipt_id) on delete restrict,
  status text not null default 'created' check(status in ('created','active','challenge_required','paused','blocked','completed','terminated')),
  started_at timestamptz,
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  created_by uuid not null,
  latest_canonical_transaction_id uuid,
  latest_intervention text check(latest_intervention is null or latest_intervention in ('MONITOR','WARNING','CHALLENGE','STEP_UP_VERIFY','PAUSE','BLOCK','TERMINATE','RESUME')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  foreign key(workspace_id,subject_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  foreign key(workspace_id,latest_canonical_transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  check(ended_at is null or started_at is null or ended_at>=started_at)
);

create index if not exists protected_workflows_workspace_activity_idx
  on public.protected_workflows(workspace_id,last_activity_at desc,id);
create index if not exists protected_workflows_subject_idx
  on public.protected_workflows(workspace_id,subject_entity_id,created_at desc);
create index if not exists protected_workflows_consent_idx
  on public.protected_workflows(consent_reference) where consent_reference is not null;
create index if not exists protected_workflows_latest_transaction_idx
  on public.protected_workflows(workspace_id,latest_canonical_transaction_id) where latest_canonical_transaction_id is not null;

create table if not exists public.workflow_interventions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.trust_workspaces(id) on delete restrict,
  workflow_id uuid not null,
  canonical_transaction_id uuid not null,
  intervention_type text not null check(intervention_type in ('MONITOR','WARNING','CHALLENGE','STEP_UP_VERIFY','PAUSE','BLOCK','TERMINATE','RESUME')),
  reason_codes text[] not null default '{}',
  performed_by uuid not null,
  status text not null check(status in ('REQUESTED','APPLIED','RESOLVED','FAILED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  outcome jsonb not null default '{}'::jsonb check(jsonb_typeof(outcome)='object'),
  evidence_graph_reference uuid,
  replay_reference uuid references public.trust_replay_sessions(id) on delete restrict,
  receipt_reference text not null,
  idempotency_key text not null,
  correlation_id uuid not null,
  unique(workspace_id,id),
  unique(workspace_id,workflow_id,idempotency_key),
  foreign key(workspace_id,workflow_id) references public.protected_workflows(workspace_id,id) on delete restrict,
  foreign key(workspace_id,canonical_transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  foreign key(workspace_id,evidence_graph_reference) references public.evidence_graph_nodes(enterprise_id,node_id) on delete restrict,
  check((status='RESOLVED' and resolved_at is not null) or status<>'RESOLVED')
);

create index if not exists workflow_interventions_timeline_idx
  on public.workflow_interventions(workspace_id,workflow_id,created_at,id);
create index if not exists workflow_interventions_transaction_idx
  on public.workflow_interventions(workspace_id,canonical_transaction_id);
create index if not exists workflow_interventions_graph_idx
  on public.workflow_interventions(workspace_id,evidence_graph_reference) where evidence_graph_reference is not null;
create index if not exists workflow_interventions_replay_idx
  on public.workflow_interventions(replay_reference) where replay_reference is not null;
create index if not exists track_block_evidence_workflow_facts_idx
  on public.evidence_objects using gin(normalized_facts)
  where source_type='PROTECTED_WORKFLOW_SIGNAL';

alter table public.protected_workflows enable row level security;
alter table public.workflow_interventions enable row level security;
revoke all on public.protected_workflows,public.workflow_interventions from anon,authenticated;
grant select on public.protected_workflows,public.workflow_interventions to authenticated;
grant all privileges on public.protected_workflows,public.workflow_interventions to service_role;

select public.ensure_policy_definition_v2(
  'public', 'protected_workflows', 'tenant reads protected workflows',
  'SELECT', array['authenticated']::name[],
  'user_can_access_trust_workspace(workspace_id)', null,
  'strict', '20260817173631-track-block-protected-workflow', null, true
);
select public.ensure_policy_definition_v2(
  'public', 'workflow_interventions', 'tenant reads workflow interventions',
  'SELECT', array['authenticated']::name[],
  'user_can_access_trust_workspace(workspace_id)', null,
  'strict', '20260817173631-track-block-protected-workflow', null, true
);

create or replace function public.protect_track_block_evidence_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if old.source_type='PROTECTED_WORKFLOW_SIGNAL' then
    raise exception 'Protected workflow evidence is immutable';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists protect_track_block_evidence_v1 on public.evidence_objects;
create trigger protect_track_block_evidence_v1 before update or delete on public.evidence_objects
  for each row execute function public.protect_track_block_evidence_v1();

create or replace function public.protect_canonical_decision_fields_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.transaction_id is distinct from old.transaction_id
    or new.enterprise_id is distinct from old.enterprise_id
    or new.actor_id is distinct from old.actor_id
    or new.subject_type is distinct from old.subject_type
    or new.subject_id is distinct from old.subject_id
    or new.workflow_id is distinct from old.workflow_id
    or new.action_type is distinct from old.action_type
    or new.action_purpose is distinct from old.action_purpose
    or new.action_resource is distinct from old.action_resource
    or new.action_environment is distinct from old.action_environment
    or new.request_digest is distinct from old.request_digest
    or new.decision is distinct from old.decision
    or new.trust_state is distinct from old.trust_state
    or new.decision_id is distinct from old.decision_id
    or new.authority_reference is distinct from old.authority_reference
    or new.policy_id is distinct from old.policy_id
    or new.policy_version is distinct from old.policy_version
    or new.policy_hash is distinct from old.policy_hash
    or new.evidence_references is distinct from old.evidence_references
    or new.evidence_digest is distinct from old.evidence_digest
    or new.reason_codes is distinct from old.reason_codes
  then raise exception 'Canonical trust decision fields are immutable'; end if;
  return new;
end $$;
drop trigger if exists protect_canonical_decision_fields_v1 on public.canonical_trust_transactions;
create trigger protect_canonical_decision_fields_v1 before update on public.canonical_trust_transactions
  for each row execute function public.protect_canonical_decision_fields_v1();

comment on table public.protected_workflows is 'Track + Block workflow state; not a Trust Object and not a decision engine.';
comment on table public.workflow_interventions is 'Downstream responses to immutable canonical ALLOW/REVIEW/DENY transactions.';
