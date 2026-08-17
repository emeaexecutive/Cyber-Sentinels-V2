-- External Agent Trust API v0.1. This migration extends the existing
-- developer credential and canonical trust runtime; it does not introduce a
-- second agent registry, authority model, decision engine, Replay, receipt,
-- Evidence Graph, or Trust Memory.

alter table public.api_keys add column if not exists tenant_id uuid references public.trust_workspaces(id) on delete restrict;
alter table public.api_keys add column if not exists client_id uuid;
alter table public.api_keys add column if not exists key_prefix text;
alter table public.api_keys add column if not exists key_hash text;
alter table public.api_keys add column if not exists status text not null default 'active';
alter table public.api_keys add column if not exists scopes text[] not null default '{}';
alter table public.api_keys add column if not exists expires_at timestamptz;
alter table public.api_keys add column if not exists revoked_at timestamptz;
alter table public.api_keys add column if not exists last_used_at timestamptz;
alter table public.api_keys add column if not exists rotated_from_id uuid references public.api_keys(id) on delete restrict;
alter table public.api_keys add column if not exists created_by uuid;
alter table public.api_keys add column if not exists updated_at timestamptz not null default now();

-- Credential lifecycle writes are server-owned. The original developer-console
-- foundation granted browser sessions insert/update access; keep tenant owners
-- read-only and route every secret-bearing mutation through the audited server
-- endpoint backed by service_role.
revoke insert,update,delete on table public.api_keys from authenticated;
grant select on table public.api_keys to authenticated;

drop index if exists public.api_keys_client_id_uidx;
create index if not exists api_keys_client_id_idx on public.api_keys(client_id,created_at desc) where client_id is not null;
create unique index if not exists api_keys_prefix_uidx on public.api_keys(key_prefix) where key_prefix is not null and key_hash is not null;
create index if not exists api_keys_tenant_status_idx on public.api_keys(tenant_id,status,created_at desc);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='api_keys_scope_v1_check') then
    alter table public.api_keys add constraint api_keys_scope_v1_check check(
      scopes <@ array['agents:write','agents:verify','authority:read','trust:request','trust:read','outcomes:write']::text[]
    );
  end if;
  if not exists(select 1 from pg_constraint where conname='api_keys_lifecycle_v1_check') then
    alter table public.api_keys add constraint api_keys_lifecycle_v1_check check(
      status in ('active','paused','revoked') and (expires_at is null or expires_at>created_at)
    );
  end if;
end $$;

create table public.public_api_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  client_id uuid not null,
  route text not null,
  method text not null,
  correlation_id uuid not null,
  agent_id text,
  transaction_id uuid,
  decision text check(decision is null or decision in ('ALLOW','REVIEW','DENY')),
  latency_ms integer not null check(latency_ms>=0),
  status integer not null check(status between 100 and 599),
  safe_error_code text,
  occurred_at timestamptz not null default now()
);
create index public_api_audit_tenant_timeline_idx on public.public_api_audit_events(tenant_id,occurred_at desc,event_id);
create index public_api_audit_correlation_idx on public.public_api_audit_events(tenant_id,correlation_id);

create table public.public_api_agent_bindings (
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  operational_entity_id text not null,
  client_id uuid not null,
  registered_at timestamptz not null default now(),
  primary key(tenant_id,operational_entity_id),
  foreign key(tenant_id,operational_entity_id) references public.operational_entities(enterprise_id,entity_id) on delete restrict
);
create index public_api_agent_client_idx on public.public_api_agent_bindings(tenant_id,client_id,registered_at desc);

create table public.public_api_rate_limit_windows (
  tenant_id uuid not null references public.trust_workspaces(id) on delete cascade,
  client_id uuid not null,
  route_class text not null,
  window_started_at timestamptz not null,
  request_count integer not null check(request_count>0),
  updated_at timestamptz not null default now(),
  primary key(client_id,route_class,window_started_at)
);

