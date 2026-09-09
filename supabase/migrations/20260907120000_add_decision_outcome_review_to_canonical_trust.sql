-- Forward-only additive migration for canonical decision-outcome review persistence.
-- This preserves historical migrations and introduces the minimal authoritative schema
-- support required for the canonical transaction persistence RPC.
create extension if not exists pgcrypto;

alter table public.canonical_trust_transactions
  add column if not exists decision_outcome_review jsonb
    check (decision_outcome_review is null or jsonb_typeof(decision_outcome_review) = 'object');

alter table public.canonical_trust_transactions
  drop constraint if exists canonical_trust_transactions_decision_outcome_review_check;

alter table public.canonical_trust_transactions
  add constraint canonical_trust_transactions_decision_outcome_review_check
  check (
    decision_outcome_review is null
    or (
      jsonb_typeof(decision_outcome_review) = 'object'
      and decision_outcome_review ? 'originalDecision'
      and decision_outcome_review->>'originalDecision' = decision
      and decision_outcome_review ? 'evaluationStatus'
      and decision_outcome_review->>'evaluationStatus' in (
        'SUPPORTED',
        'CONTRADICTED',
        'HUMAN_OVERRIDDEN',
        'PARTIALLY_SUPPORTED',
        'UNRESOLVED'
      )
      and (
        not decision_outcome_review ? 'adjudicatedOutcome'
        or decision_outcome_review->'adjudicatedOutcome' = 'null'::jsonb
        or decision_outcome_review->>'adjudicatedOutcome' in ('ALLOW','REVIEW','DENY')
      )
      and (
        not decision_outcome_review ? 'humanOverride'
        or decision_outcome_review->'humanOverride' = 'null'::jsonb
        or (
          jsonb_typeof(decision_outcome_review->'humanOverride') = 'object'
          and decision_outcome_review#>>'{humanOverride,occurred}' = 'true'
          and decision_outcome_review#>>'{humanOverride,originalDecision}' = decision
          and decision_outcome_review#>>'{humanOverride,resultingDecision}' in ('ALLOW','REVIEW','DENY')
        )
      )
    )
  ) not valid;

alter table public.canonical_trust_transaction_events
  drop constraint if exists canonical_trust_transaction_events_event_type_check;

alter table public.canonical_trust_transaction_events
  add constraint canonical_trust_transaction_events_event_type_check check(event_type in (
    'DECISION_PERSISTED','EVIDENCE_GRAPH_LINKED','REPLAY_WRITTEN','TRUST_MEMORY_WRITTEN',
    'EXTERNAL_EXECUTION_REQUESTED','EXTERNAL_ACKNOWLEDGED','EXTERNAL_OUTCOME_RECORDED',
    'NATIVE_ENFORCEMENT_REQUESTED','NATIVE_ENFORCEMENT_ACKNOWLEDGED','DESTINATION_OBSERVED',
    'NATIVE_OUTCOME_CORRELATED','CONTROL_FAILURE_DETECTED','REVIEW_REQUESTED','REVIEW_RESOLVED',
    'AUTHORITY_BOUND_PARAMETERS_SNAPSHOTTED','AUTHORITY_PARAMETER_BINDING_EVALUATED',
    'RUNTIME_AUTHORITY_OBSERVED','AUTHORIZATION_PROPAGATION_TIMELINE_RECORDED',
    'AIMS_COMPATIBLE_EVIDENCE_MAPPED','AUTHORIZATION_CHANGE_PROPAGATION_OBSERVED',
    'MODEL_CONTROLLED_SECURITY_BOUNDARY','CONSENT_BOUNDARY_MODEL_CONTROLLED',
    'TENANT_BOUNDARY_MISMATCH','CREDENTIAL_DESTINATION_CHANGED','MODEL_CONTROLLED_PROXY',
    'CREDENTIAL_SENT_OUTSIDE_BOUND_DESTINATION','DESTINATION_AUTHORITY_UNRESOLVED',
    'TOOL_SECURITY_SCHEMA_CHANGE','STALE_AUTHORITY_STILL_ACTIVE',
    'DELEGATED_SUBJECT_CONTEXT_LOST','RETROSPECTIVE_TOOL_AUTHORITY_REVIEW_RECOMMENDED',
    'AUTHORITY_PARAMETER_DRIFT','DESTINATION_BINDING_LOST','UNRESOLVED_PARAMETER_PROVENANCE',
    'STALE_AUTHORITY_POSSIBLE','RUNTIME_AUTHORITY_MISMATCH','DESTINATION_AUTHORITY_MISMATCH',
    'AUTHORITY_PROPAGATION_UNRESOLVED','PROVIDER_CONFLICT',
    'TRUST_TWIN_PROJECTED','TRUST_PRESSURE_EVALUATED','TRUST_BUDGET_EVALUATED',
    'TRUST_FORECAST_EVALUATED','TRUST_FORECAST_CHANGED','TRUST_FORECAST_CONTROL_RECOMMENDED',
    'TWIN_AUTHORITY_CHANGED','TWIN_MONITORING_DEGRADED','TWIN_IDENTITY_CHANGED',
    'TWIN_RUNTIME_CHANGED','TWIN_DESTINATION_CHANGED','TWIN_PRESSURE_SPIKE',
    'TWIN_BUDGET_NEAR_LIMIT','TWIN_BUDGET_EXCEEDED','TWIN_FORECAST_DETERIORATED',
    'TWIN_FORECAST_IMPROVED','ADAPTIVE_VERIFICATION_EVALUATED',
    'DECISION_OUTCOME_REVIEW_ATTACHED'
  )) not valid;

