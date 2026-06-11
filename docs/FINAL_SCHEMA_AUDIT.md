# Final Schema Audit

Date: 2026-06-11

## Result

No duplicate tables were added during this audit. The application expects the following operational tables, and each has an existing migration source:

| Table | Migration source | Status |
| --- | --- | --- |
| `enterprise_access_requests` | `202606030005_enterprise_access_requests.sql`, hardened by later enterprise access migrations | Present |
| `trust_workspaces` | `202606080004_trust_workspaces_cases.sql` | Present |
| `trust_cases` | `202606080004_trust_workspaces_cases.sql` | Present |
| `evidence_files` | `001_initial_schema.sql`, extended by evidence upload migrations | Present |
| `audit_logs` | `001_initial_schema.sql`, hardened by operational RLS migrations | Present |
| `signals` | `001_initial_schema.sql`, extended by `202605300003_add_signal_metadata.sql` | Present |
| `governance_actions` | `202606080005_operational_governance_engine.sql` | Present |
| `trust_timeline_events` | `202606080002_trust_timeline_events.sql` | Present |
| `trust_replay_sessions` | `202606080003_trust_replay_sessions.sql` | Present |
| `verification_receipts` | `202606090002_trust_evidence_chains_receipts.sql` | Present |
| `evidence_chains` | `202606090002_trust_evidence_chains_receipts.sql` | Present |
| `notifications` | `202606030002_messages_notifications_appeals.sql`, extended by `202606080007_operational_notifications_coordination.sql` | Present |
| `ai_agents` | `202606070001_ai_agent_identity_direction.sql` | Present |
| `agent_activity` | `202606070001_ai_agent_identity_direction.sql` | Present |
| `candidate_profiles` | `202606060001_trusted_hiring_mvp.sql` | Present |
| `recruiter_profiles` | `202606060001_trusted_hiring_mvp.sql` | Present |
| `interview_sessions` | `202606060001_trusted_hiring_mvp.sql` | Present |
| `interview_risk_events` | `202606090001_hiring_security_interview_integrity.sql` | Present |
| `usage_limits` | `202606050002_billing_subscriptions_usage_limits.sql` | Present |
| `billing_customers` | `202606050002_billing_subscriptions_usage_limits.sql` | Present |
| `subscriptions` | `202606050002_billing_subscriptions_usage_limits.sql` | Present |
| `integration_status` | `202606070003_integration_status.sql` | Present |
| `runtime_validation_logs` | `202606100001_runtime_validation_logs.sql` | Present |

## Column Notes

- `evidence_files` is created in the initial schema and extended with `passport_id`, `evidence_type`, `notes`, `uploaded_by`, `status`, `file_type`, `file_size`, `storage_path`, `public_url` and aligned `file_url` support.
- `signals` is created in the initial schema and extended with `metadata`.
- `audit_logs` is created in the initial schema with `event_type`, `actor`, `metadata` and operational risk fields.
- Billing code still uses internal `passport_limit` fields for backward compatibility, while public pricing copy now says `verification workflows`.

## Warning

Runtime validation can only verify live table reachability when `SUPABASE_SERVICE_ROLE_KEY` is present server-side. If that key is missing, table checks are reported as warnings, not schema blockers.
