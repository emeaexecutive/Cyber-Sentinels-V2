-- Runtime extension: external identity evidence and managed-control
-- responsibility are composed into the existing Operational Entity and
-- canonical trust transaction. This is not a provider registry or decision
-- engine. Provider-native payloads, credentials and biometric data are not
-- retained here.
create extension if not exists pgcrypto;

create table if not exists public.operational_entities (
  entity_id text not null,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_type text not null,
  display_reference text not null,
  canonical_trust_object_id text not null,
  lifecycle_state text not null,
  accountable_owner_id text not null,
  organization_reference text not null,
  provider_references jsonb not null default '[]'::jsonb check(jsonb_typeof(provider_references)='array'),
  external_identity_references jsonb not null default '[]'::jsonb check(jsonb_typeof(external_identity_references)='array'),
  identity_profile_reference text not null,
  current_authority_references jsonb not null default '[]'::jsonb check(jsonb_typeof(current_authority_references)='array'),
  environment_references jsonb not null default '[]'::jsonb check(jsonb_typeof(environment_references)='array'),
  workflow_references jsonb not null default '[]'::jsonb check(jsonb_typeof(workflow_references)='array'),
  current_trust_state text not null,
  current_evidence_state text not null,
  current_consequence_classification text not null,
  suspended_at timestamptz,
  revoked_at timestamptz,
  supersedes_entity_version_id text,
  canonical_digest text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(enterprise_id,entity_id),
  unique(enterprise_id,canonical_trust_object_id)
);

