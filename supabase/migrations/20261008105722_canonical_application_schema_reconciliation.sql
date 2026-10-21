-- One atomic canonical reconciliation, following the approval and ingestion repairs.
-- Existing data is preserved; incompatible historical data aborts the transaction.
begin;

-- Preserve both historical column sets on shared application tables.
-- No row deletion, invented identity, score backfill, or default-value rewrite.
-- Missing required columns without defaults are added only if the table is empty;
-- PostgreSQL aborts atomically if a future dataset violates that prerequisite.

alter table public."agent_activity" add column if not exists "activity_summary" text;

alter table public."agent_activity" add column if not exists "actor_email" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='agent_activity' and column_name='occurred_at') and exists(select 1 from public."agent_activity") then raise exception 'Required column agent_activity.occurred_at needs an explicit historical-data mapping'; end if; end $$;

alter table public."agent_activity" add column if not exists "occurred_at" timestamp with time zone default now() not null;

alter table public."agent_activity" add column if not exists "provenance_ref" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='agent_activity' and column_name='review_status') and exists(select 1 from public."agent_activity") then raise exception 'Required column agent_activity.review_status needs an explicit historical-data mapping'; end if; end $$;

alter table public."agent_activity" add column if not exists "review_status" text default 'recorded'::text not null;

alter table public."agent_activity" add column if not exists "signed_action_ref" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_agents' and column_name='agent_name') and exists(select 1 from public."ai_agents") then raise exception 'Required column ai_agents.agent_name needs an explicit historical-data mapping'; end if; end $$;

alter table public."ai_agents" add column if not exists "agent_name" text not null;

alter table public."ai_agents" add column if not exists "declared_purpose" text;

alter table public."ai_agents" add column if not exists "governance_workflow_ref" text;

alter table public."ai_agents" add column if not exists "last_seen_at" timestamp with time zone;

alter table public."ai_agents" add column if not exists "name" text;

alter table public."ai_agents" add column if not exists "operational_scope" text;

alter table public."ai_agents" add column if not exists "organization_name" text;

alter table public."ai_agents" add column if not exists "provenance_notes" text;

alter table public."ai_agents" add column if not exists "provider" text;

alter table public."ai_agents" add column if not exists "risk_level" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."ai_agents" alter column "risk_level" set default 'unknown'::text;

alter table public."ai_agents" add column if not exists "signing_key_id" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_agents' and column_name='updated_at') and exists(select 1 from public."ai_agents") then raise exception 'Required column ai_agents.updated_at needs an explicit historical-data mapping'; end if; end $$;

alter table public."ai_agents" add column if not exists "updated_at" timestamp with time zone default now() not null;

alter table public."api_keys" add column if not exists "key_name" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."api_keys" alter column "key_name" set default 'Private beta key'::text;

alter table public."api_keys" add column if not exists "owner_email" text;

alter table public."api_keys" add column if not exists "revoked" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."api_keys" alter column "revoked" set default false;

alter table public."api_keys" add column if not exists "team_id" text;

alter table public."autonomy_profiles" add column if not exists "governance_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."autonomy_profiles" alter column "governance_status" set default 'active'::text;

alter table public."autonomy_profiles" add column if not exists "status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."autonomy_profiles" alter column "status" set default 'active'::text;

alter table public."billing_customers" add column if not exists "email" text;

alter table public."billing_customers" add column if not exists "user_email" text;

alter table public."candidate_profiles" add column if not exists "company_name" text;

alter table public."candidate_profiles" add column if not exists "enterprise_id" uuid;

alter table public."candidate_profiles" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."candidate_profiles" alter column "metadata" set default '{}'::jsonb;

alter table public."candidate_profiles" add column if not exists "notes" text;

alter table public."candidate_profiles" add column if not exists "status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."candidate_profiles" alter column "status" set default 'pending'::text;

alter table public."candidate_profiles" add column if not exists "trust_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."candidate_profiles" alter column "trust_score" set default 0;

alter table public."candidate_profiles" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."candidate_profiles" alter column "updated_at" set default now();

alter table public."candidate_profiles" add column if not exists "verification_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."candidate_profiles" alter column "verification_status" set default 'pending'::text;

alter table public."decisions" add column if not exists "decided_by" text;

alter table public."decisions" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."decisions" alter column "updated_at" set default now();

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='device_channel_evidence' and column_name='evidence_source') and exists(select 1 from public."device_channel_evidence") then raise exception 'Required column device_channel_evidence.evidence_source needs an explicit historical-data mapping'; end if; end $$;

alter table public."device_channel_evidence" add column if not exists "evidence_source" text default 'operator_input'::text not null;

alter table public."device_channel_evidence" add column if not exists "evidence_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."device_channel_evidence" alter column "evidence_status" set default 'unknown'::text;

alter table public."device_channel_evidence" add column if not exists "evidence_type" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='device_channel_evidence' and column_name='integrity_state') and exists(select 1 from public."device_channel_evidence") then raise exception 'Required column device_channel_evidence.integrity_state needs an explicit historical-data mapping'; end if; end $$;

alter table public."device_channel_evidence" add column if not exists "integrity_state" text default 'pending'::text not null;

alter table public."enterprise_access_requests" add column if not exists "beta_interest" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."enterprise_access_requests" alter column "beta_interest" set default true;

alter table public."enterprise_access_requests" add column if not exists "plan_interest" text;

alter table public."enterprise_access_requests" add column if not exists "request_type" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."enterprise_access_requests" alter column "request_type" set default 'enterprise_access'::text;

alter table public."evidence_files" add column if not exists "allowed_file_type" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."evidence_files" alter column "allowed_file_type" set default true;

alter table public."evidence_files" add column if not exists "case_id" uuid;

alter table public."evidence_files" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."evidence_files" alter column "updated_at" set default now();

alter table public."hopae_verifications" add column if not exists "cyber_passport_id" uuid;

alter table public."hopae_verifications" add column if not exists "match_result" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."hopae_verifications" alter column "match_result" set default '{}'::jsonb;

alter table public."hopae_verifications" add column if not exists "normalized_user" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."hopae_verifications" alter column "normalized_user" set default '{}'::jsonb;

alter table public."hopae_verifications" add column if not exists "raw_status" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."hopae_verifications" alter column "raw_status" set default '{}'::jsonb;

alter table public."hopae_verifications" add column if not exists "raw_userinfo" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."hopae_verifications" alter column "raw_userinfo" set default '{}'::jsonb;

alter table public."hopae_verifications" add column if not exists "user_id" uuid;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='hopae_webhook_events' and column_name='payload') and exists(select 1 from public."hopae_webhook_events") then raise exception 'Required column hopae_webhook_events.payload needs an explicit historical-data mapping'; end if; end $$;

alter table public."hopae_webhook_events" add column if not exists "payload" jsonb default '{}'::jsonb not null;

alter table public."hopae_webhook_events" add column if not exists "signature_valid" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."hopae_webhook_events" alter column "signature_valid" set default false;

alter table public."injection_risk_events" add column if not exists "risk_score" integer;

alter table public."injection_risk_events" add column if not exists "risk_type" text;

alter table public."intent_requests" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."intent_requests" alter column "updated_at" set default now();

alter table public."interest_signals" add column if not exists "admin_notes" text;

alter table public."interest_signals" add column if not exists "status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."interest_signals" alter column "status" set default 'new'::text;

alter table public."interest_signals" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."interest_signals" alter column "updated_at" set default now();

alter table public."interview_sessions" add column if not exists "candidate_profile_id" uuid;

alter table public."interview_sessions" add column if not exists "ended_at" timestamp with time zone;

alter table public."interview_sessions" add column if not exists "enterprise_id" uuid;

alter table public."interview_sessions" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."interview_sessions" alter column "metadata" set default '{}'::jsonb;

alter table public."interview_sessions" add column if not exists "recruiter_id" uuid;

alter table public."interview_sessions" add column if not exists "recruiter_profile_id" uuid;

alter table public."interview_sessions" add column if not exists "scheduled_at" timestamp with time zone;

alter table public."interview_sessions" add column if not exists "session_type" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."interview_sessions" alter column "session_type" set default 'remote'::text;

alter table public."interview_sessions" add column if not exists "started_at" timestamp with time zone;

alter table public."interview_sessions" add column if not exists "title" text;

alter table public."interview_sessions" add column if not exists "trust_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."interview_sessions" alter column "trust_score" set default 0;

alter table public."interview_sessions" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."interview_sessions" alter column "updated_at" set default now();

alter table public."liveness_checks" add column if not exists "enterprise_id" uuid;

alter table public."liveness_checks" add column if not exists "interview_session_id" uuid;

alter table public."liveness_checks" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."liveness_checks" alter column "metadata" set default '{}'::jsonb;

alter table public."liveness_checks" add column if not exists "notes" text;

alter table public."liveness_checks" add column if not exists "result" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."liveness_checks" alter column "result" set default 'pending'::text;

alter table public."liveness_checks" add column if not exists "risk_level" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."liveness_checks" alter column "risk_level" set default 'pending'::text;

alter table public."liveness_checks" add column if not exists "score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."liveness_checks" alter column "score" set default 0;

alter table public."liveness_checks" add column if not exists "session_id" uuid;

alter table public."liveness_checks" add column if not exists "status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."liveness_checks" alter column "status" set default 'pending'::text;

alter table public."liveness_checks" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."liveness_checks" alter column "updated_at" set default now();

alter table public."passports" add column if not exists "chain_of_custody_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."passports" alter column "chain_of_custody_status" set default 'unknown'::text;

alter table public."passports" add column if not exists "evidence_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."passports" alter column "evidence_status" set default 'pending'::text;

alter table public."passports" add column if not exists "risk_level" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."passports" alter column "risk_level" set default 'medium'::text;

alter table public."passports" add column if not exists "tamper_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."passports" alter column "tamper_status" set default 'unknown'::text;

alter table public."provenance_events" add column if not exists "event_detail" text;

alter table public."provenance_events" add column if not exists "report_id" uuid;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='recruiter_profiles' and column_name='email') and exists(select 1 from public."recruiter_profiles") then raise exception 'Required column recruiter_profiles.email needs an explicit historical-data mapping'; end if; end $$;

alter table public."recruiter_profiles" add column if not exists "email" text not null;

alter table public."recruiter_profiles" add column if not exists "enterprise_id" uuid;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='recruiter_profiles' and column_name='full_name') and exists(select 1 from public."recruiter_profiles") then raise exception 'Required column recruiter_profiles.full_name needs an explicit historical-data mapping'; end if; end $$;

alter table public."recruiter_profiles" add column if not exists "full_name" text not null;

alter table public."recruiter_profiles" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."recruiter_profiles" alter column "metadata" set default '{}'::jsonb;

alter table public."recruiter_profiles" add column if not exists "notes" text;

alter table public."recruiter_profiles" add column if not exists "role_title" text;

alter table public."recruiter_profiles" add column if not exists "trust_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."recruiter_profiles" alter column "trust_score" set default 0;

alter table public."recruiter_profiles" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."recruiter_profiles" alter column "updated_at" set default now();

alter table public."recruiter_profiles" add column if not exists "verification_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."recruiter_profiles" alter column "verification_status" set default 'pending'::text;

alter table public."recruiter_profiles" add column if not exists "verified" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."recruiter_profiles" alter column "verified" set default false;

alter table public."risk_scores" add column if not exists "attribution_confidence" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "attribution_confidence" set default 50;

alter table public."risk_scores" add column if not exists "human_presence_index" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "human_presence_index" set default 50;

alter table public."risk_scores" add column if not exists "image_authenticity_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "image_authenticity_score" set default 50;

alter table public."risk_scores" add column if not exists "liveness_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "liveness_score" set default 50;

alter table public."risk_scores" add column if not exists "origin_trace_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "origin_trace_score" set default 50;

alter table public."risk_scores" add column if not exists "provenance_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "provenance_status" set default 'unknown'::text;

alter table public."risk_scores" add column if not exists "review_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "review_status" set default 'pending'::text;

alter table public."risk_scores" add column if not exists "synthetic_risk" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "synthetic_risk" set default 50;

alter table public."risk_scores" add column if not exists "video_deepfake_risk" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "video_deepfake_risk" set default 50;

alter table public."risk_scores" add column if not exists "voice_clone_risk" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."risk_scores" alter column "voice_clone_risk" set default 50;

alter table public."runtime_validation_logs" add column if not exists "health_score" integer;

alter table public."runtime_validation_logs" add column if not exists "overall_status" text;

alter table public."session_integrity_checks" add column if not exists "channel_integrity_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."session_integrity_checks" alter column "channel_integrity_status" set default 'unknown'::text;

alter table public."session_integrity_checks" add column if not exists "deepfake_risk_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."session_integrity_checks" alter column "deepfake_risk_status" set default 'unknown'::text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='session_integrity_checks' and column_name='evidence') and exists(select 1 from public."session_integrity_checks") then raise exception 'Required column session_integrity_checks.evidence needs an explicit historical-data mapping'; end if; end $$;

alter table public."session_integrity_checks" add column if not exists "evidence" jsonb default '{}'::jsonb not null;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='session_integrity_checks' and column_name='evidence_source') and exists(select 1 from public."session_integrity_checks") then raise exception 'Required column session_integrity_checks.evidence_source needs an explicit historical-data mapping'; end if; end $$;

alter table public."session_integrity_checks" add column if not exists "evidence_source" text default 'operator_input'::text not null;

alter table public."session_integrity_checks" add column if not exists "explanation" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='session_integrity_checks' and column_name='identity_verification_state') and exists(select 1 from public."session_integrity_checks") then raise exception 'Required column session_integrity_checks.identity_verification_state needs an explicit historical-data mapping'; end if; end $$;

