-- NOT APPROVED FOR PRODUCTION
-- STAGING TEST ONLY - validates the committed synthetic fixture state.

begin read only;

do $post_data_validation$
declare
  v_count bigint;
begin
  select count(*)
    into v_count
  from public.consent_receipts
  where enterprise_id = '10000000-0000-4000-8000-000000000001';
  if v_count <> 5 then
    raise exception
      'TEST_FAILED: expected five synthetic receipts; found %', v_count;
  end if;

  select count(*)
    into v_count
  from public.consent_receipts
  where enterprise_id = '10000000-0000-4000-8000-000000000001'
    and idempotency_key = 'synthetic-key-concurrent';
  if v_count <> 1 then
    raise exception
      'TEST_FAILED: concurrent idempotency produced % receipts', v_count;
  end if;

  select count(*)
    into v_count
  from public.trust_events
  where enterprise_id = '10000000-0000-4000-8000-000000000001'
    and schema_version = 'trust-event-v1';
  if v_count <> 10 then
    raise exception
      'TEST_FAILED: expected ten canonical Trust Events; found %', v_count;
  end if;

  select count(*)
    into v_count
  from public.trust_events event
  left join public.trust_events previous
    on previous.enterprise_id = event.enterprise_id
   and previous.schema_version = 'trust-event-v1'
   and previous.sequence = event.sequence - 1
  where event.enterprise_id = '10000000-0000-4000-8000-000000000001'
    and event.schema_version = 'trust-event-v1'
    and (
      (event.sequence = 1 and event.previous_hash is not null)
      or (
        event.sequence > 1
        and (
          previous.id is null
          or event.previous_hash <> previous.event_hash
        )
      )
    );
  if v_count <> 0 then
    raise exception
      'TEST_FAILED: canonical Trust Event chain contains % broken links',
      v_count;
  end if;

  select count(*)
    into v_count
  from public.trust_event_chain_heads head
  join public.trust_events event on event.id = head.last_event_id
  where head.enterprise_id = '10000000-0000-4000-8000-000000000001'
    and head.partition_key = 'default'
    and head.last_sequence = 10
    and event.sequence = head.last_sequence
    and event.event_hash = head.last_event_hash;
  if v_count <> 1 then
    raise exception
      'TEST_FAILED: canonical Trust Event chain head is inconsistent';
  end if;

  select count(*)
    into v_count
  from public.consent_preferences preference
  left join public.consent_receipts receipt
    on receipt.receipt_id = preference.current_receipt_id
   and receipt.enterprise_id = preference.enterprise_id
   and receipt.subject_key = preference.subject_key
  where receipt.receipt_id is null;
  if v_count <> 0 then
    raise exception
      'TEST_FAILED: current consent preference references an invalid receipt';
  end if;

  if exists (
    select 1
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'trust_events',
        'trust_event_envelopes',
        'trust_event_chain_heads',
        'trust_event_links',
        'trust_event_audit',
        'consent_policy_versions',
        'consent_categories',
        'consent_purposes',
        'consent_providers',
        'consent_cookies',
        'consent_tracker_catalogue',
        'consent_region_profiles',
        'consent_receipts',
        'consent_preferences',
        'consent_events',
        'consent_audit_log'
      )
      and not con.convalidated
  ) then
    raise exception
      'TEST_FAILED: a reconciliation constraint is not valid';
  end if;
end
$post_data_validation$;

commit;
