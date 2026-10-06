-- Replace broad legacy authenticated policies with owner, team, or parent checks.
-- Ownerless legacy records remain available to trusted service-role routes only.

alter table public.ai_agents add column if not exists owner_enterprise_id uuid;
alter table public.decisions add column if not exists case_id uuid;
alter table public.decisions add column if not exists passport_id uuid;
alter table public.provenance_events add column if not exists enterprise_id uuid;
alter table public.risk_scores add column if not exists case_id uuid;
alter table public.trust_reports add column if not exists passport_id uuid;

create or replace function public.security_closure_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_team_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.team_members tm
      where tm.team_id = p_team_id
        and lower(tm.member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and lower(coalesce(tm.invitation_status, '')) in ('active', 'accepted', 'approved')
    );
$$;

create or replace function public.security_closure_team_member(p_team_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(p_team_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.security_closure_team_member(p_team_id::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

create or replace function public.security_closure_passport_owner(p_passport_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.passports p
    where p.id = p_passport_id
      and (
        lower(coalesce(p.owner_email, p.user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or public.security_closure_team_member(p.team_id)
      )
  );
$$;

create or replace function public.security_closure_case_owner(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.verification_cases vc
    where vc.id = p_case_id
      and (
        lower(coalesce(vc.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or public.security_closure_team_member(vc.team_id)
        or public.security_closure_passport_owner(vc.passport_id)
      )
  );
$$;

create or replace function public.security_closure_ai_agent_owner(p_agent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.ai_agents a
    where a.id = p_agent_id
      and (a.owner_user_id is null or a.owner_user_id = auth.uid())
      and (a.owner_email is null or lower(a.owner_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      and (a.owner_enterprise_id is null or public.user_can_access_trust_workspace(a.owner_enterprise_id))
      and (a.enterprise_id is null or public.user_can_access_trust_workspace(a.enterprise_id))
      and (a.owner_enterprise_id is null or a.enterprise_id is null or a.owner_enterprise_id = a.enterprise_id)
      and (a.owner_user_id is not null or a.owner_email is not null or a.owner_enterprise_id is not null or a.enterprise_id is not null)
  );
$$;

create or replace function public.security_closure_evidence_object_owner(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  case_prefix text;
begin
  case_prefix := split_part(coalesce(p_object_name, ''), '/', 1);
  if case_prefix !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.security_closure_case_owner(case_prefix::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.security_closure_team_member(uuid) from public, anon;
revoke all on function public.security_closure_team_member(text) from public, anon;
revoke all on function public.security_closure_passport_owner(uuid) from public, anon;
revoke all on function public.security_closure_case_owner(uuid) from public, anon;
revoke all on function public.security_closure_ai_agent_owner(uuid) from public, anon;
revoke all on function public.security_closure_evidence_object_owner(text) from public, anon;
grant execute on function public.security_closure_team_member(uuid) to authenticated, service_role;
grant execute on function public.security_closure_team_member(text) to authenticated, service_role;
grant execute on function public.security_closure_passport_owner(uuid) to authenticated, service_role;
grant execute on function public.security_closure_case_owner(uuid) to authenticated, service_role;
grant execute on function public.security_closure_ai_agent_owner(uuid) to authenticated, service_role;
grant execute on function public.security_closure_evidence_object_owner(text) to authenticated, service_role;

create or replace function public.security_closure_set_signal_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.owner_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  end if;
  return new;
end;
$$;

revoke all on function public.security_closure_set_signal_owner() from public, anon, authenticated;
drop trigger if exists security_closure_set_signal_owner on public.signals;
create trigger security_closure_set_signal_owner
  before insert on public.signals
  for each row execute function public.security_closure_set_signal_owner();

create or replace function public.security_closure_set_audit_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.owner_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  end if;
  return new;
end;
$$;

revoke all on function public.security_closure_set_audit_owner() from public, anon, authenticated;
drop trigger if exists security_closure_set_audit_owner on public.audit_logs;
create trigger security_closure_set_audit_owner
  before insert on public.audit_logs
  for each row execute function public.security_closure_set_audit_owner();

do $$
declare
  v_table_name text;
  policy_row record;
  affected_tables text[] := array[
    'ai_agents', 'api_keys', 'audit_logs', 'autonomy_profiles',
    'data_rights_requests', 'decisions', 'enterprise_access_requests',
    'evidence_files', 'execution_passports', 'feedback_reports',
    'help_questions', 'intent_requests', 'interest_signals',
    'knowledge_articles', 'passport_state_checks', 'passports',
    'provenance_events', 'risk_scores', 'signals', 'system_health_checks',
    'team_members', 'teams', 'trust_alerts', 'trust_algorithm_runs',
    'trust_assistant_questions', 'trust_certifications', 'trust_graph_edges',
    'trust_graph_nodes', 'trust_reports', 'verification_cases',
    'verification_passports', 'verifiers', 'waitlist'
  ];
begin
  foreach v_table_name in array affected_tables loop
    if to_regclass(format('public.%I', v_table_name)) is null then
      continue;
    end if;

    for policy_row in
      select policies.policyname
      from pg_policies as policies
      where policies.schemaname = 'public'
        and policies.tablename = v_table_name
        and 'authenticated' = any(policies.roles)
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, v_table_name);
    end loop;

    execute format('alter table public.%I enable row level security', v_table_name);
    execute format('revoke all on table public.%I from authenticated', v_table_name);
  end loop;

  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'enterprise_access_requests'
      and 'anon' = any(roles)
  loop
    execute format('drop policy %I on public.enterprise_access_requests', policy_row.policyname);
  end loop;
end;
$$;

revoke all on table public.enterprise_access_requests from anon, authenticated;
revoke insert (name, work_email, company, role, company_size,
  current_problem_category, current_problem, ai_usage_level, use_case,
  message, design_partner_interest, governance_interest,
  operational_ai_interest, status) on public.enterprise_access_requests from anon;
grant select on table public.enterprise_access_requests to authenticated;
create policy "enterprise requests read own submission"
  on public.enterprise_access_requests for select to authenticated
  using (auth.uid() is not null and lower(coalesce(work_email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

grant select, insert, update on public.ai_agents to authenticated;
create policy "ai agents owner access" on public.ai_agents for all to authenticated
  using (public.security_closure_ai_agent_owner(id))
  with check (public.security_closure_ai_agent_owner(id));

grant select on table public.api_keys to authenticated;
create policy "api keys owner read" on public.api_keys for select to authenticated
  using (
    (
      tenant_id is not null
      and public.user_can_access_trust_workspace(tenant_id)
    )
    or (
      tenant_id is null
      and (owner_user_id is null or owner_user_id = auth.uid())
      and (user_id is null or user_id = auth.uid())
      and (user_email is null or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      and (owner_user_id is not null or user_id is not null or user_email is not null)
    )
  );

grant select, insert on table public.audit_logs to authenticated;
create policy "audit logs owner read" on public.audit_logs for select to authenticated
  using (
    lower(coalesce(owner_email, actor, metadata ->> 'actor', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
  );
create policy "audit logs owner insert" on public.audit_logs for insert to authenticated
  with check (
    auth.uid() is not null and (
      lower(coalesce(owner_email, actor, metadata ->> 'actor', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
  );

grant select, insert, update on table public.autonomy_profiles to authenticated;
create policy "autonomy profiles creator access" on public.autonomy_profiles for all to authenticated
  using (auth.uid() is not null and lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (auth.uid() is not null and lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

grant select, insert on table public.data_rights_requests to authenticated;
create policy "data rights requester access" on public.data_rights_requests for all to authenticated
  using (
    auth.uid() is not null
    and (requester_user_id is null or requester_user_id = auth.uid())
    and (requester_email is null or lower(requester_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (requester_user_id is not null or requester_email is not null)
  )
  with check (
    auth.uid() is not null
    and (requester_user_id is null or requester_user_id = auth.uid())
    and (requester_email is null or lower(requester_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (requester_user_id is not null or requester_email is not null)
  );

grant select, insert, update on table public.decisions to authenticated;
create policy "decisions owner access" on public.decisions for all to authenticated
  using (
    lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
    or public.security_closure_case_owner(coalesce(verification_case_id, case_id))
    or public.security_closure_passport_owner(passport_id)
  )
  with check (
    (
      lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
      or public.security_closure_case_owner(coalesce(verification_case_id, case_id))
      or public.security_closure_passport_owner(passport_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
    and (coalesce(verification_case_id, case_id) is null or public.security_closure_case_owner(coalesce(verification_case_id, case_id)))
    and (passport_id is null or public.security_closure_passport_owner(passport_id))
  );

grant select, insert, update on table public.evidence_files to authenticated;
create policy "evidence files owner access" on public.evidence_files for all to authenticated
  using (
    lower(coalesce(owner_email, uploaded_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
    or public.security_closure_case_owner(verification_case_id)
    or public.security_closure_passport_owner(passport_id)
  )
  with check (
    auth.uid() is not null and (
      lower(coalesce(owner_email, uploaded_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
      or public.security_closure_case_owner(verification_case_id)
      or public.security_closure_passport_owner(passport_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
    and (verification_case_id is null or public.security_closure_case_owner(verification_case_id))
    and (passport_id is null or public.security_closure_passport_owner(passport_id))
  );

grant select, insert, update on table public.execution_passports to authenticated;
create policy "execution passports owner access" on public.execution_passports for all to authenticated
  using (
    lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_passport_owner(passport_id)
  )
  with check (
    (
      lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_passport_owner(passport_id)
    )
    and (passport_id is null or public.security_closure_passport_owner(passport_id))
  );

grant select, insert on table public.feedback_reports to authenticated;
create policy "feedback submitter access" on public.feedback_reports for all to authenticated
  using (
    auth.uid() is not null
    and (submitted_by_user_id is null or submitted_by_user_id = auth.uid())
    and (submitted_by_email is null or lower(submitted_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (submitted_by_user_id is not null or submitted_by_email is not null)
  )
  with check (
    auth.uid() is not null
    and (submitted_by_user_id is null or submitted_by_user_id = auth.uid())
    and (submitted_by_email is null or lower(submitted_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (submitted_by_user_id is not null or submitted_by_email is not null)
  );

grant select, insert on table public.help_questions to authenticated;
create policy "help question author access" on public.help_questions for all to authenticated
  using (
    auth.uid() is not null
    and (created_by_user_id is null or created_by_user_id = auth.uid())
    and (created_by_email is null or lower(created_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (created_by is null or lower(created_by) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (created_by_user_id is not null or created_by_email is not null or created_by is not null)
  )
  with check (
    auth.uid() is not null
    and (created_by_user_id is null or created_by_user_id = auth.uid())
    and (created_by_email is null or lower(created_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (created_by is null or lower(created_by) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (created_by_user_id is not null or created_by_email is not null or created_by is not null)
  );

grant select, insert on table public.intent_requests to authenticated;
create policy "intent requests creator access" on public.intent_requests for all to authenticated
  using (auth.uid() is not null and lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (auth.uid() is not null and lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

grant select on table public.knowledge_articles to authenticated;
create policy "knowledge articles read approved" on public.knowledge_articles for select to authenticated
  using (lower(coalesce(status, '')) = 'approved');

grant select, insert on table public.passport_state_checks to authenticated;
create policy "passport state checks owner access" on public.passport_state_checks for all to authenticated
  using (
    lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_passport_owner(passport_id)
  )
  with check (
    (
      lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_passport_owner(passport_id)
    )
    and (passport_id is null or public.security_closure_passport_owner(passport_id))
  );

grant select, insert on table public.passports to authenticated;
create policy "passports owner access" on public.passports for all to authenticated
  using (
    lower(coalesce(owner_email, user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
  )
  with check (
    auth.uid() is not null and (
      lower(coalesce(owner_email, user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
  );

grant select, insert on table public.provenance_events to authenticated;
create policy "provenance events tenant access" on public.provenance_events for all to authenticated
  using (
    lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.user_can_access_trust_workspace(enterprise_id)
  )
  with check (
    auth.uid() is not null and (
      lower(coalesce(created_by, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.user_can_access_trust_workspace(enterprise_id)
    )
    and (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id))
  );

grant select, insert on table public.risk_scores to authenticated;
create policy "risk scores parent access" on public.risk_scores for all to authenticated
  using (
    public.security_closure_team_member(team_id)
    or public.security_closure_case_owner(coalesce(verification_case_id, case_id))
  )
  with check (
    public.security_closure_team_member(team_id)
    or public.security_closure_case_owner(coalesce(verification_case_id, case_id))
  );

grant select, insert on table public.signals to authenticated;
create policy "signals owner access" on public.signals for all to authenticated
  using (
    lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
  )
  with check (
    auth.uid() is not null and (
      lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
  );

grant select on table public.team_members to authenticated;
create policy "team members read own membership" on public.team_members for select to authenticated
  using (auth.uid() is not null and lower(coalesce(member_email, '')) = lower(coalesce(auth.jwt() ->> 'email', '')));

grant select on table public.teams to authenticated;
create policy "teams read by active members" on public.teams for select to authenticated
  using (public.security_closure_team_member(id));

grant select on table public.trust_alerts to authenticated;
create policy "trust alerts tenant read" on public.trust_alerts for select to authenticated
  using (
    created_by = auth.uid()
    or public.user_can_access_trust_workspace(enterprise_id)
  );

grant select, insert on table public.trust_algorithm_runs to authenticated;
create policy "trust algorithm runs subject access" on public.trust_algorithm_runs for all to authenticated
  using (
    (subject_type = 'passport' and exists (select 1 from public.passports p where p.id = subject_id and public.security_closure_passport_owner(p.id)))
    or (subject_type = 'agent' and public.security_closure_ai_agent_owner(subject_id))
  )
  with check (
    (subject_type = 'passport' and exists (select 1 from public.passports p where p.id = subject_id and public.security_closure_passport_owner(p.id)))
    or (subject_type = 'agent' and public.security_closure_ai_agent_owner(subject_id))
  );

grant select, insert on table public.trust_assistant_questions to authenticated;
create policy "trust assistant question author access" on public.trust_assistant_questions for all to authenticated
  using (
    auth.uid() is not null
    and (asked_by_user_id is null or asked_by_user_id = auth.uid())
    and (asked_by_email is null or lower(asked_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (asked_by_user_id is not null or asked_by_email is not null)
  )
  with check (
    auth.uid() is not null
    and (asked_by_user_id is null or asked_by_user_id = auth.uid())
    and (asked_by_email is null or lower(asked_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and (asked_by_user_id is not null or asked_by_email is not null)
  );

grant select, insert, delete on table public.trust_certifications to authenticated;
grant update (notes, updated_at) on table public.trust_certifications to authenticated;
create policy "trust certifications owner read" on public.trust_certifications for select to authenticated
  using (
    created_by = auth.uid()
    or public.user_can_access_trust_workspace(enterprise_id)
  );
create policy "trust certifications pending request" on public.trust_certifications for insert to authenticated
  with check (
    created_by = auth.uid()
    and status = 'pending'
    and (enterprise_id is null or public.user_can_access_trust_workspace(enterprise_id))
  );
create policy "trust certifications pending update" on public.trust_certifications for update to authenticated
  using (created_by = auth.uid() and status = 'pending')
  with check (created_by = auth.uid() and status = 'pending');
create policy "trust certifications pending delete" on public.trust_certifications for delete to authenticated
  using (created_by = auth.uid() and status = 'pending');

grant select, insert on table public.verifiers to authenticated;
create policy "verifiers read own applications" on public.verifiers for select to authenticated
  using (created_by = auth.uid());
create policy "verifiers submit own applications" on public.verifiers for insert to authenticated
  with check (created_by = auth.uid() and status = 'pending');

grant select, insert, update on table public.trust_reports to authenticated;
create policy "trust reports owner access" on public.trust_reports for all to authenticated
  using (
    lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
  )
  with check (
    auth.uid() is not null and (
      lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
    and (passport_id is null or public.security_closure_passport_owner(passport_id))
  );

grant select, insert, update on table public.verification_cases to authenticated;
create policy "verification cases owner access" on public.verification_cases for all to authenticated
  using (
    lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.security_closure_team_member(team_id)
    or public.security_closure_passport_owner(passport_id)
  )
  with check (
    auth.uid() is not null and (
      lower(coalesce(owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or public.security_closure_team_member(team_id)
      or public.security_closure_passport_owner(passport_id)
    )
    and (team_id is null or public.security_closure_team_member(team_id))
    and (passport_id is null or public.security_closure_passport_owner(passport_id))
  );

-- The remaining affected legacy tables have no reliable owner/tenant key.
-- Their broad policies and authenticated grants are removed above; trusted
-- service-role paths remain available without changing stored rows.

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and ('authenticated' = any(roles) or 'anon' = any(roles))
      and (coalesce(qual, '') like '%evidence-files%' or coalesce(with_check, '') like '%evidence-files%')
  loop
    execute format('drop policy %I on storage.objects', policy_row.policyname);
  end loop;
end;
$$;

update storage.buckets set public = false where id = 'evidence-files';
grant select, insert, update, delete on storage.objects to authenticated;
create policy "evidence objects owner read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence-files' and public.security_closure_evidence_object_owner(name));
create policy "evidence objects owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-files' and public.security_closure_evidence_object_owner(name));
create policy "evidence objects owner replace" on storage.objects for update to authenticated
  using (bucket_id = 'evidence-files' and public.security_closure_evidence_object_owner(name))
  with check (bucket_id = 'evidence-files' and public.security_closure_evidence_object_owner(name));
create policy "evidence objects owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence-files' and public.security_closure_evidence_object_owner(name));

revoke all on table public.enterprise_access_requests from anon;