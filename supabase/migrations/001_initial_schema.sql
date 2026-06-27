create extension if not exists pgcrypto;

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company text,
  role text,
  use_case text,
  abuse_risk text default 'low',
  suspicious_activity boolean default false,
  source_ip_hash text,
  user_agent_hash text,
  scan_status text default 'pending',
  allowed_file_type text default 'unverified',
  rate_limit_status text default 'allowed',
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
  abuse_risk text default 'low',
  suspicious_activity boolean default false,
  source_ip_hash text,
  user_agent_hash text,
  scan_status text default 'pending',
  allowed_file_type text default 'unverified',
  rate_limit_status text default 'allowed',
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor text,
  metadata jsonb default '{}'::jsonb,
  abuse_risk text default 'low',
  suspicious_activity boolean default false,
  source_ip_hash text,
  user_agent_hash text,
  scan_status text default 'pending',
  allowed_file_type text default 'unverified',
  rate_limit_status text default 'allowed',
  created_at timestamptz default now()
);

create table if not exists passports (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  subject_type text not null check (subject_type in ('human','agent','candidate','content')),
  subject_name text not null,
  media_type text default 'image' check (media_type in ('image','video','audio','document')),
  human_presence_index int default 50 check (human_presence_index >= 0 and human_presence_index <= 100),
  biometric_confidence int default 70 check (biometric_confidence >= 0 and biometric_confidence <= 100),
  behavioural_consistency int default 70 check (behavioural_consistency >= 0 and behavioural_consistency <= 100),
  trust_timeline_score int default 50 check (trust_timeline_score >= 0 and trust_timeline_score <= 100),
  synthetic_risk int default 20 check (synthetic_risk >= 0 and synthetic_risk <= 100),
  liveness_score int default 75 check (liveness_score >= 0 and liveness_score <= 100),
  voice_clone_risk int default 10 check (voice_clone_risk >= 0 and voice_clone_risk <= 100),
  video_deepfake_risk int default 15 check (video_deepfake_risk >= 0 and video_deepfake_risk <= 100),
  image_authenticity_score int default 80 check (image_authenticity_score >= 0 and image_authenticity_score <= 100),
  origin_trace_score int default 50 check (origin_trace_score >= 0 and origin_trace_score <= 100),
  attribution_confidence int default 30 check (attribution_confidence >= 0 and attribution_confidence <= 100),
  likely_source_type text default 'unknown',
  model_fingerprint_risk int default 20 check (model_fingerprint_risk >= 0 and model_fingerprint_risk <= 100),
  metadata_integrity text default 'unknown',
  watermark_status text default 'unknown',
  c2pa_status text default 'unknown',
  upload_chain_status text default 'unknown',
  human_review_required boolean default false,
  provenance_status text default 'unverified',
  review_status text default 'pending',
  verification_status text default 'pending',
  reality_passport_status text default 'pending',
  linkedin_url text,
  linkedin_verification_status text default 'unverified',
  linkedin_profile_consistency int,
  linkedin_claimed_company text,
  linkedin_claimed_role text,
  linkedin_review_required boolean default false,
  trust_score int default 50 check (trust_score >= 0 and trust_score <= 100),
  clearance text default 'pending',
  verified boolean default false,
  abuse_risk text default 'low',
  suspicious_activity boolean default false,
  source_ip_hash text,
  user_agent_hash text,
  scan_status text default 'pending',
  allowed_file_type text default 'unverified',
  rate_limit_status text default 'allowed',
  created_at timestamptz default now()
);

