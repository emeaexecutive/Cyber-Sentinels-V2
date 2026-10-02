create table if not exists public.judgeme_installations (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.trust_workspaces(id) on delete cascade,
  shop_domain text not null unique,
  status text not null default 'active' check (status in ('active', 'uninstalled', 'suspended')),
  installed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (shop_domain = lower(shop_domain) and shop_domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*[.]myshopify[.]com$')
);

create index if not exists judgeme_installations_tenant_idx
  on public.judgeme_installations (enterprise_id, created_at desc);

alter table public.judgeme_installations enable row level security;
revoke all on public.judgeme_installations from anon, authenticated;
grant all privileges on public.judgeme_installations to service_role;

comment on table public.judgeme_installations is
  'Trusted Judge.me shop-to-tenant installation mapping. Provider API credentials remain server-only environment secrets.';