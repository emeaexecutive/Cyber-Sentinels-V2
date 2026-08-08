-- Provider-neutral Preview qualification forward repair.
-- Neutralizes legacy cross-table RLS policies that recurse between
-- trust_workspaces and workspace_members. The hardened security-definer
-- tenant access policies created by 202608060001 remain authoritative.

begin;

-- Preserve the historical policy names while replacing their recursive grants
-- with fail-closed definitions through the canonical, drift-detecting guard.
-- The replacement intent and previous definitions are retained in
-- migration_policy_decisions.
select public.ensure_policy_definition_v2(
  'public', 'trust_workspaces', 'workspace owners and members read workspaces',
  'SELECT', array['authenticated']::name[], 'false', null,
  'intentional_replace', '202608080002-provider-neutral-workspace-rls-forward-repair',
  'Neutralize legacy recursive workspace read policy; hardened tenant policy remains authoritative.', true
);

select public.ensure_policy_definition_v2(
  'public', 'workspace_members', 'workspace participants read members',
  'SELECT', array['authenticated']::name[], 'false', null,
  'intentional_replace', '202608080002-provider-neutral-workspace-rls-forward-repair',
  'Neutralize legacy recursive membership read policy; hardened tenant policy remains authoritative.', true
);

-- These legacy mutation policies also query the opposite RLS-protected table.
-- Current owner/admin mutations are governed by user_has_trust_workspace_role.
select public.ensure_policy_definition_v2(
  'public', 'workspace_members', 'workspace owners and self add members',
  'INSERT', array['authenticated']::name[], null, 'false',
  'intentional_replace', '202608080002-provider-neutral-workspace-rls-forward-repair',
  'Neutralize legacy recursive membership insert policy; hardened owner policy remains authoritative.', true
);

select public.ensure_policy_definition_v2(
  'public', 'workspace_members', 'workspace owners update members',
  'UPDATE', array['authenticated']::name[], 'false', 'false',
  'intentional_replace', '202608080002-provider-neutral-workspace-rls-forward-repair',
  'Neutralize legacy recursive membership update policy; hardened owner policy remains authoritative.', true
);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trust_workspaces'
      and policyname = 'tenant members read trust workspaces'
      and cmd = 'SELECT'
  ) then
    raise exception 'Hardened trust_workspaces tenant-read policy is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workspace_members'
      and policyname = 'tenant members read workspace membership'
      and cmd = 'SELECT'
  ) then
    raise exception 'Hardened workspace_members tenant-read policy is missing';
  end if;
end
$$;

comment on function public.user_can_access_trust_workspace(uuid) is
  'Security-definer tenant membership check used by non-recursive RLS policies.';

commit;