create table if not exists trust_reports (
  id uuid primary key default gen_random_uuid(),
  candidate_name text,
  media_type text default 'image' check (media_type in ('image','video','audio','document')),
  human_presence_index int default 50 check (human_presence_index >= 0 and human_presence_index <= 100),
  biometric_confidence int default 70 check (biometric_confidence >= 0 and biometric_confidence <= 100),
  behavioural_consistency int default 70 check (behavioural_consistency >= 0 and behavioural_consistency <= 100),
  trust_timeline_score int default 50 check (trust_timeline_score >= 0 and trust_timeline_score <= 100),
  profile_consistency int not null check (profile_consistency >= 0 and profile_consistency <= 100),
  synthetic_risk int not null check (synthetic_risk >= 0 and synthetic_risk <= 100),
  liveness_score int default 75 check (liveness_score >= 0 and liveness_score <= 100),
  voice_clone_risk int default 10 check (voice_clone_risk >= 0 and voice_clone_risk <= 100),
  video_deepfake_risk int default 15 check (video_deepfake_risk >= 0 and video_deepfake_risk <= 100),
  image_authenticity_score int default 80 check (image_authenticity_score >= 0 and image_authenticity_score <= 100),
  origin_trace_score int default 50 check (origin_trace_score >= 0 and origin_trace_score <= 100),
  attribution_confidence int default 30 check (attribution_confidence >= 0 and attribution_confidence <= 100),
  likely_source_type text default 'unknown',
  model_fingerprint_risk int default 20 check (model_fingerprint_risk >= 0 and model_fingerprint_risk <= 100),
  metadata_integrity text default 'unknown',
  watermark_status text default 'unknown',
  c2pa_status text default 'unknown',
  upload_chain_status text default 'unknown',
  human_review_required boolean default false,
  provenance_status text default 'unverified',
  review_status text default 'pending',
  linkedin_url text,
  linkedin_verification_status text default 'unverified',
  linkedin_profile_consistency int,
  linkedin_claimed_company text,
  linkedin_claimed_role text,
  linkedin_review_required boolean default false,
  confidence int not null check (confidence >= 0 and confidence <= 100),
  trust_score int not null check (trust_score >= 0 and trust_score <= 100),
  report_type text default 'hiring_shield',
  abuse_risk text default 'low',
  suspicious_activity boolean default false,
  source_ip_hash text,
  user_agent_hash text,
  scan_status text default 'pending',
  allowed_file_type text default 'unverified',
  rate_limit_status text default 'allowed',
  created_at timestamptz default now()
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  created_at timestamptz default now()
);

create table if not exists verification_cases (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid references passports(id) on delete set null,
  subject_type text default 'human',
  subject_name text,
  status text default 'pending' check (status in ('pending','in_review','verified','rejected','escalated')),
  verification_status text default 'pending' check (verification_status in ('pending','in_review','verified','rejected','escalated')),
  decision_type text check (decision_type in ('allow','deny','manual_review','needs_more_evidence')),
  human_presence_index int,
  origin_trace_score int,
  trust_score int,
  linkedin_url text,
  linkedin_verification_status text default 'unverified',
  linkedin_profile_consistency int,
  linkedin_claimed_company text,
  linkedin_claimed_role text,
  linkedin_review_required boolean default false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  verification_case_id uuid references verification_cases(id) on delete cascade,
  file_name text,
  file_url text,
  media_type text,
  scan_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  verification_case_id uuid references verification_cases(id) on delete cascade,
  decision text not null check (decision in ('allow','deny','manual_review','needs_more_evidence')),
  status text not null check (status in ('pending','in_review','verified','rejected','escalated')),
  notes text,
  actor text,
  created_at timestamptz default now()
);

create table if not exists risk_scores (
  id uuid primary key default gen_random_uuid(),
  verification_case_id uuid references verification_cases(id) on delete cascade,
  score int check (score >= 0 and score <= 100),
  risk_level text default 'unclassified',
  created_at timestamptz default now()
);

alter table passports add column if not exists media_type text default 'profile';
alter table passports add column if not exists human_presence_index int default 50;
alter table passports add column if not exists biometric_confidence int default 70;
alter table passports add column if not exists behavioural_consistency int default 70;
alter table passports add column if not exists trust_timeline_score int default 50;
alter table passports add column if not exists synthetic_risk int default 20;
alter table passports add column if not exists liveness_score int default 75;
alter table passports add column if not exists voice_clone_risk int default 10;
alter table passports add column if not exists video_deepfake_risk int default 15;
alter table passports add column if not exists image_authenticity_score int default 80;
alter table passports add column if not exists origin_trace_score int default 50;
alter table passports add column if not exists attribution_confidence int default 30;
alter table passports add column if not exists likely_source_type text default 'unknown';
alter table passports add column if not exists model_fingerprint_risk int default 20;
alter table passports add column if not exists metadata_integrity text default 'unknown';
alter table passports add column if not exists watermark_status text default 'unknown';
alter table passports add column if not exists c2pa_status text default 'unknown';
alter table passports add column if not exists upload_chain_status text default 'unknown';
alter table passports add column if not exists human_review_required boolean default false;
alter table passports add column if not exists provenance_status text default 'unverified';
alter table passports add column if not exists review_status text default 'pending';
alter table passports add column if not exists verification_status text default 'pending';
alter table passports add column if not exists reality_passport_status text default 'pending';
alter table passports add column if not exists linkedin_url text;
alter table passports add column if not exists linkedin_verification_status text default 'unverified';
alter table passports add column if not exists linkedin_profile_consistency int;
alter table passports add column if not exists linkedin_claimed_company text;
alter table passports add column if not exists linkedin_claimed_role text;
alter table passports add column if not exists linkedin_review_required boolean default false;
alter table passports add column if not exists abuse_risk text default 'low';
alter table passports add column if not exists suspicious_activity boolean default false;
alter table passports add column if not exists source_ip_hash text;
alter table passports add column if not exists user_agent_hash text;
alter table passports add column if not exists scan_status text default 'pending';
alter table passports add column if not exists allowed_file_type text default 'unverified';
alter table passports add column if not exists rate_limit_status text default 'allowed';

