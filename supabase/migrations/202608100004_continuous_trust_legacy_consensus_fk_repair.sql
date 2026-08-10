-- Keep the canonical Trust State decision reference separate from the legacy
-- Provider Consensus pointer. Continuous Trust recommendations are retained in
-- trust_state_decisions, but must not masquerade as consensus_decisions rows.

create or replace function public.apply_trust_state_decision_v1(
  p_contract jsonb,
  p_decision jsonb,
  p_trust_event jsonb,
  p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public as $$
declare enterprise uuid:=(p_decision->>'enterpriseId')::uuid;
declare decision uuid:=(p_decision->>'stateDecisionId')::uuid;
declare recommendation uuid:=nullif(p_decision->>'recommendationId','')::uuid;
declare legacy_consensus_decision uuid;
declare trust_status text;
declare current_state text;
declare current_id uuid;
declare subject_node uuid;
declare decision_node uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Trust State Engine service path required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(enterprise::text||':'||(p_decision->>'domainKey')||':'||(p_decision->>'subjectId'),47));
  select state,current_state_decision_id into current_state,current_id from public.subject_trust_state where enterprise_id=enterprise and subject_id=p_decision->>'subjectId' for update;
  if coalesce(current_state,'UNKNOWN')<>(p_decision->>'priorState') then raise exception 'Trust state compare-and-set conflict'; end if;
  if current_state='REVOKED' and p_decision->>'nextState'<>'REVOKED' then raise exception 'Revocation cannot be reversed'; end if;
  if not (
    p_decision->>'priorState'=p_decision->>'nextState' or
    (p_decision->>'priorState'='UNKNOWN' and p_decision->>'nextState' in ('OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='OBSERVED' and p_decision->>'nextState' in ('INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='INCONCLUSIVE' and p_decision->>'nextState' in ('OBSERVED','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='TRUSTED' and p_decision->>'nextState' in ('INCONCLUSIVE','VERIFIED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='VERIFIED' and p_decision->>'nextState' in ('INCONCLUSIVE','TRUSTED','CHALLENGED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='CHALLENGED' and p_decision->>'nextState' in ('OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','BLOCKED','REVOKED','EXPIRED')) or
    (p_decision->>'priorState'='BLOCKED' and p_decision->>'nextState'='REVOKED') or
    (p_decision->>'priorState'='EXPIRED' and p_decision->>'nextState' in ('OBSERVED','INCONCLUSIVE','TRUSTED','VERIFIED','CHALLENGED','BLOCKED','REVOKED'))
  ) then raise exception 'Invalid Trust State transition'; end if;
  select decision_id into legacy_consensus_decision
  from public.consensus_decisions
  where enterprise_id=enterprise and decision_id=recommendation;
  insert into public.trust_decision_contracts(decision_contract_id,enterprise_id,domain_key,subject_id,workflow_id,authority_id,policy_id,policy_version,evidence_snapshot_hash,decision_input_hash,canonicalization,hash_algorithm,requested_at)
  values((p_contract->>'decisionContractId')::uuid,enterprise,p_contract->>'domainKey',p_contract->>'subjectId',nullif(p_contract->>'workflowId',''),nullif(p_contract->>'authorityId',''),p_contract->>'policyId',p_contract->>'policyVersion',p_contract->>'evidenceSnapshotHash',p_contract->>'decisionInputHash','JCS','SHA-256',(p_contract->>'requestedAt')::timestamptz) on conflict do nothing;
  insert into public.trust_state_decisions(state_decision_id,decision_contract_id,enterprise_id,domain_key,subject_id,prior_state,next_state,recommendation_id,policy_id,policy_version,evidence_snapshot_hash,decision_input_hash,decision_hash,decided_at,reason_codes)
  values(decision,(p_decision->>'decisionContractId')::uuid,enterprise,p_decision->>'domainKey',p_decision->>'subjectId',p_decision->>'priorState',p_decision->>'nextState',recommendation,p_decision->>'policyId',p_decision->>'policyVersion',p_decision->>'evidenceSnapshotHash',p_decision->>'decisionInputHash',p_decision->>'decisionHash',(p_decision->>'decidedAt')::timestamptz,array(select jsonb_array_elements_text(p_decision->'reasonCodes')));
  insert into public.subject_trust_state(enterprise_id,subject_id,workflow_id,state,confidence,current_decision_id,domain_key,current_state_decision_id)
  values(enterprise,p_decision->>'subjectId',nullif(p_contract->>'workflowId',''),p_decision->>'nextState',coalesce((p_decision->>'confidence')::integer,0),legacy_consensus_decision,p_decision->>'domainKey',decision)
  on conflict(enterprise_id,subject_id) do update set workflow_id=excluded.workflow_id,state=excluded.state,confidence=excluded.confidence,current_decision_id=excluded.current_decision_id,domain_key=excluded.domain_key,current_state_decision_id=excluded.current_state_decision_id,updated_at=now();
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary) values(enterprise,p_decision->>'subjectId',p_decision->>'domainKey','TRUST_STATE_DECISION',decision::text,(p_decision->>'decidedAt')::timestamptz,jsonb_build_object('priorState',p_decision->>'priorState','nextState',p_decision->>'nextState','policyId',p_decision->>'policyId','policyVersion',p_decision->>'policyVersion'));
  insert into public.trust_subjects(enterprise_id,domain_key,subject_id,subject_type) values(enterprise,p_decision->>'domainKey',p_decision->>'subjectId','UNKNOWN') on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label) values(enterprise,'SUBJECT',p_decision->>'subjectId',p_decision->>'domainKey','Trust subject') on conflict do nothing;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label) values(enterprise,'STATE_DECISION',decision::text,p_decision->>'domainKey',p_decision->>'nextState') on conflict do nothing;
  select node_id into subject_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='SUBJECT' and external_id=p_decision->>'subjectId';
  select node_id into decision_node from public.evidence_graph_nodes where enterprise_id=enterprise and node_type='STATE_DECISION' and external_id=decision::text;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type) values(enterprise,subject_node,decision_node,'RESULTED_IN') on conflict do nothing;
  trust_status:=public.append_trust_event_v1(p_trust_event,null,p_correlation_id); if trust_status<>'APPENDED' then raise exception 'Trust State Event chain conflict'; end if;
  insert into public.trust_architecture_audit_log(enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata) values(enterprise,'TRUST_STATE_TRANSITION_APPLIED','system:trust-state-engine','TRUST_STATE_DECISION',decision::text,p_correlation_id,jsonb_build_object('priorState',p_decision->>'priorState','nextState',p_decision->>'nextState'));
  return jsonb_build_object('status','APPLIED','stateDecisionId',decision,'state',p_decision->>'nextState');
end $$;

revoke all on function public.apply_trust_state_decision_v1(jsonb,jsonb,jsonb,uuid)
  from public,anon,authenticated;
grant execute on function public.apply_trust_state_decision_v1(jsonb,jsonb,jsonb,uuid)
  to service_role;

comment on function public.apply_trust_state_decision_v1(jsonb,jsonb,jsonb,uuid) is
  'The sole state mutation boundary; separates canonical state decisions from the optional legacy Provider Consensus pointer.';
