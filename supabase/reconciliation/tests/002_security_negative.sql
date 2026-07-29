-- NOT APPROVED FOR PRODUCTION
-- STAGING TEST ONLY - explicit negative role and RLS checks.

begin;

set local app.reconciliation.environment = 'staging';

do $privilege_assertions$
begin
  if has_function_privilege(
       'anon',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     ) then
    raise exception 'TEST_FAILED: anon can execute consent RPC';
  end if;
  if has_function_privilege(
       'authenticated',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     ) then
    raise exception 'TEST_FAILED: authenticated can execute consent RPC';
  end if;
  if not has_function_privilege(
       'service_role',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     ) then
    raise exception 'TEST_FAILED: service role cannot execute consent RPC';
  end if;
end
$privilege_assertions$;

set local role anon;

do $anon_denial$
begin
  begin
    perform count(*) from public.consent_receipts;
    raise exception 'TEST_FAILED: anon direct receipt read succeeded';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into public.consent_receipts(
      receipt_id,
      enterprise_id,
      anonymous_id_hash,
      subject_key,
      policy_version,
      banner_version,
      preference_schema_version,
      region_profile,
      language,
      categories,
      consent_action,
      occurred_at,
      received_at,
      source,
      receipt_hash,
      hash_algorithm,
      canonicalization,
      canonical_receipt,
      idempotency_key,
      request_hash
    )
    values (
      '60000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'synthetic-denied',
      'anonymous:denied',
      'synthetic',
      'synthetic',
      'consent-preferences-v1',
      'GLOBAL_DEFAULT',
      'en',
      '{"essential":true,"functional":false,"analytics":false,"ai_improvements":false,"marketing":false}',
      'REJECT_OPTIONAL',
      now(),
      now(),
      'STAGING_SQL_FIXTURE',
      repeat('a', 64),
      'SHA-256',
      'RFC8785-JCS',
      '{}'::jsonb,
      'synthetic-denied-key',
      repeat('b', 64)
    );
    raise exception 'TEST_FAILED: anon direct receipt write succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end
$anon_denial$;

reset role;
set local request.jwt.claim.role = 'authenticated';
set local role authenticated;

do $authenticated_denial$
begin
  begin
    perform public.persist_consent_change_v1(
      '{}'::jsonb,
      'synthetic-subject',
      'synthetic-auth-denied',
      repeat('c', 64),
      '[]'::jsonb,
      '30000000-0000-4000-8000-000000000001'
    );
    raise exception 'TEST_FAILED: authenticated RPC execution succeeded';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    delete from public.consent_receipts;
    raise exception 'TEST_FAILED: authenticated direct receipt delete succeeded';
  exception
    when insufficient_privilege then
      null;
  end;
end
$authenticated_denial$;

reset role;

rollback;
