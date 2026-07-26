-- EPIC 21: Enterprise Trust Graph.
-- Additive, versioned topology over the EPIC 20 evidence and intelligence foundation.
create extension if not exists pgcrypto;

create table public.trust_entities (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_type text not null check(entity_type in (
    'HUMAN','ORGANISATION','AI_AGENT','DEVICE','IDENTITY',
    'EMAIL','PHONE','DOCUMENT','WORKFLOW','POLICY'
  )),
  entity_name text not null check(length(entity_name) between 1 and 200),
  status text not null check(status in ('ACTIVE','SUSPENDED','REVOKED','DELETED')),
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  version integer not null default 1 check(version >= 1),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique(tenant_id,id),
  check((status='DELETED')=(deleted_at is not null))
);
create index trust_entities_tenant_type_status_idx
  on public.trust_entities(tenant_id,entity_type,status,updated_at desc,id);
create index trust_entities_tenant_name_idx
  on public.trust_entities(tenant_id,lower(entity_name),id)
  where status<>'DELETED';

create table public.trust_evidence (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id uuid not null,
  source text not null check(length(source) between 1 and 256),
  provider text not null check(length(provider) between 1 and 128),
  evidence_type text not null check(length(evidence_type) between 1 and 128),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  version integer not null default 1 check(version >= 1),
  evidence_node_id uuid references public.evidence_nodes(node_id) on delete restrict,
  created_at timestamptz not null,
  foreign key(tenant_id,entity_id)
    references public.trust_entities(tenant_id,id) on delete restrict,
  unique(tenant_id,id),
  unique(tenant_id,entity_id,source,provider,evidence_type,created_at)
);
create index trust_evidence_entity_idx
  on public.trust_evidence(tenant_id,entity_id,created_at desc,id desc);
create index trust_evidence_provider_idx
  on public.trust_evidence(tenant_id,provider,evidence_type,created_at desc);
create index trust_evidence_match_key_idx
  on public.trust_evidence(tenant_id,evidence_type,(metadata->>'matchKeyHash'))
  where metadata ? 'matchKeyHash';

create table public.trust_relationships (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  source_entity uuid not null,
  target_entity uuid not null,
  relationship_type text not null check(
    relationship_type ~ '^[A-Z][A-Z0-9_]{0,63}$'
  ),
  confidence numeric(5,4) not null check(confidence between 0 and 1),
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  version integer not null default 1 check(version >= 1),
  created_at timestamptz not null,
  removed_at timestamptz,
  foreign key(tenant_id,source_entity)
    references public.trust_entities(tenant_id,id) on delete restrict,
  foreign key(tenant_id,target_entity)
    references public.trust_entities(tenant_id,id) on delete restrict,
  unique(tenant_id,id),
  check(source_entity<>target_entity)
);
create unique index trust_relationships_active_unique_idx
  on public.trust_relationships(
    tenant_id,source_entity,target_entity,relationship_type
  ) where removed_at is null;
create index trust_relationships_source_idx
  on public.trust_relationships(tenant_id,source_entity,created_at desc,id);
create index trust_relationships_target_idx
  on public.trust_relationships(tenant_id,target_entity,created_at desc,id);

create table public.trust_sources (
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  provider text not null,
  health text not null check(health in (
    'HEALTHY','DEGRADED','UNAVAILABLE','MISCONFIGURED','UNKNOWN'
  )),
  latency integer check(latency is null or latency >= 0),
  cost numeric(12,4) check(cost is null or cost >= 0),
  cost_currency text,
  last_seen timestamptz,
  version integer not null default 1 check(version >= 1),
  updated_at timestamptz not null,
  primary key(tenant_id,provider)
);
create index trust_sources_health_idx
  on public.trust_sources(tenant_id,health,updated_at desc,provider);

