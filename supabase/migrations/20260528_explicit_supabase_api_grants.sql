-- Explicit Supabase API grants and RLS policies for Cyber Sentinels.
--
-- Every future public table must define:
-- - grant model
-- - RLS
-- - policies
-- - workflow
-- - audit event
-- - permission boundary
--
-- Never rely on Supabase's implicit public schema exposure defaults.

grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
declare
  target_table text;
  authenticated_rw_tables text[] := array[
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

  foreach target_table in array authenticated_rw_tables loop
    if to_regclass(format('public.%I', target_table)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', target_table);
      execute format('grant select, insert, update on table public.%I to authenticated', target_table);
      execute format('alter table public.%I enable row level security', target_table);

      execute format('drop policy if exists "Allow authenticated %s reads" on public.%I', target_table, target_table);
      execute format('drop policy if exists "Allow authenticated %s inserts" on public.%I', target_table, target_table);
      execute format('drop policy if exists "Allow authenticated %s updates" on public.%I', target_table, target_table);

      if target_table = 'audit_logs' then
        -- Private beta allows authenticated select/insert/update for admin
        -- workflow. Tighten to insert-only plus admin service role later.
        drop policy if exists "Allow public audit inserts" on public.audit_logs;
        drop policy if exists "Allow authenticated audit reads" on public.audit_logs;
        drop policy if exists "Allow authenticated audit inserts" on public.audit_logs;
        drop policy if exists "Allow authenticated audit updates" on public.audit_logs;
      end if;

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
      elsif target_table = 'signals' then
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
      execute format(
        'create policy "Allow authenticated %s updates" on public.%I for update to authenticated using (true) with check (true)',
        target_table,
        target_table
      );
    end if;
  end loop;
end $$;