alter table public."session_integrity_checks" add column if not exists "identity_verification_state" text default 'pending'::text not null;

alter table public."session_integrity_checks" add column if not exists "injection_risk_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."session_integrity_checks" alter column "injection_risk_status" set default 'unknown'::text;

alter table public."session_integrity_checks" add column if not exists "liveness_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."session_integrity_checks" alter column "liveness_status" set default 'unknown'::text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='session_integrity_checks' and column_name='manual_review_required') and exists(select 1 from public."session_integrity_checks") then raise exception 'Required column session_integrity_checks.manual_review_required needs an explicit historical-data mapping'; end if; end $$;

alter table public."session_integrity_checks" add column if not exists "manual_review_required" boolean default false not null;

alter table public."session_integrity_checks" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."session_integrity_checks" alter column "metadata" set default '{}'::jsonb;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='session_integrity_checks' and column_name='overall_status') and exists(select 1 from public."session_integrity_checks") then raise exception 'Required column session_integrity_checks.overall_status needs an explicit historical-data mapping'; end if; end $$;

alter table public."session_integrity_checks" add column if not exists "overall_status" text default 'pending'::text not null;

alter table public."session_integrity_checks" add column if not exists "recommended_action" text;

alter table public."session_integrity_checks" add column if not exists "review_summary" text;

alter table public."session_integrity_checks" add column if not exists "session_anomaly_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."session_integrity_checks" alter column "session_anomaly_status" set default 'unknown'::text;

alter table public."session_integrity_checks" add column if not exists "session_id" uuid;

alter table public."session_integrity_checks" add column if not exists "subject_id" uuid;

alter table public."session_integrity_checks" add column if not exists "subject_type" text;

alter table public."subscriptions" add column if not exists "current_period_start" timestamp with time zone;

alter table public."subscriptions" add column if not exists "stripe_price_id" text;

alter table public."subscriptions" add column if not exists "user_email" text;

alter table public."teams" add column if not exists "name" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."teams" alter column "name" set default 'Private Beta Team'::text;

alter table public."teams" add column if not exists "owner_email" text;

alter table public."teams" add column if not exists "team_clearance_tier" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."teams" alter column "team_clearance_tier" set default 'private_beta'::text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='team_name') and exists(select 1 from public."teams") then raise exception 'Required column teams.team_name needs an explicit historical-data mapping'; end if; end $$;

alter table public."teams" add column if not exists "team_name" text not null;

alter table public."teams" add column if not exists "trust_score" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."teams" alter column "trust_score" set default 50;

alter table public."trust_alerts" add column if not exists "description" text;

alter table public."trust_alerts" add column if not exists "title" text;

alter table public."trust_cases" add column if not exists "is_demo" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_cases" alter column "is_demo" set default false;

alter table public."trust_reports" add column if not exists "candidate_name" text;

alter table public."trust_scores" add column if not exists "confidence" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_scores" alter column "confidence" set default 0;

alter table public."trust_scores" add column if not exists "enterprise_id" uuid;

alter table public."trust_scores" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_scores" alter column "metadata" set default '{}'::jsonb;

alter table public."trust_scores" add column if not exists "reasons" text[];

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_scores" alter column "reasons" set default '{}'::text[];

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_scores' and column_name='risk_level') and exists(select 1 from public."trust_scores") then raise exception 'Required column trust_scores.risk_level needs an explicit historical-data mapping'; end if; end $$;

alter table public."trust_scores" add column if not exists "risk_level" text not null;

alter table public."trust_scores" add column if not exists "session_id" uuid;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_scores' and column_name='subject_id') and exists(select 1 from public."trust_scores") then raise exception 'Required column trust_scores.subject_id needs an explicit historical-data mapping'; end if; end $$;

alter table public."trust_scores" add column if not exists "subject_id" uuid not null;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_scores' and column_name='subject_type') and exists(select 1 from public."trust_scores") then raise exception 'Required column trust_scores.subject_type needs an explicit historical-data mapping'; end if; end $$;

alter table public."trust_scores" add column if not exists "subject_type" text not null;

alter table public."trust_scores" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_scores" alter column "updated_at" set default now();

alter table public."trust_signals" add column if not exists "signal_value" text;

alter table public."trust_signals" add column if not exists "trust_score_id" uuid;

alter table public."trust_signals" add column if not exists "weight" integer;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_signals" alter column "weight" set default 1;

alter table public."trust_workspaces" add column if not exists "design_partner" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_workspaces" alter column "design_partner" set default false;

alter table public."trust_workspaces" add column if not exists "is_demo" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_workspaces" alter column "is_demo" set default false;

alter table public."trust_workspaces" add column if not exists "pilot_mode" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."trust_workspaces" alter column "pilot_mode" set default false;

alter table public."usage_limits" add column if not exists "governance_enabled" boolean default false not null;

alter table public."usage_limits" add column if not exists "max_verification_workflows" integer;

alter table public."usage_limits" add column if not exists "trust_intelligence_enabled" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."usage_limits" alter column "trust_intelligence_enabled" set default false;

alter table public."usage_limits" add column if not exists "updated_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."usage_limits" alter column "updated_at" set default now();

alter table public."verification_cases" add column if not exists "abuse_risk" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_cases" alter column "abuse_risk" set default 'unknown'::text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='verification_cases' and column_name='case_type') and exists(select 1 from public."verification_cases") then raise exception 'Required column verification_cases.case_type needs an explicit historical-data mapping'; end if; end $$;

alter table public."verification_cases" add column if not exists "case_type" text default 'trust_review'::text not null;

alter table public."verification_cases" add column if not exists "decision" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_cases" alter column "decision" set default 'manual_review'::text;

alter table public."verification_cases" add column if not exists "rate_limit_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_cases" alter column "rate_limit_status" set default 'unknown'::text;

alter table public."verification_cases" add column if not exists "risk_level" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_cases" alter column "risk_level" set default 'medium'::text;

alter table public."verification_cases" add column if not exists "suspicious_activity" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_cases" alter column "suspicious_activity" set default false;

alter table public."verification_passports" add column if not exists "abuse_risk" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_passports" alter column "abuse_risk" set default 'low'::text;

alter table public."verification_passports" add column if not exists "allowed_file_type" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_passports" alter column "allowed_file_type" set default 'unverified'::text;

alter table public."verification_passports" add column if not exists "rate_limit_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_passports" alter column "rate_limit_status" set default 'allowed'::text;

alter table public."verification_passports" add column if not exists "scan_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_passports" alter column "scan_status" set default 'pending'::text;

alter table public."verification_passports" add column if not exists "source_ip_hash" text;

alter table public."verification_passports" add column if not exists "suspicious_activity" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_passports" alter column "suspicious_activity" set default false;

alter table public."verification_passports" add column if not exists "user_agent_hash" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='verification_signals' and column_name='badge_label') and exists(select 1 from public."verification_signals") then raise exception 'Required column verification_signals.badge_label needs an explicit historical-data mapping'; end if; end $$;

alter table public."verification_signals" add column if not exists "badge_label" text not null;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='verification_signals' and column_name='evidence') and exists(select 1 from public."verification_signals") then raise exception 'Required column verification_signals.evidence needs an explicit historical-data mapping'; end if; end $$;

alter table public."verification_signals" add column if not exists "evidence" jsonb default '{}'::jsonb not null;

alter table public."verification_signals" add column if not exists "metadata" jsonb;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."verification_signals" alter column "metadata" set default '{}'::jsonb;

alter table public."verification_signals" add column if not exists "signal_source" text;

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='verification_signals' and column_name='signal_status') and exists(select 1 from public."verification_signals") then raise exception 'Required column verification_signals.signal_status needs an explicit historical-data mapping'; end if; end $$;

alter table public."verification_signals" add column if not exists "signal_status" text not null;

alter table public."verification_signals" add column if not exists "signal_type" text;

alter table public."verification_signals" add column if not exists "subject_id" uuid;

alter table public."verification_signals" add column if not exists "subject_type" text;

alter table public."waitlist" add column if not exists "abuse_risk" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."waitlist" alter column "abuse_risk" set default 'low'::text;

alter table public."waitlist" add column if not exists "allowed_file_type" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."waitlist" alter column "allowed_file_type" set default 'unverified'::text;

alter table public."waitlist" add column if not exists "created_at" timestamp with time zone;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."waitlist" alter column "created_at" set default now();

do $$ begin if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='waitlist' and column_name='id') and exists(select 1 from public."waitlist") then raise exception 'Required column waitlist.id needs an explicit historical-data mapping'; end if; end $$;

alter table public."waitlist" add column if not exists "id" uuid default gen_random_uuid() not null;

alter table public."waitlist" add column if not exists "rate_limit_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."waitlist" alter column "rate_limit_status" set default 'allowed'::text;

alter table public."waitlist" add column if not exists "scan_status" text;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."waitlist" alter column "scan_status" set default 'pending'::text;

alter table public."waitlist" add column if not exists "source_ip_hash" text;

alter table public."waitlist" add column if not exists "suspicious_activity" boolean;

-- Future inserts only: existing rows retain NULL rather than fabricated history.
alter table public."waitlist" alter column "suspicious_activity" set default false;

alter table public."waitlist" add column if not exists "user_agent_hash" text;

alter table public."agent_activity" alter column "activity_type" set not null;

alter table public."agent_activity" alter column "created_at" set not null;

alter table public."ai_agents" alter column "verification_status" set not null;

alter table public."ai_agents" alter column "created_at" set not null;

alter table public."autonomy_profiles" alter column "subject_name" drop not null;

alter table public."autonomy_profiles" alter column "autonomy_level" drop not null;

alter table public."billing_customers" alter column "user_id" set not null;

alter table public."billing_customers" alter column "stripe_customer_id" set not null;

alter table public."candidate_profiles" alter column "full_name" set not null;

alter table public."candidate_profiles" alter column "email" set not null;

alter table public."candidate_profiles" alter column "risk_level" drop not null;

alter table public."decisions" alter column "decision" set not null;

alter table public."decisions" alter column "status" set not null;

alter table public."device_channel_evidence" alter column "session_integrity_check_id" set not null;

alter table public."device_channel_evidence" alter column "interview_session_id" set not null;

alter table public."device_channel_evidence" alter column "evidence" set not null;

alter table public."device_channel_evidence" alter column "created_at" set not null;

alter table public."enterprise_access_requests" alter column "work_email" set not null;

alter table public."enterprise_access_requests" alter column "design_partner_interest" set not null;

alter table public."enterprise_access_requests" alter column "governance_interest" set not null;

alter table public."enterprise_access_requests" alter column "operational_ai_interest" set not null;

alter table public."hopae_verifications" alter column "owner_user_id" set not null;

alter table public."hopae_verifications" alter column "provider_id" set not null;

alter table public."hopae_verifications" alter column "flow_details" set not null;

alter table public."hopae_verifications" alter column "match_data" set not null;

alter table public."hopae_verifications" alter column "identity_assurance_uplift" set not null;

alter table public."hopae_verifications" alter column "provenance_confidence" set not null;

alter table public."hopae_verifications" alter column "created_at" set not null;

alter table public."hopae_verifications" alter column "updated_at" set not null;

alter table public."injection_risk_events" alter column "session_integrity_check_id" set not null;

alter table public."injection_risk_events" alter column "interview_session_id" set not null;

alter table public."injection_risk_events" alter column "risk_level" set not null;

alter table public."injection_risk_events" alter column "explanation" set not null;

alter table public."injection_risk_events" alter column "evidence" set not null;

alter table public."injection_risk_events" alter column "created_at" set not null;

alter table public."passports" alter column "subject_type" set not null;

alter table public."session_integrity_checks" alter column "interview_session_id" set not null;

alter table public."session_integrity_checks" alter column "user_id" set not null;

alter table public."session_integrity_checks" alter column "created_at" set not null;

alter table public."subscriptions" alter column "user_id" set not null;

alter table public."subscriptions" alter column "plan" set not null;

alter table public."subscriptions" alter column "status" set not null;

alter table public."subscriptions" alter column "cancel_at_period_end" set not null;

alter table public."trust_alerts" alter column "status" set not null;

alter table public."trust_alerts" alter column "subject_type" drop not null;

alter table public."trust_alerts" alter column "risk_level" set not null;

alter table public."trust_alerts" alter column "metadata" set not null;

alter table public."trust_alerts" alter column "created_at" set not null;

alter table public."trust_alerts" alter column "updated_at" set not null;

alter table public."trust_certifications" alter column "status" set not null;

alter table public."trust_certifications" alter column "trust_score" set not null;

alter table public."trust_certifications" alter column "risk_level" set not null;

alter table public."trust_certifications" alter column "subject_type" drop not null;

alter table public."trust_certifications" alter column "created_at" set not null;

alter table public."trust_certifications" alter column "updated_at" set not null;

alter table public."trust_reports" alter column "profile_consistency" set not null;

alter table public."trust_reports" alter column "synthetic_risk" set not null;

alter table public."trust_reports" alter column "confidence" set not null;

alter table public."trust_reports" alter column "trust_score" set not null;

alter table public."usage_limits" alter column "trust_graph_enabled" set not null;

alter table public."usage_limits" alter column "api_access_enabled" set not null;

alter table public."verification_signals" alter column "session_integrity_check_id" set not null;

alter table public."verification_signals" alter column "interview_session_id" set not null;

alter table public."verification_signals" alter column "category" set not null;

alter table public."verification_signals" alter column "risk_level" set not null;

alter table public."verification_signals" alter column "explanation" set not null;

alter table public."verification_signals" alter column "requires_manual_review" set not null;

