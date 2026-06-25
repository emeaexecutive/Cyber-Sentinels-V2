create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  user_email text,
  stripe_customer_id text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  user_email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free',
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null default 'free',
  max_passports integer,
  max_evidence_uploads integer,
  trust_graph_enabled boolean not null default false,
  governance_enabled boolean not null default false,
  api_access_enabled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.usage_limits
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists billing_customers_user_id_idx
on public.billing_customers (user_id);

create index if not exists subscriptions_user_id_idx
on public.subscriptions (user_id);

create unique index if not exists usage_limits_user_id_idx
on public.usage_limits (user_id);

create index if not exists subscriptions_stripe_customer_id_idx
on public.subscriptions (stripe_customer_id);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_limits enable row level security;

grant select, insert, update on table public.billing_customers to authenticated;
grant select, insert, update on table public.subscriptions to authenticated;
grant select, insert, update on table public.usage_limits to authenticated;

drop policy if exists "users can read own billing customers" on public.billing_customers;
drop policy if exists "users can read own subscriptions" on public.subscriptions;
drop policy if exists "users can read own usage limits" on public.usage_limits;

create policy "users can read own billing customers"
on public.billing_customers
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can read own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can read own usage limits"
on public.usage_limits
for select
to authenticated
using (auth.uid() = user_id);
