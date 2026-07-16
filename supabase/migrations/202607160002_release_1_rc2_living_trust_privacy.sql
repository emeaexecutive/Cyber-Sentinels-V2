-- Release 1.0 RC2 living trust, governance isolation and retention proof.
-- Extends canonical policy, Trust Timeline/Memory and audit stores only.

alter table public.governance_policies
  add column if not exists retention_policy jsonb not null default '{}'::jsonb,
  add column if not exists compliance_evidence_mappings jsonb not null default '[]'::jsonb;

comment on column public.governance_policies.retention_policy is
  'Tenant-approved retention, evidence expiry, legal hold, access/deletion request, redaction and provider-reference deletion configuration. Empty means not recorded.';
comment on column public.governance_policies.compliance_evidence_mappings is
  'Operational evidence mappings and gaps only. This field never represents certification.';

drop policy if exists "authenticated manage governance_policies" on public.governance_policies;
create policy "tenant scoped read governance_policies"
  on public.governance_policies for select to authenticated
  using (public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped insert governance_policies"
  on public.governance_policies for insert to authenticated
  with check (public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped update governance_policies"
  on public.governance_policies for update to authenticated
  using (public.user_can_access_trust_workspace(workspace_id))
  with check (public.user_can_access_trust_workspace(workspace_id));

drop policy if exists "authenticated manage governance_actions" on public.governance_actions;
create policy "tenant scoped read governance_actions"
  on public.governance_actions for select to authenticated
  using (exists (
    select 1 from public.governance_policies policy
    where policy.id = governance_actions.policy_id
      and public.user_can_access_trust_workspace(policy.workspace_id)
  ));
create policy "tenant scoped insert governance_actions"
  on public.governance_actions for insert to authenticated
  with check (exists (
    select 1 from public.governance_policies policy
    where policy.id = governance_actions.policy_id
      and public.user_can_access_trust_workspace(policy.workspace_id)
  ));
create policy "tenant scoped update governance_actions"
  on public.governance_actions for update to authenticated
  using (exists (
    select 1 from public.governance_policies policy
    where policy.id = governance_actions.policy_id
      and public.user_can_access_trust_workspace(policy.workspace_id)
  ))
  with check (exists (
    select 1 from public.governance_policies policy
    where policy.id = governance_actions.policy_id
      and public.user_can_access_trust_workspace(policy.workspace_id)
  ));

create or replace function public.record_trust_memory_tombstone(
  workspace_reference uuid,
  workflow_reference uuid,
  entity_reference uuid,
  actor_reference uuid,
  policy_reference uuid,
  source_event_reference text,
  tombstone_action text,
  tombstone_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  policy_row public.governance_policies%rowtype;
  tombstone_id uuid;
begin
  if tombstone_action not in ('redacted', 'deleted_after_retention', 'provider_reference_deleted') then
    raise exception 'Unsupported retention tombstone action';
  end if;
  if nullif(trim(source_event_reference), '') is null or nullif(trim(tombstone_reason), '') is null then
    raise exception 'Tombstone source and reason are required';
  end if;

  select * into policy_row
  from public.governance_policies
  where id = policy_reference and workspace_id = workspace_reference;
  if policy_row.id is null then raise exception 'Tenant retention policy is not available'; end if;
  if lower(coalesce(policy_row.retention_policy ->> 'legal_hold', 'false')) = 'true' then
    raise exception 'Trust Memory removal is blocked by legal hold';
  end if;

  insert into public.trust_timeline_events (
    workspace_id, owner_user_id, correlation_id, subject_type, subject_id,
    event_type, event_title, event_summary, actor_type, actor_id, severity, metadata
  ) values (
    workspace_reference, actor_reference, gen_random_uuid(), 'workflow', workflow_reference,
    'trust_memory_event', 'Governed retention tombstone', tombstone_reason,
    'human_reviewer', actor_reference, 'info', jsonb_build_object(
      'event_kind', 'retention_tombstone',
      'entity_reference', entity_reference,
      'source_event_reference', source_event_reference,
      'action', tombstone_action,
      'policy_reference', policy_reference,
      'audit_preserved', true,
      'tombstone_raw_value_retained', false,
      'source_mutation_performed', false,
      'recalculation_required', true
    )
  ) returning id into tombstone_id;

  insert into public.audit_logs (event_type, actor, metadata, created_at)
  values (
    'trust_memory_retention_tombstone', actor_reference::text,
    jsonb_build_object(
      'tombstone_id', tombstone_id,
      'workspace_id', workspace_reference,
      'workflow_id', workflow_reference,
      'entity_id', entity_reference,
      'source_event_reference', source_event_reference,
      'action', tombstone_action,
      'policy_reference', policy_reference
    ), now()
  );

  return tombstone_id;
end;
$$;

revoke all on function public.record_trust_memory_tombstone(uuid,uuid,uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_trust_memory_tombstone(uuid,uuid,uuid,uuid,uuid,text,text,text) to service_role;
