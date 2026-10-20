-- Recovery progress is not authority. Source receipts remain append-only.
create table swarm_private.projection_cursor (tenant_id uuid primary key references swarm_private.state(tenant_id), sequence bigint not null check (sequence >= 0));
alter table swarm_private.projection_cursor enable row level security;
alter table swarm_private.projection_cursor force row level security;
revoke all on swarm_private.projection_cursor from public, anon, authenticated, service_role;
create function public.swarm_projection_cursor_v1(p_tenant_id uuid, p_expected bigint default null, p_next bigint default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare current_sequence bigint;
begin
 if p_tenant_id is null then raise exception 'TENANT_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,1));
 select sequence into current_sequence from swarm_private.projection_cursor where tenant_id=p_tenant_id;
 current_sequence:=coalesce(current_sequence,0);
 if p_expected is null and p_next is null then return current_sequence; end if;
 if p_expected is null or p_next is null or p_expected < 0 or p_next < p_expected or p_next > coalesce((select jsonb_array_length(document->'events') from swarm_private.state where tenant_id=p_tenant_id),0) then raise exception 'PROJECTION_CURSOR_INVALID'; end if;
 if current_sequence <> p_expected then return current_sequence; end if;
 insert into swarm_private.projection_cursor values(p_tenant_id,p_next) on conflict(tenant_id) do update set sequence=excluded.sequence;
 return p_next;
end $$;
revoke all on function public.swarm_projection_cursor_v1(uuid,bigint,bigint) from public,anon,authenticated;
grant execute on function public.swarm_projection_cursor_v1(uuid,bigint,bigint) to service_role;
