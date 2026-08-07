-- RC2 Enterprise Operational Readiness.
-- Forward-only and additive. This migration is not applied to Production by this change.

alter table public.workspace_members drop constraint if exists workspace_members_role_check;
alter table public.workspace_members add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'operator', 'reviewer', 'auditor', 'observer', 'integration_admin'));

create or replace function public.user_has_trust_workspace_role(
  workspace_reference uuid,
  allowed_roles text[]
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select workspace_reference is not null and (
    exists (
      select 1 from public.trust_workspaces workspace
      where workspace.id = workspace_reference
        and workspace.created_by = auth.uid()
        and 'owner' = any(allowed_roles)
    )
    or exists (
      select 1 from public.workspace_members member
      where member.workspace_id = workspace_reference
        and member.user_id = auth.uid()
        and member.role = any(allowed_roles)
    )
  );
$$;
revoke all on function public.user_has_trust_workspace_role(uuid, text[]) from public;
grant execute on function public.user_has_trust_workspace_role(uuid, text[]) to authenticated, service_role;

-- Replace the original permissive workspace policies through the canonical
-- drift-detecting reconciliation helper. The legacy names are retained as
-- deny-only markers so no permissive definition can survive this migration.
select public.ensure_policy_definition_v2('public', 'trust_workspaces', 'authenticated manage trust_workspaces', 'SELECT', array['authenticated']::name[], 'false', null, 'intentional_replace', '202608060001-rc2-enterprise-operational-readiness', 'Replace the original cross-tenant workspace policy.', true);
select public.ensure_policy_definition_v2('public', 'workspace_members', 'authenticated manage workspace_members', 'SELECT', array['authenticated']::name[], 'false', null, 'intentional_replace', '202608060001-rc2-enterprise-operational-readiness', 'Replace the original cross-tenant membership policy.', true);
select public.ensure_policy_definition_v2('public', 'trust_cases', 'authenticated manage trust_cases', 'SELECT', array['authenticated']::name[], 'false', null, 'intentional_replace', '202608060001-rc2-enterprise-operational-readiness', 'Replace the original cross-tenant case policy.', true);
select public.ensure_policy_definition_v2('public', 'trust_case_relationships', 'authenticated manage trust_case_relationships', 'SELECT', array['authenticated']::name[], 'false', null, 'intentional_replace', '202608060001-rc2-enterprise-operational-readiness', 'Replace the original cross-tenant case relationship policy.', true);

select public.ensure_policy_definition_v2('public', 'trust_workspaces', 'tenant members read trust workspaces', 'SELECT', array['authenticated']::name[], 'public.user_can_access_trust_workspace(id)', null, 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'trust_workspaces', 'users create owned trust workspaces', 'INSERT', array['authenticated']::name[], null, 'created_by = auth.uid()', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'trust_workspaces', 'workspace owners administer trust workspaces', 'UPDATE', array['authenticated']::name[], 'public.user_has_trust_workspace_role(id, array[''owner'', ''admin''])', 'public.user_has_trust_workspace_role(id, array[''owner'', ''admin''])', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);

select public.ensure_policy_definition_v2('public', 'workspace_members', 'tenant members read workspace membership', 'SELECT', array['authenticated']::name[], 'public.user_can_access_trust_workspace(workspace_id)', null, 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'workspace_members', 'workspace owners create membership', 'INSERT', array['authenticated']::name[], null, 'public.user_has_trust_workspace_role(workspace_id, array[''owner'', ''admin''])', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'workspace_members', 'workspace owners update membership', 'UPDATE', array['authenticated']::name[], 'public.user_has_trust_workspace_role(workspace_id, array[''owner'', ''admin''])', 'public.user_has_trust_workspace_role(workspace_id, array[''owner'', ''admin''])', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);

select public.ensure_policy_definition_v2('public', 'trust_cases', 'tenant members read trust cases', 'SELECT', array['authenticated']::name[], 'public.user_can_access_trust_workspace(workspace_id)', null, 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'trust_cases', 'tenant operators create trust cases', 'INSERT', array['authenticated']::name[], null, 'public.user_has_trust_workspace_role(workspace_id, array[''owner'', ''admin'', ''operator'', ''reviewer''])', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'trust_cases', 'tenant operators update trust cases', 'UPDATE', array['authenticated']::name[], 'public.user_has_trust_workspace_role(workspace_id, array[''owner'', ''admin'', ''operator'', ''reviewer''])', 'public.user_has_trust_workspace_role(workspace_id, array[''owner'', ''admin'', ''operator'', ''reviewer''])', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);

select public.ensure_policy_definition_v2('public', 'trust_case_relationships', 'tenant members read trust case relationships', 'SELECT', array['authenticated']::name[], 'exists (select 1 from public.trust_cases trust_case where trust_case.id = trust_case_relationships.case_id and public.user_can_access_trust_workspace(trust_case.workspace_id))', null, 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);
select public.ensure_policy_definition_v2('public', 'trust_case_relationships', 'tenant operators create trust case relationships', 'INSERT', array['authenticated']::name[], null, 'exists (select 1 from public.trust_cases trust_case where trust_case.id = trust_case_relationships.case_id and public.user_has_trust_workspace_role(trust_case.workspace_id, array[''owner'', ''admin'', ''operator'', ''reviewer'']))', 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);

create table public.enterprise_policy_governance_events (
  event_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  policy_version_id uuid not null references public.trust_policy_versions(policy_version_id) on delete restrict,
  previous_state text not null,
  next_state text not null,
  actor_id uuid not null,
  reviewer_id uuid,
  reason text not null check (length(trim(reason)) > 0),
  approval_evidence text[] not null check (cardinality(approval_evidence) > 0),
  authority_reference text not null check (length(trim(authority_reference)) > 0),
  replay_reference text not null check (length(trim(replay_reference)) > 0),
  rollback_policy_version_id uuid references public.trust_policy_versions(policy_version_id) on delete restrict,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique (enterprise_id, correlation_id),
  check (previous_state in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'REJECTED', 'ROLLED_BACK')),
  check (next_state in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'REJECTED', 'ROLLED_BACK')),
  check (next_state not in ('APPROVED', 'ACTIVE', 'REJECTED', 'ROLLED_BACK') or reviewer_id is not null),
  check (next_state <> 'ROLLED_BACK' or rollback_policy_version_id is not null)
);

