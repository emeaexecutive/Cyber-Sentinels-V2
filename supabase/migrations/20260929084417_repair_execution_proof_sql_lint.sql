-- Repair four runtime SQL errors reproduced by Production lint and local regression tests.
-- Forward-only: preserve signatures, owners, service-only ACLs, search paths, and tenant/append-only controls.
-- No data changes, tables, policies, history rewrites, or broader execution grants.

CREATE OR REPLACE FUNCTION public.ingest_continuous_trust_signal_v1(p_signal jsonb, p_idempotency_key_hash text, p_actor_id uuid, p_trust_event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tenant uuid := (p_signal->>'tenantId')::uuid;
  signal_id uuid := (p_signal->>'id')::uuid;
  existing public.trust_signals%rowtype;
  event_status text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust signal service path required';
  end if;
  if p_idempotency_key_hash !~ '^[a-f0-9]{64}$'
    or (p_signal->>'fingerprint') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_signal->'metadata')<>'object'
    or (p_signal->'metadata')::text ~* '(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)'
  then
    raise exception 'Continuous Trust signal validation failed';
  end if;
  if not exists(
    select 1 from public.trust_subjects
    where enterprise_id=tenant
      and subject_id=p_signal->>'entityId'
      and retired_at is null
  ) then
    raise exception 'Continuous Trust entity is unavailable';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(tenant::text||':'||(p_signal->>'source')||':'||p_idempotency_key_hash,61)
  );
  select * into existing from public.trust_signals
  where tenant_id=tenant
    and source=p_signal->>'source'
    and idempotency_key_hash=p_idempotency_key_hash
  for update;
  if found then
    if existing.fingerprint=p_signal->>'fingerprint' then
      return jsonb_build_object(
        'signalId',existing.id,'status','DUPLICATE','acceptedAt',existing.created_at,
        'duplicate',true,
        'processingStatus',coalesce((
          select processing.status from public.trust_signal_processing as processing
          where processing.tenant_id=tenant and processing.signal_id=existing.id
        ),'QUEUED')
      );
    end if;
    raise exception 'Idempotency key conflicts with a different signal';
  end if;

  insert into public.trust_signals(
    id,tenant_id,entity_id,entity_type,signal_type,source,provider,
    observed_at,received_at,severity,confidence,status,fingerprint,
    idempotency_key_hash,correlation_id,causation_id,actor_id,metadata,created_at
  ) values (
    signal_id,tenant,p_signal->>'entityId',p_signal->>'entityType',
    p_signal->>'signalType',p_signal->>'source',nullif(p_signal->>'provider',''),
    (p_signal->>'observedAt')::timestamptz,(p_signal->>'receivedAt')::timestamptz,
    p_signal->>'severity',(p_signal->>'confidence')::numeric,p_signal->>'status',
    p_signal->>'fingerprint',p_idempotency_key_hash,
    (p_signal->>'correlationId')::uuid,nullif(p_signal->>'causationId','')::uuid,
    p_actor_id,p_signal->'metadata',(p_signal->>'createdAt')::timestamptz
  );
  insert into public.trust_signal_processing(tenant_id,signal_id,status,accepted_at)
    values(tenant,signal_id,'QUEUED',(p_signal->>'receivedAt')::timestamptz);
  event_status:=public.append_trust_event_v1(
    p_trust_event,null,(p_signal->>'correlationId')::uuid
  );
  if event_status<>'APPENDED' then
    raise exception 'Continuous Trust signal event chain conflict';
  end if;
  insert into public.trust_architecture_audit_log(
    enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
  ) values (
    tenant,'CONTINUOUS_TRUST_SIGNAL_ACCEPTED','user:'||p_actor_id::text,
    'TRUST_SIGNAL',signal_id::text,(p_signal->>'correlationId')::uuid,
    jsonb_build_object(
      'signalType',p_signal->>'signalType','severity',p_signal->>'severity',
      'entityId',p_signal->>'entityId'
    )
  );
  return jsonb_build_object(
    'signalId',signal_id,'status','ACCEPTED','acceptedAt',p_signal->>'receivedAt',
    'duplicate',false,'processingStatus','QUEUED'
  );
