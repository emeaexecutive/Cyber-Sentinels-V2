-- Product Closure staging security reconciliation.
--
-- Removes obsolete workspace policy copies, preserves the non-recursive
-- tenant predicates, limits Data API grants, and prevents internal
-- SECURITY DEFINER routines from being invoked as public RPCs.

begin;

alter table public.trust_workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists "authenticated users create own workspaces" on public.trust_workspaces;
drop policy if exists "users create owned trust workspaces" on public.trust_workspaces;
drop policy if exists "authenticated manage trust_workspaces" on public.trust_workspaces;
drop policy if exists "tenant members read trust workspaces" on public.trust_workspaces;
drop policy if exists "workspace owners and members read workspaces" on public.trust_workspaces;
drop policy if exists "workspace owners administer trust workspaces" on public.trust_workspaces;
drop policy if exists "workspace owners update workspaces" on public.trust_workspaces;

create policy "tenant members read trust workspaces"
  on public.trust_workspaces for select to authenticated
  using (public.user_can_access_trust_workspace(id));

create policy "users create owned trust workspaces"
  on public.trust_workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "workspace owners administer trust workspaces"
  on public.trust_workspaces for update to authenticated
  using (public.user_has_trust_workspace_role(id, array['owner', 'admin']))
  with check (public.user_has_trust_workspace_role(id, array['owner', 'admin']));

drop policy if exists "workspace owners and self add members" on public.workspace_members;
drop policy if exists "workspace owners create membership" on public.workspace_members;
drop policy if exists "authenticated manage workspace_members" on public.workspace_members;
drop policy if exists "tenant members read workspace membership" on public.workspace_members;
drop policy if exists "workspace participants read members" on public.workspace_members;
drop policy if exists "workspace owners update members" on public.workspace_members;
drop policy if exists "workspace owners update membership" on public.workspace_members;

create policy "tenant members read workspace membership"
  on public.workspace_members for select to authenticated
  using (public.user_can_access_trust_workspace(workspace_id));

create policy "workspace owners create membership"
  on public.workspace_members for insert to authenticated
  with check (public.user_has_trust_workspace_role(workspace_id, array['owner', 'admin']));

create policy "workspace owners update membership"
  on public.workspace_members for update to authenticated
  using (public.user_has_trust_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.user_has_trust_workspace_role(workspace_id, array['owner', 'admin']));

-- The browser needs only these data operations. RLS remains the tenant
-- boundary; schema-management and destructive table privileges are removed.
revoke all on table public.trust_workspaces from anon, authenticated;
grant select, insert, update on table public.trust_workspaces to authenticated;
revoke all on table public.workspace_members from anon, authenticated;
grant select, insert, update on table public.workspace_members to authenticated;

-- Every referenced relation and auth function is schema-qualified, so an
-- empty search_path is safe and immune to role-controlled object shadowing.
alter function public.user_can_access_trust_workspace(uuid) set search_path = '';
alter function public.user_has_trust_workspace_role(uuid, text[]) set search_path = '';
alter function public.identity_workspace_role(uuid) set search_path = '';
alter function public.trust_timeline_safe_uuid(text) set search_path = '';
alter function public.trust_timeline_subject_type(jsonb) set search_path = '';
alter function public.trust_timeline_subject_id(jsonb) set search_path = '';
alter function public.trust_timeline_actor_id(jsonb) set search_path = '';
alter function public.trust_timeline_safe_timestamptz(text) set search_path = '';

revoke all on function public.user_can_access_trust_workspace(uuid) from public, anon;
revoke all on function public.user_has_trust_workspace_role(uuid, text[]) from public, anon;
revoke all on function public.identity_workspace_role(uuid) from public, anon;
grant execute on function public.user_can_access_trust_workspace(uuid) to authenticated, service_role;
grant execute on function public.user_has_trust_workspace_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.identity_workspace_role(uuid) to authenticated, service_role;

-- Internal definers execute through triggers or other database routines. They
-- do not need to be callable through PostgREST. The three workspace helpers
-- above are the deliberate exception because RLS policies invoke them.
do $revoke_internal_definers$
declare
  routine record;
begin
  for routine in
    select namespace.nspname as schema_name,
           procedure.proname as routine_name,
           pg_get_function_identity_arguments(procedure.oid) as identity_arguments
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and procedure.proname not in (
        'identity_workspace_role',
        'user_can_access_trust_workspace',
        'user_has_trust_workspace_role'
      )
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon, authenticated',
      routine.schema_name,
      routine.routine_name,
      routine.identity_arguments
    );
  end loop;
end
$revoke_internal_definers$;

do $assert_product_closure_security$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('trust_workspaces', 'workspace_members')
    group by tablename, cmd, roles
    having count(*) > 1
  ) then
    raise exception 'Workspace policy reconciliation left overlapping permissive policies';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and procedure.proname not in (
        'identity_workspace_role',
        'user_can_access_trust_workspace',
        'user_has_trust_workspace_role'
      )
      and (
        has_function_privilege('anon', procedure.oid, 'EXECUTE')
        or has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      )
  ) then
    raise exception 'An internal SECURITY DEFINER function remains Data API executable';
  end if;
end
$assert_product_closure_security$;

commit;
