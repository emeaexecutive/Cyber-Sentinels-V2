-- Customer workload identities are issuer/subject bindings to the existing
-- tenant-owned agent registry. Only trusted server code may manage them.
create table public.public_api_workload_bindings (
  binding_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.trust_workspaces(id) on delete restrict,
  operational_entity_id text not null,
  client_id uuid not null,
  issuer text not null check(length(issuer) between 1 and 2048),
  subject text not null check(length(subject) between 1 and 240),
  scopes text[] not null default '{}',
  status text not null default 'active' check(status in ('active','revoked')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(tenant_id,operational_entity_id)
    references public.public_api_agent_bindings(tenant_id,operational_entity_id)
    on delete restrict,
  check(scopes = array['trust:request']::text[]),
  check((status='active' and revoked_at is null) or (status='revoked' and revoked_at is not null))
);

create unique index public_api_workload_identity_active_uidx
  on public.public_api_workload_bindings(issuer,subject)
  where status='active';
create unique index public_api_workload_agent_active_uidx
  on public.public_api_workload_bindings(tenant_id,operational_entity_id)
  where status='active';
create index public_api_workload_tenant_agent_timeline_idx
  on public.public_api_workload_bindings(tenant_id,operational_entity_id,created_at desc);

alter table public.public_api_workload_bindings enable row level security;
revoke all on table public.public_api_workload_bindings from public,anon,authenticated;
grant select,insert,update on table public.public_api_workload_bindings to service_role;
