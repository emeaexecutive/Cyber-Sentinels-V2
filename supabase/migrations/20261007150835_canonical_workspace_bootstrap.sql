-- Canonical forward version of archived Staging bootstrap. Approval RLS remains
-- restrictive: account creation alone cannot create/read a customer workspace.
begin;

-- Idempotent first-customer workspace bootstrap.
--
-- The browser inserts only the workspace row with its cookie-bound
-- authenticated client. A private trigger establishes the initial owner
-- membership in the same transaction, so there is never a tenant without an
-- accountable owner and no service-role credential is exposed to the browser.


do $$
begin
  if exists (
    select 1
    from public.workspace_members
    group by workspace_id, user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate workspace memberships must be reconciled before customer bootstrap is enabled';
  end if;
end
$$;

create unique index if not exists workspace_members_workspace_user_uidx
  on public.workspace_members (workspace_id, user_id);

create schema if not exists private;

create or replace function private.establish_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (workspace_id, user_id) do update
      set role = case
        when public.workspace_members.role in ('owner', 'admin') then public.workspace_members.role
        else 'owner'
      end;
  end if;
  return new;
end;
$$;

revoke all on function private.establish_workspace_owner_membership() from public, anon, authenticated;

drop trigger if exists establish_workspace_owner_membership on public.trust_workspaces;

create trigger establish_workspace_owner_membership
  after insert on public.trust_workspaces
  for each row
  execute function private.establish_workspace_owner_membership();

-- Reconcile historical owner rows without deleting or weakening any existing
-- membership. This also makes the migration safe for already-created tenants.
insert into public.workspace_members (workspace_id, user_id, role)
select workspace.id, workspace.created_by, 'owner'
from public.trust_workspaces workspace
where workspace.created_by is not null
on conflict (workspace_id, user_id) do update
  set role = case
    when public.workspace_members.role in ('owner', 'admin') then public.workspace_members.role
    else 'owner'
  end;

comment on function private.establish_workspace_owner_membership() is
  'Creates the accountable first owner membership atomically with a customer workspace insert.';

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
  using (created_by = (select auth.uid()) or public.user_can_access_trust_workspace(id));

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

grant usage on schema private to postgres, service_role;

revoke all on schema private from public, anon, authenticated;

grant select, insert, update on public.trust_workspaces, public.workspace_members to authenticated;

commit;
