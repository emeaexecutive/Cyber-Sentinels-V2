-- Release 1.0 RC1 provider evidence gate.
-- Extends canonical evidence stores; no parallel trust engine or public dashboard is introduced.

alter table public.governance_policies add column if not exists allowed_actions jsonb not null default '[]'::jsonb;
alter table public.governance_policies add column if not exists allowed_purposes jsonb not null default '[]'::jsonb;
alter table public.governance_policies add column if not exists minimum_evidence integer not null default 1 check (minimum_evidence between 1 and 20);
alter table public.governance_policies add column if not exists authority_expires_at timestamptz;
alter table public.governance_policies add column if not exists authority_revoked boolean not null default false;

alter table public.hopae_verifications add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.hopae_verifications add column if not exists workflow_id uuid references public.trust_cases(id) on delete cascade;
alter table public.hopae_verifications add column if not exists entity_id uuid;
alter table public.hopae_verifications add column if not exists entity_type text default 'human';
alter table public.hopae_verifications add column if not exists correlation_id uuid;
alter table public.hopae_verifications add column if not exists nonce_hash text;
alter table public.hopae_verifications add column if not exists requested_action text;
alter table public.hopae_verifications add column if not exists requested_purpose text;
alter table public.hopae_verifications add column if not exists authority_expires_at timestamptz;
alter table public.hopae_verifications add column if not exists authority_revoked boolean not null default false;
alter table public.hopae_verifications add column if not exists delegation_valid boolean not null default false;
alter table public.hopae_verifications add column if not exists policy_id uuid references public.governance_policies(id) on delete set null;
alter table public.hopae_verifications add column if not exists policy_version text;
alter table public.hopae_verifications add column if not exists allowed_actions jsonb not null default '[]'::jsonb;
alter table public.hopae_verifications add column if not exists allowed_purposes jsonb not null default '[]'::jsonb;
alter table public.hopae_verifications add column if not exists minimum_evidence integer not null default 1;
alter table public.hopae_verifications add column if not exists runtime_state text;
alter table public.hopae_verifications add column if not exists source_mode text;
alter table public.hopae_verifications add column if not exists retention_status text not null default 'normalized_only';
alter table public.hopae_verifications add column if not exists normalized_evidence jsonb;
alter table public.hopae_verifications add column if not exists evidence_quality jsonb;
alter table public.hopae_verifications add column if not exists replay_reference uuid;
alter table public.hopae_verifications add column if not exists evidence_graph_reference uuid;
alter table public.hopae_verifications add column if not exists trust_memory_reference uuid;
alter table public.hopae_verifications add column if not exists enforcement_receipt_reference uuid;

alter table public.hopae_webhook_events alter column raw_event drop not null;
alter table public.hopae_webhook_events add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.hopae_webhook_events add column if not exists workflow_id uuid references public.trust_cases(id) on delete cascade;
alter table public.hopae_webhook_events add column if not exists correlation_id uuid;
alter table public.hopae_webhook_events add column if not exists event_digest text;
alter table public.hopae_webhook_events add column if not exists normalized_evidence jsonb;
alter table public.hopae_webhook_events add column if not exists evidence_quality jsonb;
alter table public.hopae_webhook_events add column if not exists processing_outcome text;

create unique index if not exists hopae_verifications_correlation_idx on public.hopae_verifications (correlation_id) where correlation_id is not null;
create index if not exists hopae_verifications_workspace_workflow_idx on public.hopae_verifications (workspace_id, workflow_id, created_at desc);
create index if not exists hopae_webhook_workspace_workflow_idx on public.hopae_webhook_events (workspace_id, workflow_id, received_at desc);

