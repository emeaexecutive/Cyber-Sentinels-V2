-- Idempotent first-customer workspace bootstrap.
--
-- The browser inserts only the workspace row with its cookie-bound
-- authenticated client. A private trigger establishes the initial owner
-- membership in the same transaction, so there is never a tenant without an
-- accountable owner and no service-role credential is exposed to the browser.

begin;

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

commit;
