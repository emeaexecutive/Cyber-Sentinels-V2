-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 1: read-only assertions for the captured 2026-07-29 Production baseline.

begin read only;

do $reconciliation_preflight$
declare
  v_server_major integer;
  v_missing text;
  v_conflict text;
  v_count bigint;
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: app.reconciliation.environment must equal staging';
  end if;

  v_server_major := current_setting('server_version_num')::integer / 10000;
  if v_server_major <> 17 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: PostgreSQL major version 17 required; found %',
      v_server_major;
  end if;

  select string_agg(required.extension_name, ', ' order by required.extension_name)
    into v_missing
  from (values ('pgcrypto'), ('uuid-ossp')) as required(extension_name)
  where not exists (
    select 1 from pg_extension e where e.extname = required.extension_name
  );
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: required extensions missing: %', v_missing;
  end if;

  select string_agg(required.role_name, ', ' order by required.role_name)
    into v_missing
  from (values ('anon'), ('authenticated'), ('service_role')) as required(role_name)
  where not exists (
    select 1 from pg_roles r where r.rolname = required.role_name
  );
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: required API roles missing: %', v_missing;
  end if;

  select string_agg(required.function_name, ', ' order by required.function_name)
    into v_missing
  from (
    values ('auth.uid()'), ('auth.jwt()'), ('auth.role()')
  ) as required(function_name)
  where to_regprocedure(required.function_name) is null;
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: required Supabase auth functions missing: %',
      v_missing;
  end if;

  if not exists (
    select 1
    from pg_roles
    where rolname = 'service_role'
      and rolbypassrls
  ) then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: service_role must have BYPASSRLS';
  end if;

  select string_agg(required.object_name, ', ' order by required.object_name)
    into v_missing
  from (
    values
      ('public.trust_workspaces'),
      ('public.workspace_members'),
      ('public.agents'),
      ('public.trust_events')
  ) as required(object_name)
  where to_regclass(required.object_name) is null;
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: required baseline tables missing: %', v_missing;
  end if;

  select string_agg(
      expected.table_name || '.' || expected.column_name || ' expected ' || expected.udt_name,
      ', ' order by expected.table_name, expected.column_name
    )
    into v_missing
  from (
    values
      ('trust_workspaces', 'id', 'uuid'),
      ('trust_workspaces', 'created_by', 'uuid'),
      ('workspace_members', 'id', 'uuid'),
      ('workspace_members', 'workspace_id', 'uuid'),
      ('workspace_members', 'user_id', 'uuid'),
      ('workspace_members', 'role', 'text'),
      ('agents', 'id', 'uuid'),
      ('agents', 'owner_user_id', 'uuid'),
      ('trust_events', 'id', 'uuid'),
      ('trust_events', 'event_type', 'text'),
      ('trust_events', 'actor_type', 'text'),
      ('trust_events', 'actor_label', 'text'),
      ('trust_events', 'event_source', 'text'),
      ('trust_events', 'agent_id', 'uuid'),
      ('trust_events', 'metadata', 'jsonb'),
      ('trust_events', 'created_at', 'timestamptz')
  ) as expected(table_name, column_name, udt_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name
      and c.udt_name = expected.udt_name
  );
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: required baseline columns/types missing: %',
      v_missing;
  end if;

  select string_agg(expected.table_name, ', ' order by expected.table_name)
    into v_missing
  from (
    values ('trust_workspaces'), ('workspace_members'), ('agents'), ('trust_events')
  ) as expected(table_name)
  where not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = expected.table_name
      and con.contype = 'p'
      and pg_get_constraintdef(con.oid) = 'PRIMARY KEY (id)'
  );
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: expected UUID id primary keys missing: %',
      v_missing;
  end if;

  select string_agg(c.relname, ', ' order by c.relname)
    into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('trust_workspaces', 'workspace_members', 'agents', 'trust_events')
    and not c.relrowsecurity;
  if v_missing is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: expected baseline RLS is disabled on: %',
      v_missing;
  end if;

  select string_agg(name, ', ' order by name)
    into v_conflict
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
  ) as proposed(name)
  where to_regclass('public.' || proposed.name) is not null;
  if v_conflict is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: incompatible proposed object names already exist: %',
      v_conflict;
  end if;

  select string_agg(
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
      ', ' order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
    )
    into v_conflict
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'user_can_access_trust_workspace_v2',
      'identity_workspace_role_v2',
      'append_trust_event_v1',
      'persist_consent_change_v1'
    );
  if v_conflict is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: conflicting function names/signatures already exist: %',
      v_conflict;
  end if;

  select string_agg(column_name, ', ' order by column_name)
    into v_conflict
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'trust_events'
    and column_name in (
      'event_id', 'enterprise_id', 'schema_version', 'subject_type', 'subject_id',
      'workflow_id', 'session_id', 'authority_id', 'provider_key',
      'provider_protocol', 'provider_event_id', 'provider_transaction_id',
      'provider_delivery_id', 'normalized_facts', 'reason_codes',
      'evidence_references', 'occurred_at', 'received_at', 'sequence',
      'previous_hash', 'event_hash', 'canonicalization', 'hash_algorithm',
      'canonical_event', 'late', 'supersedes_event_id'
    );
  if v_conflict is not null then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: canonical trust_events columns unexpectedly exist: %',
      v_conflict;
  end if;

  select count(*) into v_count
  from public.workspace_members
  where workspace_id is null or user_id is null;
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: workspace membership tenant identifiers contain % null rows',
      v_count;
  end if;

  select count(*) into v_count
  from public.workspace_members wm
  left join public.trust_workspaces tw on tw.id = wm.workspace_id
  where tw.id is null;
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: workspace membership contains % orphan rows',
      v_count;
  end if;

  select count(*) into v_count
  from (
    select workspace_id, user_id, count(*)
    from public.workspace_members
    group by workspace_id, user_id
    having count(*) > 1
  ) duplicates;
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: workspace membership contains % duplicate tenant/user pairs',
      v_count;
  end if;

  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'schema_reconciliation_runs', 'trust_event_envelopes',
      'trust_event_chain_heads', 'trust_event_links', 'trust_event_audit',
      'consent_policy_versions', 'consent_categories', 'consent_purposes',
      'consent_providers', 'consent_cookies', 'consent_tracker_catalogue',
      'consent_region_profiles', 'consent_receipts', 'consent_preferences',
      'consent_events', 'consent_audit_log'
    )
    and grantee in ('PUBLIC', 'anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: proposed objects already expose % unexpected browser write grants',
      v_count;
  end if;

  select count(*) into v_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'trust_events'
    and not t.tgisinternal
    and t.tgname in (
      'canonical_trust_events_append_only',
      'trust_event_audit_append_only',
      'consent_receipts_append_only',
      'consent_events_append_only',
      'consent_audit_append_only'
    );
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: incompatible reconciliation triggers already exist';
  end if;

  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ) <> 87 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: baseline table-count assumption differs from 87';
  end if;

  if (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) <> 43 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: baseline routine-count assumption differs from 43';
  end if;

  if (
    select count(*)
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ) <> 176 then
    raise exception
      'RECONCILIATION_PREFLIGHT_FAILED: baseline policy-count assumption differs from 176';
  end if;
end
$reconciliation_preflight$;

commit;
