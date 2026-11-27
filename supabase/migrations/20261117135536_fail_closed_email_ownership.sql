-- Fail closed for absent ownership email, without rejecting UID/workspace alternatives.
-- Separate review head only. Hosted application requires recovery and fresh approval.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local search_path = public, extensions;
select pg_advisory_xact_lock(hashtextextended('execution07c-email-ownership', 0));

create or replace function session_security.current_ownership_email()
returns text language sql stable security invoker set search_path = '' as $$
  select case when auth.uid() is not null
    and public.security_closure_user_approved()
    and (auth.jwt() ->> 'email') ~ '[^[:space:]]'
  then lower(auth.jwt() ->> 'email') else null end;
$$;
revoke all on function session_security.current_ownership_email() from public, anon;
grant execute on function session_security.current_ownership_email() to authenticated, service_role;
comment on function session_security.current_ownership_email() is
  'Non-exposed ownership identity. Missing/empty/whitespace email and inactive/unapproved principals return NULL; UID/tenant alternatives remain independent.';

-- Refuse to overwrite an unreviewed overload/body. Whitespace is immaterial.
do $guard$
declare expected record; signature regprocedure; fingerprint text;
begin
  for expected in select * from (values
    ('public.security_closure_ai_agent_owner(uuid)', '5ff2896afac2a6c099ba3377092f3d08', '55b1db96c9a779fa1d65e0a5f68d510e'),
    ('public.security_closure_case_owner(uuid)', '41cb484f3692e7a2a53bc1e628199b4a', '3a341ef5a939ae3faf4bee53def780da'),
    ('public.security_closure_passport_owner(uuid)', '33ecf64135f45b564d8e80bebd6f47b1', '2b8b6dc5ea4cefc729bb90b5b853cf0e'),
    ('public.security_closure_team_member(uuid)', '3ac6e35a7eb8ae58185efd98ef213cbd', '986b0549628059fe0bc9433b984d0317')
  ) as item(signature, original_md5, repaired_md5)
  loop
    signature := to_regprocedure(expected.signature);
    if signature is null then raise exception 'OWNERSHIP_FUNCTION_MISSING: %', expected.signature; end if;
    fingerprint := md5(regexp_replace(pg_get_functiondef(signature), '\s+', '', 'g'));
    if fingerprint not in (expected.original_md5, expected.repaired_md5) then
      raise exception 'OWNERSHIP_FUNCTION_DRIFT: %', expected.signature;
    end if;
  end loop;
