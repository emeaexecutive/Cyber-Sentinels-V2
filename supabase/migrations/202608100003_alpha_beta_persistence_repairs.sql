-- Repair canonical persistence contracts exercised by the Alpha/Beta product proof.
-- This replaces the existing Continuous Trust projection; it does not create a
-- parallel evidence path or a second entity model.

create or replace function public.project_continuous_trust_signal_v1(
  p_tenant_id uuid,
  p_signal_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare signal public.trust_signals%rowtype;
declare evidence_result text;
declare assurance text;
declare domain text;
begin
  if auth.role()<>'service_role' then
    raise exception 'Continuous Trust worker service path required';
  end if;
  select * into signal from public.trust_signals
  where tenant_id=p_tenant_id and id=p_signal_id;
  if not found then raise exception 'Continuous Trust signal was not found'; end if;
  evidence_result:=case signal.status
    when 'POSITIVE' then 'INCONCLUSIVE'
    when 'NEGATIVE' then 'NEGATIVE'
    when 'UNAVAILABLE' then 'UNAVAILABLE'
    when 'REVOKED' then 'REVOKED'
    else 'INCONCLUSIVE'
  end;
  assurance:=case
    when signal.confidence>=0.9 then 'VERY_HIGH'
    when signal.confidence>=0.7 then 'HIGH'
    when signal.confidence>=0.4 then 'MEDIUM'
    when signal.confidence>0 then 'LOW'
    else 'NONE'
  end;
  domain:=case signal.entity_type
    when 'AI_AGENT' then 'AI_AGENT'
    when 'DEVICE' then 'DEVICE'
    when 'ENTERPRISE_WORKFLOW' then 'WORKFLOW'
    when 'SESSION' then 'RUNTIME'
    when 'CREDENTIAL' then 'AUTHORITY'
    else case signal.signal_type
      when 'NETWORK' then 'NETWORK'
      when 'VPN' then 'NETWORK'
      when 'AUTHORITY' then 'AUTHORITY'
      when 'ENTERPRISE_POLICY' then 'GOVERNANCE'
      else 'IDENTITY'
    end
  end;
  insert into public.evidence_objects(
    id,evidence_id,enterprise_id,provider_key,evidence_classification,
    storage_boundary,normalized_facts,occurred_at,retention_expires_at,
    domain_key,subject_id,subject_type,evidence_type,source_type,source_key,
    result,assurance_level,cryptographically_verified,server_verified,
    observed_at,freshness_policy_seconds,received_at,payload_hash,
    canonicalization,hash_algorithm,reason_codes
  ) values (
    signal.id,signal.id,signal.tenant_id,coalesce(signal.provider,signal.source),
    'CONTINUOUS_TRUST_SIGNAL','NORMALIZED_LEDGER',
    jsonb_build_object(
      'signalType',signal.signal_type,'status',signal.status,
      'severity',signal.severity,'confidence',signal.confidence,
      'metadata',signal.metadata
    ),signal.observed_at,signal.created_at+interval '365 days',
    domain,signal.entity_id,signal.entity_type,signal.signal_type,
    'CONTINUOUS_TRUST_SIGNAL',signal.source,evidence_result,assurance,
    false,true,signal.observed_at,3600,signal.received_at,signal.fingerprint,
    'JCS','SHA-256',
    case
      when signal.status='POSITIVE'
        then array['CONTINUOUS_TRUST_POSITIVE_SIGNAL_CONTEXT_ONLY']
      else array['CONTINUOUS_TRUST_SIGNAL_ACCEPTED']
    end
  ) on conflict(evidence_id) do nothing;
  insert into public.trust_references(
    enterprise_id,source_type,source_id,ref_type,ref_id
  ) values (
    signal.tenant_id,'TRUST_SIGNAL',signal.id::text,'EVIDENCE_OBJECT',signal.id::text
  ) on conflict do nothing;
  return jsonb_build_object('signalId',signal.id,'evidenceId',signal.id,'projected',true);
end $$;

revoke all on function public.project_continuous_trust_signal_v1(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.project_continuous_trust_signal_v1(uuid,uuid)
  to service_role;

comment on function public.project_continuous_trust_signal_v1(uuid,uuid) is
  'Projects an accepted signal into canonical evidence with explicit observation time and freshness policy.';
