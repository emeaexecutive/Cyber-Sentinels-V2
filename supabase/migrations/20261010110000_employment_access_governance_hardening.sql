begin;

alter table public.account_access_approvals
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null;

alter table public.account_access_approvals
  drop constraint if exists account_access_approvals_status_check;
alter table public.account_access_approvals
  add constraint account_access_approvals_status_check
  check (status in ('PENDING', 'APPROVED', 'DENIED', 'REJECTED', 'SUSPENDED', 'REVOKED'));

alter table public.account_access_approval_events
  drop constraint if exists account_access_approval_events_event_type_check;
alter table public.account_access_approval_events
  add constraint account_access_approval_events_event_type_check
  check (event_type in (
    'ACCESS_REQUESTED', 'ACCESS_APPROVED', 'ACCESS_DENIED', 'ACCESS_REJECTED',
    'ACCESS_SUSPENDED', 'ACCESS_REVOKED', 'BLOCKED_LOGIN_ATTEMPT',
    'SUCCESSFUL_APPROVED_LOGIN'
  ));

alter table public.account_access_approval_events alter column user_id drop not null;
alter table public.account_access_approval_events
  drop constraint if exists account_access_approval_events_user_id_fkey;
alter table public.account_access_approval_events
  add constraint account_access_approval_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

update public.account_access_approvals
set rejected_at = coalesce(rejected_at, denied_at),
    rejected_by = coalesce(rejected_by, denied_by),
    status = 'REJECTED'
where status = 'DENIED';

alter table public.account_access_approvals
  drop constraint account_access_approvals_status_check;
alter table public.account_access_approvals
  add constraint account_access_approvals_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED'));

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
    when 'REJECTED' then 'ACCESS_REJECTED'
    when 'SUSPENDED' then 'ACCESS_SUSPENDED'
    when 'REVOKED' then 'ACCESS_REVOKED'
    else null
  end;
  if event_name is null then return new; end if;

  actor_id := case new.status
    when 'APPROVED' then new.approved_by
    when 'DENIED' then new.denied_by
    when 'REJECTED' then new.rejected_by
    when 'SUSPENDED' then new.suspended_by
    when 'REVOKED' then new.revoked_by
    else null
  end;
  insert into public.account_access_approval_events(user_id, event_type, actor_user_id, reason, metadata)
  values (new.user_id, event_name, actor_id, new.reason, jsonb_build_object('previous_status', old.status, 'status', new.status));
  return new;
end;
$$;

create or replace function public.prevent_account_access_approval_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and pg_trigger_depth() > 1
     and old.user_id is not null
     and new.user_id is null
     and row(new.event_type,new.actor_user_id,new.reason,new.metadata,new.created_at)
       is not distinct from row(old.event_type,old.actor_user_id,old.reason,old.metadata,old.created_at) then
    return new;
  end if;
  raise exception 'Account access approval events are append-only';
end;
$$;

revoke all on function public.prevent_account_access_approval_event_mutation() from public, anon, authenticated;
drop trigger if exists account_access_approval_events_append_only on public.account_access_approval_events;
create trigger account_access_approval_events_append_only
before update or delete on public.account_access_approval_events
for each row execute function public.prevent_account_access_approval_event_mutation();

create or replace function public.project_employment_decision_to_trust_memory_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type not like 'governance.employment_decision.%' then
    return new;
  end if;
  insert into public.trust_memory_index(enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,summary,correlation_id)
  values (
    new.enterprise_id,
    new.subject_id,
    'EMPLOYMENT',
    regexp_replace(upper(new.event_type), '[^A-Z0-9_]+', '_', 'g'),
    new.event_id::text,
    new.occurred_at,
    jsonb_build_object('eventType',new.event_type,'workflowId',new.workflow_id,'evidenceReferences',new.evidence_references,'eventHash',new.event_hash),
    new.correlation_id
  )
  on conflict (enterprise_id,memory_type,source_id) do nothing;
  return new;
end;
$$;

revoke all on function public.project_employment_decision_to_trust_memory_v1() from public, anon, authenticated;
drop trigger if exists project_employment_decision_to_trust_memory_v1 on public.trust_events;
create trigger project_employment_decision_to_trust_memory_v1
after insert on public.trust_events
for each row execute function public.project_employment_decision_to_trust_memory_v1();

commit;