end;
$guard$;
CREATE OR REPLACE FUNCTION public.security_closure_ai_agent_owner(p_agent_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select auth.uid() is not null and exists (
    select 1
    from public.ai_agents a
    where a.id = p_agent_id
      and (a.owner_user_id is null or a.owner_user_id = auth.uid())
      and (a.owner_email is null or lower(a.owner_email) = session_security.current_ownership_email())
      and (a.owner_enterprise_id is null or public.user_can_access_trust_workspace(a.owner_enterprise_id))
      and (a.enterprise_id is null or public.user_can_access_trust_workspace(a.enterprise_id))
      and (a.owner_enterprise_id is null or a.enterprise_id is null or a.owner_enterprise_id = a.enterprise_id)
      and (a.owner_user_id is not null or a.owner_email is not null or a.owner_enterprise_id is not null or a.enterprise_id is not null)
  )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.security_closure_case_owner(p_case_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select auth.uid() is not null and exists (
    select 1
    from public.verification_cases vc
    where vc.id = p_case_id
      and (
        lower(coalesce(vc.owner_email, '')) = session_security.current_ownership_email()
        or public.security_closure_team_member(vc.team_id)
        or public.security_closure_passport_owner(vc.passport_id)
      )
  )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.security_closure_passport_owner(p_passport_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select auth.uid() is not null and exists (
    select 1
    from public.passports p
    where p.id = p_passport_id
      and (
        lower(coalesce(p.owner_email, p.user_email, '')) = session_security.current_ownership_email()
        or public.security_closure_team_member(p.team_id)
      )
  )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.security_closure_team_member(p_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select p_team_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.team_members tm
      where tm.team_id = p_team_id
        and lower(tm.member_email) = session_security.current_ownership_email()
        and lower(coalesce(tm.invitation_status, '')) in ('active', 'accepted', 'approved')
    )) else false end;
$function$
;

-- The saved catalog proves direct policy alternatives exist in addition to helpers.
-- Guard every exact expression/role/command before altering it; any drift rolls back
-- the entire transaction. ALTER POLICY preserves policy mode, roles and command.
do $repair$
declare expected record; actual record; statement text;
begin
  for expected in select * from (values
    ('public', 'api_keys', 'api keys owner read', 'SELECT', 'PERMISSIVE', 'authenticated', '33ab62fb2e4326fff28539258564a671', 'd41d8cd98f00b204e9800998ecf8427e', '(((tenant_id IS NOT NULL) AND user_can_access_trust_workspace(tenant_id)) OR ((tenant_id IS NULL) AND ((owner_user_id IS NULL) OR (owner_user_id = auth.uid())) AND ((user_id IS NULL) OR (user_id = auth.uid())) AND ((user_email IS NULL) OR (lower(user_email) = session_security.current_ownership_email())) AND ((owner_user_id IS NOT NULL) OR (user_id IS NOT NULL) OR (user_email IS NOT NULL))))', null),
    ('public', 'audit_logs', 'audit logs owner insert', 'INSERT', 'PERMISSIVE', 'authenticated', 'd41d8cd98f00b204e9800998ecf8427e', 'b3eb1a4bd5c23fe9994b0a5fe43fa838', null, '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(owner_email, actor, (metadata ->> ''actor''::text), ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)))'),
    ('public', 'audit_logs', 'audit logs owner read', 'SELECT', 'PERMISSIVE', 'authenticated', '54d4f9907602f9a33e7c1dac62beeb74', 'd41d8cd98f00b204e9800998ecf8427e', '((lower(COALESCE(owner_email, actor, (metadata ->> ''actor''::text), ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id))', null),
    ('public', 'autonomy_profiles', 'autonomy profiles creator access', 'ALL', 'PERMISSIVE', 'authenticated', '546864704781bc92791ba1aa435bde7b', '546864704781bc92791ba1aa435bde7b', '((auth.uid() IS NOT NULL) AND (lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()))', '((auth.uid() IS NOT NULL) AND (lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()))'),
    ('public', 'data_rights_requests', 'data rights requester access', 'ALL', 'PERMISSIVE', 'authenticated', 'f295d241d39048602bd5ad7bce3717c2', 'f295d241d39048602bd5ad7bce3717c2', '((auth.uid() IS NOT NULL) AND ((requester_user_id IS NULL) OR (requester_user_id = auth.uid())) AND ((requester_email IS NULL) OR (lower(requester_email) = session_security.current_ownership_email())) AND ((requester_user_id IS NOT NULL) OR (requester_email IS NOT NULL)))', '((auth.uid() IS NOT NULL) AND ((requester_user_id IS NULL) OR (requester_user_id = auth.uid())) AND ((requester_email IS NULL) OR (lower(requester_email) = session_security.current_ownership_email())) AND ((requester_user_id IS NOT NULL) OR (requester_email IS NOT NULL)))'),
    ('public', 'decisions', 'decisions owner access', 'ALL', 'PERMISSIVE', 'authenticated', '348dba742f2ba63cd2dfc750ba069bff', '0d1fff67bb61bb546064f7ef34987c6b', '((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id) OR security_closure_case_owner(COALESCE(verification_case_id, case_id)) OR security_closure_passport_owner(passport_id))', '(((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id) OR security_closure_case_owner(COALESCE(verification_case_id, case_id)) OR security_closure_passport_owner(passport_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)) AND ((COALESCE(verification_case_id, case_id) IS NULL) OR security_closure_case_owner(COALESCE(verification_case_id, case_id))) AND ((passport_id IS NULL) OR security_closure_passport_owner(passport_id)))'),
    ('public', 'enterprise_access_requests', 'enterprise requests read own submission', 'SELECT', 'PERMISSIVE', 'authenticated', 'bde8896b7b367ac22975ef4838f72e8d', 'd41d8cd98f00b204e9800998ecf8427e', '((auth.uid() IS NOT NULL) AND (lower(COALESCE(work_email, ''''::text)) = session_security.current_ownership_email()))', null),
    ('public', 'evidence_files', 'evidence files owner access', 'ALL', 'PERMISSIVE', 'authenticated', 'c40200b40c895bbbc19952c2dcd24696', '8cccd6d5f33fb66d186a5eada1f77eb8', '((lower(COALESCE(owner_email, uploaded_by, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id) OR security_closure_case_owner(verification_case_id) OR security_closure_passport_owner(passport_id))', '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(owner_email, uploaded_by, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id) OR security_closure_case_owner(verification_case_id) OR security_closure_passport_owner(passport_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)) AND ((verification_case_id IS NULL) OR security_closure_case_owner(verification_case_id)) AND ((passport_id IS NULL) OR security_closure_passport_owner(passport_id)))'),
    ('public', 'execution_passports', 'execution passports owner access', 'ALL', 'PERMISSIVE', 'authenticated', '7e4bca152d380def680a22260d66e73b', 'e17d22a408026748e49f85495c7cc6ec', '((lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()) OR security_closure_passport_owner(passport_id))', '(((lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()) OR security_closure_passport_owner(passport_id)) AND ((passport_id IS NULL) OR security_closure_passport_owner(passport_id)))'),
    ('public', 'feedback_reports', 'feedback submitter access', 'ALL', 'PERMISSIVE', 'authenticated', 'cc47369c0deab0c6b458d1646bc58697', 'cc47369c0deab0c6b458d1646bc58697', '((auth.uid() IS NOT NULL) AND ((submitted_by_user_id IS NULL) OR (submitted_by_user_id = auth.uid())) AND ((submitted_by_email IS NULL) OR (lower(submitted_by_email) = session_security.current_ownership_email())) AND ((submitted_by_user_id IS NOT NULL) OR (submitted_by_email IS NOT NULL)))', '((auth.uid() IS NOT NULL) AND ((submitted_by_user_id IS NULL) OR (submitted_by_user_id = auth.uid())) AND ((submitted_by_email IS NULL) OR (lower(submitted_by_email) = session_security.current_ownership_email())) AND ((submitted_by_user_id IS NOT NULL) OR (submitted_by_email IS NOT NULL)))'),
    ('public', 'help_questions', 'help question author access', 'ALL', 'PERMISSIVE', 'authenticated', 'fcd0644f36aa19b8f5e7ed19ed800b6c', 'fcd0644f36aa19b8f5e7ed19ed800b6c', '((auth.uid() IS NOT NULL) AND ((created_by_user_id IS NULL) OR (created_by_user_id = auth.uid())) AND ((created_by_email IS NULL) OR (lower(created_by_email) = session_security.current_ownership_email())) AND ((created_by IS NULL) OR (lower(created_by) = session_security.current_ownership_email())) AND ((created_by_user_id IS NOT NULL) OR (created_by_email IS NOT NULL) OR (created_by IS NOT NULL)))', '((auth.uid() IS NOT NULL) AND ((created_by_user_id IS NULL) OR (created_by_user_id = auth.uid())) AND ((created_by_email IS NULL) OR (lower(created_by_email) = session_security.current_ownership_email())) AND ((created_by IS NULL) OR (lower(created_by) = session_security.current_ownership_email())) AND ((created_by_user_id IS NOT NULL) OR (created_by_email IS NOT NULL) OR (created_by IS NOT NULL)))'),
    ('public', 'intent_requests', 'intent requests creator access', 'ALL', 'PERMISSIVE', 'authenticated', '546864704781bc92791ba1aa435bde7b', '546864704781bc92791ba1aa435bde7b', '((auth.uid() IS NOT NULL) AND (lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()))', '((auth.uid() IS NOT NULL) AND (lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()))'),
    ('public', 'passport_state_checks', 'passport state checks owner access', 'ALL', 'PERMISSIVE', 'authenticated', '7e4bca152d380def680a22260d66e73b', 'e17d22a408026748e49f85495c7cc6ec', '((lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()) OR security_closure_passport_owner(passport_id))', '(((lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()) OR security_closure_passport_owner(passport_id)) AND ((passport_id IS NULL) OR security_closure_passport_owner(passport_id)))'),
    ('public', 'passports', 'passports owner access', 'ALL', 'PERMISSIVE', 'authenticated', '9c6a53c9c5c4107b68a66a9ee6b8e39c', '49d5cd00f3ee2d704c3859bd83dffea5', '((lower(COALESCE(owner_email, user_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id))', '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(owner_email, user_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)))'),
    ('public', 'provenance_events', 'provenance events tenant access', 'ALL', 'PERMISSIVE', 'authenticated', 'da1a011dcd1a19868a78dd21361d0f71', '1c77b7244d35a04a199e9d16539f291f', '((lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()) OR user_can_access_trust_workspace(enterprise_id))', '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(created_by, ''''::text)) = session_security.current_ownership_email()) OR user_can_access_trust_workspace(enterprise_id)) AND ((enterprise_id IS NULL) OR user_can_access_trust_workspace(enterprise_id)))'),
    ('public', 'signals', 'signals owner access', 'ALL', 'PERMISSIVE', 'authenticated', 'b227a5f90eaf63b9422ccd9dfd8f324d', 'e22bb90c5366158b2abfe50877d5b54e', '((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id))', '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)))'),
    ('public', 'team_members', 'team members read own membership', 'SELECT', 'PERMISSIVE', 'authenticated', '33c946c716ba4233b699d4a592c69f3e', 'd41d8cd98f00b204e9800998ecf8427e', '((auth.uid() IS NOT NULL) AND (lower(COALESCE(member_email, ''''::text)) = session_security.current_ownership_email()))', null),
    ('public', 'trust_assistant_questions', 'trust assistant question author access', 'ALL', 'PERMISSIVE', 'authenticated', '9ce48f01bb88212d9bc0843b4e80fc96', '9ce48f01bb88212d9bc0843b4e80fc96', '((auth.uid() IS NOT NULL) AND ((asked_by_user_id IS NULL) OR (asked_by_user_id = auth.uid())) AND ((asked_by_email IS NULL) OR (lower(asked_by_email) = session_security.current_ownership_email())) AND ((asked_by_user_id IS NOT NULL) OR (asked_by_email IS NOT NULL)))', '((auth.uid() IS NOT NULL) AND ((asked_by_user_id IS NULL) OR (asked_by_user_id = auth.uid())) AND ((asked_by_email IS NULL) OR (lower(asked_by_email) = session_security.current_ownership_email())) AND ((asked_by_user_id IS NOT NULL) OR (asked_by_email IS NOT NULL)))'),
    ('public', 'trust_reports', 'trust reports owner access', 'ALL', 'PERMISSIVE', 'authenticated', 'b227a5f90eaf63b9422ccd9dfd8f324d', '2bb56f61d269d2552f2b0d0f419c1d61', '((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id))', '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)) AND ((passport_id IS NULL) OR security_closure_passport_owner(passport_id)))'),
    ('public', 'verification_cases', 'verification cases owner access', 'ALL', 'PERMISSIVE', 'authenticated', '007f1c3f7b2b820e214e9e9fab824fd1', '775dd8409150be395b39b2286f7a8950', '((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id) OR security_closure_passport_owner(passport_id))', '((auth.uid() IS NOT NULL) AND ((lower(COALESCE(owner_email, ''''::text)) = session_security.current_ownership_email()) OR security_closure_team_member(team_id) OR security_closure_passport_owner(passport_id)) AND ((team_id IS NULL) OR security_closure_team_member(team_id)) AND ((passport_id IS NULL) OR security_closure_passport_owner(passport_id)))')
  ) as item(schema_name, table_name, policy_name, command_name, mode_name, role_names, old_qual_md5, old_check_md5, new_qual, new_check)
  loop
    select * into actual from pg_policies where schemaname=expected.schema_name
      and tablename=expected.table_name and policyname=expected.policy_name;
    if not found then raise exception 'OWNERSHIP_POLICY_MISSING: %.%.%', expected.schema_name, expected.table_name, expected.policy_name; end if;
    if actual.cmd<>expected.command_name or actual.permissive<>expected.mode_name
      or array_to_string(actual.roles, ',')<>expected.role_names then
      raise exception 'OWNERSHIP_POLICY_METADATA_DRIFT: %.%.%', expected.schema_name, expected.table_name, expected.policy_name;
    end if;
    if coalesce(actual.qual,'')=coalesce(expected.new_qual,'') and coalesce(actual.with_check,'')=coalesce(expected.new_check,'') then continue; end if;
    if md5(coalesce(actual.qual,''))<>expected.old_qual_md5 or md5(coalesce(actual.with_check,''))<>expected.old_check_md5 then
      raise exception 'OWNERSHIP_POLICY_EXPRESSION_DRIFT: %.%.%', expected.schema_name, expected.table_name, expected.policy_name;
    end if;
    statement := format('alter policy %I on %I.%I',expected.policy_name,expected.schema_name,expected.table_name);
    if expected.new_qual is not null then statement := statement || format(' using (%s)', expected.new_qual); end if;
    if expected.new_check is not null then statement := statement || format(' with check (%s)', expected.new_check); end if;
    execute statement;
  end loop;
  if exists(select 1 from pg_policies where schemaname in ('public','private','storage') and
    ((position('auth.jwt()' in coalesce(qual,''))>0 and position('''email''' in coalesce(qual,''))>0)
     or (position('auth.jwt()' in coalesce(with_check,''))>0 and position('''email''' in coalesce(with_check,''))>0))) then
    raise exception 'UNREVIEWED_EMPTY_EMAIL_POLICY_REMAINS';
  end if;
end;
$repair$;
commit;