create table public.operational_entity_external_identities (
  external_identity_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  operational_entity_id text not null,
  provider text not null,
  provider_entity_id text not null,
  builder_platform text not null,
  provider_native_lifecycle text not null check(provider_native_lifecycle in ('active','inactive','suspended','deactivated','deleted','unknown')),
  provider_owner text,
  provider_business_purpose text,
  certification_state text not null,
  permissions_summary text[] not null default '{}',
  observed_at timestamptz not null,
  source_timestamp timestamptz not null,
  evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
  corrected_by_reference_id uuid references public.operational_entity_external_identities(external_identity_id) on delete restrict,
  supersedes_reference_id uuid references public.operational_entity_external_identities(external_identity_id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  unique(enterprise_id,provider,provider_entity_id,evidence_digest)
);
create index operational_entity_external_identity_timeline_idx on public.operational_entity_external_identities(enterprise_id,operational_entity_id,observed_at,external_identity_id);

-- Reuses provider_registry for provider identity; this table records the
-- tenant-specific service/role relationship and is not another registry.
create table public.provider_relationships (
  relationship_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  provider_id text not null references public.provider_registry(provider_id) on delete restrict,
  provider_type text not null,
  organization_reference text not null,
  external_provider_reference text not null,
  service_relationship text not null,
  operational_entity_id text,
  role text not null check(role in ('identity_provider','agent_registry','authorization_provider','control_operator','managed_service_provider','technology_provider','runtime_provider','evidence_provider','destination_provider','independent_confirmation_source','auditor','reviewer')),
  effective_from timestamptz not null,
  effective_to timestamptz,
  status text not null check(status in ('planned','active','suspended','terminated','replaced','unknown')),
  source text not null,
  native_reference text not null,
  schema_version text not null,
  evidence_responsibilities text[] not null default '{}',
  control_responsibilities text[] not null default '{}',
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(effective_to is null or effective_to >= effective_from),
  unique(enterprise_id,provider_id,role,operational_entity_id,effective_from)
);
create index provider_relationships_entity_idx on public.provider_relationships(enterprise_id,operational_entity_id,status,effective_from desc);

create table public.provider_transitions (
  transition_id uuid primary key,
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  operational_entity_id text not null,
  previous_relationship_id uuid not null references public.provider_relationships(relationship_id) on delete restrict,
  new_relationship_id uuid not null references public.provider_relationships(relationship_id) on delete restrict,
  state text not null check(state in ('planned','in_progress','evidence_exporting','evidence_validating','new_provider_onboarding','continuity_review','completed','completed_with_gaps','failed','cancelled')),
  frozen_historical_evidence_references jsonb not null check(jsonb_typeof(frozen_historical_evidence_references)='array'),
  historical_evidence_digest text not null check(historical_evidence_digest ~ '^[a-f0-9]{64}$'),
  old_decision_snapshot_references jsonb not null check(jsonb_typeof(old_decision_snapshot_references)='array'),
  migration_gaps text[] not null default '{}',
  resolved_migration_gaps text[] not null default '{}',
  continuity_result text check(continuity_result is null or continuity_result in ('CONTINUITY_SUPPORTED','APPROVED_PROVIDER_CHANGE','PARTIAL_CONTINUITY','IDENTITY_CONFLICT','AUTHORITY_CONFLICT','EVIDENCE_GAP','MIGRATION_GAP','REVIEW_REQUIRED')),
  initiated_at timestamptz not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key(enterprise_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict,
  check(previous_relationship_id<>new_relationship_id)
);
create index provider_transitions_entity_idx on public.provider_transitions(enterprise_id,operational_entity_id,initiated_at desc);

create table public.provider_change_events (
  event_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete restrict,
  event_type text not null check(event_type in (
    'PROVIDER_SELECTED','PROVIDER_ONBOARDED','PROVIDER_REPLACED','PROVIDER_SUSPENDED','PROVIDER_TERMINATED',
    'SERVICE_SCOPE_CHANGED','EVIDENCE_EXPORT_STARTED','EVIDENCE_EXPORT_COMPLETED','HISTORICAL_EVIDENCE_VALIDATED',
    'MIGRATION_GAP_DETECTED','NEW_PROVIDER_ASSUMED_CONTROL','PROVIDER_REPLACEMENT_STARTED','MIGRATION_GAP_RESOLVED',
    'CONTINUITY_PRESERVED','CONTINUITY_REVIEW_REQUIRED','EXTERNAL_IDENTITY_CHANGED','PROVIDER_EVIDENCE_CONFLICT'
  )),
  provider_id text not null,
  previous_provider_id text,
  operator_id text not null,
  affected_operational_entity_ids text[] not null default '{}',
  affected_control_ids text[] not null default '{}',
  evidence_references text[] not null default '{}',
  occurred_at timestamptz not null,
  correlation_id uuid not null,
  event_digest text not null check(event_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(enterprise_id,event_digest)
);
create index provider_change_events_timeline_idx on public.provider_change_events(enterprise_id,provider_id,occurred_at,event_id);

alter table public.canonical_trust_transactions add column if not exists operational_entity_id text;
alter table public.canonical_trust_transactions add column if not exists accountable_owner_id text;
alter table public.canonical_trust_transactions add column if not exists entity_type text;
alter table public.canonical_trust_transactions add column if not exists entity_lifecycle_state text;
alter table public.canonical_trust_transactions add column if not exists responsibility_lineage jsonb not null default '{}'::jsonb check(jsonb_typeof(responsibility_lineage)='object');
alter table public.canonical_trust_transactions add column if not exists evidence_independence text not null default 'insufficient'
  check(evidence_independence in ('single_source','same_party_multi_system','provider_and_operator_same_party','multi_source','independently_confirmed','conflicting','insufficient'));
alter table public.canonical_trust_transactions add column if not exists decision_time_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(decision_time_snapshot)='object');

create table public.canonical_enforcement_events (
  enforcement_event_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null,
  transaction_id uuid not null,
  attribution text not null check(attribution in (
    'CUSTOMER_DECISION','OPERATOR_ACTION','PROVIDER_CLAIM','RUNTIME_OBSERVATION','DESTINATION_OBSERVATION','CYBER_SENTINELS_INTERPRETATION','HUMAN_REVIEWER_CONCLUSION'
  )),
  enforcement_stage text not null check(enforcement_stage in (
    'POLICY_DECISION','CONTROL_OWNER_APPROVAL','OPERATOR_REQUEST','TECHNOLOGY_PROVIDER_REQUEST','PROVIDER_ACKNOWLEDGEMENT',
    'PROVIDER_ENFORCEMENT_CLAIM','RUNTIME_OBSERVATION','DESTINATION_OBSERVATION','BUSINESS_OUTCOME'
  )),
  source_party_id text not null,
  source_classification text not null check(source_classification in (
    'operator_asserted','provider_asserted','technology_provider_asserted','identity_provider_asserted','runtime_observed','destination_observed',
    'independently_corroborated','human_reviewed','disputed','unconfirmed'
  )),
  claim_state text not null,
  provider_native_event_id text,
  evidence_digest text not null check(evidence_digest ~ '^[a-f0-9]{64}$'),
  schema_version text not null,
  supersedes_enforcement_event_id uuid references public.canonical_enforcement_events(enforcement_event_id) on delete restrict,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(enterprise_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  unique(enterprise_id,transaction_id,evidence_digest)
);
create index canonical_enforcement_events_timeline_idx on public.canonical_enforcement_events(enterprise_id,transaction_id,occurred_at,enforcement_event_id);

do $$ declare table_name text; begin foreach table_name in array array[
  'operational_entities','operational_entity_external_identities','provider_relationships','provider_transitions','provider_change_events','canonical_enforcement_events'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(enterprise_id))','tenant reads '||table_name,table_name);
end loop; end $$;

create trigger operational_entity_external_identities_append_only before update or delete on public.operational_entity_external_identities for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger provider_change_events_append_only before update or delete on public.provider_change_events for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger canonical_enforcement_events_append_only before update or delete on public.canonical_enforcement_events for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.preserve_provider_transition_history_v1()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.enterprise_id<>new.enterprise_id or old.operational_entity_id<>new.operational_entity_id
    or old.previous_relationship_id<>new.previous_relationship_id or old.new_relationship_id<>new.new_relationship_id
    or old.frozen_historical_evidence_references is distinct from new.frozen_historical_evidence_references
    or old.historical_evidence_digest<>new.historical_evidence_digest
    or old.old_decision_snapshot_references is distinct from new.old_decision_snapshot_references
  then raise exception 'Provider transition historical inventory is immutable'; end if;
  return new;
end $$;
create trigger provider_transition_history_immutable before update on public.provider_transitions for each row execute function public.preserve_provider_transition_history_v1();

create or replace function public.preserve_canonical_decision_snapshot_v1()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.decision_time_snapshot is distinct from new.decision_time_snapshot
    or old.responsibility_lineage is distinct from new.responsibility_lineage
    or old.evidence_independence is distinct from new.evidence_independence
  then raise exception 'Canonical decision-time snapshot is immutable'; end if;
  return new;
end $$;
create trigger canonical_decision_snapshot_immutable before update on public.canonical_trust_transactions for each row execute function public.preserve_canonical_decision_snapshot_v1();

-- Replace only the persistence function that composes the existing canonical
-- transaction. Later acknowledgement/outcome functions may update their own
-- columns but cannot alter the frozen context protected above.
create or replace function public.persist_canonical_trust_transaction_decision_v1(p_transaction jsonb,p_decision jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  enterprise uuid:=(p_transaction->>'enterpriseId')::uuid;
  transaction uuid:=(p_transaction->>'transactionId')::uuid;
  actor uuid:=(p_transaction->>'actorId')::uuid;
  correlation uuid:=(p_transaction->>'correlationId')::uuid;
  existing public.canonical_trust_transactions%rowtype;
  event_payload jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'Canonical trust transaction service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||(p_transaction->>'idempotencyKey'),89));
  select * into existing from public.canonical_trust_transactions where enterprise_id=enterprise and idempotency_key=p_transaction->>'idempotencyKey';
  if found then
    if existing.actor_id<>actor or existing.subject_type<>p_transaction->>'subjectType' or existing.subject_id<>p_transaction->>'subjectId'
      or existing.action_type<>p_transaction->>'actionType' or existing.action_purpose<>p_transaction->>'actionPurpose'
      or existing.action_resource<>p_transaction->>'actionResource' or existing.action_environment<>p_transaction->>'actionEnvironment'
      or existing.request_digest<>p_transaction->>'requestDigest'
    then raise exception 'Canonical transaction idempotency conflict'; end if;
    return jsonb_build_object('status','DUPLICATE','transactionId',existing.transaction_id,'decisionId',existing.decision_id);
  end if;
  if nullif(p_transaction->>'previousTransactionId','') is not null and not exists(
    select 1 from public.canonical_trust_transactions where enterprise_id=enterprise and transaction_id=(p_transaction->>'previousTransactionId')::uuid
  ) then raise exception 'Previous transaction tenant mismatch'; end if;
  insert into public.canonical_trust_transactions(
    transaction_id,enterprise_id,actor_id,actor_type,operational_entity_id,accountable_owner_id,entity_type,entity_lifecycle_state,
    subject_type,subject_id,workflow_id,action_type,action_purpose,action_resource,action_environment,request_digest,idempotency_key,
    correlation_id,requested_at,decision,trust_state,decision_id,authority_reference,authority_lineage_references,policy_id,policy_version,
    policy_hash,evidence_references,evidence_digest,evidence_complete,evidence_fresh,reason_codes,previous_transaction_id,changed_conditions,
    material_change,responsibility_lineage,evidence_independence,decision_time_snapshot
  ) values (
    transaction,enterprise,actor,p_transaction->>'actorType',p_transaction->>'operationalEntityId',p_transaction->>'accountableOwnerId',p_transaction->>'entityType',p_transaction->>'entityLifecycleState',
    p_transaction->>'subjectType',p_transaction->>'subjectId',p_transaction->>'workflowId',p_transaction->>'actionType',p_transaction->>'actionPurpose',
    p_transaction->>'actionResource',p_transaction->>'actionEnvironment',p_transaction->>'requestDigest',p_transaction->>'idempotencyKey',correlation,
    (p_transaction->>'requestedAt')::timestamptz,p_transaction->>'decision',p_transaction->>'trustState',(p_transaction->>'decisionId')::uuid,
    p_transaction->>'authorityReference',coalesce(p_transaction->'authorityLineageReferences','[]'::jsonb),p_transaction->>'policyId',
    p_transaction->>'policyVersion',p_transaction->>'policyHash',coalesce(p_transaction->'evidenceReferences','[]'::jsonb),p_transaction->>'evidenceDigest',
    (p_transaction->>'evidenceComplete')::boolean,(p_transaction->>'evidenceFresh')::boolean,array(select jsonb_array_elements_text(coalesce(p_transaction->'reasonCodes','[]'::jsonb))),
    nullif(p_transaction->>'previousTransactionId','')::uuid,array(select jsonb_array_elements_text(coalesce(p_transaction->'changedConditions','[]'::jsonb))),
    (p_transaction->>'materialChange')::boolean,coalesce(p_transaction->'responsibilityLineage','{}'::jsonb),p_transaction->>'evidenceIndependence',
    coalesce(p_transaction->'decisionTimeSnapshot','{}'::jsonb)
  );
  insert into public.trust_fabric_decisions(decision_id,enterprise_id,subject_type,subject_id,workflow_id,decision_type,outcome,trust_state,policy_id,policy_version,envelope,superseded_decision_id,correlation_id,deterministic_digest,created_at,actor_id)
  values((p_decision->>'decisionId')::uuid,enterprise,p_decision#>>'{subject,type}',p_decision#>>'{subject,id}',nullif(p_decision->>'workflowId',''),p_decision->>'decisionType',p_decision->>'outcome',p_decision->>'trustState',p_decision->>'policyId',p_decision->>'policyVersion',p_decision,nullif(p_decision->>'supersededDecisionId','')::uuid,correlation,p_decision->>'deterministicDigest',(p_decision->>'createdAt')::timestamptz,actor);
  event_payload:=jsonb_build_object('transactionId',transaction,'decisionId',p_transaction->>'decisionId','decision',p_transaction->>'decision','evidenceIndependence',p_transaction->>'evidenceIndependence');
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(enterprise,transaction,'DECISION_PERSISTED',actor,array_to_string(array(select jsonb_array_elements_text(coalesce(p_transaction->'reasonCodes','[]'::jsonb))),'; '),coalesce(p_transaction->'evidenceReferences','[]'::jsonb),p_transaction->>'authorityReference',p_transaction->>'policyId',p_transaction->>'policyVersion',correlation,encode(digest(event_payload::text,'sha256'),'hex'),(p_transaction->>'requestedAt')::timestamptz);
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(enterprise,'CANONICAL_TRUST_DECISION_PERSISTED','user:'||actor::text,'CANONICAL_TRUST_TRANSACTION',transaction::text,correlation,event_payload);
  return jsonb_build_object('status','CREATED','transactionId',transaction,'decisionId',p_transaction->>'decisionId');
end $$;
revoke all on function public.persist_canonical_trust_transaction_decision_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.persist_canonical_trust_transaction_decision_v1(jsonb,jsonb) to service_role;

comment on table public.operational_entity_external_identities is 'Append-only provider identity observations attached to an Operational Entity. Presence is evidence, not trust or authority.';
comment on table public.provider_change_events is 'Provider-governance history attached to affected Operational Entities and controls; it is not a provider registry.';
comment on table public.provider_relationships is 'Tenant-scoped provider roles and responsibilities referencing the existing provider_registry; not a provider registry.';
comment on table public.provider_transitions is 'Canonical provider-governance transition state with frozen historical evidence and decision snapshot references.';
comment on column public.canonical_trust_transactions.decision_time_snapshot is 'Immutable exact decision-time context. Later provider evidence appends elsewhere and never rewrites this snapshot.';
