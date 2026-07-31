-- NOT APPROVED FOR PRODUCTION
-- STAGING TEST ONLY - run concurrently with 005_concurrent_session_b.sql.

begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;

select public.persist_consent_change_v1(
  jsonb_build_object(
    'receiptId', '40000000-0000-4000-8000-000000000007',
    'enterpriseId', '10000000-0000-4000-8000-000000000001',
    'userId', null,
    'anonymousId', 'synthetic-anonymous-digest-v1',
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
    'occurredAt', '2026-07-29T18:35:00Z',
    'receivedAt', '2026-07-29T18:35:00Z',
    'expiresAt', '2027-01-25T18:35:00Z',
    'source', 'STAGING_CONCURRENCY_FIXTURE',
    'userAgentHash', null,
    'coarseCountry', null,
    'hashAlgorithm', 'SHA-256',
    'canonicalization', 'RFC8785-JCS',
    'receiptHash', repeat('6', 64)
  ),
  'anonymous:synthetic-subject-v1',
  'synthetic-key-concurrent',
  repeat('d', 64),
  jsonb_build_array(
    jsonb_build_object(
      'eventId', '50000000-0000-4000-8000-000000000011',
      'enterpriseId', '10000000-0000-4000-8000-000000000001',
      'schemaVersion', 'trust-event-v1',
      'eventType', 'consent.reject_optional',
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
        'eventId', '40000000-0000-4000-8000-000000000007',
        'transactionId', 'synthetic-key-concurrent',
        'deliveryId', null
      ),
      'normalizedFacts', jsonb_build_object(
        'policyVersion', 'synthetic-policy-v1',
        'receiptReference',
          'consent-receipt:40000000-0000-4000-8000-000000000007',
        'regionProfile', 'GLOBAL_DEFAULT',
        'source', 'STAGING_CONCURRENCY_FIXTURE'
      ),
      'reasonCodes', jsonb_build_array('SYNTHETIC_STAGING_TEST'),
      'evidenceReferences',
        jsonb_build_array(
          'consent-receipt:40000000-0000-4000-8000-000000000007'
        ),
      'occurredAt', '2026-07-29T18:35:00.000Z',
      'receivedAt', '2026-07-29T18:35:00.000Z',
      'sequence', 9,
      'previousHash', repeat('5', 64),
      'eventHash', repeat('6', 64),
      'canonicalization', 'RFC8785-JCS',
      'hashAlgorithm', 'SHA-256',
      'ordering', jsonb_build_object(
        'late', false,
        'supersedesEventId', null,
        'providerSequence', null
      )
    ),
    jsonb_build_object(
      'eventId', '50000000-0000-4000-8000-000000000012',
      'enterpriseId', '10000000-0000-4000-8000-000000000001',
      'schemaVersion', 'trust-event-v1',
      'eventType', 'consent.receipt.created',
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
        'eventId', '40000000-0000-4000-8000-000000000007',
        'transactionId', 'synthetic-key-concurrent',
        'deliveryId', null
      ),
      'normalizedFacts', jsonb_build_object(
        'policyVersion', 'synthetic-policy-v1',
        'receiptReference',
          'consent-receipt:40000000-0000-4000-8000-000000000007',
        'regionProfile', 'GLOBAL_DEFAULT',
        'source', 'STAGING_CONCURRENCY_FIXTURE'
      ),
      'reasonCodes', jsonb_build_array('SYNTHETIC_STAGING_TEST'),
      'evidenceReferences',
        jsonb_build_array(
          'consent-receipt:40000000-0000-4000-8000-000000000007'
        ),
      'occurredAt', '2026-07-29T18:35:00.000Z',
      'receivedAt', '2026-07-29T18:35:00.000Z',
      'sequence', 10,
      'previousHash', repeat('6', 64),
      'eventHash', repeat('7', 64),
      'canonicalization', 'RFC8785-JCS',
      'hashAlgorithm', 'SHA-256',
      'ordering', jsonb_build_object(
        'late', false,
        'supersedesEventId', null,
        'providerSequence', null
      )
    )
  ),
  '30000000-0000-4000-8000-000000000002'
) as session_a_result;

select pg_sleep(2);
commit;
