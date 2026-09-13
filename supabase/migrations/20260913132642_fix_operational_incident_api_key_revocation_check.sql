-- Forward-only repair: API key revocation uses status and revoked_at.
begin;

create or replace function public.persist_operational_incident_v2(
 p_tenant_id uuid,p_client_id uuid,p_key_id uuid,p_incident_id uuid,p_operation text,p_record jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 t public.canonical_trust_transactions%rowtype;
 i public.incident_regulatory_assessments%rowtype;
 e public.evidence_objects%rowtype;
 record_id uuid := (p_record->>'id')::uuid;
 transaction_ref uuid := (p_record->>'transaction_id')::uuid;
 evidence_ref uuid := nullif(p_record->>'evidence_object_id','')::uuid;
 event_time timestamptz := (p_record->>'observed_at')::timestamptz;
 received timestamptz := clock_timestamp();
 record_hash text;
 incident_node uuid;
 event_node uuid;
 version_number integer;
 required_scope text := case when p_operation='export' then 'evidence:export' else 'incidents:write' end;
begin
 if not exists(select 1 from public.api_keys k where k.id=p_key_id and k.tenant_id=p_tenant_id
   and k.client_id=p_client_id and k.status='active' and k.revoked_at is null
   and (k.expires_at is null or k.expires_at>now()) and required_scope=any(k.scopes)) then
   raise exception using errcode='42501',message='Operational incident access denied';
 end if;
 if p_operation not in ('open','append','export') or jsonb_typeof(p_record)<>'object'
   or octet_length(p_record::text)>1048576 then raise exception 'Invalid operational incident record'; end if;
 -- Serialize every writer for an incident, including package generation.
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||':'||p_incident_id::text,0));
 select * into i from public.incident_regulatory_assessments where enterprise_id=p_tenant_id and id=p_incident_id
   and evidence_mode='CANONICAL_OPERATIONAL' and created_by=p_client_id;
 if p_operation<>'open' and i.id is null then raise exception using errcode='P0002',message='Resource not found'; end if;
 if p_operation='export' then
   if p_record->>'schema_version'<>'cyber-sentinels.incident-evidence.v2.0' or p_record->>'incident_id'<>p_incident_id::text
     or p_record->>'tenant_id'<>p_tenant_id::text then raise exception 'Invalid export binding'; end if;
   if jsonb_typeof(p_record->'timeline') is distinct from 'array' or
      (select count(*) from public.incident_evidence_links where enterprise_id=p_tenant_id and incident_id=p_incident_id)
        <> jsonb_array_length(p_record->'timeline') or exists(
          select 1 from public.incident_evidence_links l where l.enterprise_id=p_tenant_id and l.incident_id=p_incident_id
          and not exists(select 1 from jsonb_array_elements(p_record->'timeline') v where v->>'id'=l.id::text)
        ) then raise exception using errcode='40001',message='Incident changed during export; retry'; end if;
   select coalesce(max(version),0)+1 into version_number from public.incident_submission_packages where enterprise_id=p_tenant_id and incident_id=p_incident_id;
   record_hash:=encode(sha256(convert_to(p_record::text,'UTF8')),'hex');
   insert into public.incident_submission_packages(id,enterprise_id,incident_id,version,state,package_payload,content_digest,package_digest,record_hash,export_schema_version,exported_at,correlation_id)
   values(record_id,p_tenant_id,p_incident_id,version_number,'internal_draft',p_record,p_record->>'integrity_digest',p_record->>'integrity_digest',record_hash,p_record->>'schema_version',received,record_id);
   insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
   values(p_tenant_id,i.agent_id,'GOVERNANCE','INCIDENT_EVIDENCE_EXPORT',record_id::text,received,jsonb_build_object('incidentId',p_incident_id,'packageId',record_id,'digest',p_record->>'integrity_digest'));
   return jsonb_build_object('id',record_id,'version',version_number);
 end if;
 select * into t from public.canonical_trust_transactions where enterprise_id=p_tenant_id and transaction_id=transaction_ref and actor_id=p_client_id;
 if t.transaction_id is null then raise exception using errcode='P0002',message='Resource not found'; end if;
 if event_time is null or event_time>received+interval '30 seconds' then raise exception 'Invalid observation timestamp'; end if;
 if p_operation='open' then
   if i.id is not null then raise exception using errcode='23505',message='Incident already exists'; end if;
   insert into public.incident_regulatory_assessments(id,enterprise_id,ai_system_id,agent_id,incident_category,jurisdiction,initial_state,canonical_case,immutable_hash,created_by,correlation_id,created_at,evidence_mode)
   values(p_incident_id,p_tenant_id,null,t.subject_id,'operational_evidence',null,'evidence_collection',
     jsonb_build_object('transaction_id',transaction_ref,'summary',p_record->>'summary','discovered_at',event_time),
     encode(sha256(convert_to(p_record::text,'UTF8')),'hex'),p_client_id,p_incident_id,received,'CANONICAL_OPERATIONAL');
 elsif p_record->>'kind'='TRANSACTION_LINK' then
   null;
 end if;
 if p_record->>'kind' is null or p_record->>'kind' not in ('TRANSACTION_LINK','EXECUTION_OBSERVATION','OUTCOME','DETECTION','INTERVENTION','CONTAINMENT','REMEDIATION','PURPOSE_OBSERVATION') then raise exception 'Invalid chronology kind'; end if;
 if p_record->>'kind'<>'TRANSACTION_LINK' and evidence_ref is null then raise exception 'Evidence required'; end if;
 if evidence_ref is not null then
   select * into e from public.evidence_objects where enterprise_id=p_tenant_id and evidence_id=evidence_ref and subject_id=t.subject_id;
   if e.evidence_id is null then raise exception using errcode='P0002',message='Resource not found'; end if;
   if e.payload_hash is distinct from p_record->>'evidence_digest' then raise exception 'Evidence digest mismatch'; end if;
 end if;
 record_hash:=encode(sha256(convert_to(p_record::text,'UTF8')),'hex');
 insert into public.incident_chronology_events(id,enterprise_id,incident_id,event_type,source,source_type,source_authority,occurred_at,timestamp_confidence,ingested_at,ordering_confidence,evidence_reference,integrity_state,classification,summary,correlation_id,record_hash)
 values(record_id,p_tenant_id,p_incident_id,p_record->>'kind',coalesce(e.provider_key,'Cyber Sentinels'),coalesce(e.source_type,'CANONICAL_TRANSACTION'),
   'ATTRIBUTED_SOURCE_ONLY',event_time,'unknown',received,'unknown',coalesce(evidence_ref::text,transaction_ref::text),
   'unverified',case when evidence_ref is null then 'TECHNICAL EVIDENCE' else 'PROVIDER ASSERTION' end,p_record->>'summary',record_id,record_hash);
 insert into public.incident_evidence_links(id,enterprise_id,incident_id,chronology_event_id,transaction_id,evidence_object_id,relation_type,details,content_digest,received_at)
 values(record_id,p_tenant_id,p_incident_id,record_id,transaction_ref,evidence_ref,p_record->>'kind',p_record,p_record->>'content_digest',received);
 insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary)
 values(p_tenant_id,t.subject_id,'GOVERNANCE','INCIDENT_'||(p_record->>'kind'),record_id::text,received,
   jsonb_build_object('incidentId',p_incident_id,'transactionId',transaction_ref,'chronologyEventId',record_id,'originalDecision',t.decision,'originalPurpose',t.action_purpose,'evidenceReference',evidence_ref,'source',e.provider_key,'interpretation',p_record->'observed_purpose'));
 insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata)
 values(p_tenant_id,'INCIDENT',p_incident_id::text,'GOVERNANCE','Operational incident','{}') on conflict do nothing;
 select node_id into incident_node from public.evidence_graph_nodes where enterprise_id=p_tenant_id and node_type='INCIDENT' and external_id=p_incident_id::text;
 insert into public.evidence_graph_nodes(enterprise_id,node_type,external_id,domain_key,label,metadata)
 values(p_tenant_id,'INCIDENT_CHRONOLOGY_EVENT',record_id::text,'GOVERNANCE',p_record->>'kind',jsonb_build_object('transactionId',transaction_ref,'evidenceReference',evidence_ref,'source',e.provider_key,'attributionEstablished',false)) returning node_id into event_node;
 insert into public.evidence_graph_edges(enterprise_id,from_node_id,to_node_id,edge_type,evidence_id)
 values(p_tenant_id,incident_node,event_node,'INCLUDES',evidence_ref);
 return jsonb_build_object('id',record_id,'incident_id',p_incident_id);
end $$;
revoke all on function public.persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.persist_operational_incident_v2(uuid,uuid,uuid,uuid,text,jsonb) to service_role;
commit;
