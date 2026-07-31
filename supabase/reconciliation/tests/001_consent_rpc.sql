-- NOT APPROVED FOR PRODUCTION
-- STAGING TEST ONLY - synthetic, non-PII consent/RPC fixtures.

begin;

set local app.reconciliation.environment = 'staging';
set local request.jwt.claim.role = 'service_role';

insert into public.trust_workspaces(
  id,
  name,
  slug,
  description,
  created_by,
  is_demo
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Synthetic reconciliation workspace A',
    'synthetic-reconciliation-a',
    'Synthetic staging fixture only',
    '20000000-0000-4000-8000-000000000001',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Synthetic reconciliation workspace B',
    'synthetic-reconciliation-b',
    'Synthetic staging fixture only',
    '20000000-0000-4000-8000-000000000002',
    true
  );

create function pg_temp.synthetic_receipt(
  p_receipt_id uuid,
  p_enterprise_id uuid,
  p_action text,
  p_categories jsonb,
  p_occurred_at timestamptz,
  p_expires_at timestamptz,
  p_receipt_hash text
)
returns jsonb
language sql
as $function$
  select jsonb_build_object(
    'receiptId', p_receipt_id,
    'enterpriseId', p_enterprise_id,
    'userId', null,
    'anonymousId', 'synthetic-anonymous-digest-v1',
    'policyVersion', 'synthetic-policy-v1',
    'bannerVersion', 'synthetic-banner-v1',
    'preferenceSchemaVersion', 'consent-preferences-v1',
    'regionProfile', 'GLOBAL_DEFAULT',
    'language', 'en',
    'categories', p_categories,
    'purposes', jsonb_build_array('secure_service_delivery'),
    'providers', jsonb_build_array('synthetic-provider'),
    'consentAction', p_action,
    'occurredAt', p_occurred_at,
    'receivedAt', p_occurred_at,
    'expiresAt', p_expires_at,
    'source', 'STAGING_SQL_FIXTURE',
    'userAgentHash', null,
    'coarseCountry', null,
    'hashAlgorithm', 'SHA-256',
    'canonicalization', 'RFC8785-JCS',
    'receiptHash', p_receipt_hash
  );
$function$;

create function pg_temp.synthetic_trust_event(
  p_event_id uuid,
  p_enterprise_id uuid,
  p_receipt_id uuid,
  p_event_type text,
  p_sequence bigint,
  p_previous_hash text,
  p_event_hash text
)
returns jsonb
language sql
as $function$
  select jsonb_build_object(
    'eventId', p_event_id,
    'enterpriseId', p_enterprise_id,
    'schemaVersion', 'trust-event-v1',
    'eventType', p_event_type,
    'subject', jsonb_build_object(
      'type', 'HUMAN',
      'id', 'anonymous:synthetic-subject-v1'
    ),
    'actor', jsonb_build_object(
      'type', 'SYSTEM',
      'id', 'synthetic-consent-service'
    ),
    'workflow', null,
    'session', null,
    'authority', null,
    'provider', jsonb_build_object(
      'key', 'cyber_sentinels_consent',
      'protocol', 'UNSIGNED',
      'serverVerified', true,
      'eventId', p_receipt_id,
      'transactionId', 'synthetic-transaction',
      'deliveryId', null
    ),
    'normalizedFacts', jsonb_build_object(
      'policyVersion', 'synthetic-policy-v1',
      'receiptReference', 'consent-receipt:' || p_receipt_id::text,
      'regionProfile', 'GLOBAL_DEFAULT',
      'source', 'STAGING_SQL_FIXTURE'
    ),
    'reasonCodes', jsonb_build_array('SYNTHETIC_STAGING_TEST'),
    'evidenceReferences',
      jsonb_build_array('consent-receipt:' || p_receipt_id::text),
    'occurredAt', '2026-07-29T18:30:00.000Z',
    'receivedAt', '2026-07-29T18:30:00.000Z',
    'sequence', p_sequence,
    'previousHash', p_previous_hash,
    'eventHash', p_event_hash,
    'canonicalization', 'RFC8785-JCS',
    'hashAlgorithm', 'SHA-256',
    'ordering', jsonb_build_object(
      'late', false,
      'supersedesEventId', null,
      'providerSequence', null
    )
  );
$function$;

set local role service_role;

