-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 5: transactional, idempotent, service-role-only consent persistence.

begin;

do $reconciliation_gate$
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_CONSENT_RPC_FAILED: app.reconciliation.environment must equal staging';
  end if;
  if not exists (
    select 1
    from public.schema_reconciliation_runs
    where reconciliation_key = '202607300004_consent_foundation'
      and status = 'completed'
  ) then
    raise exception
      'RECONCILIATION_CONSENT_RPC_FAILED: consent foundation is required';
  end if;
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'persist_consent_change_v1',
        'create_consent_policy_v1'
      )
  ) then
    raise exception
      'RECONCILIATION_CONSENT_RPC_FAILED: consent RPC name collision detected';
  end if;
end
$reconciliation_gate$;

create function public.persist_consent_change_v1(
  p_receipt jsonb,
  p_subject_key text,
  p_idempotency_key text,
  p_request_hash text,
  p_trust_events jsonb,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_enterprise_id uuid;
  v_receipt_id uuid;
  v_user_id uuid;
  v_existing public.consent_receipts%rowtype;
  v_first_choice boolean;
  v_action_event text;
  v_trust_event jsonb;
  v_trust_status text;
  v_occurred_at timestamptz;
  v_received_at timestamptz;
  v_expires_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted consent path required';
  end if;

  if p_receipt is null
     or jsonb_typeof(p_receipt) <> 'object'
     or p_correlation_id is null
     or p_subject_key is null
     or length(btrim(p_subject_key)) not between 1 and 300
     or p_idempotency_key is null
     or length(btrim(p_idempotency_key)) not between 8 and 160
     or p_request_hash is null
     or p_request_hash !~ '^[a-f0-9]{64}$'
     or p_trust_events is null
     or jsonb_typeof(p_trust_events) <> 'array'
     or jsonb_array_length(p_trust_events) < 1 then
    raise exception 'Invalid consent persistence request';
  end if;

  begin
    v_enterprise_id := (p_receipt ->> 'enterpriseId')::uuid;
    v_receipt_id := (p_receipt ->> 'receiptId')::uuid;
    v_user_id := nullif(p_receipt ->> 'userId', '')::uuid;
    v_occurred_at := (p_receipt ->> 'occurredAt')::timestamptz;
    v_received_at := (p_receipt ->> 'receivedAt')::timestamptz;
    v_expires_at := nullif(p_receipt ->> 'expiresAt', '')::timestamptz;
  exception
    when invalid_text_representation
      or datetime_field_overflow
      or invalid_datetime_format then
      raise exception 'Invalid Consent Receipt identifiers or timestamps';
  end;

  if v_enterprise_id is null
     or v_receipt_id is null
     or not exists (
       select 1
       from public.trust_workspaces
       where id = v_enterprise_id
     )
     or ((v_user_id is null) =
       (nullif(p_receipt ->> 'anonymousId', '') is null))
     or nullif(p_receipt ->> 'policyVersion', '') is null
     or nullif(p_receipt ->> 'bannerVersion', '') is null
     or nullif(p_receipt ->> 'preferenceSchemaVersion', '') is null
     or (p_receipt ->> 'regionProfile') not in (
       'EEA', 'UK', 'US_GENERAL', 'US_OPT_OUT', 'GLOBAL_DEFAULT'
     )
     or nullif(p_receipt ->> 'language', '') is null
     or (p_receipt ->> 'consentAction') not in (
       'ACCEPT_ALL', 'REJECT_OPTIONAL', 'SAVE_PREFERENCES',
       'WITHDRAW', 'POLICY_RECONSENT', 'SYSTEM_MIGRATION'
     )
     or nullif(p_receipt ->> 'source', '') is null
     or p_receipt ->> 'canonicalization' <> 'RFC8785-JCS'
     or p_receipt ->> 'hashAlgorithm' <> 'SHA-256'
     or (p_receipt ->> 'receiptHash') !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_receipt -> 'categories') <> 'object'
     or p_receipt #>> '{categories,essential}' <> 'true'
     or jsonb_typeof(p_receipt #> '{categories,essential}') <> 'boolean'
     or jsonb_typeof(p_receipt #> '{categories,functional}') <> 'boolean'
     or jsonb_typeof(p_receipt #> '{categories,analytics}') <> 'boolean'
     or jsonb_typeof(p_receipt #> '{categories,ai_improvements}') <> 'boolean'
     or jsonb_typeof(p_receipt #> '{categories,marketing}') <> 'boolean'
     or jsonb_typeof(p_receipt -> 'purposes') <> 'array'
     or jsonb_typeof(p_receipt -> 'providers') <> 'array'
     or v_received_at < v_occurred_at
     or (v_expires_at is not null and v_expires_at <= v_occurred_at) then
    raise exception 'Invalid Consent Receipt metadata';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_enterprise_id::text || ':' || btrim(p_subject_key),
      23
    )
  );

  select *
    into v_existing
  from public.consent_receipts
  where enterprise_id = v_enterprise_id
    and subject_key = btrim(p_subject_key)
    and idempotency_key = btrim(p_idempotency_key)
  for update;

  if found then
    if v_existing.request_hash = p_request_hash then
      return jsonb_build_object(
        'status', 'DUPLICATE',
        'receiptId', v_existing.receipt_id,
        'receiptHash', v_existing.receipt_hash,
        'expiresAt', v_existing.expires_at,
        'categories', v_existing.categories
      );
    end if;
    return jsonb_build_object(
      'status', 'CONFLICT',
      'receiptId', v_existing.receipt_id,
      'receiptHash', v_existing.receipt_hash,
      'expiresAt', v_existing.expires_at,
      'categories', v_existing.categories
    );
  end if;

  if exists (
    select 1
    from public.consent_receipts
    where receipt_id = v_receipt_id
  ) then
    raise exception 'Consent Receipt identifier already exists';
  end if;

  for v_trust_event in
    select value from jsonb_array_elements(p_trust_events)
  loop
    if jsonb_typeof(v_trust_event) <> 'object'
       or v_trust_event ->> 'enterpriseId' <>
         v_enterprise_id::text
       or v_trust_event #>> '{normalizedFacts,receiptReference}' <>
         'consent-receipt:' || v_receipt_id::text then
      raise exception 'Consent Trust Event does not match the receipt';
    end if;
  end loop;

  v_first_choice := not exists (
    select 1
    from public.consent_preferences
    where enterprise_id = v_enterprise_id
      and subject_key = btrim(p_subject_key)
  );

  insert into public.consent_receipts(
    receipt_id,
    enterprise_id,
    user_id,
    anonymous_id_hash,
    subject_key,
    policy_version,
    banner_version,
    preference_schema_version,
    region_profile,
    language,
    categories,
    purposes,
    providers,
    consent_action,
    occurred_at,
    received_at,
    expires_at,
    source,
    user_agent_hash,
    coarse_country,
    receipt_hash,
    hash_algorithm,
    canonicalization,
    canonical_receipt,
    idempotency_key,
    request_hash
  )
  values (
    v_receipt_id,
    v_enterprise_id,
    v_user_id,
    nullif(p_receipt ->> 'anonymousId', ''),
    btrim(p_subject_key),
    p_receipt ->> 'policyVersion',
    p_receipt ->> 'bannerVersion',
    p_receipt ->> 'preferenceSchemaVersion',
    p_receipt ->> 'regionProfile',
    p_receipt ->> 'language',
    p_receipt -> 'categories',
    array(
      select jsonb_array_elements_text(p_receipt -> 'purposes')
    ),
    array(
      select jsonb_array_elements_text(p_receipt -> 'providers')
    ),
    p_receipt ->> 'consentAction',
    v_occurred_at,
    v_received_at,
    v_expires_at,
    left(p_receipt ->> 'source', 80),
    nullif(p_receipt ->> 'userAgentHash', ''),
    nullif(p_receipt ->> 'coarseCountry', ''),
    p_receipt ->> 'receiptHash',
    p_receipt ->> 'hashAlgorithm',
    p_receipt ->> 'canonicalization',
    p_receipt,
    btrim(p_idempotency_key),
    p_request_hash
  );

  insert into public.consent_preferences(
    enterprise_id,
    user_id,
    anonymous_id_hash,
    subject_key,
    policy_version,
    region_profile,
    categories,
    current_receipt_id,
    expires_at
  )
  values (
    v_enterprise_id,
    v_user_id,
    nullif(p_receipt ->> 'anonymousId', ''),
    btrim(p_subject_key),
    p_receipt ->> 'policyVersion',
    p_receipt ->> 'regionProfile',
    p_receipt -> 'categories',
    v_receipt_id,
    v_expires_at
  )
  on conflict (enterprise_id, subject_key)
  do update
  set
    user_id = excluded.user_id,
    anonymous_id_hash = excluded.anonymous_id_hash,
    policy_version = excluded.policy_version,
    region_profile = excluded.region_profile,
    categories = excluded.categories,
    current_receipt_id = excluded.current_receipt_id,
    expires_at = excluded.expires_at,
    updated_at = now();

  v_action_event := case p_receipt ->> 'consentAction'
    when 'ACCEPT_ALL' then 'consent.accept_all'
    when 'REJECT_OPTIONAL' then 'consent.reject_optional'
    when 'WITHDRAW' then 'consent.withdrawn'
    when 'POLICY_RECONSENT' then 'consent.policy.reconsent_required'
    else 'consent.preferences.saved'
  end;

  if v_first_choice then
    insert into public.consent_events(
      enterprise_id,
      receipt_id,
      subject_key,
      event_type,
      reason_code,
      metadata,
      occurred_at
    )
    values (
      v_enterprise_id,
      v_receipt_id,
      btrim(p_subject_key),
      'consent.banner.displayed',
      'CONSENT_BANNER_FIRST_CHOICE',
      jsonb_build_object(
        'policyVersion', p_receipt ->> 'policyVersion'
      ),
      v_occurred_at
    );
  end if;

  insert into public.consent_events(
    enterprise_id,
    receipt_id,
    subject_key,
    event_type,
    reason_code,
    metadata,
    occurred_at
  )
  values
    (
      v_enterprise_id,
      v_receipt_id,
      btrim(p_subject_key),
      v_action_event,
      'CONSENT_' || (p_receipt ->> 'consentAction'),
      jsonb_build_object(
        'policyVersion', p_receipt ->> 'policyVersion',
        'regionProfile', p_receipt ->> 'regionProfile'
      ),
      v_occurred_at
    ),
    (
      v_enterprise_id,
      v_receipt_id,
      btrim(p_subject_key),
      'consent.receipt.created',
      'CONSENT_RECEIPT_INTEGRITY_RECORDED',
      jsonb_build_object(
        'receiptHash', p_receipt ->> 'receiptHash'
      ),
      v_received_at
    );

  for v_trust_event in
    select value from jsonb_array_elements(p_trust_events)
  loop
    v_trust_status := public.append_trust_event_v1(
      v_trust_event,
      null,
      p_correlation_id
    );
    if v_trust_status <> 'APPENDED' then
      raise exception 'Consent Trust Event chain conflict';
    end if;
  end loop;

  insert into public.consent_audit_log(
    enterprise_id,
    receipt_id,
    action,
    actor_reference,
    correlation_id,
    metadata
  )
  values (
    v_enterprise_id,
    v_receipt_id,
    'CONSENT_RECEIPT_CREATED',
    btrim(p_subject_key),
    p_correlation_id,
    jsonb_build_object(
      'action', p_receipt ->> 'consentAction',
      'policyVersion', p_receipt ->> 'policyVersion'
    )
  );

  return jsonb_build_object(
    'status', 'CREATED',
    'receiptId', v_receipt_id,
    'receiptHash', p_receipt ->> 'receiptHash',
    'expiresAt', v_expires_at,
    'categories', p_receipt -> 'categories'
  );
end;
$function$;

revoke all on function public.persist_consent_change_v1(
  jsonb,
  text,
  text,
  text,
  jsonb,
  uuid
) from public;
revoke all on function public.persist_consent_change_v1(
  jsonb,
  text,
  text,
  text,
  jsonb,
  uuid
) from anon;
revoke all on function public.persist_consent_change_v1(
  jsonb,
  text,
  text,
  text,
  jsonb,
  uuid
) from authenticated;
grant execute on function public.persist_consent_change_v1(
  jsonb,
  text,
  text,
  text,
  jsonb,
  uuid
) to service_role;

create function public.create_consent_policy_v1(
  p_policy jsonb,
  p_trust_events jsonb,
  p_correlation_id uuid,
  p_actor_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_enterprise_id uuid;
  v_policy_id uuid;
  v_trust_event jsonb;
  v_trust_status text;
  v_event_name text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Trusted consent policy path required';
  end if;
  if p_policy is null
     or jsonb_typeof(p_policy) <> 'object'
     or p_trust_events is null
     or jsonb_typeof(p_trust_events) <> 'array'
     or jsonb_array_length(p_trust_events) < 1
     or p_correlation_id is null
     or nullif(btrim(p_actor_reference), '') is null then
    raise exception 'Invalid consent policy request';
  end if;

  begin
    v_enterprise_id := (p_policy ->> 'enterpriseId')::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Invalid consent policy enterprise identifier';
  end;

  if not exists (
       select 1
       from public.trust_workspaces
       where id = v_enterprise_id
     )
     or nullif(p_policy ->> 'version', '') is null
     or (p_policy ->> 'status') not in ('DRAFT', 'ACTIVE')
     or nullif(p_policy ->> 'effectiveAt', '') is null
     or nullif(p_policy ->> 'locale', '') is null
     or (p_policy ->> 'contentHash') !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid consent policy metadata';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_enterprise_id::text || ':consent-policy', 29)
  );

  insert into public.consent_policy_versions(
    enterprise_id,
    version,
    status,
    effective_at,
    supersedes_version,
    locale,
    content_hash,
    requires_reconsent,
    created_by
  )
  values (
    v_enterprise_id,
    p_policy ->> 'version',
    p_policy ->> 'status',
    (p_policy ->> 'effectiveAt')::timestamptz,
    nullif(p_policy ->> 'supersedesVersion', ''),
    p_policy ->> 'locale',
    p_policy ->> 'contentHash',
    coalesce((p_policy ->> 'requiresReconsent')::boolean, false),
    nullif(p_policy ->> 'createdBy', '')::uuid
  )
  returning id into v_policy_id;

  for v_trust_event in
    select value from jsonb_array_elements(p_trust_events)
  loop
    if v_trust_event ->> 'enterpriseId' <> v_enterprise_id::text then
      raise exception 'Consent policy Trust Event tenant mismatch';
    end if;
    v_event_name := v_trust_event ->> 'eventType';
    if v_event_name not in (
      'consent.policy.version_changed',
      'consent.policy.reconsent_required'
    ) then
      raise exception 'Unsupported consent policy Trust Event';
    end if;

    insert into public.consent_events(
      enterprise_id,
      subject_key,
      event_type,
      reason_code,
      metadata,
      occurred_at
    )
    values (
      v_enterprise_id,
      'enterprise:' || v_enterprise_id::text,
      v_event_name,
      case
        when v_event_name = 'consent.policy.reconsent_required'
          then 'CONSENT_POLICY_RECONSENT_REQUIRED'
        else 'CONSENT_POLICY_VERSION_CHANGED'
      end,
      jsonb_build_object(
        'policyVersion', p_policy ->> 'version'
      ),
      now()
    );

    v_trust_status := public.append_trust_event_v1(
      v_trust_event,
      null,
      p_correlation_id
    );
    if v_trust_status <> 'APPENDED' then
      raise exception 'Consent policy Trust Event chain conflict';
    end if;
  end loop;

  insert into public.consent_audit_log(
    enterprise_id,
    action,
    actor_reference,
    correlation_id,
    metadata
  )
  values (
    v_enterprise_id,
    'CONSENT_POLICY_CREATED',
    btrim(p_actor_reference),
    p_correlation_id,
    jsonb_build_object(
      'policyId', v_policy_id,
      'version', p_policy ->> 'version',
      'status', p_policy ->> 'status'
    )
  );

  return jsonb_build_object(
    'id', v_policy_id,
    'version', p_policy ->> 'version',
    'status', p_policy ->> 'status',
    'effectiveAt', p_policy ->> 'effectiveAt',
    'locale', p_policy ->> 'locale',
    'requiresReconsent',
      coalesce((p_policy ->> 'requiresReconsent')::boolean, false)
  );
end;
$function$;

revoke all on function public.create_consent_policy_v1(
  jsonb,
  jsonb,
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.create_consent_policy_v1(
  jsonb,
  jsonb,
  uuid,
  text
) to service_role;

comment on function public.persist_consent_change_v1(
  jsonb,
  text,
  text,
  text,
  jsonb,
  uuid
) is
  'NOT APPROVED FOR PRODUCTION. Service-role-only atomic consent persistence.';

insert into public.schema_reconciliation_runs(
  reconciliation_key,
  phase,
  status,
  completed_at,
  metadata
)
values (
  '202607300005_consent_persistence_rpc',
  'consent_persistence_rpc',
  'completed',
  clock_timestamp(),
  jsonb_build_object(
    'rpc', 'persist_consent_change_v1',
    'signature', 'jsonb,text,text,text,jsonb,uuid',
    'securityDefiner', true,
    'browserExecuteRevoked', true
  )
);

commit;