alter table public."verification_signals" alter column "created_at" set not null;

alter table public.trust_certifications alter column reviewed_by type uuid using reviewed_by::uuid;



-- Preserve Production's historical tables in the canonical schema without
-- opening a retired customer surface. Current application source has no direct
-- consumers of these exact table names. Existing rows and constraints survive.

create table if not exists public."agent_activity_logs" (
  "id" uuid default gen_random_uuid() not null,
  "agent_id" uuid,
  "action" text not null,
  "risk_level" text default 'low'::text,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."agent_passports" (
  "id" uuid default gen_random_uuid() not null,
  "agent_id" uuid,
  "passport_status" text default 'issued'::text,
  "signature" text default encode(gen_random_bytes(32), 'hex'::text),
  "issued_at" timestamp with time zone default now()
);

create table if not exists public."agent_profiles" (
  "id" uuid default gen_random_uuid() not null,
  "owner_user_id" uuid,
  "agent_name" text not null,
  "agent_type" text default 'ai_agent'::text,
  "purpose" text,
  "status" text default 'pending'::text,
  "trust_score" integer default 0,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."ai_governance_runs" (
  "id" uuid default gen_random_uuid() not null,
  "subject_type" text,
  "subject_id" uuid,
  "summary" text,
  "recommendations" jsonb default '[]'::jsonb,
  "created_by_model" text,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."audit_events" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "event_type" text not null,
  "subject_type" text,
  "subject_id" uuid,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."cookie_consent_receipts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "enterprise_id" uuid,
  "anonymous_id" uuid not null,
  "session_id" uuid,
  "consent_version" text not null,
  "necessary" boolean default true not null,
  "analytics" boolean default false not null,
  "marketing" boolean default false not null,
  "preferences" boolean default false not null,
  "source" text default 'cookie_banner'::text not null,
  "jurisdiction" text,
  "country_code" text,
  "ip_hash" text,
  "user_agent_hash" text,
  "idempotency_key" uuid not null,
  "status" text default 'persisted'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "supersedes_receipt_id" uuid,
  "metadata" jsonb default '{}'::jsonb not null
);

create table if not exists public."provenance_assets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "asset_type" text,
  "file_name" text,
  "storage_path" text,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."provenance_reports" (
  "id" uuid default gen_random_uuid() not null,
  "asset_id" uuid,
  "c2pa_present" boolean default false,
  "synthid_detected" boolean default false,
  "confidence_score" integer default 0,
  "summary" text,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."system_health_checks" (
  "id" uuid default gen_random_uuid() not null,
  "check_name" text not null,
  "check_status" text,
  "details" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."trust_explanations" (
  "id" uuid default gen_random_uuid() not null,
  "trust_score_id" uuid,
  "explanation" text not null,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."verification_flags" (
  "id" uuid default gen_random_uuid() not null,
  "subject_type" text not null,
  "subject_id" uuid not null,
  "severity" text default 'medium'::text,
  "reason" text,
  "status" text default 'open'::text,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."voice_signals" (
  "id" uuid default gen_random_uuid() not null,
  "interview_session_id" uuid,
  "mismatch_detected" boolean default false,
  "confidence" integer default 0,
  "notes" text,
  "created_at" timestamp with time zone default now()
);

create table if not exists public."webcam_signals" (
  "id" uuid default gen_random_uuid() not null,
  "interview_session_id" uuid,
  "anomaly_detected" boolean default false,
  "confidence" integer default 0,
  "notes" text,
  "created_at" timestamp with time zone default now()
);

CREATE OR REPLACE FUNCTION public.prevent_cookie_consent_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    raise exception using errcode = '42501', message = 'cookie consent receipts are append-only';
end;
$function$
;

revoke all on function public."prevent_cookie_consent_mutation"() from public,anon,authenticated;
grant execute on function public."prevent_cookie_consent_mutation"() to service_role;

CREATE OR REPLACE FUNCTION public.record_cookie_consent(p_anonymous_id uuid, p_session_id uuid, p_consent_version text, p_analytics boolean, p_marketing boolean, p_preferences boolean, p_source text, p_idempotency_key uuid, p_country_code text DEFAULT NULL::text, p_ip_hash text DEFAULT NULL::text, p_user_agent_hash text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(receipt_id uuid, persisted_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_existing public.cookie_consent_receipts%rowtype;
    v_row public.cookie_consent_receipts%rowtype;
begin
    if p_anonymous_id is null or p_idempotency_key is null then
        raise exception using errcode = '22023', message = 'anonymous_id and idempotency_key are required';
    end if;
    if p_consent_version is null or length(p_consent_version) < 1 or length(p_consent_version) > 100 then
        raise exception using errcode = '22023', message = 'invalid consent version';
    end if;
    if p_source not in ('cookie_banner','cookie_preferences','api') then
        raise exception using errcode = '22023', message = 'invalid consent source';
    end if;
    if p_country_code is not null and p_country_code !~ '^[A-Z]{2}$' then
        raise exception using errcode = '22023', message = 'invalid country code';
    end if;
    if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
        raise exception using errcode = '22023', message = 'metadata must be an object';
    end if;

    select * into v_existing
    from public.cookie_consent_receipts
    where idempotency_key = p_idempotency_key;

    if found then
        return query select v_existing.id, v_existing.created_at;
        return;
    end if;

    insert into public.cookie_consent_receipts (
        user_id,
        anonymous_id,
        session_id,
        consent_version,
        necessary,
        analytics,
        marketing,
        preferences,
        source,
        country_code,
        ip_hash,
        user_agent_hash,
        idempotency_key,
        metadata
    ) values (
        auth.uid(),
        p_anonymous_id,
        p_session_id,
        p_consent_version,
        true,
        coalesce(p_analytics, false),
        coalesce(p_marketing, false),
        coalesce(p_preferences, false),
        p_source,
        p_country_code,
        p_ip_hash,
        p_user_agent_hash,
        p_idempotency_key,
        coalesce(p_metadata, '{}'::jsonb)
    ) returning * into v_row;

    return query select v_row.id, v_row.created_at;
end;
$function$
;

revoke all on function public."record_cookie_consent"(p_anonymous_id uuid, p_session_id uuid, p_consent_version text, p_analytics boolean, p_marketing boolean, p_preferences boolean, p_source text, p_idempotency_key uuid, p_country_code text, p_ip_hash text, p_user_agent_hash text, p_metadata jsonb) from public,anon,authenticated;
grant execute on function public."record_cookie_consent"(p_anonymous_id uuid, p_session_id uuid, p_consent_version text, p_analytics boolean, p_marketing boolean, p_preferences boolean, p_source text, p_idempotency_key uuid, p_country_code text, p_ip_hash text, p_user_agent_hash text, p_metadata jsonb) to service_role;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.agent_activity_logs'::regclass and conname='agent_activity_logs_pkey') then alter table public."agent_activity_logs" add constraint "agent_activity_logs_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.agent_passports'::regclass and conname='agent_passports_pkey') then alter table public."agent_passports" add constraint "agent_passports_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.agent_profiles'::regclass and conname='agent_profiles_pkey') then alter table public."agent_profiles" add constraint "agent_profiles_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.ai_governance_runs'::regclass and conname='ai_governance_runs_pkey') then alter table public."ai_governance_runs" add constraint "ai_governance_runs_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.audit_events'::regclass and conname='audit_events_pkey') then alter table public."audit_events" add constraint "audit_events_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_consent_version_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_consent_version_check" CHECK (length(consent_version) >= 1 AND length(consent_version) <= 100); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_country_code_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_country_code_check" CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'::text); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_idempotency_unique') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_idempotency_unique" UNIQUE (idempotency_key); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_ip_hash_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_ip_hash_check" CHECK (ip_hash IS NULL OR length(ip_hash) >= 32 AND length(ip_hash) <= 128); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_jurisdiction_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_jurisdiction_check" CHECK (jurisdiction IS NULL OR length(jurisdiction) <= 32); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_metadata_object') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_metadata_object" CHECK (jsonb_typeof(metadata) = 'object'::text); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_necessary_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_necessary_check" CHECK (necessary = true); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_pkey') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_source_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_source_check" CHECK (source = ANY (ARRAY['cookie_banner'::text, 'cookie_preferences'::text, 'api'::text])); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_status_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_status_check" CHECK (status = ANY (ARRAY['persisted'::text, 'withdrawn'::text, 'superseded'::text])); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_user_agent_hash_check') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_user_agent_hash_check" CHECK (user_agent_hash IS NULL OR length(user_agent_hash) >= 32 AND length(user_agent_hash) <= 128); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.provenance_assets'::regclass and conname='provenance_assets_pkey') then alter table public."provenance_assets" add constraint "provenance_assets_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.provenance_reports'::regclass and conname='provenance_reports_pkey') then alter table public."provenance_reports" add constraint "provenance_reports_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.system_health_checks'::regclass and conname='system_health_checks_pkey') then alter table public."system_health_checks" add constraint "system_health_checks_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.trust_explanations'::regclass and conname='trust_explanations_pkey') then alter table public."trust_explanations" add constraint "trust_explanations_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.verification_flags'::regclass and conname='verification_flags_pkey') then alter table public."verification_flags" add constraint "verification_flags_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.voice_signals'::regclass and conname='voice_signals_pkey') then alter table public."voice_signals" add constraint "voice_signals_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.webcam_signals'::regclass and conname='webcam_signals_pkey') then alter table public."webcam_signals" add constraint "webcam_signals_pkey" PRIMARY KEY (id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.agent_activity_logs'::regclass and conname='agent_activity_logs_agent_id_fkey') then alter table public."agent_activity_logs" add constraint "agent_activity_logs_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES agent_profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.agent_passports'::regclass and conname='agent_passports_agent_id_fkey') then alter table public."agent_passports" add constraint "agent_passports_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES agent_profiles(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.agent_profiles'::regclass and conname='agent_profiles_owner_user_id_fkey') then alter table public."agent_profiles" add constraint "agent_profiles_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.audit_events'::regclass and conname='audit_events_user_id_fkey') then alter table public."audit_events" add constraint "audit_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_supersedes_receipt_id_fkey') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_supersedes_receipt_id_fkey" FOREIGN KEY (supersedes_receipt_id) REFERENCES cookie_consent_receipts(id); end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.cookie_consent_receipts'::regclass and conname='cookie_consent_receipts_user_id_fkey') then alter table public."cookie_consent_receipts" add constraint "cookie_consent_receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.provenance_assets'::regclass and conname='provenance_assets_user_id_fkey') then alter table public."provenance_assets" add constraint "provenance_assets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.provenance_reports'::regclass and conname='provenance_reports_asset_id_fkey') then alter table public."provenance_reports" add constraint "provenance_reports_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES provenance_assets(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.trust_explanations'::regclass and conname='trust_explanations_trust_score_id_fkey') then alter table public."trust_explanations" add constraint "trust_explanations_trust_score_id_fkey" FOREIGN KEY (trust_score_id) REFERENCES trust_scores(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.voice_signals'::regclass and conname='voice_signals_interview_session_id_fkey') then alter table public."voice_signals" add constraint "voice_signals_interview_session_id_fkey" FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE; end if; end $$;

do $$ begin if not exists(select 1 from pg_constraint where conrelid='public.webcam_signals'::regclass and conname='webcam_signals_interview_session_id_fkey') then alter table public."webcam_signals" add constraint "webcam_signals_interview_session_id_fkey" FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE; end if; end $$;

CREATE INDEX IF NOT EXISTS cookie_consent_receipts_anonymous_created_idx ON public.cookie_consent_receipts USING btree (anonymous_id, created_at DESC);

CREATE INDEX IF NOT EXISTS cookie_consent_receipts_enterprise_created_idx ON public.cookie_consent_receipts USING btree (enterprise_id, created_at DESC) WHERE (enterprise_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS cookie_consent_receipts_user_created_idx ON public.cookie_consent_receipts USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);

alter table public."agent_activity_logs" enable row level security;
revoke all on public."agent_activity_logs" from public,anon,authenticated;
grant select,insert,update,delete on public."agent_activity_logs" to service_role;

alter table public."agent_passports" enable row level security;
revoke all on public."agent_passports" from public,anon,authenticated;
grant select,insert,update,delete on public."agent_passports" to service_role;

alter table public."agent_profiles" enable row level security;
revoke all on public."agent_profiles" from public,anon,authenticated;
grant select,insert,update,delete on public."agent_profiles" to service_role;

alter table public."ai_governance_runs" enable row level security;
revoke all on public."ai_governance_runs" from public,anon,authenticated;
grant select,insert,update,delete on public."ai_governance_runs" to service_role;

alter table public."audit_events" enable row level security;
revoke all on public."audit_events" from public,anon,authenticated;
grant select,insert,update,delete on public."audit_events" to service_role;

alter table public."cookie_consent_receipts" enable row level security;
alter table public."cookie_consent_receipts" force row level security;
revoke all on public."cookie_consent_receipts" from public,anon,authenticated;
grant select,insert,update,delete on public."cookie_consent_receipts" to service_role;

alter table public."provenance_assets" enable row level security;
revoke all on public."provenance_assets" from public,anon,authenticated;
grant select,insert,update,delete on public."provenance_assets" to service_role;

alter table public."provenance_reports" enable row level security;
revoke all on public."provenance_reports" from public,anon,authenticated;
grant select,insert,update,delete on public."provenance_reports" to service_role;

alter table public."system_health_checks" enable row level security;
revoke all on public."system_health_checks" from public,anon,authenticated;
grant select,insert,update,delete on public."system_health_checks" to service_role;

alter table public."trust_explanations" enable row level security;
revoke all on public."trust_explanations" from public,anon,authenticated;
grant select,insert,update,delete on public."trust_explanations" to service_role;

