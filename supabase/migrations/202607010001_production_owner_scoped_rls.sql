-- Production owner-scoped RLS for core trust records.
-- Replaces legacy "any authenticated user" policies without weakening service-role access.

alter table public.passports add column if not exists owner_email text;
alter table public.trust_reports add column if not exists owner_email text;
alter table public.verification_cases add column if not exists owner_email text;
alter table public.audit_logs add column if not exists owner_email text;

alter table public.passports enable row level security;
alter table public.trust_reports enable row level security;
alter table public.verification_cases enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.passports from anon, authenticated;
revoke all on table public.trust_reports from anon, authenticated;
revoke all on table public.verification_cases from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

grant select, insert, update on table public.passports to authenticated;
grant select, insert, update on table public.trust_reports to authenticated;
grant select, insert, update on table public.verification_cases to authenticated;
grant select, insert on table public.audit_logs to authenticated;

drop policy if exists "Allow authenticated passports reads" on public.passports;
drop policy if exists "Allow authenticated passports inserts" on public.passports;
drop policy if exists "Allow authenticated passports updates" on public.passports;
drop policy if exists "Allow authenticated trust_reports reads" on public.trust_reports;
drop policy if exists "Allow authenticated trust_reports inserts" on public.trust_reports;
drop policy if exists "Allow authenticated trust_reports updates" on public.trust_reports;
drop policy if exists "Allow authenticated verification_cases reads" on public.verification_cases;
drop policy if exists "Allow authenticated verification_cases inserts" on public.verification_cases;
drop policy if exists "Allow authenticated verification_cases updates" on public.verification_cases;
drop policy if exists "Allow authenticated audit_logs reads" on public.audit_logs;
drop policy if exists "Allow authenticated audit_logs inserts" on public.audit_logs;
drop policy if exists "Allow authenticated audit_logs updates" on public.audit_logs;
drop policy if exists "authenticated manage audit_logs" on public.audit_logs;

drop policy if exists "passport owners read" on public.passports;
drop policy if exists "passport owners insert" on public.passports;
drop policy if exists "passport owners update" on public.passports;
drop policy if exists "trust report owners read" on public.trust_reports;
drop policy if exists "trust report owners insert" on public.trust_reports;
drop policy if exists "trust report owners update" on public.trust_reports;
drop policy if exists "verification case owners read" on public.verification_cases;
drop policy if exists "verification case owners insert" on public.verification_cases;
drop policy if exists "verification case owners update" on public.verification_cases;
drop policy if exists "audit owners read" on public.audit_logs;
drop policy if exists "audit owners insert" on public.audit_logs;

create policy "passport owners read"
  on public.passports for select to authenticated
  using (
    lower(coalesce(owner_email, user_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "passport owners insert"
  on public.passports for insert to authenticated
  with check (
    lower(coalesce(owner_email, user_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "passport owners update"
  on public.passports for update to authenticated
  using (
    lower(coalesce(owner_email, user_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    lower(coalesce(owner_email, user_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "trust report owners read"
  on public.trust_reports for select to authenticated
  using (
    lower(coalesce(owner_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "trust report owners insert"
  on public.trust_reports for insert to authenticated
  with check (
    lower(coalesce(owner_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "trust report owners update"
  on public.trust_reports for update to authenticated
  using (
    lower(coalesce(owner_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    lower(coalesce(owner_email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "verification case owners read"
  on public.verification_cases for select to authenticated
  using (
    lower(coalesce(owner_email, '')) =
      lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (
      select 1 from public.passports
      where passports.id = verification_cases.passport_id
      and lower(coalesce(passports.owner_email, passports.user_email, '')) =
        lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "verification case owners insert"
  on public.verification_cases for insert to authenticated
  with check (
    lower(coalesce(owner_email, '')) =
      lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (
      select 1 from public.passports
      where passports.id = verification_cases.passport_id
      and lower(coalesce(passports.owner_email, passports.user_email, '')) =
        lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "verification case owners update"
  on public.verification_cases for update to authenticated
  using (
    lower(coalesce(owner_email, '')) =
      lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (
      select 1 from public.passports
      where passports.id = verification_cases.passport_id
      and lower(coalesce(passports.owner_email, passports.user_email, '')) =
        lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    lower(coalesce(owner_email, '')) =
      lower(coalesce(auth.jwt() ->> 'email', ''))
    or exists (
      select 1 from public.passports
      where passports.id = verification_cases.passport_id
      and lower(coalesce(passports.owner_email, passports.user_email, '')) =
        lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "audit owners read"
  on public.audit_logs for select to authenticated
  using (
    lower(coalesce(owner_email, actor, metadata ->> 'actor', '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "audit owners insert"
  on public.audit_logs for insert to authenticated
  with check (
    lower(coalesce(owner_email, actor, metadata ->> 'actor', '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  );

do $$
begin
  if to_regclass('public.governance_logs') is not null then
    execute 'alter table public.governance_logs enable row level security';
    execute 'revoke all on table public.governance_logs from anon, authenticated';
  end if;
  if to_regclass('public.admin_actions') is not null then
    execute 'alter table public.admin_actions enable row level security';
    execute 'revoke all on table public.admin_actions from anon, authenticated';
  end if;
end $$;
