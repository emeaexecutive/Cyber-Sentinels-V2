-- Explicit Supabase API grants and RLS policies for Cyber Sentinels.
--
-- Future public schema tables must declare:
-- 1. API grant model for anon/authenticated/service workflows.
-- 2. RLS enablement and policies for every exposed operation.
-- 3. Workflow owner and permission boundary.
-- 4. Audit event emitted for creates, updates, and privileged reads.
--
-- Never rely on Supabase's implicit public schema exposure defaults.

grant usage on schema public to anon, authenticated;

do $$
declare
  safe_select_columns text;
  target_table text;
  authenticated_rw_tables text[] := array[
    'passports',
    'trust_passports',
    'trust_reports',
    'verification_cases',
    'verification_passports',
    'evidence_files',
    'decisions',
    'risk_scores',
    'teams',
    'team_members',
    'compliance_exports'
  ];
  authenticated_append_tables text[] := array[
    'signals',
    'trust_ledger'
  ];
begin
  -- Public waitlist intake: anon may only insert; authenticated users can run
  -- operational back-office workflow reads and updates.
  if to_regclass('public.waitlist') is not null then
    revoke all on table public.waitlist from anon, authenticated;
    grant insert on table public.waitlist to anon;
    grant select, insert, update on table public.waitlist to authenticated;

    alter table public.waitlist enable row level security;

    drop policy if exists "Allow public waitlist inserts" on public.waitlist;
    drop policy if exists "Allow authenticated waitlist reads" on public.waitlist;
    drop policy if exists "Allow authenticated waitlist inserts" on public.waitlist;
    drop policy if exists "Allow authenticated waitlist updates" on public.waitlist;

    create policy "Allow public waitlist inserts" on public.waitlist
      for insert
      to anon
      with check (true);

    create policy "Allow authenticated waitlist reads" on public.waitlist
      for select
      to authenticated
      using (true);

    create policy "Allow authenticated waitlist inserts" on public.waitlist
      for insert
      to authenticated
      with check (true);

    create policy "Allow authenticated waitlist updates" on public.waitlist
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  -- Audit logs are append-focused. Authenticated select exists for admin back
  -- office workflows; updates and deletes are intentionally not granted.
  if to_regclass('public.audit_logs') is not null then
    revoke all on table public.audit_logs from anon, authenticated;
    grant insert, select on table public.audit_logs to authenticated;

    alter table public.audit_logs enable row level security;

    drop policy if exists "Allow public audit inserts" on public.audit_logs;
    drop policy if exists "Allow authenticated audit reads" on public.audit_logs;
    drop policy if exists "Allow authenticated audit inserts" on public.audit_logs;

    create policy "Allow authenticated audit inserts" on public.audit_logs
      for insert
      to authenticated
      with check (true);

    create policy "Allow authenticated audit reads" on public.audit_logs
      for select
      to authenticated
      using (true);
  end if;

  foreach target_table in array authenticated_rw_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', target_table);
      execute format('grant select, insert, update on table public.%I to authenticated', target_table);
      execute format('alter table public.%I enable row level security', target_table);

      execute format('drop policy if exists "Allow authenticated %s reads" on public.%I', target_table, target_table);
      execute format('drop policy if exists "Allow authenticated %s inserts" on public.%I', target_table, target_table);
      execute format('drop policy if exists "Allow authenticated %s updates" on public.%I', target_table, target_table);

      -- Drop legacy policy names from earlier migrations where they differ
      -- from the normalized table-name policy convention used here.
      if target_table = 'passports' then
        drop policy if exists "Allow authenticated passport reads" on public.passports;
        drop policy if exists "Allow authenticated passport inserts" on public.passports;
        drop policy if exists "Allow authenticated passport updates" on public.passports;
      elsif target_table = 'trust_reports' then
        drop policy if exists "Allow authenticated trust report reads" on public.trust_reports;
        drop policy if exists "Allow authenticated trust report inserts" on public.trust_reports;
      elsif target_table = 'verification_cases' then
        drop policy if exists "Allow authenticated verification case reads" on public.verification_cases;
        drop policy if exists "Allow authenticated verification case inserts" on public.verification_cases;
        drop policy if exists "Allow authenticated verification case updates" on public.verification_cases;
      elsif target_table = 'evidence_files' then
        drop policy if exists "Allow authenticated evidence reads" on public.evidence_files;
      elsif target_table = 'decisions' then
        drop policy if exists "Allow authenticated decision reads" on public.decisions;
        drop policy if exists "Allow authenticated decision inserts" on public.decisions;
      elsif target_table = 'risk_scores' then
        drop policy if exists "Allow authenticated risk score reads" on public.risk_scores;
      end if;

      execute format(
        'create policy "Allow authenticated %s reads" on public.%I for select to authenticated using (true)',
        target_table,
        target_table
      );
      execute format(
        'create policy "Allow authenticated %s inserts" on public.%I for insert to authenticated with check (true)',
        target_table,
        target_table
      );
      execute format(
        'create policy "Allow authenticated %s updates" on public.%I for update to authenticated using (true) with check (true)',
        target_table,
        target_table
      );
    end if;
  end loop;

  foreach target_table in array authenticated_append_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', target_table);
      execute format('grant select, insert on table public.%I to authenticated', target_table);
      execute format('alter table public.%I enable row level security', target_table);

      execute format('drop policy if exists "Allow authenticated %s reads" on public.%I', target_table, target_table);
      execute format('drop policy if exists "Allow authenticated %s inserts" on public.%I', target_table, target_table);

      if target_table = 'signals' then
        drop policy if exists "Allow authenticated signal reads" on public.signals;
        drop policy if exists "Allow authenticated signal inserts" on public.signals;
      end if;

      execute format(
        'create policy "Allow authenticated %s reads" on public.%I for select to authenticated using (true)',
        target_table,
        target_table
      );
      execute format(
        'create policy "Allow authenticated %s inserts" on public.%I for insert to authenticated with check (true)',
        target_table,
        target_table
      );
    end if;
  end loop;

  -- API keys require normal workflow writes, but reads should never expose
  -- full secret material if a future column stores it. The app should read
  -- metadata and prefixes only.
  if to_regclass('public.api_keys') is not null then
    revoke all on table public.api_keys from anon, authenticated;
    grant insert, update on table public.api_keys to authenticated;

    select string_agg(format('%I', column_name), ', ')
    into safe_select_columns
    from information_schema.columns
    where table_schema = 'public'
      and information_schema.columns.table_name = 'api_keys'
      and column_name not in (
        'secret',
        'secret_key',
        'api_key',
        'key',
        'key_value',
        'plain_key',
        'plaintext_key',
        'raw_key',
        'token'
      );

    if safe_select_columns is not null then
      execute format('grant select (%s) on table public.api_keys to authenticated', safe_select_columns);
    end if;

    alter table public.api_keys enable row level security;

    drop policy if exists "Allow authenticated api_keys reads" on public.api_keys;
    drop policy if exists "Allow authenticated api_keys inserts" on public.api_keys;
    drop policy if exists "Allow authenticated api_keys updates" on public.api_keys;

    create policy "Allow authenticated api_keys reads" on public.api_keys
      for select
      to authenticated
      using (true);

    create policy "Allow authenticated api_keys inserts" on public.api_keys
      for insert
      to authenticated
      with check (true);

    create policy "Allow authenticated api_keys updates" on public.api_keys
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
declare
  sequence_name text;
  owning_table text;
  covered_tables text[] := array[
    'waitlist',
    'passports',
    'trust_passports',
    'trust_reports',
    'verification_cases',
    'verification_passports',
    'audit_logs',
    'signals',
    'evidence_files',
    'decisions',
    'risk_scores',
    'teams',
    'team_members',
    'api_keys',
    'compliance_exports',
    'trust_ledger'
  ];
begin
  -- Keep sequence grants explicit too. Most current Cyber Sentinels IDs use
  -- gen_random_uuid(), but any serial/identity-backed table in this list gets
  -- only the sequence access required by its table workflow.
  for sequence_name, owning_table in
    select format('%I.%I', sequence_ns.nspname, sequence_class.relname),
           table_class.relname
    from pg_class sequence_class
    join pg_namespace sequence_ns
      on sequence_ns.oid = sequence_class.relnamespace
    join pg_depend dependency
      on dependency.objid = sequence_class.oid
     and dependency.deptype in ('a', 'i')
    join pg_class table_class
      on table_class.oid = dependency.refobjid
    join pg_namespace table_ns
      on table_ns.oid = table_class.relnamespace
    where sequence_class.relkind = 'S'
      and table_ns.nspname = 'public'
      and table_class.relname = any (covered_tables)
  loop
    execute format('revoke all on sequence %s from anon, authenticated', sequence_name);

    if owning_table = 'waitlist' then
      execute format('grant usage, select on sequence %s to anon, authenticated', sequence_name);
    else
      execute format('grant usage, select on sequence %s to authenticated', sequence_name);
    end if;
  end loop;
end $$;