end $function$;

CREATE OR REPLACE FUNCTION public.persist_rc1_trust_assessment(verification_row_id uuid, provider_event_id text, provider_event_type text, provider_verification_id text, provider_signature_timestamp bigint, provider_event_digest text, normalized_evidence_input jsonb, evidence_quality_input jsonb, assessment_input jsonb, evidence_pack_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ) on conflict (event_id) where event_id is not null do nothing returning id into webhook_row_id;

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
$function$;

CREATE OR REPLACE FUNCTION public.persist_scope_continuity_decision_v1(p_input jsonb, p_decision jsonb, p_artifacts jsonb, p_actor_id uuid, p_correlation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  enterprise uuid := (p_input#>>'{declaration,enterpriseId}')::uuid;
  context_id uuid := (p_input#>>'{declaration,id}')::uuid;
  lease_id uuid := (p_input#>>'{authorization,id}')::uuid;
  decision_id uuid := (p_decision->>'id')::uuid;
  item jsonb;
  existing public.scope_continuity_decisions;
  context_node uuid;
  lease_node uuid;
  decision_node uuid;
  item_node uuid;
  context_hash text := encode(digest(convert_to(((p_input->'declaration')-'immutableHash')::text,'UTF8'),'sha256'),'hex');
  lease_hash text := encode(
    digest(
      convert_to(
        (
          (p_input->'authorization')
          - 'consumedActionCount'
          - 'createdAt'
          - 'immutableHash'
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  item_hash text;
begin
  if auth.role()<>'service_role' then raise exception 'Scope Continuity service path required'; end if;
  if p_correlation_id<>(p_decision->>'correlationId')::uuid then raise exception 'Scope Continuity correlation mismatch'; end if;
  if enterprise<>(p_decision->>'enterpriseId')::uuid or context_id<>(p_decision->>'executionContextId')::uuid then raise exception 'Scope Continuity decision context mismatch'; end if;
  if p_actor_id is null or (p_decision->>'decisionHash') !~ '^[a-f0-9]{64}$' then raise exception 'Scope Continuity integrity metadata invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||context_id::text||':'||p_correlation_id::text,26));
  if exists(select 1 from public.scope_continuity_decisions where enterprise_id=enterprise and execution_context_id=context_id and correlation_id=p_correlation_id) then
    select * into existing from public.scope_continuity_decisions where enterprise_id=enterprise and execution_context_id=context_id and correlation_id=p_correlation_id;
    if existing.id<>decision_id or existing.decision_hash<>p_decision->>'decisionHash' then raise exception 'Scope Continuity idempotency conflict'; end if;
    return jsonb_build_object('decisionId',existing.id,'outcome',existing.outcome,'idempotentReplay',true);
  end if;

  insert into public.execution_context_declarations(
    id,enterprise_id,subject_type,subject_id,workflow_id,execution_id,environment_class,internet_access_expected,production_access_expected,
    permitted_network_zones,permitted_domains,permitted_target_identifiers,test_harness_provider,declaration_source_type,declaration_source_id,
    accountable_owner_type,accountable_owner_id,valid_from,valid_until,declared_at,evidence_reference,integrity_metadata,immutable_hash,created_at
  ) values (
    context_id,enterprise,p_input#>>'{declaration,subjectType}',p_input#>>'{declaration,subjectId}',nullif(p_input#>>'{declaration,workflowId}',''),nullif(p_input#>>'{declaration,executionId}',''),p_input#>>'{declaration,environmentClass}',
    (p_input#>>'{declaration,internetAccessExpected}')::boolean,(p_input#>>'{declaration,productionAccessExpected}')::boolean,p_input#>'{declaration,permittedNetworkZones}',p_input#>'{declaration,permittedDomains}',p_input#>'{declaration,permittedTargetIdentifiers}',
    nullif(p_input#>>'{declaration,testHarnessProvider}',''),p_input#>>'{declaration,declarationSourceType}',p_input#>>'{declaration,declarationSourceId}',p_input#>>'{declaration,accountableOwnerType}',p_input#>>'{declaration,accountableOwnerId}',
    (p_input#>>'{declaration,validFrom}')::timestamptz,(p_input#>>'{declaration,validUntil}')::timestamptz,(p_input#>>'{declaration,declaredAt}')::timestamptz,p_input#>>'{declaration,evidenceReference}',p_input#>'{declaration,integrityMetadata}',context_hash,(p_input#>>'{declaration,createdAt}')::timestamptz
  ) on conflict(enterprise_id,id) do nothing;
  if not exists(select 1 from public.execution_context_declarations where enterprise_id=enterprise and id=context_id and immutable_hash=context_hash) then raise exception 'Conflicting execution-context identifier'; end if;

  for item in select value from jsonb_array_elements(p_input->'attestations') loop
    if (item->>'enterpriseId')::uuid<>enterprise or (item->>'executionContextId')::uuid<>context_id then raise exception 'Cross-tenant attestation reference rejected'; end if;
    item_hash := encode(digest(convert_to((item-'immutableHash')::text,'UTF8'),'sha256'),'hex');
    insert into public.environment_attestations(
      id,enterprise_id,execution_context_id,subject_type,subject_id,observation_type,observed_environment_class,internet_reachable,production_reachable,observed_network_zones,observed_domains,observed_target_identifiers,
      egress_policy_state,isolation_control_state,monitoring_state,attestation_source_type,attestation_source_id,provider_or_third_party_identity,source_authority,observed_at,received_at,confidence,freshness,evidence_strength,evidence_reference,integrity_metadata,supersedes_attestation_id,immutable_hash,created_at
    ) values (
      (item->>'id')::uuid,enterprise,context_id,item->>'subjectType',item->>'subjectId',item->>'observationType',item->>'observedEnvironmentClass',nullif(item->>'internetReachable','')::boolean,nullif(item->>'productionReachable','')::boolean,item->'observedNetworkZones',item->'observedDomains',item->'observedTargetIdentifiers',
      item->>'egressPolicyState',item->>'isolationControlState',item->>'monitoringState',item->>'attestationSourceType',item->>'attestationSourceId',nullif(item->>'providerOrThirdPartyIdentity',''),item->>'sourceAuthority',(item->>'observedAt')::timestamptz,(item->>'receivedAt')::timestamptz,(item->>'confidence')::numeric,item->>'freshness',item->>'evidenceStrength',item->>'evidenceReference',item->'integrityMetadata',nullif(item->>'supersedesAttestationId','')::uuid,item_hash,(item->>'createdAt')::timestamptz
    ) on conflict(enterprise_id,id) do nothing;
    if not exists(select 1 from public.environment_attestations where enterprise_id=enterprise and id=(item->>'id')::uuid and immutable_hash=item_hash) then raise exception 'Conflicting environment-attestation identifier'; end if;
  end loop;

  insert into public.scope_authorization_leases(id,enterprise_id,subject_type,subject_id,authorized_objective,permitted_tools,permitted_actions,permitted_targets,permitted_environments,maximum_duration_seconds,maximum_action_count,data_classification_boundary,approver_type,approver_id,issued_at,expires_at,revoked_at,revocation_reason,required_attestation_types,contradiction_response_policy,authority_reference,evidence_references,supersedes_lease_id,immutable_hash)
  values(lease_id,enterprise,p_input#>>'{authorization,subjectType}',p_input#>>'{authorization,subjectId}',p_input#>>'{authorization,authorizedObjective}',p_input#>'{authorization,permittedTools}',p_input#>'{authorization,permittedActions}',p_input#>'{authorization,permittedTargets}',p_input#>'{authorization,permittedEnvironments}',(p_input#>>'{authorization,maximumDurationSeconds}')::integer,(p_input#>>'{authorization,maximumActionCount}')::integer,p_input#>'{authorization,dataClassificationBoundary}',p_input#>>'{authorization,approverType}',p_input#>>'{authorization,approverId}',(p_input#>>'{authorization,issuedAt}')::timestamptz,(p_input#>>'{authorization,expiresAt}')::timestamptz,nullif(p_input#>>'{authorization,revokedAt}','')::timestamptz,nullif(p_input#>>'{authorization,revocationReason}',''),p_input#>'{authorization,requiredAttestationTypes}',p_input#>>'{authorization,contradictionResponsePolicy}',nullif(p_input#>>'{authorization,authorityReference}',''),p_input#>'{authorization,evidenceReferences}',nullif(p_input#>>'{authorization,supersedesLeaseId}','')::uuid,lease_hash)
  on conflict(enterprise_id,id) do nothing;
  if not exists(select 1 from public.scope_authorization_leases where enterprise_id=enterprise and id=lease_id and immutable_hash=lease_hash) then raise exception 'Conflicting scope-authorization identifier'; end if;

  insert into public.scope_continuity_decisions(id,enterprise_id,execution_context_id,authorization_id,requested_action,evidence_availability,outcome,human_review_required,reason_codes,missing_evidence,evidence_references,trust_impact,decision_timestamp,decision_version,policy_id,policy_version,correlation_id,decision_hash,artifacts,actor_id)
  values(decision_id,enterprise,context_id,lease_id,p_decision->'requestedAction',p_decision->>'evidenceAvailability',p_decision->>'outcome',(p_decision->>'humanReviewRequired')::boolean,p_decision->'reasonCodes',p_decision->'missingEvidence',p_decision->'evidenceReferences',p_decision->'trustImpact',(p_decision->>'decisionTimestamp')::timestamptz,p_decision->>'decisionVersion',p_decision->>'policyId',p_decision->>'policyVersion',p_correlation_id,p_decision->>'decisionHash',p_artifacts,p_actor_id);

  for item in select value from jsonb_array_elements(p_input->'attestations') loop
    insert into public.scope_decision_attestations(enterprise_id,decision_id,attestation_id) values(enterprise,decision_id,(item->>'id')::uuid);
  end loop;
  for item in select value from jsonb_array_elements(p_decision->'contradictions') loop
    insert into public.context_contradiction_events(id,enterprise_id,execution_context_id,decision_id,contradiction_type,severity,reason_code,evidence_references,detected_by,detected_at)
    values((item->>'id')::uuid,enterprise,context_id,decision_id,item->>'type',item->>'severity',item->>'reasonCode',item->'evidenceReferences',item->>'detectedBy',(item->>'detectedAt')::timestamptz);
  end loop;

  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
  values(enterprise,p_input#>>'{declaration,subjectId}','RUNTIME','SCOPE_CONTINUITY_DECISION',decision_id::text,(p_decision->>'decisionTimestamp')::timestamptz,jsonb_build_object('outcome',p_decision->>'outcome','trustImpact',p_decision->'trustImpact','reasonCodes',p_decision->'reasonCodes')) on conflict do nothing;

  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values
    (enterprise,'EXECUTION_CONTEXT',context_id::text,'RUNTIME','Execution context',jsonb_build_object('environmentClass',p_input#>>'{declaration,environmentClass}')),
    (enterprise,'AUTHORIZATION',lease_id::text,'AUTHORITY','Scope authorization','{}'),
    (enterprise,'SCOPE_DECISION',decision_id::text,'RUNTIME',p_decision->>'outcome',jsonb_build_object('trustState',p_decision#>>'{trustImpact,nextState}'))
  on conflict do nothing;
  select node_id into context_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='EXECUTION_CONTEXT' and external_id=context_id::text;
  select node_id into lease_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='AUTHORIZATION' and external_id=lease_id::text;
  select node_id into decision_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='SCOPE_DECISION' and external_id=decision_id::text;
  if context_node is null or lease_node is null or decision_node is null then raise exception 'Scope Continuity graph node resolution failed'; end if;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,context_node,lease_node,'AUTHORIZED_BY'),(enterprise,context_node,decision_node,'RESULTED_IN') on conflict do nothing;
  for item in select value from jsonb_array_elements(p_input->'attestations') loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values(enterprise,'ENVIRONMENT_ATTESTATION',item->>'id','RUNTIME',item->>'observationType',jsonb_build_object('sourceType',item->>'attestationSourceType','evidenceStrength',item->>'evidenceStrength')) on conflict do nothing;
    select node_id into item_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='ENVIRONMENT_ATTESTATION' and external_id=item->>'id';
    if item_node is null then raise exception 'Scope Continuity attestation graph node resolution failed'; end if;
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,context_node,item_node,'OBSERVED_BY') on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_decision->'contradictions') loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata) values(enterprise,'CONTRADICTION',item->>'id','RUNTIME',item->>'type',jsonb_build_object('severity',item->>'severity')) on conflict do nothing;
    select node_id into item_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='CONTRADICTION' and external_id=item->>'id';
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,item_node,decision_node,'CONFLICTS_WITH') on conflict do nothing;
  end loop;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata)
  values(enterprise,'SCOPE_CONTINUITY_EVALUATED','user:'||p_actor_id::text,'SCOPE_CONTINUITY_DECISION',decision_id::text,p_correlation_id,jsonb_build_object('outcome',p_decision->>'outcome','decisionHash',p_decision->>'decisionHash'));
  return jsonb_build_object('decisionId',decision_id,'outcome',p_decision->>'outcome','idempotentReplay',false);
end $function$;

CREATE OR REPLACE FUNCTION public.persist_serious_incident_case_v1(p_case jsonb, p_screening jsonb, p_artifacts jsonb, p_actor_id uuid, p_correlation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare enterprise uuid := (p_case->>'enterpriseId')::uuid; incident uuid := (p_case->>'id')::uuid; case_hash text := encode(digest(convert_to(p_case::text,'UTF8'),'sha256'),'hex'); item jsonb; item_hash text; from_node uuid; to_node uuid; reference_value text;
begin
  if auth.role()<>'service_role' then raise exception 'Service role required'; end if;
  if not public.serious_incident_payload_is_minimized_v1(p_case) or not public.serious_incident_payload_is_minimized_v1(p_artifacts) then raise exception 'Restricted evidence field rejected'; end if;
  if p_case->>'state' not in ('draft','evidence_collection') then raise exception 'Initial incident state invalid'; end if;
  if not exists(select 1 from jsonb_array_elements(p_case->'responsibilityRoles') role where role->>'partyReference'=p_actor_id::text and role->>'roleType' in ('incident_owner','system_owner')) then raise exception 'Creating actor must own the incident'; end if;
  if exists(select 1 from jsonb_array_elements(p_case->'responsibilityRoles') role where role->>'assignedBy'<>p_actor_id::text) then raise exception 'Responsibility assigner mismatch'; end if;
  if exists(select 1 from jsonb_array_elements(p_case->'responsibilityRoles') role where role->>'partyReference'=p_actor_id::text and role->>'roleType' in ('compliance_reviewer','legal_reviewer','data_protection_reviewer','executive_approver','external_adviser','regulator_liaison')) then raise exception 'Protected reviewer self-assignment denied'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||incident::text,0));
  if exists(select 1 from public.incident_regulatory_assessments where enterprise_id=enterprise and id=incident) then
    if exists(select 1 from public.incident_regulatory_assessments where enterprise_id=enterprise and id=incident and immutable_hash=case_hash) then return jsonb_build_object('incidentId',incident,'idempotentReplay',true); end if;
    raise exception 'Conflicting serious-incident identifier';
  end if;
  reference_value:=nullif(p_case#>>'{references,environmentAttestationReference}','');
  if reference_value is not null and not exists(select 1 from public.environment_attestations where enterprise_id=enterprise and id=reference_value::uuid) then raise exception 'Tenant-bound environment attestation reference required'; end if;
  reference_value:=nullif(p_case#>>'{references,scopeContinuityDecisionReference}','');
  if reference_value is not null and not exists(select 1 from public.scope_continuity_decisions where enterprise_id=enterprise and id=reference_value::uuid) then raise exception 'Tenant-bound Scope Continuity decision reference required'; end if;
  reference_value:=nullif(p_case#>>'{evidenceSnapshot,scopeAuthorizationLeaseReference}','');
  if reference_value is not null and not exists(select 1 from public.scope_authorization_leases where enterprise_id=enterprise and id=reference_value::uuid) then raise exception 'Tenant-bound scope lease reference required'; end if;
  reference_value:=nullif(p_case#>>'{evidenceSnapshot,declaredEnvironmentReference}','');
  if reference_value is not null and not exists(select 1 from public.execution_context_declarations where enterprise_id=enterprise and id=reference_value::uuid) then raise exception 'Tenant-bound declared environment reference required'; end if;
  reference_value:=nullif(p_case#>>'{evidenceSnapshot,configuredEnvironmentReference}','');
  if reference_value is not null and not exists(select 1 from public.execution_context_declarations where enterprise_id=enterprise and id=reference_value::uuid) then raise exception 'Tenant-bound configured environment reference required'; end if;
  for item in select value from jsonb_array_elements(coalesce(p_case#>'{evidenceSnapshot,observedEnvironmentReferences}','[]'::jsonb)) loop
    if not exists(select 1 from public.environment_attestations where enterprise_id=enterprise and id=(item#>>'{}')::uuid) then raise exception 'Tenant-bound observed environment reference required'; end if;
  end loop;
  insert into public.incident_regulatory_assessments(id,enterprise_id,ai_system_id,agent_id,incident_category,jurisdiction,initial_state,canonical_case,immutable_hash,created_by,correlation_id,created_at)
  values(incident,enterprise,p_case#>>'{identity,aiSystemId}',p_case#>>'{identity,agentId}',p_case#>>'{regulatoryContext,incidentCategory}',p_case#>>'{regulatoryContext,jurisdiction}',p_case->>'state',p_case,case_hash,p_actor_id,p_correlation_id,(p_case->>'createdAt')::timestamptz);
  for item in select value from jsonb_array_elements(p_case->'responsibilityRoles') loop
    item_hash:=encode(digest(convert_to(item::text,'UTF8'),'sha256'),'hex');
    insert into public.incident_responsibility_roles(id,enterprise_id,incident_id,role_type,party_type,party_reference,authority_reference,assigned_at,assigned_by,supersedes_role_id,record_hash)
    values((item->>'id')::uuid,enterprise,incident,item->>'roleType',item->>'partyType',item->>'partyReference',nullif(item->>'authorityReference',''),(item->>'assignedAt')::timestamptz,item->>'assignedBy',nullif(item->>'supersedesRoleId','')::uuid,item_hash);
  end loop;
  insert into public.incident_evidence_snapshots(id,enterprise_id,incident_id,captured_at,snapshot,snapshot_digest,supersedes_snapshot_id,correlation_id)
  values((p_case#>>'{evidenceSnapshot,id}')::uuid,enterprise,incident,(p_case#>>'{evidenceSnapshot,capturedAt}')::timestamptz,p_case->'evidenceSnapshot',encode(digest(convert_to((p_case->'evidenceSnapshot')::text,'UTF8'),'sha256'),'hex'),nullif(p_case#>>'{evidenceSnapshot,supersedesSnapshotId}','')::uuid,p_correlation_id);
  insert into public.incident_regulatory_trigger_findings(id,enterprise_id,incident_id,outcome,label,reason_codes,potential_triggers,missing_evidence,recommended_reviewer_roles,policy_id,policy_version,evaluated_at,input_digest,result_digest,record_hash,correlation_id)
  values((p_screening->>'id')::uuid,enterprise,incident,p_screening->>'outcome',p_screening->>'label',p_screening->'reasonCodes',p_screening->'potentialTriggers',p_screening->'missingEvidence',p_screening->'recommendedReviewerRoles',p_screening->>'policyId',p_screening->>'policyVersion',(p_screening->>'evaluatedAt')::timestamptz,p_screening->>'inputDigest',p_screening->>'resultDigest',encode(digest(convert_to(p_screening::text,'UTF8'),'sha256'),'hex'),p_correlation_id);
  for item in select value from jsonb_array_elements(p_artifacts->'replay') loop
    item_hash:=encode(digest(convert_to(item::text,'UTF8'),'sha256'),'hex');
    insert into public.incident_chronology_events(id,enterprise_id,incident_id,event_type,source,source_type,source_authority,occurred_at,timestamp_confidence,ingested_at,ordering_confidence,evidence_reference,integrity_state,classification,summary,containment_state,deadline_metadata,correlation_id,supersedes_event_id,record_hash)
    values((item->>'id')::uuid,enterprise,incident,item->>'eventType',item->>'source',item->>'sourceType',item->>'sourceAuthority',(item->>'occurredAt')::timestamptz,item->>'timestampConfidence',(item->>'ingestedAt')::timestamptz,item->>'orderingConfidence',nullif(item->>'evidenceReference',''),item->>'integrityState',item->>'classification',item->>'summary',nullif(item->>'containmentState',''),item->'deadlineMetadata',(item->>'correlationId')::uuid,nullif(item->>'supersedesEventId','')::uuid,item_hash)
    on conflict(enterprise_id,incident_id,correlation_id,event_type) do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_artifacts->'trustMemory') loop
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary) values(enterprise,item->>'subject','GOVERNANCE',upper(item->>'eventKind'),incident::text||':'||(item->>'eventKind'),(item->>'occurredAt')::timestamptz,jsonb_build_object('incidentId',incident,'evidenceReferences',item->'evidenceReferences','decisionAuthority',item->'decisionAuthority','reason',item->>'reason')) on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_artifacts#>'{evidenceGraph,nodes}') loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata)
    values(enterprise,upper(item->>'type'),item->>'id',case when item->>'type' in ('incident','regulatory_trigger_finding','scope_continuity_decision','scope_authorization_lease') then 'GOVERNANCE' when item->>'type' in ('evidence_snapshot','affected_resource') then 'DATA' when item->>'type' in ('runtime','environment_attestation','monitor') then 'RUNTIME' when item->>'type' in ('provider','affected_organization') then 'ORGANIZATION' else 'AI_AGENT' end,item->>'label',coalesce(item->'metadata','{}'::jsonb)) on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(p_artifacts#>'{evidenceGraph,relationships}') loop
    select node_id into from_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type=upper(item->>'fromType') and external_id=item->>'from';
    select node_id into to_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type=upper(item->>'toType') and external_id=item->>'to';
    if from_node is null or to_node is null then raise exception 'Evidence Graph relationship references a missing tenant node'; end if;
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,from_node,to_node,item->>'type') on conflict do nothing;
  end loop;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(enterprise,'SERIOUS_INCIDENT_OPENED','user:'||p_actor_id::text,'INCIDENT',incident::text,p_correlation_id,jsonb_build_object('screeningOutcome',p_screening->>'outcome','caseHash',case_hash));
  return jsonb_build_object('incidentId',incident,'screeningId',p_screening->>'id','idempotentReplay',false);
end $function$;
