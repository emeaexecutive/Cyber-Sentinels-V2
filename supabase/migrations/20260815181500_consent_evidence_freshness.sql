-- Keep consent receipt evidence compatible with the continuous-trust
-- freshness columns added after the original consent evidence trigger.

begin;

create or replace function public.materialize_consent_receipt_evidence_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.evidence_objects(
    id,evidence_id,enterprise_id,provider_key,evidence_classification,
    storage_boundary,normalized_facts,occurred_at,retention_expires_at,
    domain_key,subject_id,subject_type,evidence_type,source_type,source_key,
    result,assurance_level,cryptographically_verified,server_verified,
    received_at,expires_at,payload_hash,canonicalization,hash_algorithm,
    reason_codes,observed_at,freshness_policy_seconds
  ) values (
    gen_random_uuid(),new.receipt_id,new.enterprise_id,
    'cyber_sentinels_consent','CONSENT_RECEIPT','NORMALIZED_LEDGER',
    jsonb_build_object(
      'policyVersion',new.policy_version,
      'consentAction',new.consent_action,
      'categories',new.categories
    ),
    new.occurred_at,new.expires_at,'CONSENT',new.subject_key,'HUMAN',
    'CONSENT_RECEIPT','CONSENT_MANAGER','cyber_sentinels_consent',
    case when new.consent_action = 'WITHDRAW' then 'REVOKED'
      else 'INCONCLUSIVE' end,
    'MEDIUM',false,true,new.received_at,new.expires_at,new.receipt_hash,
    'JCS','SHA-256',array['CONSENT_RECEIPT_INTEGRITY_RECORDED'],
    new.occurred_at,31536000
  );
  new.evidence_object_id := new.receipt_id;
  return new;
end
$function$;

commit;
