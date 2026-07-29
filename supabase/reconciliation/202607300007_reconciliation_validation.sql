-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 7: blocking catalog, integrity, RLS and RPC contract validation.

begin;

do $reconciliation_gate$
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: app.reconciliation.environment must equal staging';
  end if;
  if not exists (
    select 1
    from public.schema_reconciliation_runs
    where reconciliation_key = '202607300006_consent_security_and_rls'
      and status = 'completed'
  ) then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: security and RLS phase is required';
  end if;
end
$reconciliation_gate$;

alter table public.trust_events
  validate constraint trust_events_v1_required_fields_reconciliation_check;
alter table public.trust_events
  validate constraint trust_events_v1_event_type_reconciliation_check;
alter table public.trust_events
  validate constraint trust_events_v1_subject_type_reconciliation_check;
alter table public.trust_events
  validate constraint trust_events_v1_actor_type_reconciliation_check;
alter table public.trust_events
  validate constraint trust_events_v1_protocol_reconciliation_check;
alter table public.trust_events
  validate constraint trust_events_v1_integrity_reconciliation_check;

do $reconciliation_validation$
declare
  v_names text;
  v_count bigint;
  v_arguments text;
  v_result text;
  v_arg_names text[];
  v_security_definer boolean;
  v_config text[];
