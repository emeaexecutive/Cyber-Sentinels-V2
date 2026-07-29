-- STAGING VALIDATION APPROVED
-- NOT APPROVED FOR PRODUCTION
-- STAGING VALIDATION ONLY
-- Phase 6: consent/trust RLS policies and privilege assertions.

begin;

do $reconciliation_gate$
begin
  if current_setting('app.reconciliation.environment', true) is distinct from 'staging' then
    raise exception
      'RECONCILIATION_SECURITY_FAILED: app.reconciliation.environment must equal staging';
  end if;
  if not exists (
    select 1
    from public.schema_reconciliation_runs
    where reconciliation_key = '202607300005_consent_persistence_rpc'
      and status = 'completed'
  ) then
    raise exception
      'RECONCILIATION_SECURITY_FAILED: consent persistence RPC phase is required';
  end if;
end
$reconciliation_gate$;

grant select on table public.consent_policy_versions to authenticated;
grant select on table public.consent_categories to authenticated;
grant select on table public.consent_purposes to authenticated;
grant select on table public.consent_providers to authenticated;
grant select on table public.consent_cookies to authenticated;
grant select on table public.consent_tracker_catalogue to authenticated;
grant select on table public.consent_region_profiles to authenticated;
grant select on table public.consent_preferences to authenticated;
grant select on table public.consent_receipts to authenticated;
grant select on table public.consent_events to authenticated;

create policy "tenant members read consent policies v2"
on public.consent_policy_versions
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read consent categories v2"
on public.consent_categories
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read consent purposes v2"
on public.consent_purposes
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read consent providers v2"
on public.consent_providers
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read consent cookies v2"
on public.consent_cookies
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read consent trackers v2"
on public.consent_tracker_catalogue
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "tenant members read consent regions v2"
on public.consent_region_profiles
for select
to authenticated
using (
  enterprise_id is null
  or public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "users read own consent preferences v2"
on public.consent_preferences
for select
to authenticated
using (
  user_id = auth.uid()
  and public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "users read own consent receipts v2"
on public.consent_receipts
for select
to authenticated
using (
  user_id = auth.uid()
  and public.user_can_access_trust_workspace_v2(enterprise_id)
);

create policy "users read own consent events v2"
on public.consent_events
for select
to authenticated
using (
  exists (
    select 1
    from public.consent_receipts receipt
    where receipt.receipt_id = consent_events.receipt_id
      and receipt.enterprise_id = consent_events.enterprise_id
      and receipt.user_id = auth.uid()
      and public.user_can_access_trust_workspace_v2(
        receipt.enterprise_id
      )
  )
);

revoke all on table public.consent_audit_log from authenticated;
revoke all on table public.consent_audit_log from anon;
revoke all on table public.consent_audit_log from public;

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

do $reconciliation_security_assertions$
declare
  v_count bigint;
  v_names text;
begin
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
      'RECONCILIATION_SECURITY_FAILED: RLS is not enabled and forced on: %',
      v_names;
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
      'RECONCILIATION_SECURITY_FAILED: found % browser write grants',
      v_count;
  end if;

  select count(*)
    into v_count
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
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
    and (
      coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~*
        '(^|[^a-z])true([^a-z]|$)'
      or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~*
        '(^|[^a-z])true([^a-z]|$)'
    );
  if v_count <> 0 then
    raise exception
      'RECONCILIATION_SECURITY_FAILED: broad true RLS policy detected';
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
     or has_function_privilege(
       'public',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.persist_consent_change_v1(jsonb,text,text,text,jsonb,uuid)',
       'EXECUTE'
     ) then
    raise exception
      'RECONCILIATION_SECURITY_FAILED: consent RPC execute privileges are invalid';
  end if;
end
$reconciliation_security_assertions$;

insert into public.schema_reconciliation_runs(
  reconciliation_key,
  phase,
  status,
  completed_at,
  metadata
)
values (
  '202607300006_consent_security_and_rls',
  'consent_security_and_rls',
  'completed',
  clock_timestamp(),
  jsonb_build_object(
    'browserWrites', 0,
    'publicRpcExecute', false,
    'anonRpcExecute', false,
    'authenticatedRpcExecute', false,
    'serviceRoleRpcExecute', true
  )
);

commit;
