
create role authenticated nologin;
create role anon nologin;
create role service_role nologin;
create schema auth;
create schema session_security;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create table public.account_access_approvals(user_id uuid primary key,status text,last_login_attempt timestamptz,last_successful_login timestamptz);
create table public.account_access_approval_events(user_id uuid,event_type text,actor_user_id uuid,created_at timestamptz default now());
create table public.trust_workspaces(id uuid primary key,created_by uuid);
create table public.workspace_members(workspace_id uuid,user_id uuid,role text);
create table public.ai_agents(id uuid primary key,owner_user_id uuid,owner_email text,owner_enterprise_id uuid,enterprise_id uuid);
create table public.passports(id uuid primary key,owner_email text,user_email text,team_id uuid);
create table public.verification_cases(id uuid primary key,owner_email text,team_id uuid,passport_id uuid);
create table public.team_members(team_id uuid,member_email text,invitation_status text);
set check_function_bodies=off;
create or replace function session_security.current_session_active()
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  session_claim text := auth.jwt()->>'session_id';
  actor_id uuid := auth.uid();
  session_uuid uuid;
begin
  if actor_id is null or session_claim is null then return false; end if;
  -- Validate before casting; compare UUID to UUID so sessions_pkey is usable.
  if session_claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  session_uuid := session_claim::uuid;
  return exists (
    select 1 from auth.sessions s
    where s.id = session_uuid and s.user_id = actor_id
      and (s.not_after is null or s.not_after > now())
  );
end;
$$;
CREATE OR REPLACE FUNCTION public.identity_workspace_role(workspace_reference uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select case
    when exists (select 1 from public.trust_workspaces w where w.id = workspace_reference and w.created_by = auth.uid()) then 'owner'
    else (select m.role from public.workspace_members m where m.workspace_id = workspace_reference and m.user_id = auth.uid() limit 1)
  end) else null end;
$function$
;
CREATE OR REPLACE FUNCTION public.prevent_cookie_consent_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    raise exception using errcode = '42501', message = 'cookie consent receipts are append-only';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.record_account_access_attempt(p_access_granted boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := auth.uid();
  current_status text;
  event_name text;
begin
  if not session_security.current_session_active() then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  select status into current_status from public.account_access_approvals where user_id = actor_id;
  if p_access_granted and current_status is distinct from 'APPROVED' then
    raise exception 'ACCESS_APPROVAL_REQUIRED' using errcode = '42501';
  end if;
  update public.account_access_approvals
  set last_login_attempt = now(),
      last_successful_login = case when p_access_granted then now() else last_successful_login end
  where user_id = actor_id;
  event_name := case when p_access_granted then 'SUCCESSFUL_APPROVED_LOGIN' else 'BLOCKED_LOGIN_ATTEMPT' end;
  if not exists (select 1 from public.account_access_approval_events
    where user_id = actor_id and event_type = event_name and created_at > now() - interval '10 minutes') then
    insert into public.account_access_approval_events(user_id,event_type,actor_user_id)
    values (actor_id,event_name,actor_id);
  end if;
end;
$function$
;
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
      and (a.owner_email is null or lower(a.owner_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
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
        lower(coalesce(vc.owner_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or public.security_closure_team_member(vc.team_id)
        or public.security_closure_passport_owner(vc.passport_id)
      )
  )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.security_closure_evidence_object_owner(p_object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  case_prefix text;
begin
  if not public.security_closure_user_approved() then return false; end if;
  case_prefix := split_part(coalesce(p_object_name, ''), '/', 1);
  if case_prefix !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.security_closure_case_owner(case_prefix::uuid);
exception when invalid_text_representation then
  return false;
end;
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
        lower(coalesce(p.owner_email, p.user_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or public.security_closure_team_member(p.team_id)
      )
  )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.security_closure_team_member(p_team_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.security_closure_user_approved() then return false; end if;
  if coalesce(p_team_id, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.security_closure_team_member(p_team_id::uuid);
exception when invalid_text_representation then
  return false;
end;
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
        and lower(tm.member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and lower(coalesce(tm.invitation_status, '')) in ('active', 'accepted', 'approved')
    )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.security_closure_user_approved()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select session_security.current_session_active() and exists (
    select 1 from public.account_access_approvals a
    where a.user_id = auth.uid() and a.status = 'APPROVED'
  );
$function$
;
CREATE OR REPLACE FUNCTION public.user_can_access_trust_workspace(workspace_reference uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select workspace_reference is not null and exists (
    select 1 from public.trust_workspaces workspace
    where workspace.id = workspace_reference
      and (
        workspace.created_by = auth.uid()
        or exists (
          select 1 from public.workspace_members member
          where member.workspace_id = workspace.id and member.user_id = auth.uid()
        )
      )
  )) else false end;
$function$
;
CREATE OR REPLACE FUNCTION public.user_has_trust_workspace_role(workspace_reference uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select case when public.security_closure_user_approved() then (select workspace_reference is not null and (
    exists (
      select 1 from public.trust_workspaces workspace
      where workspace.id = workspace_reference
        and workspace.created_by = auth.uid()
        and 'owner' = any(allowed_roles)
    )
    or exists (
      select 1 from public.workspace_members member
      where member.workspace_id = workspace_reference
        and member.user_id = auth.uid()
        and member.role = any(allowed_roles)
    )
  )) else false end;
$function$
;
insert into auth.sessions values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null);
insert into public.account_access_approvals values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','APPROVED',null,null);
insert into public.verification_cases values ('10000000-0000-4000-8000-000000000001',null,null,null),('10000000-0000-4000-8000-000000000002','',null,null),('10000000-0000-4000-8000-000000000003','alice@example.invalid',null,null),('10000000-0000-4000-8000-000000000004','bob@example.invalid',null,null);
insert into public.passports values ('10000000-0000-4000-8000-000000000001',null,null,null),('10000000-0000-4000-8000-000000000002','',null,null),('10000000-0000-4000-8000-000000000003','alice@example.invalid',null,null),('10000000-0000-4000-8000-000000000004','bob@example.invalid',null,null),('10000000-0000-4000-8000-000000000005','', 'alice@example.invalid',null);
insert into public.team_members values ('10000000-0000-4000-8000-000000000001',null,'active'),('10000000-0000-4000-8000-000000000002','','active'),('10000000-0000-4000-8000-000000000003','alice@example.invalid','active'),('10000000-0000-4000-8000-000000000004','bob@example.invalid','active'),('10000000-0000-4000-8000-000000000006','alice@example.invalid','revoked');
insert into public.ai_agents values ('10000000-0000-4000-8000-000000000001',null,null,null,null),('10000000-0000-4000-8000-000000000002',null,'',null,null),('10000000-0000-4000-8000-000000000003',null,'alice@example.invalid',null,null),('10000000-0000-4000-8000-000000000004',null,'bob@example.invalid',null,null);
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.prevent_cookie_consent_mutation() from authenticated;
grant usage on schema auth,session_security to authenticated;
grant execute on function auth.jwt(),auth.uid(),session_security.current_session_active() to authenticated;
