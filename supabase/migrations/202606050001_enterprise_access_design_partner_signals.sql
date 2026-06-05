alter table public.enterprise_access_requests
add column if not exists design_partner_interest boolean not null default false;

alter table public.enterprise_access_requests
add column if not exists governance_interest boolean not null default false;

alter table public.enterprise_access_requests
add column if not exists operational_ai_interest boolean not null default false;