create index enterprise_policy_governance_events_policy_idx
  on public.enterprise_policy_governance_events (enterprise_id, policy_version_id, created_at desc);

alter table public.enterprise_policy_governance_events enable row level security;
revoke all on public.enterprise_policy_governance_events from anon, authenticated;
grant select on public.enterprise_policy_governance_events to authenticated;
grant all privileges on public.enterprise_policy_governance_events to service_role;
select public.ensure_policy_definition_v2('public', 'enterprise_policy_governance_events', 'tenant members read policy governance evidence', 'SELECT', array['authenticated']::name[], 'public.user_can_access_trust_workspace(enterprise_id)', null, 'strict', '202608060001-rc2-enterprise-operational-readiness', null, true);

create or replace function public.prevent_enterprise_policy_governance_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Enterprise policy governance evidence is append-only';
end;
$$;
create trigger enterprise_policy_governance_append_only
  before update or delete on public.enterprise_policy_governance_events
  for each row execute function public.prevent_enterprise_policy_governance_mutation();

create or replace function public.record_enterprise_policy_governance_event_v1(
  p_enterprise_id uuid,
  p_policy_version_id uuid,
  p_previous_state text,
  p_next_state text,
  p_actor_id uuid,
  p_reviewer_id uuid,
  p_reason text,
  p_approval_evidence text[],
  p_authority_reference text,
  p_replay_reference text,
  p_rollback_policy_version_id uuid,
  p_correlation_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_event_id uuid;
  latest_state text;
  target_policy public.trust_policy_versions%rowtype;
  rollback_policy public.trust_policy_versions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Trusted policy governance path required'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Policy change reason is required'; end if;
  if cardinality(coalesce(p_approval_evidence, '{}')) = 0 then raise exception 'Approval evidence is required'; end if;
  if nullif(trim(p_authority_reference), '') is null then raise exception 'Authority reference is required'; end if;
  if nullif(trim(p_replay_reference), '') is null then raise exception 'Replay reference is required'; end if;
  if p_next_state in ('APPROVED', 'ACTIVE', 'REJECTED', 'ROLLED_BACK') and p_reviewer_id is null then
    raise exception 'Reviewer attribution is required';
  end if;
  if not (
    (p_previous_state = 'DRAFT' and p_next_state = 'PENDING_APPROVAL') or
    (p_previous_state = 'PENDING_APPROVAL' and p_next_state in ('APPROVED', 'REJECTED')) or
    (p_previous_state = 'APPROVED' and p_next_state = 'ACTIVE') or
    (p_previous_state = 'ACTIVE' and p_next_state in ('SUPERSEDED', 'ROLLED_BACK')) or
    (p_previous_state = 'REJECTED' and p_next_state = 'DRAFT')
  ) then raise exception 'Unsupported policy governance transition'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_enterprise_id::text || ':' || p_policy_version_id::text, 71));
  select * into target_policy from public.trust_policy_versions
    where policy_version_id = p_policy_version_id and enterprise_id = p_enterprise_id;
  if target_policy.policy_version_id is null then raise exception 'Tenant policy version not found'; end if;

  select next_state into latest_state from public.enterprise_policy_governance_events
    where enterprise_id = p_enterprise_id and policy_version_id = p_policy_version_id
    order by created_at desc, event_id desc limit 1;
  if latest_state is null and p_previous_state <> 'DRAFT' then raise exception 'First policy governance state must be DRAFT'; end if;
  if latest_state is not null and latest_state <> p_previous_state then raise exception 'Policy governance compare-and-set conflict'; end if;

  if p_next_state = 'ROLLED_BACK' then
    if p_rollback_policy_version_id is null then raise exception 'Rollback policy version is required'; end if;
    select * into rollback_policy from public.trust_policy_versions
      where policy_version_id = p_rollback_policy_version_id
        and enterprise_id = p_enterprise_id
        and policy_id = target_policy.policy_id;
    if rollback_policy.policy_version_id is null then raise exception 'Rollback target must be a prior tenant policy version'; end if;
  end if;

  insert into public.enterprise_policy_governance_events (
    enterprise_id, policy_version_id, previous_state, next_state, actor_id,
    reviewer_id, reason, approval_evidence, authority_reference,
    replay_reference, rollback_policy_version_id, correlation_id
  ) values (
    p_enterprise_id, p_policy_version_id, p_previous_state, p_next_state, p_actor_id,
    p_reviewer_id, trim(p_reason), p_approval_evidence, trim(p_authority_reference),
    trim(p_replay_reference), p_rollback_policy_version_id, p_correlation_id
  ) returning event_id into created_event_id;

  insert into public.trust_architecture_audit_log (
    enterprise_id, action, actor_reference, target_type, target_id, correlation_id, metadata
  ) values (
    p_enterprise_id,
    'TRUST_POLICY_GOVERNANCE_' || p_next_state,
    'administrator:' || p_actor_id::text,
    'TRUST_POLICY_VERSION',
    p_policy_version_id::text,
    p_correlation_id,
    jsonb_build_object(
      'who', p_actor_id,
      'when', now(),
      'why', trim(p_reason),
      'evidence', p_approval_evidence,
      'authority', trim(p_authority_reference),
      'replay', trim(p_replay_reference),
      'reviewerId', p_reviewer_id,
      'previousState', p_previous_state,
      'nextState', p_next_state,
      'rollbackPolicyVersionId', p_rollback_policy_version_id
    )
  );
  return created_event_id;
end;
$$;
revoke all on function public.record_enterprise_policy_governance_event_v1(uuid, uuid, text, text, uuid, uuid, text, text[], text, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_enterprise_policy_governance_event_v1(uuid, uuid, text, text, uuid, uuid, text, text[], text, text, uuid, uuid) to service_role;

comment on table public.enterprise_policy_governance_events is
  'RC2 append-only policy approval, reviewer, evidence, authority, replay and rollback history.';
