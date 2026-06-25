create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  full_name text not null,
  email text not null,
  role_applied_for text,
  company_name text,
  verification_status text default 'pending',
  risk_level text default 'pending',
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, email)
);

create table if not exists public.recruiter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  full_name text not null,
  email text not null,
  company_name text,
  role_title text,
  verification_status text default 'pending',
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, email)
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete set null,
  recruiter_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  title text,
  status text default 'pending',
  scheduled_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.interview_risk_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  session_id uuid references public.interview_sessions(id) on delete cascade,
  signal_type text not null,
  status text default 'pending',
  risk_level text default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.liveness_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  session_id uuid references public.interview_sessions(id) on delete cascade,
  status text default 'pending',
  risk_level text default 'pending',
  provider text default 'placeholder',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trust_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  session_id uuid references public.interview_sessions(id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  risk_level text not null,
  reasons text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  subject_type text not null,
  subject_id uuid,
  session_id uuid references public.interview_sessions(id) on delete set null,
  status text default 'pending',
  risk_level text default 'pending',
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  enterprise_id uuid null,
  verification_event_id uuid references public.verification_events(id) on delete cascade,
  status text default 'needs_manual_review',
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewer_email text,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.interview_sessions
add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.candidate_profiles enable row level security;
alter table public.recruiter_profiles enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_risk_signals enable row level security;
alter table public.liveness_checks enable row level security;
alter table public.trust_scores enable row level security;
alter table public.verification_events enable row level security;
alter table public.admin_reviews enable row level security;

create policy "candidate profiles owner select" on public.candidate_profiles
for select to authenticated using (user_id = auth.uid());
create policy "candidate profiles owner insert" on public.candidate_profiles
for insert to authenticated with check (user_id = auth.uid());
create policy "candidate profiles owner update" on public.candidate_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recruiter profiles owner select" on public.recruiter_profiles
for select to authenticated using (user_id = auth.uid());
create policy "recruiter profiles owner insert" on public.recruiter_profiles
for insert to authenticated with check (user_id = auth.uid());
create policy "recruiter profiles owner update" on public.recruiter_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "interview sessions owner select" on public.interview_sessions
for select to authenticated using (user_id = auth.uid());
create policy "interview sessions owner insert" on public.interview_sessions
for insert to authenticated with check (user_id = auth.uid());
create policy "interview sessions owner update" on public.interview_sessions
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "interview risk signals owner select" on public.interview_risk_signals
for select to authenticated using (user_id = auth.uid());
create policy "interview risk signals owner insert" on public.interview_risk_signals
for insert to authenticated with check (user_id = auth.uid());
create policy "interview risk signals owner update" on public.interview_risk_signals
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "liveness checks owner select" on public.liveness_checks
for select to authenticated using (user_id = auth.uid());
create policy "liveness checks owner insert" on public.liveness_checks
for insert to authenticated with check (user_id = auth.uid());
create policy "liveness checks owner update" on public.liveness_checks
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "trust scores owner select" on public.trust_scores
for select to authenticated using (user_id = auth.uid());
create policy "trust scores owner insert" on public.trust_scores
for insert to authenticated with check (user_id = auth.uid());
create policy "trust scores owner update" on public.trust_scores
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "verification events owner select" on public.verification_events
for select to authenticated using (user_id = auth.uid());
create policy "verification events owner insert" on public.verification_events
for insert to authenticated with check (user_id = auth.uid());
create policy "verification events owner update" on public.verification_events
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admin reviews owner select" on public.admin_reviews
for select to authenticated using (user_id = auth.uid());
create policy "admin reviews owner insert" on public.admin_reviews
for insert to authenticated with check (user_id = auth.uid());
create policy "admin reviews owner update" on public.admin_reviews
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
