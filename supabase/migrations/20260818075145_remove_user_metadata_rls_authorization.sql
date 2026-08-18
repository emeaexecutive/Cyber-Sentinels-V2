-- Forward-only remediation for Supabase advisor lint
-- advisor lint 0015 (RLS references user-editable auth metadata).
--
-- Historical Production policies accepted either a server-controlled app
-- role or a user-editable role. Preserve the
-- canonical policy names and existing authorization model while removing the
-- user-controlled branch.  Every replacement is recorded by the canonical
-- migration policy decision ledger.

begin;

alter table public.trust_assistant_questions enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.message_threads enable row level security;
alter table public.message_events enable row level security;
alter table public.appeals enable row level security;
alter table public.agents enable row level security;
alter table public.trust_events enable row level security;
alter table public.agent_permissions enable row level security;
alter table public.api_keys enable row level security;

select public.ensure_policy_definition_v2(
  'public', 'trust_assistant_questions', 'admin manage trust_assistant_questions',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

select public.ensure_policy_definition_v2(
  'public', 'knowledge_articles', 'admin manage knowledge_articles',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

select public.ensure_policy_definition_v2(
  'public', 'message_threads', 'admin manage message_threads',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

select public.ensure_policy_definition_v2(
  'public', 'message_events', 'admin manage message_events',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

select public.ensure_policy_definition_v2(
  'public', 'appeals', 'admin manage appeals',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

select public.ensure_policy_definition_v2(
  'public', 'agents', 'admin manage agents',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

-- Canonical trust-event rows are tenant-scoped through the dedicated
-- workspace policy.  Global admin authority applies only to legacy/non-v1
-- rows, exactly as in the canonical trust-event foundation migration.
select public.ensure_policy_definition_v2(
  'public', 'trust_events', 'admin manage trust_events',
  'ALL', array['authenticated']::name[],
  '((schema_version IS DISTINCT FROM ''trust-event-v1''::text) AND (COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text))',
  '((schema_version IS DISTINCT FROM ''trust-event-v1''::text) AND (COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text))',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove user-editable admin authority and preserve canonical trust-event tenant isolation.', true
);

select public.ensure_policy_definition_v2(
  'public', 'agent_permissions', 'admin manage agent_permissions',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

select public.ensure_policy_definition_v2(
  'public', 'api_keys', 'admin manage api_keys',
  'ALL', array['authenticated']::name[],
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text), ''''::text) = ''admin''::text)',
  'intentional_replace', '20260818075145-remove-user-metadata-rls-authorization',
  'Remove the user-editable auth metadata admin authorization branch.', true
);

do $$
declare
  unsafe_policy_count integer;
  rls_disabled_count integer;
begin
  select count(*) into unsafe_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any (array[
      'trust_assistant_questions', 'knowledge_articles', 'message_threads',
      'message_events', 'appeals', 'agents', 'trust_events',
      'agent_permissions', 'api_keys'
    ])
    and (coalesce(qual, '') ilike '%' || 'user_' || 'metadata' || '%'
      or coalesce(with_check, '') ilike '%' || 'user_' || 'metadata' || '%');

  if unsafe_policy_count <> 0 then
    raise exception 'User-editable metadata remains in % release authorization policies', unsafe_policy_count;
  end if;

  select count(*) into rls_disabled_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = any (array[
      'trust_assistant_questions', 'knowledge_articles', 'message_threads',
      'message_events', 'appeals', 'agents', 'trust_events',
      'agent_permissions', 'api_keys'
    ])
    and not relation.relrowsecurity;

  if rls_disabled_count <> 0 then
    raise exception 'RLS is disabled on % remediated release tables', rls_disabled_count;
  end if;
end
$$;

commit;