-- Tenant scope the canonical proof stores used by RC1. Legacy rows without
-- ownership are no longer readable by ordinary authenticated sessions.
alter table public.trust_timeline_events add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.trust_timeline_events add column if not exists owner_user_id uuid;
alter table public.trust_timeline_events add column if not exists correlation_id uuid;
alter table public.trust_replay_sessions add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.trust_replay_sessions add column if not exists owner_user_id uuid;
alter table public.trust_replay_sessions add column if not exists correlation_id uuid;
alter table public.evidence_chains add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.evidence_chains add column if not exists owner_user_id uuid;
alter table public.evidence_chains add column if not exists correlation_id uuid;
alter table public.verification_receipts add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.verification_receipts add column if not exists owner_user_id uuid;
alter table public.verification_receipts add column if not exists correlation_id uuid;
alter table public.trust_relationships add column if not exists workspace_id uuid references public.trust_workspaces(id) on delete cascade;
alter table public.trust_relationships add column if not exists owner_user_id uuid;
alter table public.trust_relationships add column if not exists correlation_id uuid;

create index if not exists trust_timeline_workspace_idx on public.trust_timeline_events (workspace_id, created_at desc);
create index if not exists trust_replay_workspace_idx on public.trust_replay_sessions (workspace_id, created_at desc);
create index if not exists evidence_chains_workspace_idx on public.evidence_chains (workspace_id, created_at desc);
create index if not exists verification_receipts_workspace_idx on public.verification_receipts (workspace_id, issued_at desc);
create index if not exists trust_relationships_workspace_idx on public.trust_relationships (workspace_id, created_at desc);

create or replace function public.user_can_access_trust_workspace(workspace_reference uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select workspace_reference is not null and exists (
    select 1 from public.trust_workspaces workspace
    where workspace.id = workspace_reference
      and (
        workspace.created_by = auth.uid()
        or exists (
          select 1 from public.workspace_members member
          where member.workspace_id = workspace.id and member.user_id = auth.uid()
        )
      )
  );
$$;
revoke all on function public.user_can_access_trust_workspace(uuid) from public;
grant execute on function public.user_can_access_trust_workspace(uuid) to authenticated, service_role;

drop policy if exists "authenticated read trust_timeline_events" on public.trust_timeline_events;
drop policy if exists "authenticated insert trust_timeline_events" on public.trust_timeline_events;
create policy "tenant scoped read trust_timeline_events" on public.trust_timeline_events for select to authenticated
  using (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped insert trust_timeline_events" on public.trust_timeline_events for insert to authenticated
  with check (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));

drop policy if exists "authenticated read trust_replay_sessions" on public.trust_replay_sessions;
drop policy if exists "authenticated insert trust_replay_sessions" on public.trust_replay_sessions;
create policy "tenant scoped read trust_replay_sessions" on public.trust_replay_sessions for select to authenticated
  using (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped insert trust_replay_sessions" on public.trust_replay_sessions for insert to authenticated
  with check (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));

drop policy if exists "authenticated read evidence_chains" on public.evidence_chains;
drop policy if exists "authenticated insert evidence_chains" on public.evidence_chains;
create policy "tenant scoped read evidence_chains" on public.evidence_chains for select to authenticated
  using (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped insert evidence_chains" on public.evidence_chains for insert to authenticated
  with check (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));

drop policy if exists "authenticated read verification_receipts" on public.verification_receipts;
drop policy if exists "authenticated insert verification_receipts" on public.verification_receipts;
create policy "tenant scoped read verification_receipts" on public.verification_receipts for select to authenticated
  using (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped insert verification_receipts" on public.verification_receipts for insert to authenticated
  with check (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));

drop policy if exists "authenticated read trust_relationships" on public.trust_relationships;
drop policy if exists "authenticated insert trust_relationships" on public.trust_relationships;
create policy "tenant scoped read trust_relationships" on public.trust_relationships for select to authenticated
  using (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id));
create policy "tenant scoped insert trust_relationships" on public.trust_relationships for insert to authenticated
  with check (
    (owner_user_id = auth.uid() or public.user_can_access_trust_workspace(workspace_id))
    and relationship_type in ('submitted_evidence','reviewed_by','linked_to','generated_signal','owned_by','verified_by','escalated_to','connected_activity','supports')
  );