create table public.trust_graph_events (
  id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  entity_id uuid,
  event_type text not null check(event_type in (
    'ENTITY_CREATED','ENTITY_UPDATED','ENTITY_DELETED','EVIDENCE_ADDED',
    'RELATIONSHIP_ADDED','RELATIONSHIP_REMOVED','PROVIDER_UPDATED'
  )),
  resource_type text not null check(resource_type in (
    'ENTITY','EVIDENCE','RELATIONSHIP','PROVIDER'
  )),
  resource_id text not null,
  actor_id uuid not null,
  version integer not null check(version >= 1),
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,entity_id)
    references public.trust_entities(tenant_id,id) on delete restrict,
  unique(tenant_id,id),
  unique(tenant_id,resource_type,resource_id,version,event_type)
);
create index trust_graph_events_entity_idx
  on public.trust_graph_events(tenant_id,entity_id,occurred_at desc,id desc);
create index trust_graph_events_resource_idx
  on public.trust_graph_events(
    tenant_id,resource_type,resource_id,version desc
  );
create index trust_graph_events_correlation_idx
  on public.trust_graph_events(tenant_id,correlation_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'trust_entities','trust_evidence','trust_relationships',
    'trust_sources','trust_graph_events'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon,authenticated',table_name);
    execute format('grant all privileges on public.%I to service_role',table_name);
    execute format('grant select on public.%I to authenticated',table_name);
  end loop;
end $$;

create policy "tenant reads trust entities" on public.trust_entities
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust graph evidence" on public.trust_evidence
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust relationships" on public.trust_relationships
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust sources" on public.trust_sources
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));
create policy "tenant reads trust graph events" on public.trust_graph_events
  for select to authenticated
  using(public.user_can_access_trust_workspace(tenant_id));