begin
  select string_agg(required.object_name, ', ' order by required.object_name)
    into v_names
  from (
    values
      ('public.schema_reconciliation_runs'),
      ('public.trust_event_envelopes'),
      ('public.trust_event_chain_heads'),
      ('public.trust_event_links'),
      ('public.trust_event_audit'),
      ('public.consent_policy_versions'),
      ('public.consent_categories'),
      ('public.consent_purposes'),
      ('public.consent_providers'),
      ('public.consent_cookies'),
      ('public.consent_tracker_catalogue'),
      ('public.consent_region_profiles'),
      ('public.consent_receipts'),
      ('public.consent_preferences'),
      ('public.consent_events'),
      ('public.consent_audit_log')
  ) required(object_name)
  where to_regclass(required.object_name) is null;
  if v_names is not null then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: required tables missing: %',
      v_names;
  end if;

  select string_agg(
      expected.table_name || '.' || expected.column_name ||
        ' expected ' || expected.udt_name ||
        case when expected.not_null then ' not null' else '' end,
      ', ' order by expected.table_name, expected.column_name
    )
    into v_names
  from (
    values
      ('trust_event_chain_heads', 'enterprise_id', 'uuid', true),
      ('trust_event_chain_heads', 'partition_key', 'text', true),
      ('trust_event_chain_heads', 'last_sequence', 'int8', true),
      ('trust_event_chain_heads', 'last_event_id', 'uuid', false),
      ('trust_event_chain_heads', 'last_event_hash', 'text', false),
      ('consent_policy_versions', 'id', 'uuid', true),
      ('consent_policy_versions', 'enterprise_id', 'uuid', false),
      ('consent_cookies', 'id', 'uuid', true),
      ('consent_tracker_catalogue', 'id', 'uuid', true),
      ('consent_receipts', 'receipt_id', 'uuid', true),
      ('consent_receipts', 'enterprise_id', 'uuid', true),
      ('consent_receipts', 'subject_key', 'text', true),
      ('consent_receipts', 'categories', 'jsonb', true),
      ('consent_receipts', 'expires_at', 'timestamptz', false),
      ('consent_receipts', 'receipt_hash', 'text', true),
      ('consent_receipts', 'idempotency_key', 'text', true),
      ('consent_preferences', 'current_receipt_id', 'uuid', true),
      ('consent_events', 'receipt_id', 'uuid', false),
      ('consent_audit_log', 'correlation_id', 'uuid', true)
  ) expected(table_name, column_name, udt_name, not_null)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name
      and c.udt_name = expected.udt_name
      and (
        not expected.not_null
        or c.is_nullable = 'NO'
      )
  );
  if v_names is not null then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: column contract mismatch: %',
      v_names;
  end if;

  select string_agg(expected.table_name, ', ' order by expected.table_name)
    into v_names
  from (
    values
      ('schema_reconciliation_runs'),
      ('trust_event_envelopes'),
      ('trust_event_chain_heads'),
      ('trust_event_links'),
      ('trust_event_audit'),
      ('consent_policy_versions'),
      ('consent_categories'),
      ('consent_purposes'),
      ('consent_providers'),
      ('consent_cookies'),
      ('consent_tracker_catalogue'),
      ('consent_region_profiles'),
      ('consent_receipts'),
      ('consent_preferences'),
      ('consent_events'),
      ('consent_audit_log')
  ) expected(table_name)
  where not exists (
    select 1
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and con.contype = 'p'
  );
  if v_names is not null then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: primary keys missing: %',
      v_names;
  end if;

  select count(*)
    into v_count
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
    and not con.convalidated;
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: % constraints remain not valid',
      v_count;
  end if;

  if not exists (
       select 1
       from pg_indexes
       where schemaname = 'public'
         and tablename = 'consent_receipts'
         and indexname =
           'consent_receipts_enterprise_id_subject_key_idempotency_key_key'
     )
     or not exists (
       select 1
       from pg_indexes
       where schemaname = 'public'
         and tablename = 'trust_events'
         and indexname = 'trust_events_enterprise_sequence_v1_unique_idx'
     ) then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: required unique indexes are missing';
  end if;

  select count(*)
    into v_count
  from (
    select enterprise_id, subject_key, idempotency_key
    from public.consent_receipts
    group by enterprise_id, subject_key, idempotency_key
    having count(*) > 1
  ) duplicates;
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: duplicate consent idempotency keys found';
  end if;

  select count(*)
    into v_count
  from public.consent_receipts receipt
  left join public.trust_workspaces workspace
    on workspace.id = receipt.enterprise_id
  where workspace.id is null;
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: orphan consent receipt tenants found';
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
      'RECONCILIATION_VALIDATION_FAILED: orphan or cross-subject consent preferences found';
  end if;

  select count(*)
    into v_count
  from public.trust_event_chain_heads head
  left join public.trust_events event
    on event.id = head.last_event_id
  where (
      head.last_sequence = 0
      and (
        head.last_event_id is not null
        or head.last_event_hash is not null
      )
    )
    or (
      head.last_sequence > 0
      and (
        event.id is null
        or event.enterprise_id <> head.enterprise_id
        or event.sequence <> head.last_sequence
        or event.event_hash <> head.last_event_hash
      )
    );
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: Trust Event chain-head invariant failed';
  end if;

  select string_agg(c.relname, ', ' order by c.relname)
    into v_names
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'schema_reconciliation_runs',
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
    and (not c.relrowsecurity or not c.relforcerowsecurity);
  if v_names is not null then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: RLS state invalid on: %',
      v_names;
  end if;

  select
    pg_get_function_identity_arguments(p.oid),
    pg_get_function_result(p.oid),
    p.proargnames,
    p.prosecdef,
    p.proconfig
  into
    v_arguments,
    v_result,
    v_arg_names,
    v_security_definer,
    v_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'persist_consent_change_v1';

  if not found
     or v_arguments <>
       'p_receipt jsonb, p_subject_key text, p_idempotency_key text, p_request_hash text, p_trust_events jsonb, p_correlation_id uuid'
     or v_result <> 'jsonb'
     or v_arg_names[1:6] <> array[
       'p_receipt',
       'p_subject_key',
       'p_idempotency_key',
       'p_request_hash',
       'p_trust_events',
       'p_correlation_id'
     ]
     or not v_security_definer
     or not ('search_path=public' = any(v_config)) then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: persist_consent_change_v1 contract is invalid';
  end if;

  if has_function_privilege(
       'anon',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     ) then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: persist_consent_change_v1 role grants are invalid';
  end if;

  select count(*)
    into v_count
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
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
      'consent_events'
    );
  if v_count <> 14 then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: expected 14 reconciliation RLS policies; found %',
      v_count;
  end if;

  select count(*)
    into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'schema_reconciliation_runs',
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
    and grantee in ('PUBLIC', 'anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: browser write grant found';
  end if;
end
$reconciliation_validation$;

insert into public.schema_reconciliation_runs(
  reconciliation_key,
  phase,
  status,
  completed_at,
  metadata
)
values (
  '202607300007_reconciliation_validation',
  'reconciliation_validation',
  'completed',
  clock_timestamp(),
  jsonb_build_object(
    'requiredTablesPresent', true,
    'constraintsValid', true,
    'orphanRows', 0,
    'duplicateIdempotencyKeys', 0,
    'rlsValid', true,
    'rpcSignatureValid', true,
    'rpcGrantsValid', true,
    'trustChainValid', true
  )
);

do $reconciliation_completion$
begin
  if exists (
    select 1
    from public.schema_reconciliation_runs
    where status = 'started'
  ) then
    raise exception
      'RECONCILIATION_VALIDATION_FAILED: reconciliation phase remains started';
  end if;
end
$reconciliation_completion$;

-- Supabase/PostgREST-supported schema cache reload notification. A staging
-- PostgREST listener must acknowledge this outside this PostgreSQL-only phase.
notify pgrst, 'reload schema';

commit;
