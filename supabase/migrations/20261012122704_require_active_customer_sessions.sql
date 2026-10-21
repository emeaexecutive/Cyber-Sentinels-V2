-- Immediate logout enforcement for customer JWTs; API keys retain their separate
-- server-side owner approval boundary. No account disposition or history changes.
begin;

create schema if not exists session_security;
revoke all on schema session_security from public, anon;
grant usage on schema session_security to authenticated, service_role;

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
revoke all on function session_security.current_session_active() from public, anon;
grant execute on function session_security.current_session_active() to authenticated, service_role;

create or replace function public.security_closure_user_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select session_security.current_session_active() and exists (
    select 1 from public.account_access_approvals a
    where a.user_id = auth.uid() and a.status = 'APPROVED'
  );
$$;
revoke all on function public.security_closure_user_approved() from public, anon;
grant execute on function public.security_closure_user_approved() to authenticated, service_role;

-- Pending users still see their own minimal status while signed in. This table
-- intentionally has no approval-required policy; it nevertheless needs a session.
-- Fail on unexpected existing policy rather than silently replacing drift.
create policy "active customer session required" on public.account_access_approvals
  as restrictive for all to authenticated
  using ((select session_security.current_session_active()))
  with check ((select session_security.current_session_active()));

-- This is the one customer-callable mutating definer RPC that intentionally
-- permits pending users. Preserve its audit semantics, but require a live session.
create or replace function public.record_account_access_attempt(p_access_granted boolean)
returns void language plpgsql security definer set search_path = '' as $$
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
$$;
revoke all on function public.record_account_access_attempt(boolean) from public, anon;
grant execute on function public.record_account_access_attempt(boolean) to authenticated, service_role;

comment on function session_security.current_session_active() is
  'Checks only the caller JWT session and owner; does not expose auth.sessions. Logout deletes that session. JWT expiry remains enforced by the API.';
commit;