alter table public."verification_flags" enable row level security;
revoke all on public."verification_flags" from public,anon,authenticated;
grant select,insert,update,delete on public."verification_flags" to service_role;

alter table public."voice_signals" enable row level security;
revoke all on public."voice_signals" from public,anon,authenticated;
grant select,insert,update,delete on public."voice_signals" to service_role;

alter table public."webcam_signals" enable row level security;
revoke all on public."webcam_signals" from public,anon,authenticated;
grant select,insert,update,delete on public."webcam_signals" to service_role;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='agent_activity_logs' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."agent_activity_logs" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='agent_passports' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."agent_passports" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='agent_profiles' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."agent_profiles" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='ai_governance_runs' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."ai_governance_runs" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='audit_events' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."audit_events" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='cookie_consent_receipts' and policyname='cookie_consent_receipts_select_own') then execute 'create policy "cookie_consent_receipts_select_own" on public."cookie_consent_receipts" as PERMISSIVE for SELECT to "authenticated" using ((user_id = auth.uid()))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='cookie_consent_receipts' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."cookie_consent_receipts" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='provenance_assets' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."provenance_assets" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='provenance_reports' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."provenance_reports" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='system_health_checks' and policyname='account approval required') then execute 'create policy "account approval required" on public."system_health_checks" as RESTRICTIVE for ALL to "authenticated" using (security_closure_user_approved()) with check (security_closure_user_approved())'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='system_health_checks' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."system_health_checks" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='trust_explanations' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."trust_explanations" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='verification_flags' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."verification_flags" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='voice_signals' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."voice_signals" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_policies where schemaname='public' and tablename='webcam_signals' and policyname='customer approval required') then execute 'create policy "customer approval required" on public."webcam_signals" as RESTRICTIVE for ALL to "authenticated" using (( SELECT security_closure_user_approved() AS security_closure_user_approved)) with check (( SELECT security_closure_user_approved() AS security_closure_user_approved))'; end if; end $$;

do $$ begin if not exists(select 1 from pg_trigger where tgrelid='public.cookie_consent_receipts'::regclass and tgname='cookie_consent_receipts_prevent_update') then execute 'CREATE TRIGGER cookie_consent_receipts_prevent_update BEFORE DELETE OR UPDATE ON cookie_consent_receipts FOR EACH ROW EXECUTE FUNCTION prevent_cookie_consent_mutation()'; end if; end $$;



-- Canonical privilege contracts: preserve explicit Production customer grants,
-- restore INSERT RETURNING for the current owner-bound hiring writers, and
-- remove Staging's implicit blanket CRUD grants. Approval and tenant RLS remain.
select set_config('request.jwt.claims','{"role":"service_role"}',true);

revoke select,insert,update,delete on public."admin_reviews" from authenticated;

revoke select,insert,update,delete on public."agent_activity" from authenticated;

grant insert,select,update on public."agent_activity" to authenticated;

revoke select,insert,update,delete on public."agent_permissions" from authenticated;

grant insert,select,update on public."agent_permissions" to authenticated;

revoke select,insert,update,delete on public."agents" from authenticated;

grant insert,select,update on public."agents" to authenticated;

revoke select,insert,update,delete on public."api_test_runs" from authenticated;

grant insert,select on public."api_test_runs" to authenticated;

revoke select,insert,update,delete on public."appeals" from authenticated;

grant insert,select,update on public."appeals" to authenticated;

revoke select,insert,update,delete on public."billing_customers" from authenticated;

grant insert,select,update on public."billing_customers" to authenticated;

revoke select,insert,update,delete on public."candidate_profiles" from authenticated;

grant insert,select,update on public."candidate_profiles" to authenticated;

revoke select,insert,update,delete on public."device_channel_evidence" from authenticated;

grant insert,select,update on public."device_channel_evidence" to authenticated;

revoke all on public."enterprise_trust_objects" from service_role;
grant select on public."enterprise_trust_objects" to service_role;

revoke select,insert,update,delete on public."evidence_chains" from authenticated;

grant insert,select on public."evidence_chains" to authenticated;

revoke select,insert,update,delete on public."governance_actions" from authenticated;

grant insert,select,update on public."governance_actions" to authenticated;

revoke select,insert,update,delete on public."governance_policies" from authenticated;

grant insert,select,update on public."governance_policies" to authenticated;

revoke select,insert,update,delete on public."hopae_verifications" from authenticated;

grant insert,select,update on public."hopae_verifications" to authenticated;

revoke select,insert,update,delete on public."injection_risk_events" from authenticated;

grant insert,select,update on public."injection_risk_events" to authenticated;

revoke select,insert,update,delete on public."integration_status" from authenticated;

grant insert,select,update on public."integration_status" to authenticated;

revoke select,insert,update,delete on public."interview_risk_events" from authenticated;

grant insert,select,update on public."interview_risk_events" to authenticated;

revoke select,insert,update,delete on public."interview_risk_signals" from authenticated;

revoke select,insert,update,delete on public."interview_sessions" from authenticated;

grant insert,select,update on public."interview_sessions" to authenticated;

revoke select,insert,update,delete on public."launch_control_notes" from authenticated;

grant insert,select,update on public."launch_control_notes" to authenticated;

revoke select,insert,update,delete on public."liveness_checks" from authenticated;

grant insert on public."liveness_checks" to authenticated;

revoke select,insert,update,delete on public."message_events" from authenticated;

grant insert,select,update on public."message_events" to authenticated;

revoke select,insert,update,delete on public."message_threads" from authenticated;

grant insert,select,update on public."message_threads" to authenticated;

revoke select,insert,update,delete on public."notifications" from authenticated;

grant insert,select,update on public."notifications" to authenticated;

revoke select,insert,update,delete on public."operational_intelligence_events" from authenticated;

grant insert,select on public."operational_intelligence_events" to authenticated;

revoke select,insert,update,delete on public."recruiter_profiles" from authenticated;

grant insert,select,update on public."recruiter_profiles" to authenticated;

revoke select,insert,update,delete on public."runtime_validation_logs" from authenticated;

grant insert,select on public."runtime_validation_logs" to authenticated;

revoke all on public."scope_continuity_replay" from service_role;
grant select on public."scope_continuity_replay" to service_role;

revoke select,insert,update,delete on public."session_integrity_checks" from authenticated;

grant insert,select,update on public."session_integrity_checks" to authenticated;

revoke select,insert,update,delete on public."subscriptions" from authenticated;

grant insert,select,update on public."subscriptions" to authenticated;

revoke select,insert,update,delete on public."support_issues" from authenticated;

grant insert,select on public."support_issues" to authenticated;

revoke select,insert,update,delete on public."trust_case_relationships" from authenticated;

grant insert,select,update on public."trust_case_relationships" to authenticated;

revoke select,insert,update,delete on public."trust_cases" from authenticated;

grant insert,select,update on public."trust_cases" to authenticated;

revoke select,insert,update,delete on public."trust_relationships" from authenticated;

grant insert,select on public."trust_relationships" to authenticated;

revoke select,insert,update,delete on public."trust_replay_sessions" from authenticated;

grant insert,select on public."trust_replay_sessions" to authenticated;

revoke select,insert,update,delete on public."trust_scores" from authenticated;

grant insert,select on public."trust_scores" to authenticated;

revoke select,insert,update,delete on public."trust_timeline_events" from authenticated;

grant insert,select on public."trust_timeline_events" to authenticated;

revoke select,insert,update,delete on public."usage_limits" from authenticated;

grant insert,select,update on public."usage_limits" to authenticated;

revoke select,insert,update,delete on public."verification_events" from authenticated;

grant insert,select on public."verification_events" to authenticated;

revoke select,insert,update,delete on public."verification_receipts" from authenticated;

grant insert,select on public."verification_receipts" to authenticated;

revoke select,insert,update,delete on public."verification_signals" from authenticated;

grant insert,select,update on public."verification_signals" to authenticated;

alter default privileges for role postgres in schema public revoke select,update on sequences from authenticated;
alter default privileges for role postgres in schema public grant usage on sequences to authenticated;

alter function public.trust_timeline_actor_id(jsonb) set search_path='';

alter function public.trust_timeline_subject_id(jsonb) set search_path='';

alter function public.trust_timeline_subject_type(jsonb) set search_path='';

alter function public.trust_timeline_safe_timestamptz(text) set search_path='';

alter function public.trust_timeline_safe_uuid(text) set search_path='';

-- Retain named audit decisions, but close obsolete alternative access paths.
select public.ensure_policy_definition_v2('public','hopae_verifications','Users can insert own Hopae verifications','INSERT',array['authenticated']::name[],null,'false','intentional_replace','canonical_application_schema_reconciliation','Canonical owner/tenant policies supersede the legacy user_id alternative',true);
select public.ensure_policy_definition_v2('public','hopae_verifications','Users can view own Hopae verifications','SELECT',array['authenticated']::name[],'false',null,'intentional_replace','canonical_application_schema_reconciliation','Canonical owner/tenant policies supersede the legacy user_id alternative',true);
select public.ensure_policy_definition_v2('public','waitlist','anon insert waitlist','INSERT',array['anon']::name[],null,'false','intentional_replace','canonical_application_schema_reconciliation','Public submission uses the Turnstile-validated server route only',true);



-- Canonical validation keeps both environments' valid constraints.
-- Unknown measurements receive no invented numeric default. Existing values are
-- never rewritten. All constraints validate existing rows or abort atomically.

alter table public."ai_agents" alter column "agent_type" drop default;

alter table public."ai_agents" alter column "verification_status" set default 'concept_review'::text;

alter table public."audit_logs" alter column "abuse_risk" set default 'unknown'::text;

alter table public."audit_logs" alter column "allowed_file_type" drop default;

alter table public."audit_logs" alter column "rate_limit_status" set default 'unknown'::text;

alter table public."autonomy_profiles" alter column "risk_level" set default 'medium'::text;

alter table public."autonomy_profiles" alter column "subject_type" set default 'ai_agent'::text;

alter table public."hopae_verifications" alter column "amr" set default '[]'::jsonb;

alter table public."hopae_verifications" alter column "provenance" set default '{}'::jsonb;

alter table public."hopae_verifications" alter column "status" set default 'pending'::text;

alter table public."interview_sessions" alter column "status" set default 'pending'::text;

alter table public."passports" alter column "abuse_risk" set default 'unknown'::text;

alter table public."passports" alter column "allowed_file_type" drop default;

alter table public."passports" alter column "attribution_confidence" drop default;

alter table public."passports" alter column "behavioural_consistency" drop default;

alter table public."passports" alter column "biometric_confidence" drop default;

alter table public."passports" alter column "image_authenticity_score" drop default;

alter table public."passports" alter column "linkedin_profile_consistency" drop default;

alter table public."passports" alter column "liveness_score" drop default;

alter table public."passports" alter column "media_type" drop default;

alter table public."passports" alter column "model_fingerprint_risk" drop default;

alter table public."passports" alter column "provenance_status" set default 'unknown'::text;

alter table public."passports" alter column "rate_limit_status" set default 'unknown'::text;

alter table public."passports" alter column "synthetic_risk" drop default;

alter table public."passports" alter column "video_deepfake_risk" drop default;

alter table public."passports" alter column "voice_clone_risk" drop default;

alter table public."subscriptions" alter column "status" set default 'none'::text;

alter table public."trust_alerts" alter column "detected_at" set default now();

alter table public."trust_alerts" alter column "risk_level" set default 'medium'::text;

alter table public."trust_alerts" alter column "severity" set default 'medium'::text;

alter table public."trust_alerts" alter column "source" set default 'cyber_sentinels'::text;

alter table public."trust_alerts" alter column "status" set default 'open'::text;

alter table public."trust_reports" alter column "abuse_risk" set default 'unknown'::text;

alter table public."trust_reports" alter column "allowed_file_type" drop default;

alter table public."trust_reports" alter column "attribution_confidence" drop default;

alter table public."trust_reports" alter column "behavioural_consistency" drop default;

alter table public."trust_reports" alter column "biometric_confidence" drop default;

alter table public."trust_reports" alter column "confidence" drop default;

alter table public."trust_reports" alter column "image_authenticity_score" drop default;

alter table public."trust_reports" alter column "linkedin_profile_consistency" drop default;

alter table public."trust_reports" alter column "liveness_score" drop default;

alter table public."trust_reports" alter column "media_type" drop default;

alter table public."trust_reports" alter column "model_fingerprint_risk" drop default;

alter table public."trust_reports" alter column "profile_consistency" drop default;

alter table public."trust_reports" alter column "provenance_status" set default 'unknown'::text;

alter table public."trust_reports" alter column "rate_limit_status" set default 'unknown'::text;

alter table public."trust_reports" alter column "synthetic_risk" drop default;

alter table public."trust_reports" alter column "trust_score" drop default;

alter table public."trust_reports" alter column "video_deepfake_risk" drop default;

alter table public."trust_reports" alter column "voice_clone_risk" drop default;

alter table public."trust_scores" alter column "score" drop default;

alter table public."trust_signals" alter column "id" set default gen_random_uuid();

alter table public."usage_limits" alter column "plan" set default 'free'::text;

alter table public."verification_cases" alter column "decision_type" set default 'manual_review'::text;

alter table public."verification_cases" alter column "human_presence_index" drop default;

alter table public."verification_cases" alter column "linkedin_profile_consistency" drop default;

alter table public."verification_cases" alter column "origin_trace_score" drop default;

alter table public."verification_cases" alter column "subject_type" drop default;

alter table public."verification_cases" alter column "trust_score" drop default;

