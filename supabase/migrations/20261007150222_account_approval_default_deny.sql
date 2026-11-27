-- Approval is an additional database boundary, never a tenant grant.
-- Historical migrations remain unchanged. No existing customer rows are removed.
begin;

create or replace function public.require_customer_approval()
returns void language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' and not public.security_closure_user_approved() then
    raise exception 'ACCESS_APPROVAL_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

-- Restrictive policies compose with every existing permissive tenant policy.
-- Cover all application tables, not a hand-picked subset of legacy tables.
do $$
declare item record;
begin
  for item in select n.nspname, c.relname, c.relkind from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','S','f')
      and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
  loop
    if item.relkind='S' then
      execute format('revoke all on sequence %I.%I from public, anon',item.nspname,item.relname);
      execute format('revoke select, update on sequence %I.%I from authenticated',item.nspname,item.relname);
    else
      execute format('revoke all on table %I.%I from public, anon',item.nspname,item.relname);
      execute format('revoke truncate, references, trigger, maintain on table %I.%I from authenticated',item.nspname,item.relname);
      -- Column-level grants survive table-level REVOKE unless removed explicitly.
      if item.relkind in ('r','p') then
        execute format('alter table %I.%I enable row level security',item.nspname,item.relname);
        if item.relname <> 'account_access_approvals' then
          execute format('drop policy if exists "customer approval required" on %I.%I',item.nspname,item.relname);
          execute format('create policy "customer approval required" on %I.%I as restrictive for all to authenticated using ((select public.security_closure_user_approved())) with check ((select public.security_closure_user_approved()))',item.nspname,item.relname);
        end if;
      elsif item.relkind='v' then
        execute format('alter view %I.%I set (security_invoker=true)',item.nspname,item.relname);
      else
        -- Materialized views / foreign tables do not inherit the table RLS gate.
        execute format('revoke all on table %I.%I from authenticated',item.nspname,item.relname);
      end if;
    end if;
  end loop;
end;
$$;

do $$
declare col record;
begin
  for col in select n.nspname,c.relname,a.attname from pg_attribute a
    join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and a.attnum>0 and not a.attisdropped and a.attacl is not null
  loop
    execute format('revoke all (%I) on table %I.%I from public, anon',col.attname,col.nspname,col.relname);
  end loop;
end;
$$;

-- Only a user's own minimal approval-status display is available before approval.
revoke all on public.account_access_approvals from authenticated;

grant select(user_id,status,organization,reason) on public.account_access_approvals to authenticated;

-- Storage uses its own API and must enforce the same boundary directly.
do $$
declare item text;
begin
  foreach item in array array['objects','buckets'] loop
    execute format('drop policy if exists "customer approval required" on storage.%I',item);
    execute format('create policy "customer approval required" on storage.%I as restrictive for all to authenticated using ((select public.security_closure_user_approved())) with check ((select public.security_closure_user_approved()))',item);
    execute format('drop policy if exists "anonymous customer storage denied" on storage.%I',item);
    execute format('create policy "anonymous customer storage denied" on storage.%I as restrictive for all to anon using (false) with check (false)',item);
  end loop;
end;
$$;

-- Deny new direct RPC surfaces by default. Trigger invocation does not require
-- exposing trigger functions as RPCs. Trusted server operations retain access.
do $$
declare fn record;
begin
  for fn in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
    and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated',fn.signature);
    execute format('grant execute on function %s to service_role',fn.signature);
  end loop;
end;
$$;

alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;

alter default privileges for role postgres in schema public revoke all on sequences from public, anon;

alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public grant all on tables to service_role;

alter default privileges for role postgres in schema public grant all on sequences to service_role;

alter default privileges for role postgres in schema public grant execute on functions to service_role;

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
$function$;

grant execute on function public.identity_workspace_role(workspace_reference uuid) to authenticated;

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
$function$;

grant execute on function public.security_closure_ai_agent_owner(p_agent_id uuid) to authenticated;

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
$function$;

grant execute on function public.security_closure_case_owner(p_case_id uuid) to authenticated;

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
$function$;

grant execute on function public.security_closure_evidence_object_owner(p_object_name text) to authenticated;

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
$function$;

grant execute on function public.security_closure_passport_owner(p_passport_id uuid) to authenticated;

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
$function$;

