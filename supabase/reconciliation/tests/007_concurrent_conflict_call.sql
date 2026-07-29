-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- STAGING TEST ONLY - shared concurrent conflicting-idempotency invocation.

select public.persist_consent_change_v1(
  jsonb_build_object(
    'receiptId', '40000000-0000-4000-8000-000000000009',
    'enterpriseId', '10000000-0000-4000-8000-000000000002',
    'userId', null,
    'anonymousId', 'synthetic-conflict-subject-digest-v1',
    'policyVersion', 'synthetic-policy-v1',
    'bannerVersion', 'synthetic-banner-v1',
    'preferenceSchemaVersion', 'consent-preferences-v1',
    'regionProfile', 'GLOBAL_DEFAULT',
    'language', 'en',
    'categories',
      '{"essential":true,"functional":false,"analytics":false,"ai_improvements":false,"marketing":false}'::jsonb,
    'purposes', jsonb_build_array('secure_service_delivery'),
    'providers', jsonb_build_array('synthetic-provider'),
    'consentAction', 'REJECT_OPTIONAL',
    'occurredAt', '2026-07-29T18:36:00Z',
    'receivedAt', '2026-07-29T18:36:00Z',
    'expiresAt', '2027-01-25T18:36:00Z',
    'source', 'STAGING_CONCURRENT_CONFLICT_FIXTURE',
    'userAgentHash', null,
    'coarseCountry', null,
    'hashAlgorithm', 'SHA-256',
    'canonicalization', 'RFC8785-JCS',
    'receiptHash', repeat('c', 64)
  ),
  'anonymous:synthetic-conflict-subject-v1',
  'synthetic-key-concurrent-conflict',
  repeat(current_setting('app.test_request_hash'), 64),
  jsonb_build_array(
    jsonb_build_object(
      'eventId', '50000000-0000-4000-8000-000000000015',
      'enterpriseId', '10000000-0000-4000-8000-000000000002',
      'schemaVersion', 'trust-event-v1',
      'eventType', 'consent.reject_optional',
      'subject', jsonb_build_object(
        'type', 'HUMAN',
        'id', 'anonymous:synthetic-conflict-subject-v1'
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
        'eventId', '40000000-0000-4000-8000-000000000009',
        'transactionId', 'synthetic-key-concurrent-conflict',
        'deliveryId', null
      ),
      'normalizedFacts', jsonb_build_object(
        'policyVersion', 'synthetic-policy-v1',
        'receiptReference',
          'consent-receipt:40000000-0000-4000-8000-000000000009',
        'regionProfile', 'GLOBAL_DEFAULT',
        'source', 'STAGING_CONCURRENT_CONFLICT_FIXTURE'
      ),
      'reasonCodes', jsonb_build_array('SYNTHETIC_STAGING_TEST'),
      'evidenceReferences',
        jsonb_build_array(
          'consent-receipt:40000000-0000-4000-8000-000000000009'
        ),
      'occurredAt', '2026-07-29T18:36:00.000Z',
      'receivedAt', '2026-07-29T18:36:00.000Z',
      'sequence', 3,
      'previousHash', repeat('b', 64),
      'eventHash', repeat('c', 64),
      'canonicalization', 'RFC8785-JCS',
      'hashAlgorithm', 'SHA-256',
      'ordering', jsonb_build_object(
        'late', false,
        'supersedesEventId', null,
        'providerSequence', null
      )
    ),
    jsonb_build_object(
      'eventId', '50000000-0000-4000-8000-000000000016',
      'enterpriseId', '10000000-0000-4000-8000-000000000002',
      'schemaVersion', 'trust-event-v1',
      'eventType', 'consent.receipt.created',
      'subject', jsonb_build_object(
        'type', 'HUMAN',
        'id', 'anonymous:synthetic-conflict-subject-v1'
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
        'eventId', '40000000-0000-4000-8000-000000000009',
        'transactionId', 'synthetic-key-concurrent-conflict',
        'deliveryId', null
      ),
      'normalizedFacts', jsonb_build_object(
        'policyVersion', 'synthetic-policy-v1',
        'receiptReference',
          'consent-receipt:40000000-0000-4000-8000-000000000009',
        'regionProfile', 'GLOBAL_DEFAULT',
        'source', 'STAGING_CONCURRENT_CONFLICT_FIXTURE'
      ),
      'reasonCodes', jsonb_build_array('SYNTHETIC_STAGING_TEST'),
      'evidenceReferences',
        jsonb_build_array(
          'consent-receipt:40000000-0000-4000-8000-000000000009'
        ),
      'occurredAt', '2026-07-29T18:36:00.000Z',
      'receivedAt', '2026-07-29T18:36:00.000Z',
      'sequence', 4,
      'previousHash', repeat('c', 64),
      'eventHash', repeat('d', 64),
      'canonicalization', 'RFC8785-JCS',
      'hashAlgorithm', 'SHA-256',
      'ordering', jsonb_build_object(
        'late', false,
        'supersedesEventId', null,
        'providerSequence', null
      )
    )
  ),
  '30000000-0000-4000-8000-000000000003'
) as concurrent_conflict_result
\gset

select (
  :'concurrent_conflict_result'::jsonb ->> 'status'
  = current_setting('app.expected_status')
) as concurrent_conflict_status_matches
\gset

\if :concurrent_conflict_status_matches
\else
  \echo 'TEST_FAILED: unexpected concurrent conflict status'
  \quit 3
\endif

select :'concurrent_conflict_result' as concurrent_conflict_result;
