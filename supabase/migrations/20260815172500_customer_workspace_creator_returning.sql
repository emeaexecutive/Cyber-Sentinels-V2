-- Keep first-customer bootstrap cookie-bound while allowing INSERT ...
-- RETURNING to see only the workspace owned by the authenticated creator.
-- Membership remains the general tenant read boundary and is established by
-- the existing private AFTER INSERT trigger in the same transaction.

begin;

drop policy if exists "tenant members read trust workspaces"
  on public.trust_workspaces;

create policy "tenant members read trust workspaces"
  on public.trust_workspaces for select to authenticated
  using (
    created_by = (select auth.uid())
    or public.user_can_access_trust_workspace(id)
  );

commit;