alter table trust_reports add column if not exists candidate_name text;
alter table trust_reports add column if not exists media_type text default 'profile';
alter table trust_reports add column if not exists human_presence_index int default 50;
alter table trust_reports add column if not exists biometric_confidence int default 70;
alter table trust_reports add column if not exists behavioural_consistency int default 70;
alter table trust_reports add column if not exists trust_timeline_score int default 50;
alter table trust_reports add column if not exists liveness_score int default 75;
alter table trust_reports add column if not exists voice_clone_risk int default 10;
alter table trust_reports add column if not exists video_deepfake_risk int default 15;
alter table trust_reports add column if not exists image_authenticity_score int default 80;
alter table trust_reports add column if not exists origin_trace_score int default 50;
alter table trust_reports add column if not exists attribution_confidence int default 30;
alter table trust_reports add column if not exists likely_source_type text default 'unknown';
alter table trust_reports add column if not exists model_fingerprint_risk int default 20;
alter table trust_reports add column if not exists metadata_integrity text default 'unknown';
alter table trust_reports add column if not exists watermark_status text default 'unknown';
alter table trust_reports add column if not exists c2pa_status text default 'unknown';
alter table trust_reports add column if not exists upload_chain_status text default 'unknown';
alter table trust_reports add column if not exists human_review_required boolean default false;
alter table trust_reports add column if not exists provenance_status text default 'unverified';
alter table trust_reports add column if not exists review_status text default 'pending';
alter table trust_reports add column if not exists linkedin_url text;
alter table trust_reports add column if not exists linkedin_verification_status text default 'unverified';
alter table trust_reports add column if not exists linkedin_profile_consistency int;
alter table trust_reports add column if not exists linkedin_claimed_company text;
alter table trust_reports add column if not exists linkedin_claimed_role text;
alter table trust_reports add column if not exists linkedin_review_required boolean default false;
alter table trust_reports add column if not exists abuse_risk text default 'low';
alter table trust_reports add column if not exists suspicious_activity boolean default false;
alter table trust_reports add column if not exists source_ip_hash text;
alter table trust_reports add column if not exists user_agent_hash text;
alter table trust_reports add column if not exists scan_status text default 'pending';
alter table trust_reports add column if not exists allowed_file_type text default 'unverified';
alter table trust_reports add column if not exists rate_limit_status text default 'allowed';

alter table waitlist add column if not exists abuse_risk text default 'low';
alter table waitlist add column if not exists suspicious_activity boolean default false;
alter table waitlist add column if not exists source_ip_hash text;
alter table waitlist add column if not exists user_agent_hash text;
alter table waitlist add column if not exists scan_status text default 'pending';
alter table waitlist add column if not exists allowed_file_type text default 'unverified';
alter table waitlist add column if not exists rate_limit_status text default 'allowed';

alter table audit_logs add column if not exists abuse_risk text default 'low';
alter table audit_logs add column if not exists suspicious_activity boolean default false;
alter table audit_logs add column if not exists source_ip_hash text;
alter table audit_logs add column if not exists user_agent_hash text;
alter table audit_logs add column if not exists scan_status text default 'pending';
alter table audit_logs add column if not exists allowed_file_type text default 'unverified';
alter table audit_logs add column if not exists rate_limit_status text default 'allowed';

alter table verification_cases add column if not exists passport_id uuid references passports(id) on delete set null;
alter table verification_cases add column if not exists verification_status text default 'pending';
alter table verification_cases add column if not exists decision_type text;
alter table verification_cases add column if not exists human_presence_index int;
alter table verification_cases add column if not exists origin_trace_score int;
alter table verification_cases add column if not exists trust_score int;
alter table verification_cases add column if not exists linkedin_url text;
alter table verification_cases add column if not exists linkedin_verification_status text default 'unverified';
alter table verification_cases add column if not exists linkedin_profile_consistency int;
alter table verification_cases add column if not exists linkedin_claimed_company text;
alter table verification_cases add column if not exists linkedin_claimed_role text;
alter table verification_cases add column if not exists linkedin_review_required boolean default false;