create table public.public_api_outcome_submissions (
  submission_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  transaction_id uuid not null,
  client_id uuid not null,
  source_id text not null,
  destination text not null,
  action_reference text not null,
  target text not null,
  result text not null check(result in ('SUCCEEDED','FAILED','UNKNOWN')),
  observed_at timestamptz not null,
  evidence_reference text not null,
  supplied_digest text,
  independence text not null check(independence in ('AGENT_ASSERTED','APPROVED_DESTINATION','INDEPENDENT')),
  submission_digest text not null check(submission_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key(tenant_id,transaction_id) references public.canonical_trust_transactions(enterprise_id,transaction_id) on delete restrict,
  unique(tenant_id,transaction_id,submission_digest)
);

create table public.public_api_webhook_events (
  event_id uuid primary key,
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  event_type text not null check(event_type in (
    'decision.review_required','decision.denied','authority.revoked','trust.material_change','outcome.contradiction'
  )),
  subject_reference text not null,
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  payload_digest text not null check(payload_digest ~ '^[a-f0-9]{64}$'),
  delivery_state text not null default 'QUEUED' check(delivery_state in ('QUEUED','DELIVERED','FAILED','NOT_CONFIGURED')),
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(tenant_id,payload_digest)
);
create index public_api_webhook_tenant_timeline_idx on public.public_api_webhook_events(tenant_id,created_at desc,event_id);

do $$ declare table_name text; begin foreach table_name in array array[
  'public_api_agent_bindings','public_api_audit_events','public_api_rate_limit_windows','public_api_outcome_submissions','public_api_webhook_events'
] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('grant all privileges on public.%I to service_role',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(public.user_can_access_trust_workspace(tenant_id))','tenant reads '||table_name,table_name);
end loop; end $$;

create trigger public_api_audit_events_append_only before update or delete on public.public_api_audit_events for each row execute function public.prevent_trust_architecture_history_mutation();
create trigger public_api_outcome_submissions_append_only before update or delete on public.public_api_outcome_submissions for each row execute function public.prevent_trust_architecture_history_mutation();

create or replace function public.consume_public_api_rate_limit_v1(
  p_tenant_id uuid,p_client_id uuid,p_route_class text,p_limit integer,p_window_seconds integer
) returns jsonb language plpgsql security definer set search_path=public as $$
declare started timestamptz; current_count integer; retry_after integer;
begin
  if auth.role()<>'service_role' then raise exception 'Public API service path required'; end if;
  if p_limit<1 or p_window_seconds<1 or p_window_seconds>3600 then raise exception 'Invalid public API rate limit'; end if;
  started:=to_timestamp(floor(extract(epoch from clock_timestamp())/p_window_seconds)*p_window_seconds);
  insert into public.public_api_rate_limit_windows(tenant_id,client_id,route_class,window_started_at,request_count)
  values(p_tenant_id,p_client_id,p_route_class,started,1)
  on conflict(client_id,route_class,window_started_at) do update set request_count=public.public_api_rate_limit_windows.request_count+1,updated_at=now()
  returning request_count into current_count;
  retry_after:=greatest(1,ceil(extract(epoch from started+make_interval(secs=>p_window_seconds)-clock_timestamp()))::integer);
  return jsonb_build_object('allowed',current_count<=p_limit,'limit',p_limit,'remaining',greatest(0,p_limit-current_count),'retryAfter',retry_after,'resetAt',started+make_interval(secs=>p_window_seconds));
end $$;
revoke all on function public.consume_public_api_rate_limit_v1(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_public_api_rate_limit_v1(uuid,uuid,text,integer,integer) to service_role;

comment on table public.api_keys is 'Tenant-scoped external API client credentials. key_hash stores a salted scrypt derivation; plaintext secrets are never persisted.';
comment on table public.public_api_outcome_submissions is 'Outcome assertions projected onto existing canonical transactions. AGENT_ASSERTED is never independent destination evidence.';
