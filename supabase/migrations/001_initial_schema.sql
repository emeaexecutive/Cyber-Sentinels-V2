create extension if not exists pgcrypto;

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company text,
  role text,
  use_case text,
  created_at timestamptz default now()
);

create table if not exists verification_passports (
  id uuid primary key default gen_random_uuid(),
  subject_type text check (subject_type in ('human','agent','content')),
  subject_name text not null,
  trust_score int check (trust_score >= 0 and trust_score <= 100),
  status text default 'pending',
  world_verified boolean default false,
  risk_flags jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;
alter table verification_passports enable row level security;
alter table audit_logs enable row level security;

create policy "Allow public waitlist inserts" on waitlist
  for insert
  to anon
  with check (true);
