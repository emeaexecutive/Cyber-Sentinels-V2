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
  media_type text default 'profile' check (media_type in ('image','video','audio','document','profile','agent')),
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
  trust_score int default 50 check (trust_score >= 0 and trust_score <= 100),
  clearance text default 'pending',
  verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists trust_reports (
  id uuid primary key default gen_random_uuid(),
  candidate_name text,
  media_type text default 'profile' check (media_type in ('image','video','audio','document','profile','agent')),
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
