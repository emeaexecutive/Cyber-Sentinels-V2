-- Private beta schema compatibility patch.
-- Safe to rerun: every column/table addition uses IF NOT EXISTS.

create extension if not exists pgcrypto;

alter table trust_reports add column if not exists media_type text default 'image';
alter table trust_reports add column if not exists human_presence_index int default 50;
alter table trust_reports add column if not exists biometric_confidence int default 70;
alter table trust_reports add column if not exists behavioural_consistency int default 70;
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
alter table trust_reports add column if not exists trust_timeline_score int default 50;
alter table trust_reports add column if not exists review_status text default 'pending';
alter table trust_reports add column if not exists report_type text default 'hiring_shield';
alter table trust_reports add column if not exists linkedin_url text;
alter table trust_reports add column if not exists linkedin_verification_status text default 'unverified';
alter table trust_reports add column if not exists linkedin_profile_consistency int;
alter table trust_reports add column if not exists linkedin_claimed_company text;
alter table trust_reports add column if not exists linkedin_claimed_role text;
alter table trust_reports add column if not exists linkedin_review_required boolean default false;
alter table trust_reports add column if not exists source_ip_hash text;
alter table trust_reports add column if not exists user_agent_hash text;
alter table trust_reports add column if not exists abuse_risk text default 'low';
alter table trust_reports add column if not exists suspicious_activity boolean default false;
alter table trust_reports add column if not exists scan_status text default 'pending';
alter table trust_reports add column if not exists allowed_file_type text default 'unverified';
alter table trust_reports add column if not exists rate_limit_status text default 'allowed';
alter table trust_reports add column if not exists owner_email text;
alter table trust_reports add column if not exists team_id text;
alter table trust_reports add column if not exists client_id text;

alter table passports add column if not exists owner_email text;
alter table passports add column if not exists team_id text;
alter table passports add column if not exists client_id text;
alter table passports add column if not exists media_type text default 'image';
alter table passports add column if not exists human_presence_index int default 50;
alter table passports add column if not exists origin_trace_score int default 50;
alter table passports add column if not exists review_status text default 'pending';

alter table audit_logs add column if not exists owner_email text;
alter table audit_logs add column if not exists team_id text;
alter table audit_logs add column if not exists client_id text;
alter table audit_logs add column if not exists source_ip_hash text;
alter table audit_logs add column if not exists user_agent_hash text;
alter table audit_logs add column if not exists abuse_risk text default 'low';
alter table audit_logs add column if not exists suspicious_activity boolean default false;
alter table audit_logs add column if not exists scan_status text default 'pending';
alter table audit_logs add column if not exists allowed_file_type text default 'unverified';
alter table audit_logs add column if not exists rate_limit_status text default 'allowed';

alter table signals add column if not exists owner_email text;
alter table signals add column if not exists team_id text;
alter table signals add column if not exists client_id text;

alter table verification_cases add column if not exists owner_email text;
alter table verification_cases add column if not exists team_id text;
alter table verification_cases add column if not exists client_id text;
alter table verification_cases add column if not exists passport_id uuid references passports(id) on delete set null;
alter table verification_cases add column if not exists subject_type text default 'human';
alter table verification_cases add column if not exists subject_name text;
alter table verification_cases add column if not exists status text default 'pending';
alter table verification_cases add column if not exists verification_status text default 'pending';
alter table verification_cases add column if not exists decision_type text;
alter table verification_cases add column if not exists human_presence_index int;
alter table verification_cases add column if not exists origin_trace_score int;
alter table verification_cases add column if not exists trust_score int;

alter table evidence_files add column if not exists owner_email text;
alter table evidence_files add column if not exists team_id text;
alter table evidence_files add column if not exists client_id text;
alter table evidence_files add column if not exists verification_case_id uuid references verification_cases(id) on delete cascade;
alter table evidence_files add column if not exists file_name text;
alter table evidence_files add column if not exists file_url text;
alter table evidence_files add column if not exists media_type text;
alter table evidence_files add column if not exists scan_status text default 'pending';

alter table decisions add column if not exists owner_email text;
alter table decisions add column if not exists team_id text;
alter table decisions add column if not exists client_id text;
alter table decisions add column if not exists verification_case_id uuid references verification_cases(id) on delete cascade;
alter table decisions add column if not exists actor text;
alter table decisions add column if not exists notes text;

alter table risk_scores add column if not exists team_id text;
alter table risk_scores add column if not exists verification_case_id uuid references verification_cases(id) on delete cascade;
alter table risk_scores add column if not exists score int;
alter table risk_scores add column if not exists risk_level text default 'unclassified';

create table if not exists teams (
  id text primary key default gen_random_uuid()::text,
  name text default 'Private Beta Team',
  owner_email text,
  team_clearance_tier text default 'private_beta',
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  member_email text not null,
  role text default 'reviewer',
  invitation_status text default 'active',
  created_at timestamptz default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  key_name text default 'Private beta key',
  key_prefix text,
  key_hash text,
  owner_email text,
  team_id text,
  usage_count int default 0,
  revoked boolean default false,
  created_at timestamptz default now()
);
