-- Keep first-customer bootstrap cookie-bound while allowing INSERT ...
-- RETURNING to see only the workspace owned by the authenticated creator.
-- Membership remains the general tenant read boundary and is established by
-- the existing private AFTER INSERT trigger in the same transaction.

begin;

select public.ensure_policy_definition_v2(
  'public',
  'trust_workspaces',
  'tenant members read trust workspaces',
  'SELECT',
  array['authenticated']::name[],
  'created_by = (select auth.uid()) or public.user_can_access_trust_workspace(id)',
  null,
  'intentional_replace',
  '20260815172500-customer-workspace-creator-returning',
  'Permit INSERT ... RETURNING for the authenticated creator while preserving membership-based tenant reads.',
  true
);

commit;
