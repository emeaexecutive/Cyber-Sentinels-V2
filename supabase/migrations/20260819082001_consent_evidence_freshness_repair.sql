-- Repair active evidence writers after observed_at and
-- freshness_policy_seconds became mandatory. This migration preserves the
-- canonical evidence_objects store and does not add compatibility defaults.

create or replace function public.materialize_consent_receipt_evidence_v1()
returns trigger
language plpgsql
security definer
set search_path=public as $$
begin
  insert into public.evidence_objects(
    id,evidence_id,enterprise_id,provider_key,evidence_classification,
    storage_boundary,normalized_facts,occurred_at,observed_at,
    freshness_policy_seconds,retention_expires_at,domain_key,subject_id,
    subject_type,evidence_type,source_type,source_key,result,assurance_level,
    cryptographically_verified,server_verified,received_at,expires_at,
    payload_hash,canonicalization,hash_algorithm,reason_codes
  ) values (
    gen_random_uuid(),new.receipt_id,new.enterprise_id,
    'cyber_sentinels_consent','CONSENT_RECEIPT','NORMALIZED_LEDGER',
    jsonb_build_object(
      'policyVersion',new.policy_version,
      'consentAction',new.consent_action,
      'categories',new.categories
    ),
    new.occurred_at,new.occurred_at,86400,new.expires_at,
    'CONSENT',new.subject_key,'HUMAN','CONSENT_RECEIPT','CONSENT_MANAGER',
    'cyber_sentinels_consent',
    case when new.consent_action='WITHDRAW' then 'REVOKED' else 'INCONCLUSIVE' end,
    'MEDIUM',false,true,new.received_at,new.expires_at,new.receipt_hash,
    'JCS','SHA-256',array['CONSENT_RECEIPT_INTEGRITY_RECORDED']
  );
  new.evidence_object_id:=new.receipt_id;
  return new;
end $$;

-- Provider observations are the other active trigger writer created before
-- freshness became mandatory. Keep its existing evidence mapping while making
-- the observation and freshness contract explicit at the writer boundary.
create or replace function public.materialize_provider_observation_evidence_v1()
returns trigger
language plpgsql
security definer
set search_path=public as $$
declare mapped_result text;
declare mapped_assurance text;
begin
  mapped_result:=case
    when new.result='PASS' and new.provider_key<>'world_id' and new.server_verified then 'POSITIVE'
    when new.result in ('FAIL','BLOCKED') then 'NEGATIVE'
    when new.result='REVOKED' then 'REVOKED'
    when new.result='UNAVAILABLE' then 'UNAVAILABLE'
    else 'INCONCLUSIVE'
  end;
  mapped_assurance:=case
    when new.assurance>=0.9 then 'VERY_HIGH'
    when new.assurance>=0.7 then 'HIGH'
    when new.assurance>=0.4 then 'MEDIUM'
    when new.assurance>0 then 'LOW'
    else 'NONE'
  end;
  insert into public.evidence_objects(
    id,evidence_id,enterprise_id,provider_key,evidence_classification,
    storage_boundary,normalized_facts,occurred_at,observed_at,
    freshness_policy_seconds,retention_expires_at,domain_key,subject_id,
    subject_type,evidence_type,source_type,source_key,result,assurance_level,
    cryptographically_verified,server_verified,received_at,expires_at,
    payload_hash,canonicalization,hash_algorithm,reason_codes
  ) values (
    gen_random_uuid(),new.observation_id,new.enterprise_id,new.provider_key,
    'PROVIDER_OBSERVATION','NORMALIZED_LEDGER',
    jsonb_build_object(
      'signalType',new.signal_type,
      'result',new.result,
      'quality',new.quality
    ),
    new.occurred_at,new.occurred_at,86400,new.expires_at,
    'IDENTITY',new.subject_id,'HUMAN',new.signal_type,
    'PROVIDER_OBSERVATION',new.provider_key,mapped_result,mapped_assurance,
    new.signature_verified,new.server_verified,new.received_at,new.expires_at,
    new.evidence_digest,'JCS','SHA-256',
    case
      when new.provider_key='world_id'
        then array['WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED']
      else new.reason_codes
    end
  );
  new.evidence_object_id:=new.observation_id;
  return new;
end $$;