create or replace function public.prevent_trust_memory_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.event_type = 'trust_memory_event' then
    raise exception 'Trust Memory events are append-only';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
drop trigger if exists trust_memory_append_only on public.trust_timeline_events;
create trigger trust_memory_append_only before update or delete on public.trust_timeline_events
  for each row execute function public.prevent_trust_memory_mutation();

create or replace function public.persist_rc1_trust_assessment(
  verification_row_id uuid,
  provider_event_id text,
  provider_event_type text,
  provider_verification_id text,
  provider_signature_timestamp bigint,
  provider_event_digest text,
  normalized_evidence_input jsonb,
  evidence_quality_input jsonb,
  assessment_input jsonb,
  evidence_pack_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  verification_row public.hopae_verifications%rowtype;
  webhook_row_id uuid;
  replay_id uuid;
  evidence_id uuid;
  memory_id uuid;
  receipt_id uuid;
  stored_pack jsonb;
begin
  select * into verification_row from public.hopae_verifications where id = verification_row_id for update;
  if verification_row.id is null then raise exception 'Unknown verification session'; end if;
  if verification_row.verification_id <> provider_verification_id then
    raise exception 'Provider verification reference mismatch';
  end if;

  insert into public.hopae_webhook_events (
    event_id, event_type, verification_id, signature_timestamp, event_digest,
    workspace_id, workflow_id, correlation_id, normalized_evidence,
    evidence_quality, processing_outcome, raw_event, processed_at
  ) values (
    provider_event_id, provider_event_type, provider_verification_id,
    provider_signature_timestamp, provider_event_digest, verification_row.workspace_id,
    verification_row.workflow_id, verification_row.correlation_id,
    normalized_evidence_input, evidence_quality_input,
    assessment_input ->> 'trust_decision', null, now()
  ) on conflict (event_id) do nothing returning id into webhook_row_id;

  if webhook_row_id is null then
    return jsonb_build_object(
      'duplicate', true,
      'replay_reference', verification_row.replay_reference,
      'evidence_graph_reference', verification_row.evidence_graph_reference,
      'trust_memory_reference', verification_row.trust_memory_reference,
      'receipt_reference', verification_row.enforcement_receipt_reference
    );
  end if;

  insert into public.trust_replay_sessions (
    subject_type, subject_id, workspace_id, owner_user_id, correlation_id,
    replay_summary, generated_by
  ) values (
    'workflow', verification_row.workflow_id, verification_row.workspace_id,
    verification_row.owner_user_id, verification_row.correlation_id,
    concat(assessment_input ->> 'trust_decision', ': ', assessment_input #>> '{authority_result,reason}'),
    'rc1_trust_assessment'
  ) returning id into replay_id;

  insert into public.evidence_chains (
    subject_type, subject_id, workspace_id, owner_user_id, correlation_id,
    chain_summary, evidence
  ) values (
    'workflow', verification_row.workflow_id, verification_row.workspace_id,
    verification_row.owner_user_id, verification_row.correlation_id,
    'RC1 normalized provider evidence -> quality -> authority -> decision -> enforcement -> Replay -> Trust Memory',
    jsonb_build_array(jsonb_build_object(
      'normalizedProviderEvidence', normalized_evidence_input,
      'evidenceQuality', evidence_quality_input,
      'replayReference', replay_id,
      'evidenceGraphReference', assessment_input ->> 'evidence_graph_reference'
    ))
  ) returning id into evidence_id;

  insert into public.trust_timeline_events (
    subject_type, subject_id, workspace_id, owner_user_id, correlation_id,
    event_type, event_title, event_summary, actor_type, actor_id, severity, metadata
  ) values (
    'workflow', verification_row.workflow_id, verification_row.workspace_id,
    verification_row.owner_user_id, verification_row.correlation_id,
    'trust_memory_event', 'Trust assessment recorded',
    assessment_input #>> '{trust_memory_event,reason}', 'trust_orchestrator',
    verification_row.owner_user_id,
    case when assessment_input ->> 'trust_decision' = 'allow' then 'info' else 'review' end,
    coalesce(assessment_input -> 'trust_memory_event', '{}'::jsonb) || jsonb_build_object(
      'correlation_id', verification_row.correlation_id,
      'replay_reference', replay_id,
      'evidence_chain_reference', evidence_id
    )
  ) returning id into memory_id;

  stored_pack := jsonb_set(evidence_pack_input, '{replay,reference}', to_jsonb(replay_id::text), true);
  stored_pack := jsonb_set(stored_pack, '{evidenceGraph,reference}', to_jsonb(evidence_id::text), true);
  stored_pack := jsonb_set(stored_pack, '{trustMemory,references}', jsonb_build_array(memory_id::text), true);

  insert into public.verification_receipts (
    subject_type, subject_id, workspace_id, owner_user_id, correlation_id,
    receipt_type, verification_status, confidence_level, issued_by,
    receipt_summary, evidence_snapshot
  ) values (
    'workflow', verification_row.workflow_id, verification_row.workspace_id,
    verification_row.owner_user_id, verification_row.correlation_id,
    'trust_assessment', assessment_input ->> 'trust_decision',
    assessment_input ->> 'confidence_band', verification_row.owner_user_id,
    concat('Trust Decision ', assessment_input ->> 'trust_decision', '; enforcement ', assessment_input ->> 'enforcement_action', '.'),
    stored_pack
  ) returning id into receipt_id;

  stored_pack := jsonb_set(stored_pack, '{enforcement,receiptReference}', to_jsonb(receipt_id::text), true);
  update public.verification_receipts set evidence_snapshot = stored_pack where id = receipt_id;

  insert into public.trust_relationships (
    source_type, source_id, relationship_type, target_type, target_id,
    confidence_level, explanation, workspace_id, owner_user_id, correlation_id
  ) values (
    'evidence_chain', evidence_id, 'supports', 'verification_receipt', receipt_id,
    assessment_input ->> 'confidence_band',
    'Tenant-scoped RC1 Evidence Graph edge connects normalized evidence to the enforcement receipt.',
    verification_row.workspace_id, verification_row.owner_user_id, verification_row.correlation_id
  );

  update public.hopae_verifications set
    status = normalized_evidence_input ->> 'evidenceStatus',
    normalized_user_data = null,
    provenance = null,
    upstream_identity_proof = null,
    normalized_evidence = normalized_evidence_input,
    evidence_quality = evidence_quality_input,
    replay_reference = replay_id,
    evidence_graph_reference = evidence_id,
    trust_memory_reference = memory_id,
    enforcement_receipt_reference = receipt_id,
    completed_at = now(),
    updated_at = now()
  where id = verification_row.id;

  insert into public.audit_logs (event_type, actor, metadata, created_at) values (
    'rc1_trust_assessment_completed', 'trust_orchestrator',
    jsonb_build_object(
      'correlation_id', verification_row.correlation_id,
      'workspace_id', verification_row.workspace_id,
      'workflow_id', verification_row.workflow_id,
      'provider', 'hopae_connect',
      'source_mode', verification_row.source_mode,
      'evidence_quality', evidence_quality_input ->> 'status',
      'decision', assessment_input ->> 'trust_decision',
      'enforcement', assessment_input ->> 'enforcement_action',
      'replay_reference', replay_id
    ), now()
  );

  return jsonb_build_object(
    'duplicate', false,
    'replay_reference', replay_id,
    'evidence_graph_reference', evidence_id,
    'trust_memory_reference', memory_id,
    'receipt_reference', receipt_id
  );
end;
$$;

revoke all on function public.persist_rc1_trust_assessment(uuid,text,text,text,bigint,text,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.persist_rc1_trust_assessment(uuid,text,text,text,bigint,text,jsonb,jsonb,jsonb,jsonb) to service_role;