alter table verification_cases drop constraint if exists verification_cases_status_check;
alter table verification_cases drop constraint if exists verification_cases_verification_status_check;
alter table verification_cases drop constraint if exists verification_cases_decision_type_check;
update verification_cases set status = 'in_review' where status = 'reviewing';
update verification_cases
  set verification_status = 'in_review'
  where verification_status = 'reviewing';
alter table verification_cases add constraint verification_cases_status_check
  check (status in ('pending','in_review','verified','rejected','escalated'));
alter table verification_cases add constraint verification_cases_verification_status_check
  check (verification_status in ('pending','in_review','verified','rejected','escalated'));
alter table verification_cases add constraint verification_cases_decision_type_check
  check (decision_type is null or decision_type in ('allow','deny','manual_review','needs_more_evidence'));

alter table decisions drop constraint if exists decisions_status_check;
update decisions set status = 'in_review' where status = 'reviewing';
alter table decisions add constraint decisions_status_check
  check (status in ('pending','in_review','verified','rejected','escalated'));

alter table waitlist enable row level security;
alter table verification_passports enable row level security;
alter table audit_logs enable row level security;
alter table passports enable row level security;
alter table trust_reports enable row level security;
alter table signals enable row level security;
alter table verification_cases enable row level security;
alter table evidence_files enable row level security;
alter table decisions enable row level security;
alter table risk_scores enable row level security;

drop policy if exists "Allow public waitlist inserts" on waitlist;
drop policy if exists "Allow authenticated waitlist reads" on waitlist;
drop policy if exists "Allow public audit inserts" on audit_logs;
drop policy if exists "Allow authenticated audit reads" on audit_logs;
drop policy if exists "Allow authenticated passport reads" on passports;
drop policy if exists "Allow authenticated passport inserts" on passports;
drop policy if exists "Allow authenticated passport updates" on passports;
drop policy if exists "Allow authenticated trust report reads" on trust_reports;
drop policy if exists "Allow authenticated trust report inserts" on trust_reports;
drop policy if exists "Allow authenticated signal reads" on signals;
drop policy if exists "Allow authenticated signal inserts" on signals;
drop policy if exists "Allow authenticated verification case reads" on verification_cases;
drop policy if exists "Allow authenticated verification case inserts" on verification_cases;
drop policy if exists "Allow authenticated verification case updates" on verification_cases;
drop policy if exists "Allow authenticated evidence reads" on evidence_files;
drop policy if exists "Allow authenticated decision reads" on decisions;
drop policy if exists "Allow authenticated decision inserts" on decisions;
drop policy if exists "Allow authenticated risk score reads" on risk_scores;

create policy "Allow public waitlist inserts" on waitlist
  for insert
  to anon
  with check (true);

create policy "Allow authenticated waitlist reads" on waitlist
  for select
  to authenticated
  using (true);

create policy "Allow public audit inserts" on audit_logs
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow authenticated audit reads" on audit_logs
  for select
  to authenticated
  using (true);

-- Security: audit_logs are append-only. Application code and RLS policies only
-- insert or read audit events; there are intentionally no update/delete
-- policies for this table.
revoke update, delete on audit_logs from anon, authenticated;

create policy "Allow authenticated passport reads" on passports
  for select
  to authenticated
  using (true);

create policy "Allow authenticated passport inserts" on passports
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated passport updates" on passports
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated trust report reads" on trust_reports
  for select
  to authenticated
  using (true);

create policy "Allow authenticated trust report inserts" on trust_reports
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated signal reads" on signals
  for select
  to authenticated
  using (true);

create policy "Allow authenticated signal inserts" on signals
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated verification case reads" on verification_cases
  for select
  to authenticated
  using (true);

create policy "Allow authenticated verification case inserts" on verification_cases
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated verification case updates" on verification_cases
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated evidence reads" on evidence_files
  for select
  to authenticated
  using (true);

create policy "Allow authenticated decision reads" on decisions
  for select
  to authenticated
  using (true);

create policy "Allow authenticated decision inserts" on decisions
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated risk score reads" on risk_scores
  for select
  to authenticated
  using (true);
