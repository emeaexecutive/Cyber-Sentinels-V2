# Migration report

- Timestamp: 2026-07-22T16:20:48.666Z
- Status: PASS WITH WARNINGS
- Checks: 65 SQL migration file(s); legacy identifiers; destructive drops; legacy-sensitive updates; duplicate filenames; empty files
- Exact failure stage: None
- Actionable remediation: Review WARNING findings against the target schema before migration.
- Limitation: Static analysis does not prove database correctness or successful application to a live project.

## Findings

- **INFO** legacy-reference - supabase/migrations/001_initial_schema.sql: trust_score: 11 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202605260001_private_beta_schema_fix.sql: trust_score: 1 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202606030003_ai_trust_event_pipeline.sql: trust_score: 2 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202606060001_trusted_hiring_mvp.sql: candidate_profile_id: 1 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202606060001_trusted_hiring_mvp.sql: enterprise_id: 8 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202606090001_hiring_security_interview_integrity.sql: candidate_profile_id: 4 reference(s); review context before changing historical SQL.
- **INFO** legacy-update - supabase/migrations/202606090001_hiring_security_interview_integrity.sql: Legacy-sensitive UPDATE is inside an existence-checked block.
- **INFO** legacy-reference - supabase/migrations/202606180001_enterprise_ai_trust_governance.sql: enterprise_id: 4 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202606180001_enterprise_ai_trust_governance.sql: trust_score: 4 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202606190001_verifiers.sql: trust_score: 2 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202607190001_identity_signal_engine.sql: enterprise_id: 21 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202607190002_identity_signal_runtime.sql: enterprise_id: 38 reference(s); review context before changing historical SQL.
- **INFO** legacy-reference - supabase/migrations/202607200001_canonical_trust_event_foundation.sql: enterprise_id: 55 reference(s); review context before changing historical SQL.
- **WARNING** legacy-update - supabase/migrations/202607200001_canonical_trust_event_foundation.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200001_canonical_trust_event_foundation.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200001_canonical_trust_event_foundation.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200001_canonical_trust_event_foundation.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200001_canonical_trust_event_foundation.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **INFO** legacy-reference - supabase/migrations/202607200002_enterprise_trust_consent_manager.sql: enterprise_id: 50 reference(s); review context before changing historical SQL.
- **WARNING** legacy-update - supabase/migrations/202607200002_enterprise_trust_consent_manager.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200002_enterprise_trust_consent_manager.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **INFO** legacy-reference - supabase/migrations/202607200003_provider_consensus_engine.sql: enterprise_id: 47 reference(s); review context before changing historical SQL.
- **WARNING** legacy-update - supabase/migrations/202607200003_provider_consensus_engine.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200003_provider_consensus_engine.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607200003_provider_consensus_engine.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **INFO** legacy-reference - supabase/migrations/202607210001_enterprise_trust_architecture.sql: enterprise_id: 106 reference(s); review context before changing historical SQL.
- **WARNING** legacy-update - supabase/migrations/202607210001_enterprise_trust_architecture.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607210001_enterprise_trust_architecture.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607210001_enterprise_trust_architecture.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607210001_enterprise_trust_architecture.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607210001_enterprise_trust_architecture.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **INFO** legacy-reference - supabase/migrations/202607210002_continuous_trust_runtime.sql: enterprise_id: 28 reference(s); review context before changing historical SQL.
- **WARNING** legacy-update - supabase/migrations/202607210002_continuous_trust_runtime.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607210002_continuous_trust_runtime.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
- **WARNING** legacy-update - supabase/migrations/202607210002_continuous_trust_runtime.sql: UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.