-- Email-only waitlist submission is the current validated public contract.
-- Retain the historical contact tuple's uniqueness while making id the row key.
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.waitlist'::regclass and conname='waitlist_legacy_contact_key') then
  alter table public.waitlist add constraint waitlist_legacy_contact_key unique(email,company,role,use_case);
 end if;
 if exists(select 1 from pg_constraint where conrelid='public.waitlist'::regclass and conname='waitlist_pkey' and pg_get_constraintdef(oid)<>'PRIMARY KEY (id)') then
  alter table public.waitlist drop constraint waitlist_pkey;
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.waitlist'::regclass and conname='waitlist_pkey') then
  alter table public.waitlist add constraint waitlist_pkey primary key(id);
 end if;
end $$;
alter table public.waitlist alter column company drop not null;
alter table public.waitlist alter column role drop not null;
alter table public.waitlist alter column use_case drop not null;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.autonomy_profiles'::regclass and conname='autonomy_profiles_autonomy_level_check' and pg_get_constraintdef(oid)<>'CHECK ((autonomy_level = ANY (ARRAY[''observe''::text, ''advise''::text, ''act_with_approval''::text, ''act_autonomously''::text])))') then
  alter table public."autonomy_profiles" drop constraint "autonomy_profiles_autonomy_level_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.autonomy_profiles'::regclass and conname='autonomy_profiles_autonomy_level_check') then
  alter table public."autonomy_profiles" add constraint "autonomy_profiles_autonomy_level_check" CHECK ((autonomy_level = ANY (ARRAY['observe'::text, 'advise'::text, 'act_with_approval'::text, 'act_autonomously'::text])));
 end if;
 alter table public."autonomy_profiles" validate constraint "autonomy_profiles_autonomy_level_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.autonomy_profiles'::regclass and conname='autonomy_profiles_governance_status_check' and pg_get_constraintdef(oid)<>'CHECK ((governance_status = ANY (ARRAY[''active''::text, ''paused''::text, ''blocked''::text, ''retired''::text])))') then
  alter table public."autonomy_profiles" drop constraint "autonomy_profiles_governance_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.autonomy_profiles'::regclass and conname='autonomy_profiles_governance_status_check') then
  alter table public."autonomy_profiles" add constraint "autonomy_profiles_governance_status_check" CHECK ((governance_status = ANY (ARRAY['active'::text, 'paused'::text, 'blocked'::text, 'retired'::text])));
 end if;
 alter table public."autonomy_profiles" validate constraint "autonomy_profiles_governance_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.autonomy_profiles'::regclass and conname='autonomy_profiles_risk_level_check' and pg_get_constraintdef(oid)<>'CHECK ((risk_level = ANY (ARRAY[''low''::text, ''medium''::text, ''high''::text, ''critical''::text])))') then
  alter table public."autonomy_profiles" drop constraint "autonomy_profiles_risk_level_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.autonomy_profiles'::regclass and conname='autonomy_profiles_risk_level_check') then
  alter table public."autonomy_profiles" add constraint "autonomy_profiles_risk_level_check" CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));
 end if;
 alter table public."autonomy_profiles" validate constraint "autonomy_profiles_risk_level_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.decisions'::regclass and conname='decisions_case_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (case_id) REFERENCES verification_cases(id) ON DELETE CASCADE') then
  alter table public."decisions" drop constraint "decisions_case_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.decisions'::regclass and conname='decisions_case_id_fkey') then
  alter table public."decisions" add constraint "decisions_case_id_fkey" FOREIGN KEY (case_id) REFERENCES verification_cases(id) ON DELETE CASCADE;
 end if;
 alter table public."decisions" validate constraint "decisions_case_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_case_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (case_id) REFERENCES verification_cases(id) ON DELETE CASCADE') then
  alter table public."evidence_files" drop constraint "evidence_files_case_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_case_id_fkey') then
  alter table public."evidence_files" add constraint "evidence_files_case_id_fkey" FOREIGN KEY (case_id) REFERENCES verification_cases(id) ON DELETE CASCADE;
 end if;
 alter table public."evidence_files" validate constraint "evidence_files_case_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_media_type_check' and pg_get_constraintdef(oid)<>'CHECK ((media_type = ANY (ARRAY[''image''::text, ''video''::text, ''audio''::text, ''document''::text, ''profile''::text, ''agent''::text])))') then
  alter table public."evidence_files" drop constraint "evidence_files_media_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_media_type_check') then
  alter table public."evidence_files" add constraint "evidence_files_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'document'::text, 'profile'::text, 'agent'::text])));
 end if;
 alter table public."evidence_files" validate constraint "evidence_files_media_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.hopae_verifications'::regclass and conname='hopae_verifications_user_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL') then
  alter table public."hopae_verifications" drop constraint "hopae_verifications_user_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.hopae_verifications'::regclass and conname='hopae_verifications_user_id_fkey') then
  alter table public."hopae_verifications" add constraint "hopae_verifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
 end if;
 alter table public."hopae_verifications" validate constraint "hopae_verifications_user_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.interview_sessions'::regclass and conname='interview_sessions_recruiter_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (recruiter_id) REFERENCES recruiter_profiles(id) ON DELETE SET NULL') then
  alter table public."interview_sessions" drop constraint "interview_sessions_recruiter_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.interview_sessions'::regclass and conname='interview_sessions_recruiter_id_fkey') then
  alter table public."interview_sessions" add constraint "interview_sessions_recruiter_id_fkey" FOREIGN KEY (recruiter_id) REFERENCES recruiter_profiles(id) ON DELETE SET NULL;
 end if;
 alter table public."interview_sessions" validate constraint "interview_sessions_recruiter_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.liveness_checks'::regclass and conname='liveness_checks_interview_session_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE') then
  alter table public."liveness_checks" drop constraint "liveness_checks_interview_session_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.liveness_checks'::regclass and conname='liveness_checks_interview_session_id_fkey') then
  alter table public."liveness_checks" add constraint "liveness_checks_interview_session_id_fkey" FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE;
 end if;
 alter table public."liveness_checks" validate constraint "liveness_checks_interview_session_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.operational_entity_native_replay_events'::regclass and conname='operational_entity_native_replay_events_event_type_check' and pg_get_constraintdef(oid)<>'CHECK ((event_type = ANY (ARRAY[''MANIFEST_REGISTERED''::text, ''CREDENTIAL_REGISTERED''::text, ''CHALLENGE_ISSUED''::text, ''CHALLENGE_VERIFIED''::text, ''NATIVE_IDENTITY_VERIFIED''::text, ''OWNER_CONFIRMED''::text, ''RUNTIME_BOUND''::text, ''BUILD_VERIFIED''::text, ''ENTITY_CHANGED''::text, ''CREDENTIAL_ROTATED''::text, ''CREDENTIAL_REVOKED''::text, ''VERIFICATION_EXPIRED''::text, ''REVERIFICATION_COMPLETED''::text, ''ENTITY_SUSPENDED''::text, ''AUTHORITY_REVOKED''::text, ''OWNER_REVOKED''::text, ''MANIFEST_REVOKED''::text, ''ALPHA_VERIFIED''::text, ''BETA_REGISTERED''::text, ''BETA_VERIFIED''::text, ''ALPHA_AUTHORITY_ISSUED''::text, ''GAMMA_AUTHORITY_ISSUED''::text, ''DELEGATION_PROPOSED''::text, ''DELEGATION_VALIDATED''::text, ''BETA_ACCEPTED''::text, ''DELEGATION_ACTIVATED''::text, ''BETA_ACTION_REQUESTED''::text, ''BETA_ACTION_ALLOWED''::text, ''BETA_ACTION_REVIEW_REQUIRED''::text, ''BETA_ACTION_DENIED''::text, ''BETA_SCOPE_VIOLATION_DENIED''::text, ''PARENT_AUTHORITY_REVOKED''::text, ''DELEGATION_INVALIDATED''::text, ''DELEGATION_REVOKED''::text, ''DELEGATED_AUTHORITY_VALID''::text, ''ACTION_REQUESTED''::text, ''DECISION_ALLOW''::text, ''DECISION_DENY''::text, ''HUMAN_APPROVAL_RECORDED''::text, ''ENFORCEMENT_REQUESTED''::text, ''ENFORCEMENT_ACKNOWLEDGED''::text, ''DESTINATION_OBSERVED''::text, ''OUTCOME_CONFIRMED''::text, ''UNAUTHORIZED_EXECUTION_OBSERVED''::text, ''CONTROL_FAILURE_DETECTED''::text, ''AUTHORITY_CHANGED_BEFORE_EXECUTION''::text, ''CONTROL_RECOVERY_CONFIRMED''::text, ''RELATIONSHIP_OBSERVED''::text, ''AUTHORITY_INTERSECTION_EVALUATED''::text, ''INTER_AGENT_COMPATIBILITY_EVALUATED''::text, ''INTER_AGENT_CONFLICT_EVALUATED''::text])))') then
  alter table public."operational_entity_native_replay_events" drop constraint "operational_entity_native_replay_events_event_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.operational_entity_native_replay_events'::regclass and conname='operational_entity_native_replay_events_event_type_check') then
  alter table public."operational_entity_native_replay_events" add constraint "operational_entity_native_replay_events_event_type_check" CHECK ((event_type = ANY (ARRAY['MANIFEST_REGISTERED'::text, 'CREDENTIAL_REGISTERED'::text, 'CHALLENGE_ISSUED'::text, 'CHALLENGE_VERIFIED'::text, 'NATIVE_IDENTITY_VERIFIED'::text, 'OWNER_CONFIRMED'::text, 'RUNTIME_BOUND'::text, 'BUILD_VERIFIED'::text, 'ENTITY_CHANGED'::text, 'CREDENTIAL_ROTATED'::text, 'CREDENTIAL_REVOKED'::text, 'VERIFICATION_EXPIRED'::text, 'REVERIFICATION_COMPLETED'::text, 'ENTITY_SUSPENDED'::text, 'AUTHORITY_REVOKED'::text, 'OWNER_REVOKED'::text, 'MANIFEST_REVOKED'::text, 'ALPHA_VERIFIED'::text, 'BETA_REGISTERED'::text, 'BETA_VERIFIED'::text, 'ALPHA_AUTHORITY_ISSUED'::text, 'GAMMA_AUTHORITY_ISSUED'::text, 'DELEGATION_PROPOSED'::text, 'DELEGATION_VALIDATED'::text, 'BETA_ACCEPTED'::text, 'DELEGATION_ACTIVATED'::text, 'BETA_ACTION_REQUESTED'::text, 'BETA_ACTION_ALLOWED'::text, 'BETA_ACTION_REVIEW_REQUIRED'::text, 'BETA_ACTION_DENIED'::text, 'BETA_SCOPE_VIOLATION_DENIED'::text, 'PARENT_AUTHORITY_REVOKED'::text, 'DELEGATION_INVALIDATED'::text, 'DELEGATION_REVOKED'::text, 'DELEGATED_AUTHORITY_VALID'::text, 'ACTION_REQUESTED'::text, 'DECISION_ALLOW'::text, 'DECISION_DENY'::text, 'HUMAN_APPROVAL_RECORDED'::text, 'ENFORCEMENT_REQUESTED'::text, 'ENFORCEMENT_ACKNOWLEDGED'::text, 'DESTINATION_OBSERVED'::text, 'OUTCOME_CONFIRMED'::text, 'UNAUTHORIZED_EXECUTION_OBSERVED'::text, 'CONTROL_FAILURE_DETECTED'::text, 'AUTHORITY_CHANGED_BEFORE_EXECUTION'::text, 'CONTROL_RECOVERY_CONFIRMED'::text, 'RELATIONSHIP_OBSERVED'::text, 'AUTHORITY_INTERSECTION_EVALUATED'::text, 'INTER_AGENT_COMPATIBILITY_EVALUATED'::text, 'INTER_AGENT_CONFLICT_EVALUATED'::text])));
 end if;
 alter table public."operational_entity_native_replay_events" validate constraint "operational_entity_native_replay_events_event_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.operational_intelligence_events'::regclass and conname='operational_intelligence_events_workspace_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (workspace_id) REFERENCES trust_workspaces(id) ON DELETE SET NULL') then
  alter table public."operational_intelligence_events" drop constraint "operational_intelligence_events_workspace_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.operational_intelligence_events'::regclass and conname='operational_intelligence_events_workspace_id_fkey') then
  alter table public."operational_intelligence_events" add constraint "operational_intelligence_events_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES trust_workspaces(id) ON DELETE SET NULL;
 end if;
 alter table public."operational_intelligence_events" validate constraint "operational_intelligence_events_workspace_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.provenance_events'::regclass and conname='provenance_events_report_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (report_id) REFERENCES provenance_reports(id) ON DELETE CASCADE') then
  alter table public."provenance_events" drop constraint "provenance_events_report_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.provenance_events'::regclass and conname='provenance_events_report_id_fkey') then
  alter table public."provenance_events" add constraint "provenance_events_report_id_fkey" FOREIGN KEY (report_id) REFERENCES provenance_reports(id) ON DELETE CASCADE;
 end if;
 alter table public."provenance_events" validate constraint "provenance_events_report_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.provenance_events'::regclass and conname='provenance_events_subject_check' and pg_get_constraintdef(oid)<>'CHECK ((subject_type = ANY (ARRAY[''human''::text, ''ai_agent''::text, ''workflow''::text, ''enterprise''::text])))') then
  alter table public."provenance_events" drop constraint "provenance_events_subject_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.provenance_events'::regclass and conname='provenance_events_subject_check') then
  alter table public."provenance_events" add constraint "provenance_events_subject_check" CHECK ((subject_type = ANY (ARRAY['human'::text, 'ai_agent'::text, 'workflow'::text, 'enterprise'::text])));
 end if;
 alter table public."provenance_events" validate constraint "provenance_events_subject_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.recruiter_profiles'::regclass and conname='recruiter_profiles_user_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL') then
  alter table public."recruiter_profiles" drop constraint "recruiter_profiles_user_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.recruiter_profiles'::regclass and conname='recruiter_profiles_user_id_fkey') then
  alter table public."recruiter_profiles" add constraint "recruiter_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
 end if;
 alter table public."recruiter_profiles" validate constraint "recruiter_profiles_user_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.risk_scores'::regclass and conname='risk_scores_case_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (case_id) REFERENCES verification_cases(id) ON DELETE CASCADE') then
  alter table public."risk_scores" drop constraint "risk_scores_case_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.risk_scores'::regclass and conname='risk_scores_case_id_fkey') then
  alter table public."risk_scores" add constraint "risk_scores_case_id_fkey" FOREIGN KEY (case_id) REFERENCES verification_cases(id) ON DELETE CASCADE;
 end if;
 alter table public."risk_scores" validate constraint "risk_scores_case_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.session_integrity_checks'::regclass and conname='session_integrity_checks_user_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL') then
  alter table public."session_integrity_checks" drop constraint "session_integrity_checks_user_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.session_integrity_checks'::regclass and conname='session_integrity_checks_user_id_fkey') then
  alter table public."session_integrity_checks" add constraint "session_integrity_checks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
 end if;
 alter table public."session_integrity_checks" validate constraint "session_integrity_checks_user_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_passport_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (passport_id) REFERENCES passports(id)') then
  alter table public."trust_reports" drop constraint "trust_reports_passport_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_passport_id_fkey') then
  alter table public."trust_reports" add constraint "trust_reports_passport_id_fkey" FOREIGN KEY (passport_id) REFERENCES passports(id);
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_passport_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_confidence_check' and pg_get_constraintdef(oid)<>'CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))') then
  alter table public."trust_signals" drop constraint "trust_signals_confidence_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_confidence_check') then
  alter table public."trust_signals" add constraint "trust_signals_confidence_check" CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_confidence_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_fingerprint_check' and pg_get_constraintdef(oid)<>'CHECK ((fingerprint ~ ''^[a-f0-9]{64}$''::text))') then
  alter table public."trust_signals" drop constraint "trust_signals_fingerprint_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_fingerprint_check') then
  alter table public."trust_signals" add constraint "trust_signals_fingerprint_check" CHECK ((fingerprint ~ '^[a-f0-9]{64}$'::text));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_fingerprint_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_idempotency_key_hash_check' and pg_get_constraintdef(oid)<>'CHECK ((idempotency_key_hash ~ ''^[a-f0-9]{64}$''::text))') then
  alter table public."trust_signals" drop constraint "trust_signals_idempotency_key_hash_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_idempotency_key_hash_check') then
  alter table public."trust_signals" add constraint "trust_signals_idempotency_key_hash_check" CHECK ((idempotency_key_hash ~ '^[a-f0-9]{64}$'::text));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_idempotency_key_hash_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_metadata_check' and pg_get_constraintdef(oid)<>'CHECK (((jsonb_typeof(metadata) = ''object''::text) AND ((metadata)::text !~* ''(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)''::text)))') then
  alter table public."trust_signals" drop constraint "trust_signals_metadata_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_metadata_check') then
  alter table public."trust_signals" add constraint "trust_signals_metadata_check" CHECK (((jsonb_typeof(metadata) = 'object'::text) AND ((metadata)::text !~* '(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)'::text)));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_metadata_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_observed_at_check' and pg_get_constraintdef(oid)<>'CHECK ((observed_at <= (received_at + ''00:05:00''::interval)))') then
  alter table public."trust_signals" drop constraint "trust_signals_observed_at_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_observed_at_check') then
  alter table public."trust_signals" add constraint "trust_signals_observed_at_check" CHECK ((observed_at <= (received_at + '00:05:00'::interval)));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_observed_at_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_severity_check' and pg_get_constraintdef(oid)<>'CHECK ((severity = ANY (ARRAY[''INFORMATIONAL''::text, ''LOW''::text, ''MEDIUM''::text, ''HIGH''::text, ''CRITICAL''::text])))') then
  alter table public."trust_signals" drop constraint "trust_signals_severity_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_severity_check') then
  alter table public."trust_signals" add constraint "trust_signals_severity_check" CHECK ((severity = ANY (ARRAY['INFORMATIONAL'::text, 'LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_severity_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_signal_type_check' and pg_get_constraintdef(oid)<>'CHECK ((signal_type = ANY (ARRAY[''IDENTITY''::text, ''DOCUMENT''::text, ''EMAIL''::text, ''PHONE''::text, ''DEVICE''::text, ''SESSION''::text, ''BROWSER''::text, ''NETWORK''::text, ''VPN''::text, ''LOCATION''::text, ''BEHAVIOUR''::text, ''LIVENESS''::text, ''DEEPFAKE''::text, ''PROVIDER''::text, ''ENTERPRISE_POLICY''::text, ''MANUAL_REVIEW''::text, ''AI_AGENT''::text, ''AUTHORITY''::text, ''CREDENTIAL''::text, ''INTEGRATION''::text, ''SYSTEM''::text])))') then
  alter table public."trust_signals" drop constraint "trust_signals_signal_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_signal_type_check') then
  alter table public."trust_signals" add constraint "trust_signals_signal_type_check" CHECK ((signal_type = ANY (ARRAY['IDENTITY'::text, 'DOCUMENT'::text, 'EMAIL'::text, 'PHONE'::text, 'DEVICE'::text, 'SESSION'::text, 'BROWSER'::text, 'NETWORK'::text, 'VPN'::text, 'LOCATION'::text, 'BEHAVIOUR'::text, 'LIVENESS'::text, 'DEEPFAKE'::text, 'PROVIDER'::text, 'ENTERPRISE_POLICY'::text, 'MANUAL_REVIEW'::text, 'AI_AGENT'::text, 'AUTHORITY'::text, 'CREDENTIAL'::text, 'INTEGRATION'::text, 'SYSTEM'::text])));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_signal_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_source_check' and pg_get_constraintdef(oid)<>'CHECK (((length(source) >= 1) AND (length(source) <= 160)))') then
  alter table public."trust_signals" drop constraint "trust_signals_source_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_source_check') then
  alter table public."trust_signals" add constraint "trust_signals_source_check" CHECK (((length(source) >= 1) AND (length(source) <= 160)));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_source_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_status_check' and pg_get_constraintdef(oid)<>'CHECK ((status = ANY (ARRAY[''POSITIVE''::text, ''NEGATIVE''::text, ''INCONCLUSIVE''::text, ''UNAVAILABLE''::text, ''REVOKED''::text, ''INFORMATIONAL''::text])))') then
  alter table public."trust_signals" drop constraint "trust_signals_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_status_check') then
  alter table public."trust_signals" add constraint "trust_signals_status_check" CHECK ((status = ANY (ARRAY['POSITIVE'::text, 'NEGATIVE'::text, 'INCONCLUSIVE'::text, 'UNAVAILABLE'::text, 'REVOKED'::text, 'INFORMATIONAL'::text])));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_tenant_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (tenant_id) REFERENCES trust_workspaces(id) ON DELETE RESTRICT') then
  alter table public."trust_signals" drop constraint "trust_signals_tenant_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_tenant_id_fkey') then
  alter table public."trust_signals" add constraint "trust_signals_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES trust_workspaces(id) ON DELETE RESTRICT;
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_tenant_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_trust_score_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (trust_score_id) REFERENCES trust_scores(id) ON DELETE CASCADE') then
  alter table public."trust_signals" drop constraint "trust_signals_trust_score_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_trust_score_id_fkey') then
  alter table public."trust_signals" add constraint "trust_signals_trust_score_id_fkey" FOREIGN KEY (trust_score_id) REFERENCES trust_scores(id) ON DELETE CASCADE;
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_trust_score_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.usage_limits'::regclass and conname='usage_limits_plan_key' and pg_get_constraintdef(oid)<>'UNIQUE (plan)') then
  alter table public."usage_limits" drop constraint "usage_limits_plan_key";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.usage_limits'::regclass and conname='usage_limits_plan_key') then
  alter table public."usage_limits" add constraint "usage_limits_plan_key" UNIQUE (plan);
 end if;

end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.billing_customers'::regclass and conname='billing_customers_user_id_key' and pg_get_constraintdef(oid)<>'UNIQUE (user_id)') then
  alter table public."billing_customers" drop constraint "billing_customers_user_id_key";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.billing_customers'::regclass and conname='billing_customers_user_id_key') then
  alter table public."billing_customers" add constraint "billing_customers_user_id_key" UNIQUE (user_id);
 end if;

end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.candidate_profiles'::regclass and conname='candidate_profiles_user_id_email_key' and pg_get_constraintdef(oid)<>'UNIQUE (user_id, email)') then
  alter table public."candidate_profiles" drop constraint "candidate_profiles_user_id_email_key";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.candidate_profiles'::regclass and conname='candidate_profiles_user_id_email_key') then
  alter table public."candidate_profiles" add constraint "candidate_profiles_user_id_email_key" UNIQUE (user_id, email);
 end if;

end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.decisions'::regclass and conname='decisions_status_check' and pg_get_constraintdef(oid)<>'CHECK ((status = ANY (ARRAY[''pending''::text, ''in_review''::text, ''verified''::text, ''rejected''::text, ''escalated''::text])))') then
  alter table public."decisions" drop constraint "decisions_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.decisions'::regclass and conname='decisions_status_check') then
  alter table public."decisions" add constraint "decisions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_review'::text, 'verified'::text, 'rejected'::text, 'escalated'::text])));
 end if;
 alter table public."decisions" validate constraint "decisions_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.decisions'::regclass and conname='decisions_verification_case_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (verification_case_id) REFERENCES verification_cases(id) ON DELETE CASCADE') then
  alter table public."decisions" drop constraint "decisions_verification_case_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.decisions'::regclass and conname='decisions_verification_case_id_fkey') then
  alter table public."decisions" add constraint "decisions_verification_case_id_fkey" FOREIGN KEY (verification_case_id) REFERENCES verification_cases(id) ON DELETE CASCADE;
 end if;
 alter table public."decisions" validate constraint "decisions_verification_case_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_passport_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE SET NULL') then
  alter table public."evidence_files" drop constraint "evidence_files_passport_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_passport_id_fkey') then
  alter table public."evidence_files" add constraint "evidence_files_passport_id_fkey" FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE SET NULL;
 end if;
 alter table public."evidence_files" validate constraint "evidence_files_passport_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_verification_case_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (verification_case_id) REFERENCES verification_cases(id) ON DELETE CASCADE') then
  alter table public."evidence_files" drop constraint "evidence_files_verification_case_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.evidence_files'::regclass and conname='evidence_files_verification_case_id_fkey') then
  alter table public."evidence_files" add constraint "evidence_files_verification_case_id_fkey" FOREIGN KEY (verification_case_id) REFERENCES verification_cases(id) ON DELETE CASCADE;
 end if;
 alter table public."evidence_files" validate constraint "evidence_files_verification_case_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.governance_actions'::regclass and conname='governance_actions_status_check' and pg_get_constraintdef(oid)<>'CHECK ((action_status = ANY (ARRAY[''pending''::text, ''in_review''::text, ''escalated''::text, ''approved''::text, ''rejected''::text, ''resolved''::text])))') then
  alter table public."governance_actions" drop constraint "governance_actions_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.governance_actions'::regclass and conname='governance_actions_status_check') then
  alter table public."governance_actions" add constraint "governance_actions_status_check" CHECK ((action_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'escalated'::text, 'approved'::text, 'rejected'::text, 'resolved'::text])));
 end if;
 alter table public."governance_actions" validate constraint "governance_actions_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.hopae_webhook_events'::regclass and conname='hopae_webhook_events_event_id_key' and pg_get_constraintdef(oid)<>'UNIQUE (event_id)') then
  alter table public."hopae_webhook_events" drop constraint "hopae_webhook_events_event_id_key";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.hopae_webhook_events'::regclass and conname='hopae_webhook_events_event_id_key') then
  alter table public."hopae_webhook_events" add constraint "hopae_webhook_events_event_id_key" UNIQUE (event_id);
 end if;

end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.injection_risk_events'::regclass and conname='injection_risk_level_check' and pg_get_constraintdef(oid)<>'CHECK ((risk_level = ANY (ARRAY[''low''::text, ''medium''::text, ''high''::text, ''unknown''::text])))') then
  alter table public."injection_risk_events" drop constraint "injection_risk_level_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.injection_risk_events'::regclass and conname='injection_risk_level_check') then
  alter table public."injection_risk_events" add constraint "injection_risk_level_check" CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'unknown'::text])));
 end if;
 alter table public."injection_risk_events" validate constraint "injection_risk_level_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.injection_risk_events'::regclass and conname='injection_risk_score_check' and pg_get_constraintdef(oid)<>'CHECK (((risk_score IS NULL) OR ((risk_score >= 0) AND (risk_score <= 100))))') then
  alter table public."injection_risk_events" drop constraint "injection_risk_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.injection_risk_events'::regclass and conname='injection_risk_score_check') then
  alter table public."injection_risk_events" add constraint "injection_risk_score_check" CHECK (((risk_score IS NULL) OR ((risk_score >= 0) AND (risk_score <= 100))));
 end if;
 alter table public."injection_risk_events" validate constraint "injection_risk_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.interview_sessions'::regclass and conname='interview_sessions_candidate_profile_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (candidate_profile_id) REFERENCES candidate_profiles(id) ON DELETE SET NULL') then
  alter table public."interview_sessions" drop constraint "interview_sessions_candidate_profile_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.interview_sessions'::regclass and conname='interview_sessions_candidate_profile_id_fkey') then
  alter table public."interview_sessions" add constraint "interview_sessions_candidate_profile_id_fkey" FOREIGN KEY (candidate_profile_id) REFERENCES candidate_profiles(id) ON DELETE SET NULL;
 end if;
 alter table public."interview_sessions" validate constraint "interview_sessions_candidate_profile_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.interview_sessions'::regclass and conname='interview_sessions_recruiter_profile_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (recruiter_profile_id) REFERENCES recruiter_profiles(id) ON DELETE SET NULL') then
  alter table public."interview_sessions" drop constraint "interview_sessions_recruiter_profile_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.interview_sessions'::regclass and conname='interview_sessions_recruiter_profile_id_fkey') then
  alter table public."interview_sessions" add constraint "interview_sessions_recruiter_profile_id_fkey" FOREIGN KEY (recruiter_profile_id) REFERENCES recruiter_profiles(id) ON DELETE SET NULL;
 end if;
 alter table public."interview_sessions" validate constraint "interview_sessions_recruiter_profile_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.liveness_checks'::regclass and conname='liveness_checks_session_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE') then
  alter table public."liveness_checks" drop constraint "liveness_checks_session_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.liveness_checks'::regclass and conname='liveness_checks_session_id_fkey') then
  alter table public."liveness_checks" add constraint "liveness_checks_session_id_fkey" FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE;
 end if;
 alter table public."liveness_checks" validate constraint "liveness_checks_session_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.message_events'::regclass and conname='message_events_thread_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE') then
  alter table public."message_events" drop constraint "message_events_thread_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.message_events'::regclass and conname='message_events_thread_id_fkey') then
  alter table public."message_events" add constraint "message_events_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE;
 end if;
 alter table public."message_events" validate constraint "message_events_thread_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_attribution_confidence_check' and pg_get_constraintdef(oid)<>'CHECK (((attribution_confidence >= 0) AND (attribution_confidence <= 100)))') then
  alter table public."passports" drop constraint "passports_attribution_confidence_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_attribution_confidence_check') then
  alter table public."passports" add constraint "passports_attribution_confidence_check" CHECK (((attribution_confidence >= 0) AND (attribution_confidence <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_attribution_confidence_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_behavioural_consistency_check' and pg_get_constraintdef(oid)<>'CHECK (((behavioural_consistency >= 0) AND (behavioural_consistency <= 100)))') then
  alter table public."passports" drop constraint "passports_behavioural_consistency_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_behavioural_consistency_check') then
  alter table public."passports" add constraint "passports_behavioural_consistency_check" CHECK (((behavioural_consistency >= 0) AND (behavioural_consistency <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_behavioural_consistency_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_biometric_confidence_check' and pg_get_constraintdef(oid)<>'CHECK (((biometric_confidence >= 0) AND (biometric_confidence <= 100)))') then
  alter table public."passports" drop constraint "passports_biometric_confidence_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_biometric_confidence_check') then
  alter table public."passports" add constraint "passports_biometric_confidence_check" CHECK (((biometric_confidence >= 0) AND (biometric_confidence <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_biometric_confidence_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_human_presence_index_check' and pg_get_constraintdef(oid)<>'CHECK (((human_presence_index >= 0) AND (human_presence_index <= 100)))') then
  alter table public."passports" drop constraint "passports_human_presence_index_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_human_presence_index_check') then
  alter table public."passports" add constraint "passports_human_presence_index_check" CHECK (((human_presence_index >= 0) AND (human_presence_index <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_human_presence_index_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_image_authenticity_score_check' and pg_get_constraintdef(oid)<>'CHECK (((image_authenticity_score >= 0) AND (image_authenticity_score <= 100)))') then
  alter table public."passports" drop constraint "passports_image_authenticity_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_image_authenticity_score_check') then
  alter table public."passports" add constraint "passports_image_authenticity_score_check" CHECK (((image_authenticity_score >= 0) AND (image_authenticity_score <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_image_authenticity_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_liveness_score_check' and pg_get_constraintdef(oid)<>'CHECK (((liveness_score >= 0) AND (liveness_score <= 100)))') then
  alter table public."passports" drop constraint "passports_liveness_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_liveness_score_check') then
  alter table public."passports" add constraint "passports_liveness_score_check" CHECK (((liveness_score >= 0) AND (liveness_score <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_liveness_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_media_type_check' and pg_get_constraintdef(oid)<>'CHECK (media_type IN (''image'',''video'',''audio'',''document'',''profile''))') then
  alter table public."passports" drop constraint "passports_media_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_media_type_check') then
  alter table public."passports" add constraint "passports_media_type_check" CHECK (media_type IN ('image','video','audio','document','profile'));
 end if;
 alter table public."passports" validate constraint "passports_media_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_model_fingerprint_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((model_fingerprint_risk >= 0) AND (model_fingerprint_risk <= 100)))') then
  alter table public."passports" drop constraint "passports_model_fingerprint_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_model_fingerprint_risk_check') then
  alter table public."passports" add constraint "passports_model_fingerprint_risk_check" CHECK (((model_fingerprint_risk >= 0) AND (model_fingerprint_risk <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_model_fingerprint_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_origin_trace_score_check' and pg_get_constraintdef(oid)<>'CHECK (((origin_trace_score >= 0) AND (origin_trace_score <= 100)))') then
  alter table public."passports" drop constraint "passports_origin_trace_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_origin_trace_score_check') then
  alter table public."passports" add constraint "passports_origin_trace_score_check" CHECK (((origin_trace_score >= 0) AND (origin_trace_score <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_origin_trace_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_synthetic_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((synthetic_risk >= 0) AND (synthetic_risk <= 100)))') then
  alter table public."passports" drop constraint "passports_synthetic_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_synthetic_risk_check') then
  alter table public."passports" add constraint "passports_synthetic_risk_check" CHECK (((synthetic_risk >= 0) AND (synthetic_risk <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_synthetic_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_trust_score_check' and pg_get_constraintdef(oid)<>'CHECK (((trust_score >= 0) AND (trust_score <= 100)))') then
  alter table public."passports" drop constraint "passports_trust_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_trust_score_check') then
  alter table public."passports" add constraint "passports_trust_score_check" CHECK (((trust_score >= 0) AND (trust_score <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_trust_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_trust_timeline_score_check' and pg_get_constraintdef(oid)<>'CHECK (((trust_timeline_score >= 0) AND (trust_timeline_score <= 100)))') then
  alter table public."passports" drop constraint "passports_trust_timeline_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_trust_timeline_score_check') then
  alter table public."passports" add constraint "passports_trust_timeline_score_check" CHECK (((trust_timeline_score >= 0) AND (trust_timeline_score <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_trust_timeline_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_video_deepfake_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((video_deepfake_risk >= 0) AND (video_deepfake_risk <= 100)))') then
  alter table public."passports" drop constraint "passports_video_deepfake_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_video_deepfake_risk_check') then
  alter table public."passports" add constraint "passports_video_deepfake_risk_check" CHECK (((video_deepfake_risk >= 0) AND (video_deepfake_risk <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_video_deepfake_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_voice_clone_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((voice_clone_risk >= 0) AND (voice_clone_risk <= 100)))') then
  alter table public."passports" drop constraint "passports_voice_clone_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.passports'::regclass and conname='passports_voice_clone_risk_check') then
  alter table public."passports" add constraint "passports_voice_clone_risk_check" CHECK (((voice_clone_risk >= 0) AND (voice_clone_risk <= 100)));
 end if;
 alter table public."passports" validate constraint "passports_voice_clone_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.recruiter_profiles'::regclass and conname='recruiter_profiles_user_id_email_key' and pg_get_constraintdef(oid)<>'UNIQUE (user_id, email)') then
  alter table public."recruiter_profiles" drop constraint "recruiter_profiles_user_id_email_key";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.recruiter_profiles'::regclass and conname='recruiter_profiles_user_id_email_key') then
  alter table public."recruiter_profiles" add constraint "recruiter_profiles_user_id_email_key" UNIQUE (user_id, email);
 end if;

end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.risk_scores'::regclass and conname='risk_scores_score_check' and pg_get_constraintdef(oid)<>'CHECK (((score >= 0) AND (score <= 100)))') then
  alter table public."risk_scores" drop constraint "risk_scores_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.risk_scores'::regclass and conname='risk_scores_score_check') then
  alter table public."risk_scores" add constraint "risk_scores_score_check" CHECK (((score >= 0) AND (score <= 100)));
 end if;
 alter table public."risk_scores" validate constraint "risk_scores_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.session_integrity_checks'::regclass and conname='session_integrity_status_check' and pg_get_constraintdef(oid)<>'CHECK ((overall_status = ANY (ARRAY[''pending''::text, ''reviewable''::text, ''needs_review''::text])))') then
  alter table public."session_integrity_checks" drop constraint "session_integrity_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.session_integrity_checks'::regclass and conname='session_integrity_status_check') then
  alter table public."session_integrity_checks" add constraint "session_integrity_status_check" CHECK ((overall_status = ANY (ARRAY['pending'::text, 'reviewable'::text, 'needs_review'::text])));
 end if;
 alter table public."session_integrity_checks" validate constraint "session_integrity_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.subscriptions'::regclass and conname='subscriptions_user_id_key' and pg_get_constraintdef(oid)<>'UNIQUE (user_id)') then
  alter table public."subscriptions" drop constraint "subscriptions_user_id_key";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.subscriptions'::regclass and conname='subscriptions_user_id_key') then
  alter table public."subscriptions" add constraint "subscriptions_user_id_key" UNIQUE (user_id);
 end if;

end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_cases'::regclass and conname='trust_cases_priority_check' and pg_get_constraintdef(oid)<>'CHECK ((priority = ANY (ARRAY[''low''::text, ''medium''::text, ''high''::text, ''urgent''::text])))') then
  alter table public."trust_cases" drop constraint "trust_cases_priority_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_cases'::regclass and conname='trust_cases_priority_check') then
  alter table public."trust_cases" add constraint "trust_cases_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));
 end if;
 alter table public."trust_cases" validate constraint "trust_cases_priority_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_cases'::regclass and conname='trust_cases_status_check' and pg_get_constraintdef(oid)<>'CHECK ((status = ANY (ARRAY[''open''::text, ''in_review''::text, ''escalated''::text, ''approved''::text, ''rejected''::text, ''closed''::text])))') then
  alter table public."trust_cases" drop constraint "trust_cases_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_cases'::regclass and conname='trust_cases_status_check') then
  alter table public."trust_cases" add constraint "trust_cases_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'escalated'::text, 'approved'::text, 'rejected'::text, 'closed'::text])));
 end if;
 alter table public."trust_cases" validate constraint "trust_cases_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_certifications'::regclass and conname='trust_certifications_score_check' and pg_get_constraintdef(oid)<>'CHECK (((trust_score >= 0) AND (trust_score <= 100)))') then
  alter table public."trust_certifications" drop constraint "trust_certifications_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_certifications'::regclass and conname='trust_certifications_score_check') then
  alter table public."trust_certifications" add constraint "trust_certifications_score_check" CHECK (((trust_score >= 0) AND (trust_score <= 100)));
 end if;
 alter table public."trust_certifications" validate constraint "trust_certifications_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_certifications'::regclass and conname='trust_certifications_status_check' and pg_get_constraintdef(oid)<>'CHECK ((status = ANY (ARRAY[''pending''::text, ''verified''::text, ''failed''::text, ''revoked''::text])))') then
  alter table public."trust_certifications" drop constraint "trust_certifications_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_certifications'::regclass and conname='trust_certifications_status_check') then
  alter table public."trust_certifications" add constraint "trust_certifications_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'failed'::text, 'revoked'::text])));
 end if;
 alter table public."trust_certifications" validate constraint "trust_certifications_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_certifications'::regclass and conname='trust_certifications_type_check' and pg_get_constraintdef(oid)<>'CHECK ((certification_type = ANY (ARRAY[''verified_human''::text, ''verified_executive''::text, ''verified_ai_agent''::text, ''verified_recruiter''::text, ''verified_workflow''::text, ''verified_enterprise''::text])))') then
  alter table public."trust_certifications" drop constraint "trust_certifications_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_certifications'::regclass and conname='trust_certifications_type_check') then
  alter table public."trust_certifications" add constraint "trust_certifications_type_check" CHECK ((certification_type = ANY (ARRAY['verified_human'::text, 'verified_executive'::text, 'verified_ai_agent'::text, 'verified_recruiter'::text, 'verified_workflow'::text, 'verified_enterprise'::text])));
 end if;
 alter table public."trust_certifications" validate constraint "trust_certifications_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_attribution_confidence_check' and pg_get_constraintdef(oid)<>'CHECK (((attribution_confidence >= 0) AND (attribution_confidence <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_attribution_confidence_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_attribution_confidence_check') then
  alter table public."trust_reports" add constraint "trust_reports_attribution_confidence_check" CHECK (((attribution_confidence >= 0) AND (attribution_confidence <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_attribution_confidence_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_behavioural_consistency_check' and pg_get_constraintdef(oid)<>'CHECK (((behavioural_consistency >= 0) AND (behavioural_consistency <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_behavioural_consistency_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_behavioural_consistency_check') then
  alter table public."trust_reports" add constraint "trust_reports_behavioural_consistency_check" CHECK (((behavioural_consistency >= 0) AND (behavioural_consistency <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_behavioural_consistency_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_biometric_confidence_check' and pg_get_constraintdef(oid)<>'CHECK (((biometric_confidence >= 0) AND (biometric_confidence <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_biometric_confidence_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_biometric_confidence_check') then
  alter table public."trust_reports" add constraint "trust_reports_biometric_confidence_check" CHECK (((biometric_confidence >= 0) AND (biometric_confidence <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_biometric_confidence_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_confidence_check' and pg_get_constraintdef(oid)<>'CHECK (((confidence >= 0) AND (confidence <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_confidence_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_confidence_check') then
  alter table public."trust_reports" add constraint "trust_reports_confidence_check" CHECK (((confidence >= 0) AND (confidence <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_confidence_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_human_presence_index_check' and pg_get_constraintdef(oid)<>'CHECK (((human_presence_index >= 0) AND (human_presence_index <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_human_presence_index_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_human_presence_index_check') then
  alter table public."trust_reports" add constraint "trust_reports_human_presence_index_check" CHECK (((human_presence_index >= 0) AND (human_presence_index <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_human_presence_index_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_image_authenticity_score_check' and pg_get_constraintdef(oid)<>'CHECK (((image_authenticity_score >= 0) AND (image_authenticity_score <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_image_authenticity_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_image_authenticity_score_check') then
  alter table public."trust_reports" add constraint "trust_reports_image_authenticity_score_check" CHECK (((image_authenticity_score >= 0) AND (image_authenticity_score <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_image_authenticity_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_liveness_score_check' and pg_get_constraintdef(oid)<>'CHECK (((liveness_score >= 0) AND (liveness_score <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_liveness_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_liveness_score_check') then
  alter table public."trust_reports" add constraint "trust_reports_liveness_score_check" CHECK (((liveness_score >= 0) AND (liveness_score <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_liveness_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_media_type_check' and pg_get_constraintdef(oid)<>'CHECK (media_type IN (''image'',''video'',''audio'',''document'',''profile''))') then
  alter table public."trust_reports" drop constraint "trust_reports_media_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_media_type_check') then
  alter table public."trust_reports" add constraint "trust_reports_media_type_check" CHECK (media_type IN ('image','video','audio','document','profile'));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_media_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_model_fingerprint_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((model_fingerprint_risk >= 0) AND (model_fingerprint_risk <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_model_fingerprint_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_model_fingerprint_risk_check') then
  alter table public."trust_reports" add constraint "trust_reports_model_fingerprint_risk_check" CHECK (((model_fingerprint_risk >= 0) AND (model_fingerprint_risk <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_model_fingerprint_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_origin_trace_score_check' and pg_get_constraintdef(oid)<>'CHECK (((origin_trace_score >= 0) AND (origin_trace_score <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_origin_trace_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_origin_trace_score_check') then
  alter table public."trust_reports" add constraint "trust_reports_origin_trace_score_check" CHECK (((origin_trace_score >= 0) AND (origin_trace_score <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_origin_trace_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_profile_consistency_check' and pg_get_constraintdef(oid)<>'CHECK (((profile_consistency >= 0) AND (profile_consistency <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_profile_consistency_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_profile_consistency_check') then
  alter table public."trust_reports" add constraint "trust_reports_profile_consistency_check" CHECK (((profile_consistency >= 0) AND (profile_consistency <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_profile_consistency_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_synthetic_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((synthetic_risk >= 0) AND (synthetic_risk <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_synthetic_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_synthetic_risk_check') then
  alter table public."trust_reports" add constraint "trust_reports_synthetic_risk_check" CHECK (((synthetic_risk >= 0) AND (synthetic_risk <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_synthetic_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_trust_score_check' and pg_get_constraintdef(oid)<>'CHECK (((trust_score >= 0) AND (trust_score <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_trust_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_trust_score_check') then
  alter table public."trust_reports" add constraint "trust_reports_trust_score_check" CHECK (((trust_score >= 0) AND (trust_score <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_trust_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_trust_timeline_score_check' and pg_get_constraintdef(oid)<>'CHECK (((trust_timeline_score >= 0) AND (trust_timeline_score <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_trust_timeline_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_trust_timeline_score_check') then
  alter table public."trust_reports" add constraint "trust_reports_trust_timeline_score_check" CHECK (((trust_timeline_score >= 0) AND (trust_timeline_score <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_trust_timeline_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_video_deepfake_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((video_deepfake_risk >= 0) AND (video_deepfake_risk <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_video_deepfake_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_video_deepfake_risk_check') then
  alter table public."trust_reports" add constraint "trust_reports_video_deepfake_risk_check" CHECK (((video_deepfake_risk >= 0) AND (video_deepfake_risk <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_video_deepfake_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_voice_clone_risk_check' and pg_get_constraintdef(oid)<>'CHECK (((voice_clone_risk >= 0) AND (voice_clone_risk <= 100)))') then
  alter table public."trust_reports" drop constraint "trust_reports_voice_clone_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_reports'::regclass and conname='trust_reports_voice_clone_risk_check') then
  alter table public."trust_reports" add constraint "trust_reports_voice_clone_risk_check" CHECK (((voice_clone_risk >= 0) AND (voice_clone_risk <= 100)));
 end if;
 alter table public."trust_reports" validate constraint "trust_reports_voice_clone_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_scores'::regclass and conname='trust_scores_score_check' and pg_get_constraintdef(oid)<>'CHECK (((score >= 0) AND (score <= 100)))') then
  alter table public."trust_scores" drop constraint "trust_scores_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_scores'::regclass and conname='trust_scores_score_check') then
  alter table public."trust_scores" add constraint "trust_scores_score_check" CHECK (((score >= 0) AND (score <= 100)));
 end if;
 alter table public."trust_scores" validate constraint "trust_scores_score_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_scores'::regclass and conname='trust_scores_session_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE') then
  alter table public."trust_scores" drop constraint "trust_scores_session_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_scores'::regclass and conname='trust_scores_session_id_fkey') then
  alter table public."trust_scores" add constraint "trust_scores_session_id_fkey" FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE;
 end if;
 alter table public."trust_scores" validate constraint "trust_scores_session_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_check' and pg_get_constraintdef(oid)<>'CHECK ((observed_at <= (received_at + ''00:05:00''::interval)))') then
  alter table public."trust_signals" drop constraint "trust_signals_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_check') then
  alter table public."trust_signals" add constraint "trust_signals_check" CHECK ((observed_at <= (received_at + '00:05:00'::interval)));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_metadata_check1' and pg_get_constraintdef(oid)<>'CHECK (((metadata)::text !~* ''(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)''::text))') then
  alter table public."trust_signals" drop constraint "trust_signals_metadata_check1";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_metadata_check1') then
  alter table public."trust_signals" add constraint "trust_signals_metadata_check1" CHECK (((metadata)::text !~* '(access.?token|refresh.?token|authorization|api.?key|client.?secret|webhook.?secret|password|passcode|private.?key|raw.?payload|raw.?proof|document.?image|biometric|selfie|face.?image|passport.?image|precise.?location|latitude|longitude|full.?ip)'::text));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_metadata_check1";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_provider_check' and pg_get_constraintdef(oid)<>'CHECK (((provider IS NULL) OR ((length(provider) >= 1) AND (length(provider) <= 160))))') then
  alter table public."trust_signals" drop constraint "trust_signals_provider_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.trust_signals'::regclass and conname='trust_signals_provider_check') then
  alter table public."trust_signals" add constraint "trust_signals_provider_check" CHECK (((provider IS NULL) OR ((length(provider) >= 1) AND (length(provider) <= 160))));
 end if;
 alter table public."trust_signals" validate constraint "trust_signals_provider_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_decision_type_check' and pg_get_constraintdef(oid)<>'CHECK (((decision_type IS NULL) OR (decision_type = ANY (ARRAY[''allow''::text, ''deny''::text, ''manual_review''::text, ''needs_more_evidence''::text]))))') then
  alter table public."verification_cases" drop constraint "verification_cases_decision_type_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_decision_type_check') then
  alter table public."verification_cases" add constraint "verification_cases_decision_type_check" CHECK (((decision_type IS NULL) OR (decision_type = ANY (ARRAY['allow'::text, 'deny'::text, 'manual_review'::text, 'needs_more_evidence'::text]))));
 end if;
 alter table public."verification_cases" validate constraint "verification_cases_decision_type_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_passport_id_fkey' and pg_get_constraintdef(oid)<>'FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE SET NULL') then
  alter table public."verification_cases" drop constraint "verification_cases_passport_id_fkey";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_passport_id_fkey') then
  alter table public."verification_cases" add constraint "verification_cases_passport_id_fkey" FOREIGN KEY (passport_id) REFERENCES passports(id) ON DELETE SET NULL;
 end if;
 alter table public."verification_cases" validate constraint "verification_cases_passport_id_fkey";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_status_check' and pg_get_constraintdef(oid)<>'CHECK ((status = ANY (ARRAY[''pending''::text, ''in_review''::text, ''verified''::text, ''rejected''::text, ''escalated''::text])))') then
  alter table public."verification_cases" drop constraint "verification_cases_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_status_check') then
  alter table public."verification_cases" add constraint "verification_cases_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_review'::text, 'verified'::text, 'rejected'::text, 'escalated'::text])));
 end if;
 alter table public."verification_cases" validate constraint "verification_cases_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_verification_status_check' and pg_get_constraintdef(oid)<>'CHECK ((verification_status = ANY (ARRAY[''pending''::text, ''in_review''::text, ''verified''::text, ''rejected''::text, ''escalated''::text])))') then
  alter table public."verification_cases" drop constraint "verification_cases_verification_status_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.verification_cases'::regclass and conname='verification_cases_verification_status_check') then
  alter table public."verification_cases" add constraint "verification_cases_verification_status_check" CHECK ((verification_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'verified'::text, 'rejected'::text, 'escalated'::text])));
 end if;
 alter table public."verification_cases" validate constraint "verification_cases_verification_status_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.verification_signals'::regclass and conname='verification_signals_risk_check' and pg_get_constraintdef(oid)<>'CHECK ((risk_level = ANY (ARRAY[''low''::text, ''medium''::text, ''high''::text, ''unknown''::text])))') then
  alter table public."verification_signals" drop constraint "verification_signals_risk_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.verification_signals'::regclass and conname='verification_signals_risk_check') then
  alter table public."verification_signals" add constraint "verification_signals_risk_check" CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'unknown'::text])));
 end if;
 alter table public."verification_signals" validate constraint "verification_signals_risk_check";
end $$;

do $$ begin
 if exists(select 1 from pg_constraint where conrelid='public.verification_signals'::regclass and conname='verification_signals_score_check' and pg_get_constraintdef(oid)<>'CHECK (((confidence_score IS NULL) OR ((confidence_score >= 0) AND (confidence_score <= 100))))') then
  alter table public."verification_signals" drop constraint "verification_signals_score_check";
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.verification_signals'::regclass and conname='verification_signals_score_check') then
  alter table public."verification_signals" add constraint "verification_signals_score_check" CHECK (((confidence_score IS NULL) OR ((confidence_score >= 0) AND (confidence_score <= 100))));
 end if;
 alter table public."verification_signals" validate constraint "verification_signals_score_check";
end $$;

CREATE INDEX IF NOT EXISTS idx_ai_enterprise ON public.ai_agents USING btree (enterprise_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_access_ai_usage ON public.enterprise_access_requests USING btree (ai_usage_level);

CREATE INDEX IF NOT EXISTS idx_enterprise_access_created_at ON public.enterprise_access_requests USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_access_problem_category ON public.enterprise_access_requests USING btree (current_problem_category);

CREATE INDEX IF NOT EXISTS idx_enterprise_access_status ON public.enterprise_access_requests USING btree (status);

CREATE INDEX IF NOT EXISTS idx_governance_actions_status ON public.governance_actions USING btree (action_status);

CREATE UNIQUE INDEX IF NOT EXISTS hopae_verifications_verification_id_uidx ON public.hopae_verifications USING btree (verification_id);

CREATE INDEX IF NOT EXISTS idx_hopae_verifications_status ON public.hopae_verifications USING btree (status);

CREATE INDEX IF NOT EXISTS idx_hopae_verifications_user_id ON public.hopae_verifications USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_hopae_verifications_verification_id ON public.hopae_verifications USING btree (verification_id);

CREATE UNIQUE INDEX IF NOT EXISTS hopae_webhook_events_event_id_uidx ON public.hopae_webhook_events USING btree (event_id) WHERE (event_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications USING btree (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_operational_intelligence_workspace ON public.operational_intelligence_events USING btree (workspace_id);

CREATE INDEX IF NOT EXISTS idx_pe_enterprise ON public.provenance_events USING btree (enterprise_id);

CREATE INDEX IF NOT EXISTS idx_session_integrity_subject ON public.session_integrity_checks USING btree (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_ta_enterprise ON public.trust_alerts USING btree (enterprise_id);

CREATE INDEX IF NOT EXISTS idx_trust_cases_workspace ON public.trust_cases USING btree (workspace_id);

CREATE INDEX IF NOT EXISTS idx_tc_enterprise ON public.trust_certifications USING btree (enterprise_id);

CREATE INDEX IF NOT EXISTS idx_tc_subject ON public.trust_certifications USING btree (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_trust_relationships_source ON public.trust_relationships USING btree (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_trust_relationships_target ON public.trust_relationships USING btree (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_trust_replay_subject ON public.trust_replay_sessions USING btree (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_trust_timeline_created ON public.trust_timeline_events USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_timeline_subject ON public.trust_timeline_events USING btree (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_verification_receipts_subject ON public.verification_receipts USING btree (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_verification_signals_subject ON public.verification_signals USING btree (subject_type, subject_id);


commit;
