-- Extend canonical artifacts with Trust Forecast evidence from the immutable
-- decision-time snapshot. This creates no forecast store or decision path.

create or replace function public.extend_canonical_trust_transaction_graph_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  tx public.canonical_trust_transactions%rowtype;
  subject_node uuid; tx_node uuid; decision_node uuid; authority_node uuid; policy_node uuid; evidence_node uuid;
  from_node uuid; to_node uuid; item jsonb; edge jsonb; projection jsonb; payload jsonb;
  authority_projection jsonb; forecast_projection jsonb; twin_projection jsonb;
begin
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'Canonical transaction scope mismatch'; end if;
  if tx.evidence_graph_reference is not null then return jsonb_build_object('status','DUPLICATE','evidenceGraphReference',tx.evidence_graph_reference); end if;
  insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values
    (p_enterprise_id,'SUBJECT',tx.subject_id,'IDENTITY','Trust Object',jsonb_build_object('subjectType',tx.subject_type),p_correlation_id),
    (p_enterprise_id,'TRUST_TRANSACTION',tx.transaction_id::text,'WORKFLOW',tx.action_type,jsonb_build_object('decision',tx.decision,'requestDigest',tx.request_digest),p_correlation_id),
    (p_enterprise_id,'DECISION',tx.decision_id::text,'GOVERNANCE',tx.decision,jsonb_build_object('trustState',tx.trust_state),p_correlation_id),
    (p_enterprise_id,'AUTHORITY',tx.authority_reference,'AUTHORITY','Authority lineage',jsonb_build_object('reference',tx.authority_reference),p_correlation_id),
    (p_enterprise_id,'POLICY',tx.policy_id||':'||tx.policy_version,'GOVERNANCE','Policy version',jsonb_build_object('policyHash',tx.policy_hash),p_correlation_id)
  on conflict do nothing;
  select node_id into subject_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='SUBJECT' and external_id=tx.subject_id;
  select node_id into tx_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='TRUST_TRANSACTION' and external_id=tx.transaction_id::text;
  select node_id into decision_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='DECISION' and external_id=tx.decision_id::text;
  select node_id into authority_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='AUTHORITY' and external_id=tx.authority_reference;
  select node_id into policy_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='POLICY' and external_id=tx.policy_id||':'||tx.policy_version;
  insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,correlation_id) values
    (p_enterprise_id,subject_node,tx_node,'PARTICIPATED_IN',p_correlation_id),
    (p_enterprise_id,tx_node,authority_node,'AUTHORIZED_BY',p_correlation_id),
    (p_enterprise_id,policy_node,decision_node,'APPLIES_TO',p_correlation_id),
    (p_enterprise_id,decision_node,tx_node,'RESULTED_IN',p_correlation_id)
  on conflict do nothing;
  for item in select value from jsonb_array_elements(tx.evidence_references) loop
    insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id) values(p_enterprise_id,'EVIDENCE_REFERENCE',item->>'reference','IDENTITY',item->>'providerId',jsonb_build_object('providerEventId',item->>'providerEventId','sourceDigest',item->>'sourceDigest'),p_correlation_id) on conflict do nothing;
    select node_id into evidence_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type='EVIDENCE_REFERENCE' and external_id=item->>'reference';
    insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,correlation_id) values(p_enterprise_id,evidence_node,decision_node,'SUPPORTED',p_correlation_id) on conflict do nothing;
  end loop;
  authority_projection:=coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,graphProjection}','{}'::jsonb);
  forecast_projection:=coalesce(tx.decision_time_snapshot#>'{trustForecast,graphProjection}','{}'::jsonb);
  twin_projection:=coalesce(tx.decision_time_snapshot#>'{trustTwin,graphProjection}','{}'::jsonb);
  for projection in select value from jsonb_array_elements(jsonb_build_array(authority_projection,forecast_projection,twin_projection)) loop
    for item in select value from jsonb_array_elements(coalesce(projection->'nodes','[]'::jsonb)) loop
      if nullif(item->>'nodeType','') is not null and nullif(item->>'externalId','') is not null then
        insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata,correlation_id)
        values(p_enterprise_id,item->>'nodeType',item->>'externalId',coalesce(nullif(item->>'domainKey',''),'GOVERNANCE'),item->>'label',coalesce(item->'metadata','{}'::jsonb)||jsonb_build_object('canonicalTransactionId',p_transaction_id),p_correlation_id)
        on conflict do nothing;
      end if;
    end loop;
    for edge in select value from jsonb_array_elements(coalesce(projection->'edges','[]'::jsonb)) loop
      select node_id into from_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type=edge->>'fromNodeType' and external_id=edge->>'fromExternalId';
      select node_id into to_node from public.evidence_graph_nodes where enterprise_id=p_enterprise_id and node_type=edge->>'toNodeType' and external_id=edge->>'toExternalId';
      if from_node is not null and to_node is not null then
        insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,correlation_id)
        values(p_enterprise_id,from_node,to_node,edge->>'edgeType',p_correlation_id) on conflict do nothing;
      end if;
    end loop;
  end loop;
  update public.canonical_trust_transactions set evidence_graph_reference=tx_node,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'evidenceGraphReference',tx_node,'authorityIntegrityNodes',jsonb_array_length(coalesce(authority_projection->'nodes','[]'::jsonb)),'trustForecastNodes',jsonb_array_length(coalesce(forecast_projection->'nodes','[]'::jsonb)),'trustTwinNodes',jsonb_array_length(coalesce(twin_projection->'nodes','[]'::jsonb)));
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'EVIDENCE_GRAPH_LINKED',p_actor_id,'Canonical authority-integrity, Trust Twin, pressure, budget, and Trust Forecast relationships linked.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','evidenceGraphReference',tx_node);
end $$;
revoke all on function public.extend_canonical_trust_transaction_graph_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.extend_canonical_trust_transaction_graph_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.append_canonical_trust_transaction_replay_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare tx public.canonical_trust_transactions%rowtype; replay uuid; payload jsonb; item jsonb; artifact_replay jsonb;
begin
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id then raise exception 'Canonical transaction scope mismatch'; end if;
  if tx.replay_reference is not null then return jsonb_build_object('status','DUPLICATE','replayReference',tx.replay_reference); end if;
  artifact_replay:=coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,replayEvents}','[]'::jsonb)||coalesce(tx.decision_time_snapshot#>'{trustTwin,replayEvents}',tx.decision_time_snapshot#>'{trustForecast,replayEvents}','[]'::jsonb);
  insert into public.trust_replay_sessions(subject_type,subject_id,workspace_id,owner_user_id,correlation_id,canonical_transaction_id,replay_summary,generated_by)
  values('workflow',tx.workflow_id::uuid,p_enterprise_id,p_actor_id,p_correlation_id,p_transaction_id,tx.decision||': '||array_to_string(tx.reason_codes,', ')||case when jsonb_array_length(artifact_replay)>0 then ' | trust intelligence events: '||jsonb_array_length(artifact_replay)::text else '' end,'canonical_trust_transaction') returning id into replay;
  for item in select value from jsonb_array_elements(artifact_replay) loop
    insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
    values(p_enterprise_id,p_transaction_id,item->>'eventType',p_actor_id,coalesce(item->'details','{}'::jsonb)::text,coalesce(item->'evidenceReferences','[]'::jsonb),tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(extensions.digest(item::text,'sha256'),'hex'),coalesce((item->>'occurredAt')::timestamptz,tx.requested_at));
  end loop;
  update public.canonical_trust_transactions set replay_reference=replay,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'replayReference',replay,'decision',tx.decision,'trustIntelligenceEvents',jsonb_array_length(artifact_replay));
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'REPLAY_WRITTEN',p_actor_id,'Chronology appended after canonical decision persistence and graph linkage.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','replayReference',replay);
end $$;
revoke all on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.append_canonical_trust_transaction_replay_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.emit_canonical_trust_transaction_memory_v1(p_enterprise_id uuid,p_transaction_id uuid,p_actor_id uuid,p_correlation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare tx public.canonical_trust_transactions%rowtype; memory uuid; payload jsonb; item jsonb; artifact_memory jsonb; memory_domain text;
begin
  select * into tx from public.canonical_trust_transactions where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id for update;
  if tx.transaction_id is null or tx.actor_id<>p_actor_id or tx.correlation_id<>p_correlation_id or not tx.material_change then raise exception 'Non-material Trust Memory write rejected'; end if;
  if tx.trust_memory_reference is not null then return jsonb_build_object('status','DUPLICATE','trustMemoryReference',tx.trust_memory_reference); end if;
  artifact_memory:=coalesce(tx.decision_time_snapshot#>'{authorityIntegrity,trustMemoryEvents}','[]'::jsonb)||coalesce(tx.decision_time_snapshot#>'{trustTwin,trustMemoryEvents}',tx.decision_time_snapshot#>'{trustForecast,trustMemoryEvents}','[]'::jsonb);
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id)
  values(p_enterprise_id,tx.subject_id,'RUNTIME','CANONICAL_TRUST_TRANSACTION',p_transaction_id::text,tx.requested_at,jsonb_build_object('decision',tx.decision,'trustState',tx.trust_state,'changedConditions',tx.changed_conditions,'previousTransactionId',tx.previous_transaction_id,'trustIntelligenceEventCount',jsonb_array_length(artifact_memory)),p_correlation_id) returning memory_id into memory;
  for item in select value from jsonb_array_elements(artifact_memory) loop
    memory_domain:=case when item->>'eventType' like 'FORECAST_%' or item->>'eventType' like 'TRUST_%' or item->>'eventType'='DEPLOYMENT_HELD' then 'GOVERNANCE' else 'AUTHORITY' end;
    insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id)
    values(p_enterprise_id,tx.subject_id,memory_domain,item->>'eventType',p_transaction_id::text||':'||item->>'eventId',coalesce((item->>'occurredAt')::timestamptz,tx.requested_at),jsonb_build_object('canonicalTransactionId',p_transaction_id,'evidenceReferences',coalesce(item->'evidenceReferences','[]'::jsonb),'knownAtForecastTime',true),p_correlation_id)
    on conflict do nothing;
  end loop;
  update public.canonical_trust_transactions set trust_memory_reference=memory,updated_at=now() where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id;
  payload:=jsonb_build_object('transactionId',p_transaction_id,'trustMemoryReference',memory,'changedConditions',tx.changed_conditions,'trustIntelligenceEvents',jsonb_array_length(artifact_memory));
  insert into public.canonical_trust_transaction_events(enterprise_id,transaction_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at)
  values(p_enterprise_id,p_transaction_id,'TRUST_MEMORY_WRITTEN',p_actor_id,'Material trust state, authority integrity, or forecast change recorded.',tx.evidence_references,tx.authority_reference,tx.policy_id,tx.policy_version,p_correlation_id,encode(extensions.digest(payload::text,'sha256'),'hex'),now());
  return jsonb_build_object('status','CREATED','trustMemoryReference',memory);
end $$;
revoke all on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.emit_canonical_trust_transaction_memory_v1(uuid,uuid,uuid,uuid) to service_role;

comment on function public.extend_canonical_trust_transaction_graph_v1(uuid,uuid,uuid,uuid) is 'Extends the canonical Evidence Graph with immutable authority-integrity, derived Trust Twin, Trust Pressure, Trust Budget, and Trust Forecast projections; no parallel graph or decision engine.';
