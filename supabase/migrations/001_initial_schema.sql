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

create table if not exists passports (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  subject_type text not null check (subject_type in ('human','agent','candidate','content')),
  subject_name text not null,
  trust_score int default 50 check (trust_score >= 0 and trust_score <= 100),
  clearance text default 'pending',
  verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists trust_reports (
  id uuid primary key default gen_random_uuid(),
  profile_consistency int not null check (profile_consistency >= 0 and profile_consistency <= 100),
  synthetic_risk int not null check (synthetic_risk >= 0 and synthetic_risk <= 100),
  confidence int not null check (confidence >= 0 and confidence <= 100),
  trust_score int not null check (trust_score >= 0 and trust_score <= 100),
  report_type text default 'hiring_shield',
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;
alter table verification_passports enable row level security;
alter table audit_logs enable row level security;
alter table passports enable row level security;
alter table trust_reports enable row level security;
alter table signals enable row level security;

create policy "Allow public waitlist inserts" on waitlist
  for insert
  to anon
  with check (true);

create policy "Allow public passport reads" on passports
  for select
  to anon, authenticated
  using (true);

create policy "Allow public passport inserts" on passports
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow authenticated passport updates" on passports
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow public trust report reads" on trust_reports
  for select
  to anon, authenticated
  using (true);

create policy "Allow public trust report inserts" on trust_reports
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow public signal reads" on signals
  for select
  to anon, authenticated
  using (true);

create policy "Allow public signal inserts" on signals
  for insert
  to anon, authenticated
  with check (true);
