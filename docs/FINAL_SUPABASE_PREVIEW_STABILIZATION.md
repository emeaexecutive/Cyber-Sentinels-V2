# Final Supabase Preview Stabilization

Date: 2026-06-25
Workspace: `C:\Users\emeae\Desktop\cyber-sentinels-clean`

## Result

Supabase Preview migration stability was tightened without changing product behavior, weakening RLS, exposing protected data or adding speculative infrastructure.

The sweep focused on migration order, `create table if not exists` compatibility, ownership columns and RLS policy safety.

## Fixed Migration Issues

### `interview_sessions`

`supabase/migrations/202606060001_trusted_hiring_mvp.sql` now guarantees `interview_sessions.user_id` exists before RLS is enabled and before owner policies such as `"interview sessions owner select"` reference it.

The same compatibility guard was added for the other user-owned hiring MVP tables whose policies use `user_id = auth.uid()`:

- `candidate_profiles`
- `recruiter_profiles`
- `interview_risk_signals`
- `liveness_checks`
- `trust_scores`
- `verification_events`
- `admin_reviews`

### `session_integrity_checks`

`supabase/migrations/202606190002_session_integrity_signal_separation.sql` now adds compatibility columns before indexes and policies reference them:

- `session_integrity_checks.interview_session_id`
- `session_integrity_checks.user_id`
- `session_integrity_checks.created_at`
- `verification_signals.session_integrity_check_id`
- `verification_signals.interview_session_id`
- `verification_signals.category`
- `verification_signals.created_at`
- `injection_risk_events.session_integrity_check_id`
- `injection_risk_events.interview_session_id`
- `injection_risk_events.created_at`
- `device_channel_evidence.session_integrity_check_id`
- `device_channel_evidence.interview_session_id`
- `device_channel_evidence.created_at`

### `trust_events`

`supabase/migrations/202606030003_ai_trust_event_pipeline.sql` now guarantees policy-owned fields exist before RLS policy creation:

- `trust_events.agent_id`
- `trust_events.metadata`
- `trust_events.created_at`
- `agent_permissions.agent_id`

### `ai_agents`

`supabase/migrations/202606070001_ai_agent_identity_direction.sql` now guards ownership/index columns before owner policies and indexes run:

- `ai_agents.owner_user_id`
- `ai_agents.owner_email`
- `ai_agents.created_at`
- `agent_activity.agent_id`

`supabase/migrations/202606180001_enterprise_ai_trust_governance.sql` also guards `ai_agents.owner_email` and `ai_agents.created_at` before enterprise indexes reference them.

### Enterprise Trust Governance

`supabase/migrations/202606180001_enterprise_ai_trust_governance.sql` now guards policy and index columns for:

- `trust_certifications.created_by`
- `trust_certifications.certification_type`
- `trust_certifications.status`
- `trust_certifications.subject_type`
- `trust_certifications.subject_id`
- `trust_certifications.created_at`
- `trust_alerts.created_by`
- `trust_alerts.alert_type`
- `trust_alerts.status`
- `trust_alerts.subject_type`
- `trust_alerts.subject_id`
- `trust_alerts.created_at`

## Ownership Strategy

The preferred user-owned pattern remains:

```sql
user_id uuid references auth.users(id)
```

Where the existing project already uses a table-specific ownership column, the migration keeps that model:

- `owner_user_id` for AI agents and Hopae verification ownership.
- `created_by` for workspace and governance records.
- `asked_by_user_id`, `created_by_user_id`, and `submitted_by_user_id` for existing support and messaging flows.

Compatibility guards do not make tables public. They only ensure the columns referenced by existing RLS policies, indexes and foreign keys exist before those objects are created.

## RLS Safety Notes

- No RLS policy was weakened.
- No protected table was made public.
- No service-role access was exposed client-side.
- Migration search found no `user_metadata` or `raw_user_meta_data` references in SQL migrations.
- Existing admin RLS checks use `app_metadata`, not user-editable auth metadata.
- `usage_limits` already includes a `user_id` compatibility guard before its policy references `auth.uid() = user_id`.
- `agent_runtime_sessions` is not present in this migration chain, so no policy repair was required for that table.

## Verified Tables

- `usage_limits`: `user_id` exists before the owner read policy.
- `interview_sessions`: `user_id` now exists before owner policies.
- `session_integrity_checks`: `user_id` and index columns now exist before policies and indexes.
- `trust_reports`: base table and additive schema are present; authenticated policies remain unchanged.
- `verification_cases`: base table and additive schema are present; authenticated policies remain unchanged.
- `trust_events`: policy fields now have compatibility guards.
- `candidate_profiles`: `user_id` now has a compatibility guard before owner policies.
- `agent_runtime_sessions`: not found in current migrations.

## Remaining Deferred Cleanup

- Legacy authenticated-wide policies on early beta tables such as `trust_reports` and `verification_cases` remain unchanged because this task targeted Preview stability, not a broader RLS redesign.
- Some older beta columns such as `team_id text` remain as plain metadata fields. The previous broken `team_id text references teams(id)` pattern was not present in this sweep.
- Future RLS hardening should be done as a separate, explicit authorization design pass with data ownership and migration backfill planning.