grant execute on function public.security_closure_team_member(p_team_id text) to authenticated;

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
$function$;

grant execute on function public.security_closure_team_member(p_team_id uuid) to authenticated;

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
$function$;

grant execute on function public.user_can_access_trust_workspace(workspace_reference uuid) to authenticated;

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
$function$;

grant execute on function public.user_has_trust_workspace_role(workspace_reference uuid, allowed_roles text[]) to authenticated;

CREATE OR REPLACE FUNCTION public.trust_entity_summary_v1(p_tenant_id uuid, p_entity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
begin
 perform public.require_customer_approval();
 return (select case when e.id is null then null else jsonb_build_object(
    'entity',to_jsonb(e),
    'evidence_count',(
      select count(*) from public.trust_evidence v
      where v.tenant_id=p_tenant_id and v.entity_id=p_entity_id
    ),
    'active_relationship_count',(
      select count(*) from public.trust_graph_relationships_v2 r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and (r.source_entity=p_entity_id or r.target_entity=p_entity_id)
    ),
    'inbound_relationship_count',(
      select count(*) from public.trust_graph_relationships_v2 r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and r.target_entity=p_entity_id
    ),
    'outbound_relationship_count',(
      select count(*) from public.trust_graph_relationships_v2 r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and r.source_entity=p_entity_id
    ),
    'provider_count',(
      select count(distinct v.provider) from public.trust_evidence v
      where v.tenant_id=p_tenant_id and v.entity_id=p_entity_id
    ),
    'latest_activity_at',greatest(
      e.updated_at,
      coalesce((
        select max(v.created_at) from public.trust_evidence v
        where v.tenant_id=p_tenant_id and v.entity_id=p_entity_id
      ),e.updated_at),
      coalesce((
        select max(g.occurred_at) from public.trust_graph_events g
        where g.tenant_id=p_tenant_id and g.entity_id=p_entity_id
      ),e.updated_at)
    )
  ) end
  from public.trust_entities e
  where e.tenant_id=p_tenant_id and e.id=p_entity_id);
end;
$function$;

grant execute on function public.trust_entity_summary_v1(p_tenant_id uuid, p_entity_id uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.trust_graph_orphans_v1(p_tenant_id uuid, p_limit integer DEFAULT 100)
 RETURNS SETOF trust_entities
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
begin
 perform public.require_customer_approval();
 return query select e.* from public.trust_entities e
  where e.tenant_id=p_tenant_id and e.status<>'DELETED'
    and not exists(
      select 1 from public.trust_graph_relationships_v2 r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and (r.source_entity=e.id or r.target_entity=e.id)
    )
  order by e.created_at desc,e.id desc
  limit least(greatest(p_limit,1),500);
end;
$function$;

grant execute on function public.trust_graph_orphans_v1(p_tenant_id uuid, p_limit integer) to authenticated;

CREATE OR REPLACE FUNCTION public.trust_graph_statistics_v1(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
begin
 perform public.require_customer_approval();
 return (select jsonb_build_object(
    'entities',(select count(*) from public.trust_entities where tenant_id=p_tenant_id),
    'active_entities',(select count(*) from public.trust_entities where tenant_id=p_tenant_id and status='ACTIVE'),
    'evidence',(select count(*) from public.trust_evidence where tenant_id=p_tenant_id),
    'active_relationships',(select count(*) from public.trust_graph_relationships_v2 where tenant_id=p_tenant_id and removed_at is null),
    'providers',(select count(*) from public.trust_sources where tenant_id=p_tenant_id),
    'orphan_entities',(
      select count(*) from public.trust_entities e
      where e.tenant_id=p_tenant_id and e.status<>'DELETED'
        and not exists(
          select 1 from public.trust_graph_relationships_v2 r
          where r.tenant_id=p_tenant_id and r.removed_at is null
            and (r.source_entity=e.id or r.target_entity=e.id)
        )
    ),
    'measured_at',now()
  ));
end;
$function$;

grant execute on function public.trust_graph_statistics_v1(p_tenant_id uuid) to authenticated;

grant execute on function public.security_closure_user_approved(), public.record_account_access_attempt(boolean), public.require_customer_approval() to authenticated, service_role;

commit;
