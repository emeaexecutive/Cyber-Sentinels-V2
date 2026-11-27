-- PROPOSAL ONLY: not in the deployment migration directory; requires separate review/approval.
-- The service role is a trusted tenant-scoping boundary. Browser/agent roles cannot call these RPCs.
create schema if not exists swarm_private;
revoke all on schema swarm_private from public, anon, authenticated, service_role;
create table swarm_private.state (
 tenant_id uuid primary key,
 version bigint not null check(version > 0),
 document jsonb not null check(document->>'tenantId' = tenant_id::text),
 check(jsonb_typeof(document->'events') = 'array')
);
alter table swarm_private.state enable row level security;
alter table swarm_private.state force row level security;
create table swarm_private.events (
 tenant_id uuid not null,
 sequence bigint not null,
 digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 document jsonb not null,
 primary key(tenant_id,sequence), unique(tenant_id,digest),
 check(document->>'tenantId' = tenant_id::text),
 check((document->>'sequence')::bigint = sequence)
);
alter table swarm_private.events enable row level security;
alter table swarm_private.events force row level security;
revoke all on all tables in schema swarm_private from public, anon, authenticated, service_role;
create function swarm_private.immutable_event() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'SWARM_APPEND_ONLY'; end $$;
create trigger immutable_events before update or delete on swarm_private.events for each row execute function swarm_private.immutable_event();
revoke all on function swarm_private.immutable_event() from public;
create function public.load_swarm_state_v1(p_tenant_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
 select jsonb_build_object('version',version,'state',document) from swarm_private.state where tenant_id=p_tenant_id
$$;
create function public.cas_swarm_state_v1(p_tenant_id uuid,p_version bigint,p_state jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare prior swarm_private.state; n bigint; entry jsonb; prior_hash text;
begin
 if p_tenant_id is null or p_version is null or p_version<0 or p_state->>'tenantId' is distinct from p_tenant_id::text or jsonb_typeof(p_state->'events') is distinct from 'array' then raise exception 'SWARM_INVALID_STATE'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,0));
 select * into prior from swarm_private.state where tenant_id=p_tenant_id for update;
 if coalesce(prior.version,0)<>p_version then return false; end if;
 n:=coalesce(jsonb_array_length(prior.document->'events'),0);
 if jsonb_array_length(p_state->'events') <= n then raise exception 'SWARM_APPEND_REQUIRED'; end if;
 if n>0 then
   for i in 0..n-1 loop
     if prior.document->'events'->i is distinct from p_state->'events'->i then raise exception 'SWARM_HISTORY_REWRITE'; end if;
   end loop;
 end if;
 prior_hash:=coalesce(prior.document->'events'->(n::int-1)->>'digest',repeat('0',64));
 for entry in select value from jsonb_array_elements(p_state->'events') with ordinality e(value,ord) where ord>n loop
   n:=n+1;
   if entry->>'tenantId' is distinct from p_tenant_id::text or (entry->>'sequence')::bigint is distinct from n or entry->>'previousHash' is distinct from prior_hash then raise exception 'SWARM_EVENT_BINDING'; end if;
   insert into swarm_private.events values(p_tenant_id,n,entry->>'digest',entry);
   prior_hash:=entry->>'digest';
 end loop;
 insert into swarm_private.state values(p_tenant_id,p_version+1,p_state)
 on conflict(tenant_id) do update set version=excluded.version,document=excluded.document;
 return true;
end $$;
revoke all on function public.load_swarm_state_v1(uuid) from public,anon,authenticated;
revoke all on function public.cas_swarm_state_v1(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.load_swarm_state_v1(uuid) to service_role;
grant execute on function public.cas_swarm_state_v1(uuid,bigint,jsonb) to service_role;
comment on function public.cas_swarm_state_v1(uuid,bigint,jsonb) is 'Internal server-only CAS; never expose a raw service-role proxy or client-supplied tenant context.';
