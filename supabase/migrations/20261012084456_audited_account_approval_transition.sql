-- Platform administrators are authorized by the server allowlist/session gate.
-- The service-only RPC receives that verified actor; customers cannot invoke it.
-- No historical approval or customer data is rewritten by this migration.
begin;

create or replace function public.guard_account_access_transition()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare actor uuid;
begin
  if old.status is not distinct from new.status then return new; end if;
  actor := case new.status
    when 'APPROVED' then new.approved_by
    when 'REJECTED' then new.rejected_by
    when 'SUSPENDED' then new.suspended_by
    when 'REVOKED' then new.revoked_by
    else null end;
  if actor is null or nullif(btrim(new.reason),'') is null then
    raise exception 'ACCOUNT_APPROVAL_ACTOR_AND_REASON_REQUIRED' using errcode='42501';
  end if;
  if new.status='APPROVED' and actor=new.user_id then
    raise exception 'ACCOUNT_SELF_APPROVAL_FORBIDDEN' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_account_access_transition() from public,anon,authenticated,service_role;
create trigger guard_account_access_transition
before update of status on public.account_access_approvals
for each row execute function public.guard_account_access_transition();

create or replace function public.set_account_access_status(
  p_user_id uuid, p_status text, p_actor_user_id uuid, p_reason text
)
returns text language plpgsql security definer set search_path = '' as $$
declare previous_status text;
begin
  if p_status is null or p_status not in ('APPROVED','REJECTED','SUSPENDED','REVOKED') then
    raise exception 'ACCOUNT_APPROVAL_STATUS_INVALID' using errcode='22023';
  end if;
  if p_actor_user_id is null or not exists(select 1 from auth.users where id=p_actor_user_id)
     or nullif(btrim(p_reason),'') is null or length(p_reason)>1000 then
    raise exception 'ACCOUNT_APPROVAL_ACTOR_AND_REASON_REQUIRED' using errcode='42501';
  end if;
  if p_status='APPROVED' and p_actor_user_id=p_user_id then
    raise exception 'ACCOUNT_SELF_APPROVAL_FORBIDDEN' using errcode='42501';
  end if;
  select status into previous_status from public.account_access_approvals
    where user_id=p_user_id for update;
  if not found then raise exception 'ACCOUNT_APPROVAL_NOT_FOUND' using errcode='P0002'; end if;
  if previous_status=p_status then return previous_status; end if;
  update public.account_access_approvals set
    status=p_status,reason=btrim(p_reason),
    approved_at=case when p_status='APPROVED' then now() else approved_at end,
    approved_by=case when p_status='APPROVED' then p_actor_user_id else approved_by end,
    rejected_at=case when p_status='REJECTED' then now() else rejected_at end,
    rejected_by=case when p_status='REJECTED' then p_actor_user_id else rejected_by end,
    suspended_at=case when p_status='SUSPENDED' then now() else suspended_at end,
    suspended_by=case when p_status='SUSPENDED' then p_actor_user_id else suspended_by end,
    revoked_at=case when p_status='REVOKED' then now() else revoked_at end,
    revoked_by=case when p_status='REVOKED' then p_actor_user_id else revoked_by end
  where user_id=p_user_id;
  -- The existing AFTER trigger writes the append-only event in this transaction.
  return p_status;
end;
$$;
revoke all on function public.set_account_access_status(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.set_account_access_status(uuid,text,uuid,text) to service_role;

-- BYPASSRLS does not bypass privileges. Trusted application code must use the
-- audited RPC; Auth triggers and login-attempt functions execute as their owner.
revoke insert,update,delete,truncate,references,trigger on public.account_access_approvals from public,anon,authenticated,service_role;
revoke insert,update,delete,truncate,references,trigger on public.account_access_approval_events from public,anon,authenticated,service_role;
-- Remove column-level write grants as well, including inherited legacy grants.
do $$ declare col record; begin
  for col in select table_name,column_name from information_schema.columns
    where table_schema='public' and table_name in ('account_access_approvals','account_access_approval_events')
  loop
    execute format('revoke insert (%I), update (%I), references (%I) on public.%I from public,anon,authenticated,service_role',col.column_name,col.column_name,col.column_name,col.table_name);
  end loop;
end $$;
commit;