do $test$
declare
  v_workspace constant uuid := '10000000-0000-4000-8000-000000000001';
  v_subject constant text := 'anonymous:synthetic-subject-v1';
  v_correlation constant uuid := '30000000-0000-4000-8000-000000000001';
  v_all_categories constant jsonb :=
    '{"essential":true,"functional":true,"analytics":true,"ai_improvements":true,"marketing":true}'::jsonb;
  v_essential_categories constant jsonb :=
    '{"essential":true,"functional":false,"analytics":false,"ai_improvements":false,"marketing":false}'::jsonb;
  v_optional_categories constant jsonb :=
    '{"essential":true,"functional":false,"analytics":true,"ai_improvements":false,"marketing":false}'::jsonb;
  v_marketing_categories constant jsonb :=
    '{"essential":true,"functional":false,"analytics":false,"ai_improvements":false,"marketing":true}'::jsonb;
  v_receipt jsonb;
  v_events jsonb;
  v_result jsonb;
  v_before bigint;
begin
  -- Valid ACCEPT_ALL receipt and two-event trust-chain append.
  v_receipt := pg_temp.synthetic_receipt(
    '40000000-0000-4000-8000-000000000001',
    v_workspace,
    'ACCEPT_ALL',
    v_all_categories,
    '2026-07-29T18:30:00Z',
    '2027-01-25T18:30:00Z',
    repeat('a', 64)
  );
  v_events := jsonb_build_array(
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000001',
      v_workspace,
      '40000000-0000-4000-8000-000000000001',
      'consent.accept_all',
      1,
      null,
      repeat('b', 64)
    ),
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000002',
      v_workspace,
      '40000000-0000-4000-8000-000000000001',
      'consent.receipt.created',
      2,
      repeat('b', 64),
      repeat('c', 64)
    )
  );
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-accept-all',
    repeat('1', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'CREATED'
     or v_result ->> 'receiptId' <>
       '40000000-0000-4000-8000-000000000001'
     or v_result ->> 'receiptHash' <> repeat('a', 64)
     or v_result -> 'categories' <> v_all_categories then
    raise exception 'TEST_FAILED: valid consent response contract';
  end if;
  if (
    select count(*) from public.consent_receipts
  ) <> 1
     or (
       select count(*) from public.consent_preferences
     ) <> 1
     or (
       select count(*) from public.consent_events
     ) <> 3
     or (
       select count(*)
       from public.trust_events
       where schema_version = 'trust-event-v1'
     ) <> 2
     or (
       select last_sequence
       from public.trust_event_chain_heads
       where enterprise_id = v_workspace
         and partition_key = 'default'
     ) <> 2 then
    raise exception 'TEST_FAILED: valid consent row counts or chain head';
  end if;

  -- Exact idempotent replay returns the original stable receipt.
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-accept-all',
    repeat('1', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'DUPLICATE'
     or v_result ->> 'receiptId' <>
       '40000000-0000-4000-8000-000000000001'
     or (
       select count(*) from public.consent_receipts
     ) <> 1
     or (
       select count(*)
       from public.trust_events
       where schema_version = 'trust-event-v1'
     ) <> 2 then
    raise exception 'TEST_FAILED: exact idempotent replay';
  end if;

  -- Same idempotency key with a different hash is a non-mutating conflict.
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-accept-all',
    repeat('9', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'CONFLICT'
     or v_result ->> 'receiptId' <>
       '40000000-0000-4000-8000-000000000001'
     or (
       select count(*) from public.consent_receipts
     ) <> 1 then
    raise exception 'TEST_FAILED: idempotency conflict';
  end if;

  -- Optional analytics preference.
  v_receipt := pg_temp.synthetic_receipt(
    '40000000-0000-4000-8000-000000000002',
    v_workspace,
    'SAVE_PREFERENCES',
    v_optional_categories,
    '2026-07-29T18:31:00Z',
    '2027-01-25T18:31:00Z',
    repeat('d', 64)
  );
  v_events := jsonb_build_array(
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000003',
      v_workspace,
      '40000000-0000-4000-8000-000000000002',
      'consent.preferences.saved',
      3,
      repeat('c', 64),
      repeat('e', 64)
    ),
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000004',
      v_workspace,
      '40000000-0000-4000-8000-000000000002',
      'consent.receipt.created',
      4,
      repeat('e', 64),
      repeat('f', 64)
    )
  );
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-analytics',
    repeat('2', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'CREATED'
     or (v_result #>> '{categories,analytics}')::boolean is not true then
    raise exception 'TEST_FAILED: optional analytics consent';
  end if;

  -- Optional marketing preference on the isolated second workspace.
  v_receipt := pg_temp.synthetic_receipt(
    '40000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000002',
    'SAVE_PREFERENCES',
    v_marketing_categories,
    '2026-07-29T18:31:30Z',
    '2027-01-25T18:31:30Z',
    repeat('9', 64)
  );
  v_events := jsonb_build_array(
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000013',
      '10000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000008',
      'consent.preferences.saved',
      1,
      null,
      repeat('a', 64)
    ),
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000014',
      '10000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000008',
      'consent.receipt.created',
      2,
      repeat('a', 64),
      repeat('b', 64)
    )
  );
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-marketing',
    repeat('5', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'CREATED'
     or (v_result #>> '{categories,marketing}')::boolean is not true
     or (v_result #>> '{categories,analytics}')::boolean is not false then
    raise exception 'TEST_FAILED: optional marketing consent';
  end if;

  -- Revocation/essential-only preference.
  v_receipt := pg_temp.synthetic_receipt(
    '40000000-0000-4000-8000-000000000003',
    v_workspace,
    'WITHDRAW',
    v_essential_categories,
    '2026-07-29T18:32:00Z',
    '2027-01-25T18:32:00Z',
    repeat('0', 64)
  );
  v_events := jsonb_build_array(
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000005',
      v_workspace,
      '40000000-0000-4000-8000-000000000003',
      'consent.withdrawn',
      5,
      repeat('f', 64),
      repeat('1', 64)
    ),
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000006',
      v_workspace,
      '40000000-0000-4000-8000-000000000003',
      'consent.receipt.created',
      6,
      repeat('1', 64),
      repeat('2', 64)
    )
  );
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-withdraw',
    repeat('3', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'CREATED'
     or (v_result #>> '{categories,essential}')::boolean is not true
     or (v_result #>> '{categories,analytics}')::boolean is not false then
    raise exception 'TEST_FAILED: revoked essential-only consent';
  end if;

  -- Already-expired historical receipt is valid when expiry follows occurrence.
  v_receipt := pg_temp.synthetic_receipt(
    '40000000-0000-4000-8000-000000000004',
    v_workspace,
    'REJECT_OPTIONAL',
    v_essential_categories,
    '2025-01-01T00:00:00Z',
    '2025-02-01T00:00:00Z',
    repeat('3', 64)
  );
  v_events := jsonb_build_array(
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000007',
      v_workspace,
      '40000000-0000-4000-8000-000000000004',
      'consent.reject_optional',
      7,
      repeat('2', 64),
      repeat('4', 64)
    ),
    pg_temp.synthetic_trust_event(
      '50000000-0000-4000-8000-000000000008',
      v_workspace,
      '40000000-0000-4000-8000-000000000004',
      'consent.receipt.created',
      8,
      repeat('4', 64),
      repeat('5', 64)
    )
  );
  v_result := public.persist_consent_change_v1(
    v_receipt,
    v_subject,
    'synthetic-key-expired',
    repeat('4', 64),
    v_events,
    v_correlation
  );
  if v_result ->> 'status' <> 'CREATED'
     or (v_result ->> 'expiresAt')::timestamptz >= now() then
    raise exception 'TEST_FAILED: expired historical receipt';
  end if;

  -- Malformed receipt fails and writes nothing.
  v_before := (select count(*) from public.consent_receipts);
  begin
    perform public.persist_consent_change_v1(
      '{}'::jsonb,
      v_subject,
      'synthetic-key-malformed',
      repeat('6', 64),
      '[]'::jsonb,
      v_correlation
    );
    raise exception 'TEST_FAILED: malformed receipt was accepted';
  exception
    when others then
      if sqlerrm like 'TEST_FAILED:%' then
        raise;
      end if;
  end;
  if (select count(*) from public.consent_receipts) <> v_before then
    raise exception 'TEST_FAILED: malformed receipt partially persisted';
  end if;

  -- Missing subject key fails.
  begin
    perform public.persist_consent_change_v1(
      v_receipt,
      '',
      'synthetic-key-no-subject',
      repeat('7', 64),
      v_events,
      v_correlation
    );
    raise exception 'TEST_FAILED: missing subject key was accepted';
  exception
    when others then
      if sqlerrm like 'TEST_FAILED:%' then
        raise;
      end if;
  end;

  -- Missing trust events fails.
  begin
    perform public.persist_consent_change_v1(
      v_receipt,
      v_subject,
      'synthetic-key-no-events',
      repeat('8', 64),
      '[]'::jsonb,
      v_correlation
    );
    raise exception 'TEST_FAILED: missing trust events were accepted';
  exception
    when others then
      if sqlerrm like 'TEST_FAILED:%' then
        raise;
      end if;
  end;

  -- Cross-tenant event injection fails.
  begin
    perform public.persist_consent_change_v1(
      pg_temp.synthetic_receipt(
        '40000000-0000-4000-8000-000000000005',
        v_workspace,
        'SAVE_PREFERENCES',
        v_essential_categories,
        '2026-07-29T18:33:00Z',
        '2027-01-25T18:33:00Z',
        repeat('6', 64)
      ),
      v_subject,
      'synthetic-key-cross-tenant',
      repeat('a', 64),
      jsonb_build_array(
        pg_temp.synthetic_trust_event(
          '50000000-0000-4000-8000-000000000009',
          '10000000-0000-4000-8000-000000000002',
          '40000000-0000-4000-8000-000000000005',
          'consent.preferences.saved',
          9,
          repeat('5', 64),
          repeat('7', 64)
        )
      ),
      v_correlation
    );
    raise exception 'TEST_FAILED: cross-tenant Trust Event was accepted';
  exception
    when others then
      if sqlerrm like 'TEST_FAILED:%' then
        raise;
      end if;
  end;

  -- A chain conflict rolls the receipt/preferences/events back fully.
  v_before := (select count(*) from public.consent_receipts);
  begin
    perform public.persist_consent_change_v1(
      pg_temp.synthetic_receipt(
        '40000000-0000-4000-8000-000000000006',
        v_workspace,
        'SAVE_PREFERENCES',
        v_essential_categories,
        '2026-07-29T18:34:00Z',
        '2027-01-25T18:34:00Z',
        repeat('8', 64)
      ),
      v_subject,
      'synthetic-key-chain-conflict',
      repeat('b', 64),
      jsonb_build_array(
        pg_temp.synthetic_trust_event(
          '50000000-0000-4000-8000-000000000010',
          v_workspace,
          '40000000-0000-4000-8000-000000000006',
          'consent.preferences.saved',
          99,
          repeat('5', 64),
          repeat('9', 64)
        )
      ),
      v_correlation
    );
    raise exception 'TEST_FAILED: Trust Event chain conflict was accepted';
  exception
    when others then
      if sqlerrm like 'TEST_FAILED:%' then
        raise;
      end if;
  end;
  if (select count(*) from public.consent_receipts) <> v_before
     or exists (
       select 1
       from public.consent_receipts
       where receipt_id =
         '40000000-0000-4000-8000-000000000006'
     ) then
    raise exception 'TEST_FAILED: chain-conflict transaction partially persisted';
  end if;

  -- Invalid UUID input is rejected by the typed RPC boundary.
  begin
    execute $dynamic$
      select public.persist_consent_change_v1(
        '{}'::jsonb,
        'synthetic-subject',
        'synthetic-key-invalid-correlation',
        repeat('c', 64),
        '[]'::jsonb,
        'not-a-uuid'::uuid
      )
    $dynamic$;
    raise exception 'TEST_FAILED: invalid correlation UUID was accepted';
  exception
    when invalid_text_representation then
      null;
  end;
end
$test$;

reset role;

do $post_test$
begin
  if (
    select count(*)
    from public.consent_receipts
  ) <> 5 then
    raise exception 'TEST_FAILED: expected five durable synthetic receipts';
  end if;
  if (
    select count(*)
    from public.trust_events
    where schema_version = 'trust-event-v1'
  ) <> 10 then
    raise exception 'TEST_FAILED: expected ten canonical Trust Events';
  end if;
  if (
    select last_sequence
    from public.trust_event_chain_heads
    where enterprise_id = '10000000-0000-4000-8000-000000000001'
      and partition_key = 'default'
  ) <> 8 then
    raise exception 'TEST_FAILED: expected Trust Event chain sequence eight';
  end if;
  if (
    select last_sequence
    from public.trust_event_chain_heads
    where enterprise_id = '10000000-0000-4000-8000-000000000002'
      and partition_key = 'default'
  ) <> 2 then
    raise exception
      'TEST_FAILED: expected marketing Trust Event chain sequence two';
  end if;
end
$post_test$;

commit;
