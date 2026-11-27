create table if not exists public.account_access_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  organization text,
  requested_at timestamptz not null default now(),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'DENIED', 'SUSPENDED', 'REVOKED')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  denied_at timestamptz,
  denied_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  reason text,
  last_login_attempt timestamptz,
  last_successful_login timestamptz
);

create table if not exists public.account_access_approval_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'ACCESS_REQUESTED', 'ACCESS_APPROVED', 'ACCESS_DENIED',
    'ACCESS_SUSPENDED', 'ACCESS_REVOKED', 'BLOCKED_LOGIN_ATTEMPT',
    'SUCCESSFUL_APPROVED_LOGIN'
  )),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_access_approvals enable row level security;
alter table public.account_access_approval_events enable row level security;
revoke all on table public.account_access_approvals from anon, authenticated;
revoke all on table public.account_access_approval_events from anon, authenticated;
grant select on table public.account_access_approvals to authenticated;
create policy "users read own access approval"
  on public.account_access_approvals for select to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

grant all on table public.account_access_approvals, public.account_access_approval_events to service_role;

create or replace function public.create_account_access_request()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  requested_organization text;
begin
  if new.email is null then
    return new;
  end if;

  requested_organization := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'organization',
    new.raw_user_meta_data ->> 'company',
    ''
  )), '');

  insert into public.account_access_approvals(user_id, email, organization, requested_at, status)
  values (new.id, lower(new.email), requested_organization, coalesce(new.created_at, now()), 'PENDING')
  on conflict (user_id) do update set email = excluded.email;

  if tg_op = 'INSERT' then
    insert into public.account_access_approval_events(user_id, event_type, metadata, created_at)
    values (new.id, 'ACCESS_REQUESTED', jsonb_build_object('organization', requested_organization), coalesce(new.created_at, now()));
  end if;
  return new;
end;
$$;

drop trigger if exists create_account_access_request on auth.users;
create trigger create_account_access_request
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.create_account_access_request();

insert into public.account_access_approvals(user_id, email, organization, requested_at, status)
select
  id,
  lower(email),
  nullif(trim(coalesce(raw_user_meta_data ->> 'organization', raw_user_meta_data ->> 'company', '')), ''),
  coalesce(created_at, now()),
  'PENDING'
from auth.users
where email is not null
on conflict (user_id) do nothing;

insert into public.account_access_approval_events(user_id, event_type, created_at)
select approval.user_id, 'ACCESS_REQUESTED', approval.requested_at
from public.account_access_approvals approval
where not exists (
  select 1 from public.account_access_approval_events event
  where event.user_id = approval.user_id and event.event_type = 'ACCESS_REQUESTED'
);

create or replace function public.record_account_access_attempt(p_access_granted boolean)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  current_status text;
  event_name text;
begin
  if actor_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select status into current_status
  from public.account_access_approvals
  where user_id = actor_id;

  if p_access_granted and current_status is distinct from 'APPROVED' then
    raise exception 'ACCESS_APPROVAL_REQUIRED' using errcode = '42501';
  end if;

  update public.account_access_approvals
  set last_login_attempt = now(),
      last_successful_login = case when p_access_granted then now() else last_successful_login end
  where user_id = actor_id;

  event_name := case when p_access_granted then 'SUCCESSFUL_APPROVED_LOGIN' else 'BLOCKED_LOGIN_ATTEMPT' end;
  if not exists (
    select 1 from public.account_access_approval_events
    where user_id = actor_id and event_type = event_name and created_at > now() - interval '10 minutes'
  ) then
    insert into public.account_access_approval_events(user_id, event_type, actor_user_id)
    values (actor_id, event_name, actor_id);
  end if;
end;
$$;

create or replace function public.audit_account_access_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  event_name text;
  actor_id uuid;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  event_name := case new.status
    when 'APPROVED' then 'ACCESS_APPROVED'
    when 'DENIED' then 'ACCESS_DENIED'
    when 'SUSPENDED' then 'ACCESS_SUSPENDED'
    when 'REVOKED' then 'ACCESS_REVOKED'
    else null
  end;
  if event_name is null then return new; end if;

  actor_id := case new.status
    when 'APPROVED' then new.approved_by
    when 'DENIED' then new.denied_by
    when 'SUSPENDED' then new.suspended_by
    when 'REVOKED' then new.revoked_by
    else null
  end;
  insert into public.account_access_approval_events(user_id, event_type, actor_user_id, reason, metadata)
  values (new.user_id, event_name, actor_id, new.reason, jsonb_build_object('previous_status', old.status, 'status', new.status));
  return new;
end;
$$;

drop trigger if exists audit_account_access_status_change on public.account_access_approvals;
create trigger audit_account_access_status_change
  after update of status on public.account_access_approvals
  for each row execute function public.audit_account_access_status_change();

revoke all on function public.create_account_access_request() from public, anon, authenticated;
revoke all on function public.record_account_access_attempt(boolean) from public, anon, authenticated;
revoke all on function public.audit_account_access_status_change() from public, anon, authenticated;
grant execute on function public.record_account_access_attempt(boolean) to authenticated, service_role;