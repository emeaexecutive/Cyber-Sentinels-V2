-- Make the atomic public API limiter's isolation boundary explicit. Client IDs
-- are already random, tenant-bound server-side identifiers; including tenant_id
-- in the key and conflict target makes cross-tenant sharing impossible even if
-- a client identifier is ever deliberately reused during recovery or import.

alter table public.public_api_rate_limit_windows
  drop constraint if exists public_api_rate_limit_windows_pkey;

alter table public.public_api_rate_limit_windows
  add constraint public_api_rate_limit_windows_pkey
  primary key(tenant_id,client_id,route_class,window_started_at);

create or replace function public.consume_public_api_rate_limit_v1(
  p_tenant_id uuid,p_client_id uuid,p_route_class text,p_limit integer,p_window_seconds integer
) returns jsonb language plpgsql security definer set search_path=public as $$
declare started timestamptz; current_count integer; retry_after integer;
begin
  if auth.role()<>'service_role' then raise exception 'Public API service path required'; end if;
  if p_tenant_id is null or p_client_id is null then raise exception 'Tenant-bound API client required'; end if;
  if p_limit<1 or p_window_seconds<1 or p_window_seconds>3600 then raise exception 'Invalid public API rate limit'; end if;
  started:=to_timestamp(floor(extract(epoch from clock_timestamp())/p_window_seconds)*p_window_seconds);
  insert into public.public_api_rate_limit_windows(tenant_id,client_id,route_class,window_started_at,request_count)
  values(p_tenant_id,p_client_id,p_route_class,started,1)
  on conflict(tenant_id,client_id,route_class,window_started_at) do update
    set request_count=public.public_api_rate_limit_windows.request_count+1,updated_at=now()
  returning request_count into current_count;
  retry_after:=greatest(1,ceil(extract(epoch from started+make_interval(secs=>p_window_seconds)-clock_timestamp()))::integer);
  return jsonb_build_object(
    'allowed',current_count<=p_limit,
    'limit',p_limit,
    'remaining',greatest(0,p_limit-current_count),
    'retryAfter',retry_after,
    'resetAt',started+make_interval(secs=>p_window_seconds)
  );
end $$;

revoke all on function public.consume_public_api_rate_limit_v1(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_public_api_rate_limit_v1(uuid,uuid,text,integer,integer) to service_role;
