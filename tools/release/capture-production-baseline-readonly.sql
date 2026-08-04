begin transaction read only;

select json_build_object(
  'captured_at_utc', timezone('utc', clock_timestamp()),
  'postgres_version', current_setting('server_version'),
  'extensions', (
    select coalesce(json_agg(e.extname order by e.extname), '[]'::json)
    from pg_extension e
  ),
  'tables', (
    select coalesce(
      json_agg(n.nspname || '.' || c.relname order by n.nspname, c.relname),
      '[]'::json
    )
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth', 'storage')
      and c.relkind in ('r', 'p')
  ),
  'views', (
    select coalesce(
      json_agg(n.nspname || '.' || c.relname order by n.nspname, c.relname),
      '[]'::json
    )
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth', 'storage')
      and c.relkind = 'v'
  ),
  'materialized_views', (
    select coalesce(
      json_agg(n.nspname || '.' || c.relname order by n.nspname, c.relname),
      '[]'::json
    )
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth', 'storage')
      and c.relkind = 'm'
  ),
  'function_signatures', (
    select coalesce(
      json_agg(
        n.nspname || '.' || p.proname || '('
          || pg_get_function_identity_arguments(p.oid) || ')'
        order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
      ),
      '[]'::json
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
  ),
  'rls_enabled_tables', (
    select coalesce(
      json_agg(n.nspname || '.' || c.relname order by n.nspname, c.relname),
      '[]'::json
    )
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth', 'storage')
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  ),
  'policies', (
    select coalesce(
      json_agg(
        p.schemaname || '.' || p.tablename || '.' || p.policyname
        order by p.schemaname, p.tablename, p.policyname
      ),
      '[]'::json
    )
    from pg_policies p
    where p.schemaname in ('public', 'auth', 'storage')
  ),
  'indexes', (
    select coalesce(
      json_agg(i.schemaname || '.' || i.indexname order by i.schemaname, i.indexname),
      '[]'::json
    )
    from pg_indexes i
    where i.schemaname in ('public', 'auth', 'storage')
  ),
  'triggers', (
    select coalesce(
      json_agg(
        n.nspname || '.' || c.relname || '.' || t.tgname
        order by n.nspname, c.relname, t.tgname
      ),
      '[]'::json
    )
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'auth', 'storage')
      and not t.tgisinternal
  ),
  'grant_categories', (
    select coalesce(json_agg(categories.category order by categories.category), '[]'::json)
    from (
      select distinct table_schema || ':' || grantee || ':' || privilege_type as category
      from information_schema.role_table_grants
      where table_schema in ('public', 'auth', 'storage')
    ) categories
  ),
  'auth_storage_foreign_keys', (
    select coalesce(
      json_agg(
        source_namespace.nspname || '.' || source_table.relname || '.' || constraint_row.conname
          || ' -> ' || target_namespace.nspname || '.' || target_table.relname
        order by source_namespace.nspname, source_table.relname, constraint_row.conname
      ),
      '[]'::json
    )
    from pg_constraint constraint_row
    join pg_class source_table on source_table.oid = constraint_row.conrelid
    join pg_namespace source_namespace on source_namespace.oid = source_table.relnamespace
    join pg_class target_table on target_table.oid = constraint_row.confrelid
    join pg_namespace target_namespace on target_namespace.oid = target_table.relnamespace
    where constraint_row.contype = 'f'
      and source_namespace.nspname = 'public'
      and target_namespace.nspname in ('auth', 'storage')
  ),
  'auth_storage_function_dependencies', (
    select coalesce(json_agg(dependencies.signature order by dependencies.signature), '[]'::json)
    from (
      select distinct
        'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and (
          pg_get_functiondef(p.oid) ~* '\mauth\.'
          or pg_get_functiondef(p.oid) ~* '\mstorage\.'
        )
    ) dependencies
  )
) as sanitized_baseline;

commit;
