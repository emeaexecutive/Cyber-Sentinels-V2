-- Forward reconciliation for environments that applied the original
-- 20260820085027 definition before its pgcrypto search path was corrected.
-- Keep this definition identical to the corrected canonical function.
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
    deployment_gate,execution_continuity
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
    coalesce(p_transaction->'providerNeutralEvidence','[]'::jsonb),p_transaction->'deploymentGate',coalesce(p_transaction->'executionContinuity','[]'::jsonb)
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
