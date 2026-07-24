-- EPIC 25: Enterprise Trust Centre collaboration boundary.
-- Trust state, evidence, Replay and policy remain owned by their existing engines.

create table public.trust_alert_activity (
  activity_id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  alert_id uuid not null references public.trust_alerts(id) on delete cascade,
  action text not null check (
    action in ('acknowledge','investigating','resolved','dismissed','assign','comment')
  ),
  note text,
  actor_id uuid not null,
  assigned_to uuid,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  check (char_length(coalesce(note,'')) <= 500)
);

create index trust_alert_activity_timeline_idx
  on public.trust_alert_activity(enterprise_id,alert_id,created_at,activity_id);

alter table public.trust_alert_activity enable row level security;
revoke all on public.trust_alert_activity from anon,authenticated;
grant select on public.trust_alert_activity to authenticated;
grant all privileges on public.trust_alert_activity to service_role;

create policy "tenant reads trust alert activity"
  on public.trust_alert_activity
  for select
  to authenticated
  using(public.user_can_access_trust_workspace(enterprise_id));

create trigger trust_alert_activity_append_only
  before update or delete on public.trust_alert_activity
  for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.manage_trust_centre_alerts_v1(
  p_enterprise_id uuid,
  p_alert_ids uuid[],
  p_actor_id uuid,
  p_action text,
  p_note text,
  p_assigned_to uuid,
  p_correlation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  alert_id uuid;
  current_state text;
  target_state text;
  affected integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Enterprise Trust Centre service path required';
  end if;
  if coalesce(array_length(p_alert_ids,1),0) not between 1 and 100 then
    raise exception 'Alert batch size invalid';
  end if;
  if p_action not in ('acknowledge','investigating','resolved','dismissed','assign','comment') then
    raise exception 'Alert action invalid';
  end if;
  if p_action in ('comment','resolved','dismissed') and length(trim(coalesce(p_note,''))) = 0 then
    raise exception 'Alert note required';
  end if;
  if p_action = 'assign' then
    if p_assigned_to is null or not exists (
      select 1 from public.trust_workspaces workspace
      where workspace.id=p_enterprise_id and workspace.created_by=p_assigned_to
      union all
      select 1 from public.workspace_members member
      where member.workspace_id=p_enterprise_id and member.user_id=p_assigned_to
    ) then
      raise exception 'Alert assignee must be a workspace participant';
    end if;
  end if;

  target_state := case p_action when 'acknowledge' then 'acknowledged'
    when 'investigating' then 'investigating'
    when 'resolved' then 'resolved'
    when 'dismissed' then 'dismissed'
    else null end;

  foreach alert_id in array p_alert_ids loop
    select status into current_state
      from public.trust_alerts
      where id=alert_id and enterprise_id=p_enterprise_id
      for update;
    if current_state is null then raise exception 'Alert not found'; end if;
    if current_state in ('resolved','dismissed') and target_state is not null and target_state<>current_state then
      raise exception 'Closed alert transition denied';
    end if;

    if target_state is not null then
      update public.trust_alerts set
        status=target_state,
        reviewed_by=p_actor_id::text,
        acknowledged_at=case when target_state='acknowledged' then coalesce(acknowledged_at,now()) else acknowledged_at end,
        resolved_at=case when target_state in ('resolved','dismissed') then coalesce(resolved_at,now()) else resolved_at end,
        updated_at=now()
      where id=alert_id and enterprise_id=p_enterprise_id;
    elsif p_action='assign' then
      update public.trust_alerts
        set assigned_to=p_assigned_to,updated_at=now()
        where id=alert_id and enterprise_id=p_enterprise_id;
    end if;

    insert into public.trust_alert_activity(
      enterprise_id,alert_id,action,note,actor_id,assigned_to,correlation_id
    ) values (
      p_enterprise_id,alert_id,p_action,nullif(left(trim(coalesce(p_note,'')),500),''),
      p_actor_id,p_assigned_to,p_correlation_id
    );
    insert into public.trust_architecture_audit_log(
      enterprise_id,action,actor_reference,target_type,target_id,correlation_id,metadata
    ) values (
      p_enterprise_id,'TRUST_CENTRE_ALERT_'||upper(p_action),
      'user:'||p_actor_id::text,'TRUST_ALERT',alert_id::text,p_correlation_id,
      jsonb_build_object('priorState',current_state,'nextState',coalesce(target_state,current_state),
        'assignedTo',p_assigned_to,'noteRecorded',length(trim(coalesce(p_note,'')))>0)
    );
    affected := affected + 1;
  end loop;
  return jsonb_build_object('affected',affected,'action',p_action,'correlationId',p_correlation_id);
end $$;

revoke all on function public.manage_trust_centre_alerts_v1(
  uuid,uuid[],uuid,text,text,uuid,uuid
) from public,anon,authenticated;
grant execute on function public.manage_trust_centre_alerts_v1(
  uuid,uuid[],uuid,text,text,uuid,uuid
) to service_role;

comment on table public.trust_alert_activity is
  'Immutable tenant-scoped alert collaboration history for the Enterprise Trust Centre.';
comment on function public.manage_trust_centre_alerts_v1(uuid,uuid[],uuid,text,text,uuid,uuid) is
  'Audited bulk alert boundary; it does not mutate authoritative trust state.';