create trigger trust_evidence_append_only
before update or delete on public.trust_evidence
for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger trust_graph_events_append_only
before update or delete on public.trust_graph_events
for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.mutate_trust_graph_v1(
  p_action text,
  p_payload jsonb,
  p_event jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  tenant uuid := (p_event->>'tenantId')::uuid;
  actor uuid := (p_event->>'actorId')::uuid;
  entity_row public.trust_entities%rowtype;
  evidence_row public.trust_evidence%rowtype;
  relationship_row public.trust_relationships%rowtype;
  source_row public.trust_sources%rowtype;
  result jsonb;
begin
  if auth.role()<>'service_role' then
    raise exception 'Trust Graph service path required';
  end if;
  if p_payload->>'tenantId' is distinct from p_event->>'tenantId' then
    raise exception 'Cross-tenant Trust Graph mutation denied';
  end if;

  case p_action
    when 'CREATE_ENTITY' then
      insert into public.trust_entities(
        id,tenant_id,entity_type,entity_name,status,metadata,version,
        created_at,updated_at,deleted_at
      ) values (
        (p_payload->>'id')::uuid,tenant,p_payload->>'entityType',
        p_payload->>'entityName',p_payload->>'status',
        coalesce(p_payload->'metadata','{}'::jsonb),
        (p_payload->>'version')::integer,
        (p_payload->>'createdAt')::timestamptz,
        (p_payload->>'updatedAt')::timestamptz,
        nullif(p_payload->>'deletedAt','')::timestamptz
      ) returning * into entity_row;
      result:=to_jsonb(entity_row);

    when 'UPDATE_ENTITY' then
      update public.trust_entities set
        entity_name=coalesce(
          nullif(p_payload->'patch'->>'entityName',''),entity_name
        ),
        status=coalesce(
          nullif(p_payload->'patch'->>'status',''),status
        ),
        metadata=case when p_payload->'patch' ? 'metadata'
          then p_payload->'patch'->'metadata' else metadata end,
        version=version+1,
        updated_at=(p_event->>'occurredAt')::timestamptz
      where tenant_id=tenant
        and id=(p_payload->>'entityId')::uuid
        and version=(p_payload->>'expectedVersion')::integer
        and status<>'DELETED'
      returning * into entity_row;
      if not found then raise exception 'Trust Graph version conflict'; end if;
      result:=to_jsonb(entity_row);

    when 'DELETE_ENTITY' then
      if exists(
        select 1 from public.trust_relationships
        where tenant_id=tenant and removed_at is null
          and (
            source_entity=(p_payload->>'entityId')::uuid
            or target_entity=(p_payload->>'entityId')::uuid
          )
      ) then
        raise exception 'Active relationships must be removed before entity deletion';
      end if;
      update public.trust_entities set
        status='DELETED',deleted_at=(p_event->>'occurredAt')::timestamptz,
        updated_at=(p_event->>'occurredAt')::timestamptz,version=version+1
      where tenant_id=tenant
        and id=(p_payload->>'entityId')::uuid
        and version=(p_payload->>'expectedVersion')::integer
        and status<>'DELETED'
      returning * into entity_row;
      if not found then raise exception 'Trust Graph version conflict'; end if;
      result:=to_jsonb(entity_row);

    when 'ATTACH_EVIDENCE' then
      if not exists(
        select 1 from public.trust_entities
        where tenant_id=tenant and id=(p_payload->>'entityId')::uuid
          and status<>'DELETED'
      ) then raise exception 'Evidence entity unavailable'; end if;
      insert into public.trust_evidence(
        id,tenant_id,entity_id,source,provider,evidence_type,confidence,
        metadata,version,created_at
      ) values (
        (p_payload->>'id')::uuid,tenant,(p_payload->>'entityId')::uuid,
        p_payload->>'source',p_payload->>'provider',
        p_payload->>'evidenceType',(p_payload->>'confidence')::numeric,
        coalesce(p_payload->'metadata','{}'::jsonb),
        (p_payload->>'version')::integer,
        (p_payload->>'createdAt')::timestamptz
      ) returning * into evidence_row;
      result:=to_jsonb(evidence_row);

    when 'CREATE_RELATIONSHIP' then
      if (
        select count(*) from public.trust_entities
        where tenant_id=tenant
          and id in (
            (p_payload->>'sourceEntityId')::uuid,
            (p_payload->>'targetEntityId')::uuid
          )
          and status<>'DELETED'
      )<>2 then raise exception 'Relationship entities unavailable'; end if;
      insert into public.trust_relationships(
        id,tenant_id,source_entity,target_entity,relationship_type,
        confidence,metadata,version,created_at,removed_at
      ) values (
        (p_payload->>'id')::uuid,tenant,
        (p_payload->>'sourceEntityId')::uuid,
        (p_payload->>'targetEntityId')::uuid,
        p_payload->>'relationshipType',
        (p_payload->>'confidence')::numeric,
        coalesce(p_payload->'metadata','{}'::jsonb),
        (p_payload->>'version')::integer,
        (p_payload->>'createdAt')::timestamptz,null
      ) returning * into relationship_row;
      result:=to_jsonb(relationship_row);

    when 'REMOVE_RELATIONSHIP' then
      update public.trust_relationships set
        removed_at=(p_event->>'occurredAt')::timestamptz,
        version=version+1
      where tenant_id=tenant
        and id=(p_payload->>'relationshipId')::uuid
        and version=(p_payload->>'expectedVersion')::integer
        and removed_at is null
      returning * into relationship_row;
      if not found then raise exception 'Trust Graph version conflict'; end if;
      result:=to_jsonb(relationship_row);

    when 'UPDATE_PROVIDER' then
      insert into public.trust_sources(
        tenant_id,provider,health,latency,cost,cost_currency,last_seen,
        version,updated_at
      ) values (
        tenant,p_payload->>'provider',p_payload->>'health',
        nullif(p_payload->>'latencyMs','')::integer,
        nullif(p_payload->>'costAmount','')::numeric,
        nullif(p_payload->>'costCurrency',''),
        nullif(p_payload->>'lastSeen','')::timestamptz,
        (p_payload->>'version')::integer,
        (p_payload->>'updatedAt')::timestamptz
      )
      on conflict(tenant_id,provider) do update set
        health=excluded.health,latency=excluded.latency,cost=excluded.cost,
        cost_currency=excluded.cost_currency,last_seen=excluded.last_seen,
        version=public.trust_sources.version+1,
        updated_at=excluded.updated_at
      where public.trust_sources.version+1=excluded.version
      returning * into source_row;
      if not found then raise exception 'Trust Graph version conflict'; end if;
      result:=to_jsonb(source_row);

    else
      raise exception 'Unsupported Trust Graph mutation';
  end case;

  insert into public.trust_graph_events(
    id,tenant_id,entity_id,event_type,resource_type,resource_id,actor_id,
    version,occurred_at,metadata,correlation_id
  ) values (
    (p_event->>'id')::uuid,tenant,nullif(p_event->>'entityId','')::uuid,
    p_event->>'eventType',p_event->>'resourceType',
    p_event->>'resourceId',actor,(p_event->>'version')::integer,
    (p_event->>'occurredAt')::timestamptz,
    coalesce(p_event->'metadata','{}'::jsonb),
    (p_event->>'correlationId')::uuid
  );

  return jsonb_build_object('record',result,'eventId',p_event->>'id');
end $$;
revoke all on function public.mutate_trust_graph_v1(text,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.mutate_trust_graph_v1(text,jsonb,jsonb)
  to service_role;

create or replace function public.trust_entity_summary_v1(
  p_tenant_id uuid,
  p_entity_id uuid
) returns jsonb
language sql stable security invoker set search_path=public as $$
  select case when e.id is null then null else jsonb_build_object(
    'entity',to_jsonb(e),
    'evidence_count',(
      select count(*) from public.trust_evidence v
      where v.tenant_id=p_tenant_id and v.entity_id=p_entity_id
    ),
    'active_relationship_count',(
      select count(*) from public.trust_relationships r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and (r.source_entity=p_entity_id or r.target_entity=p_entity_id)
    ),
    'inbound_relationship_count',(
      select count(*) from public.trust_relationships r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and r.target_entity=p_entity_id
    ),
    'outbound_relationship_count',(
      select count(*) from public.trust_relationships r
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
  where e.tenant_id=p_tenant_id and e.id=p_entity_id
$$;

create or replace function public.trust_graph_orphans_v1(
  p_tenant_id uuid,
  p_limit integer default 100
) returns setof public.trust_entities
language sql stable security invoker set search_path=public as $$
  select e.* from public.trust_entities e
  where e.tenant_id=p_tenant_id and e.status<>'DELETED'
    and not exists(
      select 1 from public.trust_relationships r
      where r.tenant_id=p_tenant_id and r.removed_at is null
        and (r.source_entity=e.id or r.target_entity=e.id)
    )
  order by e.created_at desc,e.id desc
  limit least(greatest(p_limit,1),500)
$$;

create or replace function public.trust_graph_statistics_v1(
  p_tenant_id uuid
) returns jsonb
language sql stable security invoker set search_path=public as $$
  select jsonb_build_object(
    'entities',(select count(*) from public.trust_entities where tenant_id=p_tenant_id),
    'active_entities',(select count(*) from public.trust_entities where tenant_id=p_tenant_id and status='ACTIVE'),
    'evidence',(select count(*) from public.trust_evidence where tenant_id=p_tenant_id),
    'active_relationships',(select count(*) from public.trust_relationships where tenant_id=p_tenant_id and removed_at is null),
    'providers',(select count(*) from public.trust_sources where tenant_id=p_tenant_id),
    'orphan_entities',(
      select count(*) from public.trust_entities e
      where e.tenant_id=p_tenant_id and e.status<>'DELETED'
        and not exists(
          select 1 from public.trust_relationships r
          where r.tenant_id=p_tenant_id and r.removed_at is null
            and (r.source_entity=e.id or r.target_entity=e.id)
        )
    ),
    'measured_at',now()
  )
$$;

grant execute on function public.trust_entity_summary_v1(uuid,uuid)
  to authenticated,service_role;
grant execute on function public.trust_graph_orphans_v1(uuid,integer)
  to authenticated,service_role;
grant execute on function public.trust_graph_statistics_v1(uuid)
  to authenticated,service_role;

comment on table public.trust_entities is
  'Versioned Enterprise Trust Graph entities. Deletion creates a tombstone.';
comment on table public.trust_evidence is
  'Provider-neutral, append-only evidence attached to Trust Graph entities.';
comment on table public.trust_relationships is
  'Versioned tenant-bound Trust Graph topology with non-destructive removal.';
comment on function public.mutate_trust_graph_v1(text,jsonb,jsonb) is
  'Atomic service-only Trust Graph mutation and immutable event boundary.';