create or replace function public.persist_canonical_trust_transaction_decision_v1(p_transaction jsonb,p_decision jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
  enterprise uuid:=(p_transaction->>'enterpriseId')::uuid;
  transaction uuid:=(p_transaction->>'transactionId')::uuid;
  actor uuid:=(p_transaction->>'actorId')::uuid;
  correlation uuid:=(p_transaction->>'correlationId')::uuid;
  existing public.canonical_trust_transactions%rowtype;
  event_payload jsonb;
begin
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
    material_change,responsibility_lineage,evidence_independence,decision_time_snapshot,continuity_signals,provider_neutral_evidence,
    deployment_gate,execution_continuity,decision_outcome_review
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
    coalesce(p_transaction->'decisionTimeSnapshot','{}'::jsonb),coalesce(p_transaction->'continuitySignals','{}'::jsonb),
    coalesce(p_transaction->'providerNeutralEvidence','[]'::jsonb),p_transaction->'deploymentGate',coalesce(p_transaction->'executionContinuity','[]'::jsonb),
    p_transaction->'decisionOutcomeReview'
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

create or replace function public.attach_canonical_decision_outcome_review_v1(
  p_enterprise_id uuid,
  p_transaction_id uuid,
  p_actor_id uuid,
  p_review jsonb
) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare
  tx public.canonical_trust_transactions%rowtype;
  payload jsonb;
  memory uuid;
begin
  select * into tx
  from public.canonical_trust_transactions
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id
  for update;

  if tx.transaction_id is null then
    raise exception 'Cross-tenant transaction reference rejected';
  end if;
  if p_review->>'originalDecision'<>tx.decision
    or p_review->>'policyVersion'<>tx.policy_version
    or coalesce(p_review->'decisionReasonCodes','[]'::jsonb)<>to_jsonb(tx.reason_codes)
  then
    raise exception 'Cross-tenant or mismatched decision reference rejected';
  end if;
  if tx.decision_outcome_review is not null then
    if tx.decision_outcome_review=p_review then
      return jsonb_build_object('status','DUPLICATE','transactionId',p_transaction_id);
    end if;
    raise exception 'Canonical decision-outcome review is already attached';
  end if;

  update public.canonical_trust_transactions
  set decision_outcome_review=p_review,updated_at=now()
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;

  payload:=jsonb_build_object(
    'transactionId',p_transaction_id,
    'decisionId',tx.decision_id,
    'originalDecision',tx.decision,
    'decisionOutcomeReview',p_review
  );
  insert into public.canonical_trust_transaction_events(
    enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
    authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
  ) values(
    p_enterprise_id,p_transaction_id,'DECISION_OUTCOME_REVIEW_ATTACHED',p_actor_id,
    'Later outcome evidence and adjudication attached without mutating the original decision.',
    tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,
    tx.correlation_id,encode(digest(payload::text,'sha256'),'hex'),now()
  );

  insert into public.trust_memory_index(
    enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id
  ) values(
    p_enterprise_id,tx.subject_id,'GOVERNANCE','DECISION_OUTCOME_REVIEW',p_transaction_id::text,
    now(),jsonb_build_object(
      'originalDecision',tx.decision,
      'action',jsonb_build_object(
        'type',tx.action_type,
        'purpose',tx.action_purpose,
        'resource',tx.action_resource,
        'environment',tx.action_environment
      ),
      'observedOutcomes',jsonb_build_object(
        'providerOutcome',p_review->'providerOutcome',
        'runtimeOutcome',p_review->'runtimeOutcome',
        'destinationOutcome',p_review->'destinationOutcome'
      ),
      'laterAdjudication',jsonb_build_object(
        'adjudicatedOutcome',p_review->'adjudicatedOutcome',
        'humanOverride',p_review->'humanOverride'
      ),
      'evaluationStatus',p_review->'evaluationStatus',
      'decisionOutcomeReview',p_review
    ),tx.correlation_id
  ) returning memory_id into memory;

  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values(
    p_enterprise_id,'DECISION_OUTCOME_REVIEW_ATTACHED','user:'||p_actor_id::text,
    'CANONICAL_TRUST_TRANSACTION',p_transaction_id::text,tx.correlation_id,payload
  );

  return jsonb_build_object(
    'status','CREATED',
    'transactionId',p_transaction_id,
    'decisionId',tx.decision_id,
    'trustMemoryReference',memory
  );
end $$;

revoke all on function public.attach_canonical_decision_outcome_review_v1(uuid,uuid,uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.attach_canonical_decision_outcome_review_v1(uuid,uuid,uuid,jsonb)
  to service_role;

-- Replay reconstructs the immutable decision-time facts and the later review
-- as separate values. In particular, an adjudicated disagreement never
-- rewrites tx.decision.
create or replace function public.append_canonical_trust_transaction_replay_v1(
  p_enterprise_id uuid,
  p_transaction_id uuid,
  p_actor_id uuid,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  tx public.canonical_trust_transactions%rowtype;
  replay uuid;
  payload jsonb;
  item jsonb;
  artifact_replay jsonb;
begin
  select * into tx
  from public.canonical_trust_transactions
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id
  for update;

  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then
    raise exception 'Canonical transaction scope mismatch';
  end if;
  if tx.replay_reference is not null then
    return jsonb_build_object('status','DUPLICATE','replayReference',tx.replay_reference);
  end if;

  artifact_replay:=coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,replayEvents}','[]'::jsonb)
    ||coalesce(tx.decision_time_snapshot#>'{trustTwin,replayEvents}',tx.decision_time_snapshot#>'{trustForecast,replayEvents}','[]'::jsonb);

  payload:=jsonb_build_object(
    'transactionId',p_transaction_id,
    'originalDecision',tx.decision,
    'policyVersion',tx.policy_version,
    'decisionReasonCodes',to_jsonb(tx.reason_codes),
    'decisionOutcomeReview',tx.decision_outcome_review
  );

  insert into public.trust_replay_sessions(
    subject_type,subject_id,workspace_id,owner_user_id,correlation_id,
    canonical_transaction_id,replay_summary,generated_by
  ) values(
    'trust_transaction',p_transaction_id,p_enterprise_id,p_actor_id,p_correlation_id,
    p_transaction_id,payload::text
      ||case when jsonb_array_length(artifact_replay)>0
        then ' | trust intelligence events: '||jsonb_array_length(artifact_replay)::text
        else '' end,
    'canonical_trust_transaction'
  ) returning id into replay;

  for item in select value from jsonb_array_elements(artifact_replay) loop
    insert into public.canonical_trust_transaction_events(
      enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
      authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
    ) values(
      p_enterprise_id,p_transaction_id,item->>'eventType',p_actor_id,
      coalesce(item->'details','{}'::jsonb)::text,
      coalesce(item->'evidenceReferences','[]'::jsonb),tx.authority_reference,
      tx.policy_id,tx.policy_version,p_correlation_id,
      encode(extensions.digest(item::text,'sha256'),'hex'),
      coalesce((item->>'occurredAt')::timestamptz,tx.requested_at)
    );
  end loop;

  update public.canonical_trust_transactions
  set replay_reference=replay,updated_at=now()
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;

  payload:=payload||jsonb_build_object(
    'replayReference',replay,
    'trustIntelligenceEvents',jsonb_array_length(artifact_replay)
  );
  insert into public.canonical_trust_transaction_events(
    enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
    authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
  ) values(
    p_enterprise_id,p_transaction_id,'REPLAY_WRITTEN',p_actor_id,
    'Chronology appended with immutable original decision and separately retained outcome review.',
    tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,
    p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now()
  );

  return jsonb_build_object('status','CREATED','replayReference',replay);
end $$;

revoke all on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid)
  to service_role;

-- Trust Memory retains the action, observed outcomes, later adjudication and
-- review relationship while keeping the original decision immutable.
create or replace function public.emit_canonical_trust_transaction_memory_v1(
  p_enterprise_id uuid,
  p_transaction_id uuid,
  p_actor_id uuid,
  p_correlation_id uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  tx public.canonical_trust_transactions%rowtype;
  memory uuid;
  payload jsonb;
  item jsonb;
  artifact_memory jsonb;
  memory_domain text;
begin
  select * into tx
  from public.canonical_trust_transactions
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id
  for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id or not tx.material_change then
    raise exception 'Non-material Trust Memory write rejected';
  end if;
  if tx.trust_memory_reference is not null then
    return jsonb_build_object('status','DUPLICATE','trustMemoryReference',tx.trust_memory_reference);
  end if;
  artifact_memory:=
    coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,trustMemoryEvents}','[]'::jsonb)
    || coalesce(
      tx.decision_time_snapshot#>'{trustTwin,trustMemoryEvents}',
      tx.decision_time_snapshot#>'{trustForecast,trustMemoryEvents}',
      '[]'::jsonb
    );
  insert into public.trust_memory_index(
    enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id
  ) values(
    p_enterprise_id,tx.subject_id,'RUNTIME','CANONICAL_TRUST_TRANSACTION',p_transaction_id::text,
    tx.requested_at,
    jsonb_build_object(
      'originalDecision',tx.decision,
      'action',jsonb_build_object(
        'type',tx.action_type,
        'purpose',tx.action_purpose,
        'resource',tx.action_resource,
        'environment',tx.action_environment
      ),
      'policyVersion',tx.policy_version,
      'decisionReasonCodes',to_jsonb(tx.reason_codes),
      'observedOutcomes',jsonb_build_object(
        'providerOutcome',tx.decision_outcome_review->'providerOutcome',
        'runtimeOutcome',tx.decision_outcome_review->'runtimeOutcome',
        'destinationOutcome',tx.decision_outcome_review->'destinationOutcome'
      ),
      'laterAdjudication',jsonb_build_object(
        'adjudicatedOutcome',tx.decision_outcome_review->'adjudicatedOutcome',
        'humanOverride',tx.decision_outcome_review->'humanOverride'
      ),
      'evaluationStatus',tx.decision_outcome_review->'evaluationStatus',
      'decisionOutcomeReview',tx.decision_outcome_review,
      'trustState',tx.trust_state,
      'changedConditions',tx.changed_conditions,
      'previousTransactionId',tx.previous_transaction_id,
      'trustIntelligenceEventCount',jsonb_array_length(artifact_memory)
    ),
    p_correlation_id
  ) returning memory_id into memory;
  for item in select value from jsonb_array_elements(artifact_memory) loop
    memory_domain:=case
      when item->>'eventType' like 'FORECAST_%'
        or item->>'eventType' like 'TRUST_%'
        or item->>'eventType'='DEPLOYMENT_HELD'
      then 'GOVERNANCE'
      else 'AUTHORITY'
    end;
    insert into public.trust_memory_index(
      enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id
    ) values(
      p_enterprise_id,
      tx.subject_id,
      memory_domain,
      item->>'eventType',
      p_transaction_id::text || ':' || (item->>'eventId'),
      coalesce((item->>'occurredAt')::timestamptz,tx.requested_at),
      jsonb_build_object(
        'canonicalTransactionId',p_transaction_id,
        'evidenceReferences',coalesce(item->'evidenceReferences','[]'::jsonb),
        'knownAtForecastTime',true
      ),
      p_correlation_id
    ) on conflict do nothing;
  end loop;
  update public.canonical_trust_transactions
  set trust_memory_reference=memory,updated_at=now()
  where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object(
    'transactionId',p_transaction_id,
    'trustMemoryReference',memory,
    'originalDecision',tx.decision,
    'decisionOutcomeReview',tx.decision_outcome_review,
    'changedConditions',tx.changed_conditions,
    'trustIntelligenceEvents',jsonb_array_length(artifact_memory)
  );
  insert into public.canonical_trust_transaction_events(
    enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,
    authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at
  ) values(
    p_enterprise_id,p_transaction_id,'TRUST_MEMORY_WRITTEN',p_actor_id,
    'Material action, observed outcomes and later adjudication recorded without rewriting the original decision.',
    tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,
    p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now()
  );
  return jsonb_build_object('status','CREATED','trustMemoryReference',memory);
end $$;

revoke all on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid)
  to service_role;
