# Migration chain audit

- Production migration head: `202606090003`.
- First pending migration: `202606100001`.
- Target migration head: `202608010002`.
- Applied migrations: 45.
- Pending migrations: 29.
- Ordering: lexical timestamp order; every local timestamp is unique.
- Row-volume evidence: unknown; no Production row counts were inspected.

| Timestamp | Migration | Purpose | Dependencies | Schema impact | Data impact | RLS | Lock risk | Rollback boundary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `001` | `001_initial_schema.sql` | Initial Schema (Applied legacy foundation) | `Supabase managed baseline` | constraint hardening, data backfill, feature schema, policy hardening, table creation; creates 28, alters 10 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202605260001` | `202605260001_private_beta_schema_fix.sql` | Private Beta Schema Fix (Applied legacy foundation) | `001` | compatibility repair, feature schema, table creation; creates 3, alters 8 | none | no | HISTORICAL | Applied Production history; never edit |
| `20260528` | `20260528_explicit_supabase_api_grants.sql` | Explicit Supabase Api Grants (Applied legacy foundation) | `202605260001` | data backfill, feature schema, policy hardening; creates 7, alters 2 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202605300001` | `202605300001_evidence_upload_flow.sql` | Evidence Upload Flow (Applied legacy foundation) | `20260528` | data backfill, feature schema, policy hardening; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202605300002` | `202605300002_align_evidence_file_url.sql` | Align Evidence File Url (Applied legacy foundation) | `202605300001` | compatibility repair, data backfill, feature schema; creates 0, alters 1 | bounded update/backfill path; row volume unknown | no | HISTORICAL | Applied Production history; never edit |
| `202605300003` | `202605300003_add_signal_metadata.sql` | Add Signal Metadata (Applied legacy foundation) | `202605300002` | additive schema; creates 0, alters 1 | none | no | HISTORICAL | Applied Production history; never edit |
| `202605310001` | `202605310001_real_evidence_file_upload.sql` | Real Evidence File Upload (Applied legacy foundation) | `202605300003` | data backfill, feature schema, policy hardening; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606010001` | `202606010001_intent_requests.sql` | Intent Requests (Applied legacy foundation) | `202605310001` | data backfill, feature schema, policy hardening, table creation; creates 2, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606010002` | `202606010002_autonomy_profiles.sql` | Autonomy Profiles (Applied legacy foundation) | `202606010001` | data backfill, feature schema, policy hardening, table creation; creates 2, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606010003` | `202606010003_passport_state_checks.sql` | Passport State Checks (Applied legacy foundation) | `202606010002` | data backfill, feature schema, policy hardening, table creation; creates 2, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606010004` | `202606010004_execution_passports.sql` | Execution Passports (Applied legacy foundation) | `202606010003` | data backfill, feature schema, policy hardening, table creation; creates 2, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606020001` | `202606020001_trust_graph_engine_help.sql` | Trust Graph Engine Help (Applied legacy foundation) | `202606010004` | data backfill, feature schema, policy hardening, table creation; creates 6, alters 3 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606020002` | `202606020002_harden_operational_tables.sql` | Harden Operational Tables (Applied legacy foundation) | `202606020001` | data backfill, feature schema, policy hardening; creates 6, alters 6 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606020004` | `202606020004_help_question_traceability.sql` | Help Question Traceability (Applied legacy foundation) | `202606020002` | data backfill, feature schema; creates 0, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606020005` | `202606020005_trust_assistant_questions.sql` | Trust Assistant Questions (Applied legacy foundation) | `202606020004` | data backfill, feature schema, policy hardening, table creation; creates 4, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606020006` | `202606020006_knowledge_articles.sql` | Knowledge Articles (Applied legacy foundation) | `202606020005` | data backfill, feature schema, policy hardening, table creation; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606030001` | `202606030001_data_rights_requests.sql` | Data Rights Requests (Applied legacy foundation) | `202606020006` | data backfill, feature schema, policy hardening, table creation; creates 2, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606030002` | `202606030002_messages_notifications_appeals.sql` | Messages Notifications Appeals (Applied legacy foundation) | `202606030001` | data backfill, feature schema, policy hardening, table creation; creates 12, alters 4 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606030003` | `202606030003_ai_trust_event_pipeline.sql` | Ai Trust Event Pipeline (Applied legacy foundation) | `202606030002` | data backfill, feature schema, policy hardening, table creation; creates 11, alters 3 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606030004` | `202606030004_developer_platform_api_keys.sql` | Developer Platform Api Keys (Applied legacy foundation) | `202606030003` | data backfill, feature schema, policy hardening, table creation; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606030005` | `202606030005_enterprise_access_requests.sql` | Enterprise Access Requests (Applied legacy foundation) | `202606030004` | data backfill, feature schema, policy hardening, table creation; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606030006` | `202606030006_private_evidence_bucket.sql` | Private Evidence Bucket (Applied legacy foundation) | `202606030005` | data backfill, feature schema; creates 0, alters 0 | bounded update/backfill path; row volume unknown | no | HISTORICAL | Applied Production history; never edit |
| `202606040001` | `202606040001_feedback_signal_intelligence.sql` | Feedback Signal Intelligence (Applied legacy foundation) | `202606030006` | data backfill, feature schema, policy hardening, table creation; creates 5, alters 2 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606040002` | `202606040002_ensure_enterprise_access_requests_public_submit.sql` | Ensure Enterprise Access Requests Public Submit (Applied legacy foundation) | `202606040001` | data backfill, feature schema, policy hardening, table creation; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606040003` | `202606040003_enterprise_access_problem_category.sql` | Enterprise Access Problem Category (Applied legacy foundation) | `202606040002` | additive schema; creates 0, alters 1 | none | no | HISTORICAL | Applied Production history; never edit |
| `202606050001` | `202606050001_enterprise_access_design_partner_signals.sql` | Enterprise Access Design Partner Signals (Applied legacy foundation) | `202606040003` | additive schema; creates 0, alters 1 | none | no | HISTORICAL | Applied Production history; never edit |
| `202606050002` | `202606050002_billing_subscriptions_usage_limits.sql` | Billing Subscriptions Usage Limits (Applied legacy foundation) | `202606050001` | data backfill, feature schema, index creation, policy hardening, table creation; creates 10, alters 3 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606050003` | `202606050003_harden_enterprise_access_insert_permissions.sql` | Harden Enterprise Access Insert Permissions (Applied legacy foundation) | `202606050002` | data backfill, feature schema, policy hardening; creates 1, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606050004` | `202606050004_submit_enterprise_access_request_rpc.sql` | Submit Enterprise Access Request Rpc (Applied legacy foundation) | `202606050003` | feature schema, function or RPC; creates 1, alters 0 | deterministic seed/configuration inserts | no | HISTORICAL | Applied Production history; never edit |
| `202606060001` | `202606060001_trusted_hiring_mvp.sql` | Trusted Hiring Mvp (Applied legacy foundation) | `202606050004` | data backfill, feature schema, policy hardening, table creation; creates 32, alters 8 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606070001` | `202606070001_ai_agent_identity_direction.sql` | Ai Agent Identity Direction (Applied legacy foundation) | `202606060001` | data backfill, feature schema, index creation, policy hardening, table creation; creates 7, alters 2 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606070002` | `202606070002_trust_algorithm_runs.sql` | Trust Algorithm Runs (Applied legacy foundation) | `202606070001` | feature schema, index creation, policy hardening, table creation; creates 4, alters 1 | none | yes | HISTORICAL | Applied Production history; never edit |
| `202606070003` | `202606070003_integration_status.sql` | Integration Status (Applied legacy foundation) | `202606070002` | feature schema, index creation, policy hardening, table creation; creates 4, alters 1 | none | yes | HISTORICAL | Applied Production history; never edit |
| `202606070004` | `202606070004_api_test_runs.sql` | Api Test Runs (Applied legacy foundation) | `202606070003` | feature schema, index creation, policy hardening, table creation; creates 4, alters 1 | none | yes | HISTORICAL | Applied Production history; never edit |
| `202606070005` | `202606070005_launch_control_notes.sql` | Launch Control Notes (Applied legacy foundation) | `202606070004` | data backfill, feature schema, index creation, policy hardening, table creation; creates 3, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606080001` | `202606080001_trust_relationships.sql` | Trust Relationships (Applied legacy foundation) | `202606070005` | feature schema, index creation, policy hardening, table creation; creates 6, alters 1 | none | yes | HISTORICAL | Applied Production history; never edit |
| `202606080002` | `202606080002_trust_timeline_events.sql` | Trust Timeline Events (Applied legacy foundation) | `202606080001` | feature schema, function or RPC, index creation, policy hardening, table creation; creates 28, alters 1 | deterministic seed/configuration inserts | yes | HISTORICAL | Applied Production history; never edit |
| `202606080003` | `202606080003_trust_replay_sessions.sql` | Trust Replay Sessions (Applied legacy foundation) | `202606080002` | feature schema, index creation, policy hardening, table creation; creates 5, alters 1 | none | yes | HISTORICAL | Applied Production history; never edit |
| `202606080004` | `202606080004_trust_workspaces_cases.sql` | Trust Workspaces Cases (Applied legacy foundation) | `202606080003` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 16, alters 4 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606080005` | `202606080005_operational_governance_engine.sql` | Operational Governance Engine (Applied legacy foundation) | `202606080004` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 24, alters 2 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606080006` | `202606080006_operational_hardening_rls.sql` | Operational Hardening Rls (Applied legacy foundation) | `202606080005` | compatibility repair, data backfill, feature schema, policy hardening; creates 11, alters 14 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606080007` | `202606080007_operational_notifications_coordination.sql` | Operational Notifications Coordination (Applied legacy foundation) | `202606080006` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 18, alters 3 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606090001` | `202606090001_hiring_security_interview_integrity.sql` | Hiring Security Interview Integrity (Applied legacy foundation) | `202606080007` | compatibility repair, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 8, alters 4 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606090002` | `202606090002_trust_evidence_chains_receipts.sql` | Trust Evidence Chains Receipts (Applied legacy foundation) | `202606090001` | feature schema, function or RPC, index creation, policy hardening, table creation; creates 13, alters 2 | deterministic seed/configuration inserts | yes | HISTORICAL | Applied Production history; never edit |
| `202606090003` | `202606090003_operational_trust_intelligence.sql` | Operational Trust Intelligence (Applied legacy foundation) | `202606090002` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 18, alters 1 | bounded update/backfill path; row volume unknown | yes | HISTORICAL | Applied Production history; never edit |
| `202606100001` | `202606100001_runtime_validation_logs.sql` | Runtime Validation Logs (Pre-Epic 16 release foundation) | `202606090003` | feature schema, index creation, policy hardening, table creation, validation; creates 5, alters 1 | none | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202606180001` | `202606180001_enterprise_ai_trust_governance.sql` | Enterprise Ai Trust Governance (Pre-Epic 16 release foundation) | `202606100001` | constraint hardening, data backfill, feature schema, index creation, policy hardening, table creation; creates 17, alters 4 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202606190001` | `202606190001_verifiers.sql` | Verifiers (Pre-Epic 16 release foundation) | `202606180001` | constraint hardening, feature schema, index creation, policy hardening, table creation; creates 5, alters 1 | none | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202606190002` | `202606190002_session_integrity_signal_separation.sql` | Session Integrity Signal Separation (Pre-Epic 16 release foundation) | `202606190001` | compatibility repair, constraint hardening, feature schema, function or RPC, index creation, policy hardening, table creation; creates 16, alters 4 | deterministic seed/configuration inserts | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202606190003` | `202606190003_hopae_connect_upstream_identity.sql` | Hopae Connect Upstream Identity (Pre-Epic 16 release foundation) | `202606190002` | data backfill, feature schema, index creation, policy hardening, table creation; creates 5, alters 4 | bounded update/backfill path; row volume unknown | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202606270001` | `202606270001_screenshot_support_debugging.sql` | Screenshot Support Debugging (Pre-Epic 16 release foundation) | `202606190003` | constraint hardening, data backfill, feature schema, index creation, policy hardening, table creation; creates 6, alters 1 | bounded update/backfill path; row volume unknown | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202607010001` | `202607010001_production_owner_scoped_rls.sql` | Production Owner Scoped Rls (Pre-Epic 16 release foundation) | `202606270001` | data backfill, feature schema, policy hardening; creates 11, alters 6 | bounded update/backfill path; row volume unknown | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202607020001` | `202607020001_critical_trust_infrastructure_alignment.sql` | Critical Trust Infrastructure Alignment (Pre-Epic 16 release foundation) | `202607010001` | compatibility repair, constraint hardening, feature schema, index creation; creates 1, alters 2 | none | no | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607160001` | `202607160001_release_1_rc1_provider_evidence_gate.sql` | Release 1 Rc1 Provider Evidence Gate (Release 1 / Epic 16-17) | `202607020001` | data backfill, feature schema, function or RPC, index creation, policy hardening; creates 22, alters 8 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607160002` | `202607160002_release_1_rc2_living_trust_privacy.sql` | Release 1 Rc2 Living Trust Privacy (Release 1 / Epic 16-17) | `202607160001` | data backfill, feature schema, function or RPC, policy hardening; creates 7, alters 1 | bounded update/backfill path; row volume unknown | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202607160003` | `202607160003_release_1_rc6_production_evidence_gate.sql` | Release 1 Rc6 Production Evidence Gate (Release 1 / Epic 16-17) | `202607160002` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 18, alters 7 | bounded delete path; staging evidence required | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607170001` | `202607170001_operational_risk_intelligence_shadow.sql` | Operational Risk Intelligence Shadow (Release 1 / Epic 16-17) | `202607160003` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 19, alters 5 | bounded delete path; staging evidence required | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607170002` | `202607170002_provider_abstraction_hopae.sql` | Provider Abstraction Hopae (Release 1 / Epic 16-17) | `202607170001` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 12, alters 6 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607190001` | `202607190001_identity_signal_engine.sql` | Identity Signal Engine (Epic 17) | `202607170002` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 27, alters 1 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607190002` | `202607190002_identity_signal_runtime.sql` | Identity Signal Runtime (Epic 17) | `202607190001` | constraint hardening, data backfill, feature schema, index creation, policy hardening; creates 16, alters 6 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607200001` | `202607200001_canonical_trust_event_foundation.sql` | Canonical Trust Event Foundation (Epic 17) | `202607190002` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 38, alters 2 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607200002` | `202607200002_enterprise_trust_consent_manager.sql` | Enterprise Trust Consent Manager (Epic 17) | `202607200001` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 36, alters 2 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607200003` | `202607200003_provider_consensus_engine.sql` | Provider Consensus Engine (Epic 17) | `202607200002` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 34, alters 2 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607210001` | `202607210001_enterprise_trust_architecture.sql` | Enterprise Trust Architecture (Epic 18) | `202607200003` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 54, alters 5 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607210002` | `202607210002_continuous_trust_runtime.sql` | Continuous Trust Runtime (Epic 19) | `202607210001` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 14, alters 5 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607230001` | `202607230001_trust_intelligence_engine.sql` | Trust Intelligence Engine (Epic 20) | `202607210002` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 47, alters 1 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607230002` | `202607230002_enterprise_trust_graph.sql` | Enterprise Trust Graph (Epic 21) | `202607230001` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 28, alters 1 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607240001` | `202607240001_trust_dna_engine.sql` | Trust Dna Engine (Epic 22) | `202607230002` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 12, alters 3 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607240002` | `202607240002_replay_timeline_engine.sql` | Replay Timeline Engine (Epic 23) | `202607240001` | constraint hardening, feature schema, function or RPC, index creation; creates 13, alters 1 | deterministic seed/configuration inserts | no | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607240003` | `202607240003_continuous_trust_engine.sql` | Continuous Trust Engine (Epic 24) | `202607240002` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 44, alters 3 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202607240004` | `202607240004_enterprise_trust_centre.sql` | Enterprise Trust Centre (Epic 25) | `202607240003` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation; creates 5, alters 1 | bounded update/backfill path; row volume unknown | yes | MEDIUM | Stop before next phase; restore isolated staging or forward-repair |
| `202607310001` | `202607310001_environment_attestation_scope_continuity.sql` | Environment Attestation Scope Continuity (Epic 26) | `202607240004` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation, view or projection; creates 34, alters 1 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202608010001` | `202608010001_ai_serious_incident_regulatory_lineage.sql` | Ai Serious Incident Regulatory Lineage (Epic 27) | `202607310001` | constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation, view or projection; creates 50, alters 3 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |
| `202608010002` | `202608010002_enterprise_trust_fabric.sql` | Enterprise Trust Fabric (Epic 28) | `202608010001` | data backfill, feature schema, function or RPC, index creation, policy hardening, table creation, view or projection; creates 22, alters 4 | bounded update/backfill path; row volume unknown | yes | HIGH | Stop before next phase; restore isolated staging or forward-repair |

## Detailed per-migration inventory

### 001 — 001_initial_schema.sql

- Purpose / feature: Initial Schema; Applied legacy foundation.
- Classification: constraint hardening, data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `Supabase managed baseline`.
- Tables created: `public.audit_logs`, `public.decisions`, `public.evidence_files`, `public.passports`, `public.risk_scores`, `public.signals`, `public.trust_reports`, `public.verification_cases`, `public.verification_passports`, `public.waitlist`.
- Tables altered: `public.audit_logs`, `public.decisions`, `public.evidence_files`, `public.passports`, `public.risk_scores`, `public.signals`, `public.trust_reports`, `public.verification_cases`, `public.verification_passports`, `public.waitlist`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.audit_logs.allow authenticated audit reads`, `public.audit_logs.allow public audit inserts`, `public.decisions.allow authenticated decision inserts`, `public.decisions.allow authenticated decision reads`, `public.evidence_files.allow authenticated evidence reads`, `public.passports.allow authenticated passport inserts`, `public.passports.allow authenticated passport reads`, `public.passports.allow authenticated passport updates`, `public.risk_scores.allow authenticated risk score reads`, `public.signals.allow authenticated signal inserts`, `public.signals.allow authenticated signal reads`, `public.trust_reports.allow authenticated trust report inserts`, `public.trust_reports.allow authenticated trust report reads`, `public.verification_cases.allow authenticated verification case inserts`, `public.verification_cases.allow authenticated verification case reads`, `public.verification_cases.allow authenticated verification case updates`, `public.waitlist.allow authenticated waitlist reads`, `public.waitlist.allow public waitlist inserts`.
- Indexes: none.
- Constraints: `decisions_status_check`, `if`, `verification_cases_decision_type_check`, `verification_cases_status_check`, `verification_cases_verification_status_check`.
- Triggers: none.
- Grant/revoke categories: `REVOKE UPDATE, DELETE ON`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:3, dropConstraint:4, dropPolicy:18, update:5.

### 202605260001 — 202605260001_private_beta_schema_fix.sql

- Purpose / feature: Private Beta Schema Fix; Applied legacy foundation.
- Classification: compatibility repair, feature schema, table creation.
- Expected order / dependency boundary: after `001`.
- Tables created: `public.api_keys`, `public.team_members`, `public.teams`.
- Tables altered: `public.audit_logs`, `public.decisions`, `public.evidence_files`, `public.passports`, `public.risk_scores`, `public.signals`, `public.trust_reports`, `public.verification_cases`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: none.
- Destructive review signals: cascade:4.

### 20260528 — 20260528_explicit_supabase_api_grants.sql

- Purpose / feature: Explicit Supabase Api Grants; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `202605260001`.
- Tables created: none.
- Tables altered: `public.public`, `public.waitlist`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.public.allow authenticated %s inserts`, `public.public.allow authenticated %s reads`, `public.public.allow authenticated %s updates`, `public.waitlist.allow authenticated waitlist inserts`, `public.waitlist.allow authenticated waitlist reads`, `public.waitlist.allow authenticated waitlist updates`, `public.waitlist.allow public waitlist inserts`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `GRANT USAGE ON`, `GRANT USAGE, SELECT ON`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:25, update:5.

### 202605300001 — 202605300001_evidence_upload_flow.sql

- Purpose / feature: Evidence Upload Flow; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `20260528`.
- Tables created: none.
- Tables altered: `public.evidence_files`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.evidence_files.allow authenticated evidence_files inserts`, `public.evidence_files.allow authenticated evidence_files reads`, `public.evidence_files.allow authenticated evidence_files updates`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:4, update:2.

### 202605300002 — 202605300002_align_evidence_file_url.sql

- Purpose / feature: Align Evidence File Url; Applied legacy foundation.
- Classification: compatibility repair, data backfill, feature schema.
- Expected order / dependency boundary: after `202605300001`.
- Tables created: none.
- Tables altered: `public.evidence_files`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropColumn:1, update:1.

### 202605300003 — 202605300003_add_signal_metadata.sql

- Purpose / feature: Add Signal Metadata; Applied legacy foundation.
- Classification: additive schema.
- Expected order / dependency boundary: after `202605300002`.
- Tables created: none.
- Tables altered: `public.signals`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: none.
- Destructive review signals: none.

### 202605310001 — 202605310001_real_evidence_file_upload.sql

- Purpose / feature: Real Evidence File Upload; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `202605300003`.
- Tables created: none.
- Tables altered: `public.evidence_files`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.storage.allow authenticated evidence file reads`, `public.storage.allow authenticated evidence file updates`, `public.storage.allow authenticated evidence file uploads`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:3, update:2, insert:1.

### 202606010001 — 202606010001_intent_requests.sql

- Purpose / feature: Intent Requests; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202605310001`.
- Tables created: `public.intent_requests`.
- Tables altered: `public.intent_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.intent_requests.authenticated manage intent_requests`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606010002 — 202606010002_autonomy_profiles.sql

- Purpose / feature: Autonomy Profiles; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606010001`.
- Tables created: `public.autonomy_profiles`.
- Tables altered: `public.autonomy_profiles`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.autonomy_profiles.authenticated manage autonomy_profiles`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606010003 — 202606010003_passport_state_checks.sql

- Purpose / feature: Passport State Checks; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606010002`.
- Tables created: `public.passport_state_checks`.
- Tables altered: `public.passport_state_checks`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.passport_state_checks.authenticated manage passport_state_checks`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606010004 — 202606010004_execution_passports.sql

- Purpose / feature: Execution Passports; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606010003`.
- Tables created: `public.execution_passports`.
- Tables altered: `public.execution_passports`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.execution_passports.authenticated manage execution_passports`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606020001 — 202606020001_trust_graph_engine_help.sql

- Purpose / feature: Trust Graph Engine Help; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606010004`.
- Tables created: `public.help_questions`, `public.trust_graph_edges`, `public.trust_graph_nodes`.
- Tables altered: `public.help_questions`, `public.trust_graph_edges`, `public.trust_graph_nodes`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.help_questions.authenticated manage help_questions`, `public.trust_graph_edges.authenticated manage trust_graph_edges`, `public.trust_graph_nodes.authenticated manage trust_graph_nodes`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:3, update:3.

### 202606020002 — 202606020002_harden_operational_tables.sql

- Purpose / feature: Harden Operational Tables; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `202606020001`.
- Tables created: none.
- Tables altered: `public.audit_logs`, `public.decisions`, `public.help_questions`, `public.signals`, `public.trust_graph_edges`, `public.trust_graph_nodes`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.audit_logs.authenticated manage audit_logs`, `public.decisions.authenticated manage decisions`, `public.help_questions.authenticated manage help_questions`, `public.signals.authenticated manage signals`, `public.trust_graph_edges.authenticated manage trust_graph_edges`, `public.trust_graph_nodes.authenticated manage trust_graph_nodes`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:6, update:6.

### 202606020004 — 202606020004_help_question_traceability.sql

- Purpose / feature: Help Question Traceability; Applied legacy foundation.
- Classification: data backfill, feature schema.
- Expected order / dependency boundary: after `202606020002`.
- Tables created: none.
- Tables altered: `public.help_questions`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: update:2.

### 202606020005 — 202606020005_trust_assistant_questions.sql

- Purpose / feature: Trust Assistant Questions; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606020004`.
- Tables created: `public.trust_assistant_questions`.
- Tables altered: `public.trust_assistant_questions`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.trust_assistant_questions.admin manage trust_assistant_questions`, `public.trust_assistant_questions.authenticated insert trust_assistant_questions`, `public.trust_assistant_questions.authenticated own read trust_assistant_questions`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:3, update:1.

### 202606020006 — 202606020006_knowledge_articles.sql

- Purpose / feature: Knowledge Articles; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606020005`.
- Tables created: `public.knowledge_articles`.
- Tables altered: `public.knowledge_articles`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.knowledge_articles.admin manage knowledge_articles`, `public.knowledge_articles.authenticated read approved knowledge_articles`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:2, update:1.

### 202606030001 — 202606030001_data_rights_requests.sql

- Purpose / feature: Data Rights Requests; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606020006`.
- Tables created: `public.data_rights_requests`.
- Tables altered: `public.data_rights_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.data_rights_requests.authenticated manage data_rights_requests`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606030002 — 202606030002_messages_notifications_appeals.sql

- Purpose / feature: Messages Notifications Appeals; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606030001`.
- Tables created: `public.appeals`, `public.message_events`, `public.message_threads`, `public.notifications`.
- Tables altered: `public.appeals`, `public.message_events`, `public.message_threads`, `public.notifications`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.appeals.admin manage appeals`, `public.appeals.users manage own appeals`, `public.message_events.admin manage message_events`, `public.message_events.users manage own message_events`, `public.message_threads.admin manage message_threads`, `public.message_threads.users manage own message_threads`, `public.notifications.admin manage notifications`, `public.notifications.users manage own notifications`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:1, dropPolicy:8, update:4.

### 202606030003 — 202606030003_ai_trust_event_pipeline.sql

- Purpose / feature: Ai Trust Event Pipeline; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606030002`.
- Tables created: `public.agent_permissions`, `public.agents`, `public.trust_events`.
- Tables altered: `public.agent_permissions`, `public.agents`, `public.trust_events`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.agent_permissions.admin manage agent_permissions`, `public.agent_permissions.users create own agent_permissions`, `public.agent_permissions.users read own agent_permissions`, `public.agents.admin manage agents`, `public.agents.users manage own agents`, `public.trust_events.admin manage trust_events`, `public.trust_events.users create own trust_events`, `public.trust_events.users read own trust_events`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:8, update:2.

### 202606030004 — 202606030004_developer_platform_api_keys.sql

- Purpose / feature: Developer Platform Api Keys; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606030003`.
- Tables created: `public.api_keys`.
- Tables altered: `public.api_keys`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.api_keys.admin manage api_keys`, `public.api_keys.users manage own api_keys`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:2, update:1.

### 202606030005 — 202606030005_enterprise_access_requests.sql

- Purpose / feature: Enterprise Access Requests; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606030004`.
- Tables created: `public.enterprise_access_requests`.
- Tables altered: `public.enterprise_access_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.enterprise_access_requests.authenticated manage enterprise access requests`, `public.enterprise_access_requests.public insert enterprise access requests`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:2, update:1.

### 202606030006 — 202606030006_private_evidence_bucket.sql

- Purpose / feature: Private Evidence Bucket; Applied legacy foundation.
- Classification: data backfill, feature schema.
- Expected order / dependency boundary: after `202606030005`.
- Tables created: none.
- Tables altered: none.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: update:1, insert:1.

### 202606040001 — 202606040001_feedback_signal_intelligence.sql

- Purpose / feature: Feedback Signal Intelligence; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606030006`.
- Tables created: `public.feedback_reports`, `public.interest_signals`.
- Tables altered: `public.feedback_reports`, `public.interest_signals`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.feedback_reports.authenticated manage feedback_reports`, `public.interest_signals.authenticated manage interest_signals`, `public.interest_signals.public insert interest_signals`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:3, update:2.

### 202606040002 — 202606040002_ensure_enterprise_access_requests_public_submit.sql

- Purpose / feature: Ensure Enterprise Access Requests Public Submit; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606040001`.
- Tables created: `public.enterprise_access_requests`.
- Tables altered: `public.enterprise_access_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.enterprise_access_requests.authenticated manage enterprise access requests`, `public.enterprise_access_requests.public insert enterprise access requests`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:2, update:1.

### 202606040003 — 202606040003_enterprise_access_problem_category.sql

- Purpose / feature: Enterprise Access Problem Category; Applied legacy foundation.
- Classification: additive schema.
- Expected order / dependency boundary: after `202606040002`.
- Tables created: none.
- Tables altered: `public.enterprise_access_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: none.
- Destructive review signals: none.

### 202606050001 — 202606050001_enterprise_access_design_partner_signals.sql

- Purpose / feature: Enterprise Access Design Partner Signals; Applied legacy foundation.
- Classification: additive schema.
- Expected order / dependency boundary: after `202606040003`.
- Tables created: none.
- Tables altered: `public.enterprise_access_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: none.
- Destructive review signals: none.

### 202606050002 — 202606050002_billing_subscriptions_usage_limits.sql

- Purpose / feature: Billing Subscriptions Usage Limits; Applied legacy foundation.
- Classification: data backfill, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606050001`.
- Tables created: `public.billing_customers`, `public.subscriptions`, `public.usage_limits`.
- Tables altered: `public.billing_customers`, `public.subscriptions`, `public.usage_limits`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.billing_customers.users can read own billing customers`, `public.subscriptions.users can read own subscriptions`, `public.usage_limits.users can read own usage limits`.
- Indexes: `public.billing_customers_user_id_idx`, `public.subscriptions_stripe_customer_id_idx`, `public.subscriptions_user_id_idx`, `public.usage_limits_user_id_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:2, dropPolicy:3, update:3.

### 202606050003 — 202606050003_harden_enterprise_access_insert_permissions.sql

- Purpose / feature: Harden Enterprise Access Insert Permissions; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `202606050002`.
- Tables created: none.
- Tables altered: `public.enterprise_access_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.enterprise_access_requests.public insert enterprise access requests`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606050004 — 202606050004_submit_enterprise_access_request_rpc.sql

- Purpose / feature: Submit Enterprise Access Request Rpc; Applied legacy foundation.
- Classification: feature schema, function or RPC.
- Expected order / dependency boundary: after `202606050003`.
- Tables created: none.
- Tables altered: none.
- Views: none.
- Functions/RPCs: `public.submit_enterprise_access_request`.
- Policies: none.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`.
- Data impact/backfill: deterministic seed/configuration inserts.
- Destructive review signals: replaceFunction:1, insert:1.

### 202606060001 — 202606060001_trusted_hiring_mvp.sql

- Purpose / feature: Trusted Hiring Mvp; Applied legacy foundation.
- Classification: data backfill, feature schema, policy hardening, table creation.
- Expected order / dependency boundary: after `202606050004`.
- Tables created: `public.admin_reviews`, `public.candidate_profiles`, `public.interview_risk_signals`, `public.interview_sessions`, `public.liveness_checks`, `public.recruiter_profiles`, `public.trust_scores`, `public.verification_events`.
- Tables altered: `public.admin_reviews`, `public.candidate_profiles`, `public.interview_risk_signals`, `public.interview_sessions`, `public.liveness_checks`, `public.recruiter_profiles`, `public.trust_scores`, `public.verification_events`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.admin_reviews.admin reviews owner insert`, `public.admin_reviews.admin reviews owner select`, `public.admin_reviews.admin reviews owner update`, `public.candidate_profiles.candidate profiles owner insert`, `public.candidate_profiles.candidate profiles owner select`, `public.candidate_profiles.candidate profiles owner update`, `public.interview_risk_signals.interview risk signals owner insert`, `public.interview_risk_signals.interview risk signals owner select`, `public.interview_risk_signals.interview risk signals owner update`, `public.interview_sessions.interview sessions owner insert`, `public.interview_sessions.interview sessions owner select`, `public.interview_sessions.interview sessions owner update`, `public.liveness_checks.liveness checks owner insert`, `public.liveness_checks.liveness checks owner select`, `public.liveness_checks.liveness checks owner update`, `public.recruiter_profiles.recruiter profiles owner insert`, `public.recruiter_profiles.recruiter profiles owner select`, `public.recruiter_profiles.recruiter profiles owner update`, `public.trust_scores.trust scores owner insert`, `public.trust_scores.trust scores owner select`, `public.trust_scores.trust scores owner update`, `public.verification_events.verification events owner insert`, `public.verification_events.verification events owner select`, `public.verification_events.verification events owner update`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:4, dropPolicy:24, update:8.

### 202606070001 — 202606070001_ai_agent_identity_direction.sql

- Purpose / feature: Ai Agent Identity Direction; Applied legacy foundation.
- Classification: data backfill, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606060001`.
- Tables created: `public.agent_activity`, `public.ai_agents`.
- Tables altered: `public.agent_activity`, `public.ai_agents`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.agent_activity.users insert own agent activity`, `public.agent_activity.users read own agent activity`, `public.ai_agents.users manage own ai agents`.
- Indexes: `public.agent_activity_agent_id_idx`, `public.ai_agents_owner_user_id_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:2, dropPolicy:3, update:1.

### 202606070002 — 202606070002_trust_algorithm_runs.sql

- Purpose / feature: Trust Algorithm Runs; Applied legacy foundation.
- Classification: feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606070001`.
- Tables created: `public.trust_algorithm_runs`.
- Tables altered: `public.trust_algorithm_runs`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.trust_algorithm_runs.authenticated insert trust algorithm runs`, `public.trust_algorithm_runs.authenticated read trust algorithm runs`.
- Indexes: `public.trust_algorithm_runs_subject_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606070003 — 202606070003_integration_status.sql

- Purpose / feature: Integration Status; Applied legacy foundation.
- Classification: feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606070002`.
- Tables created: `public.integration_status`.
- Tables altered: `public.integration_status`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.integration_status.admin insert integration status`, `public.integration_status.admin read integration status`.
- Indexes: `public.integration_status_provider_checked_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606070004 — 202606070004_api_test_runs.sql

- Purpose / feature: Api Test Runs; Applied legacy foundation.
- Classification: feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606070003`.
- Tables created: `public.api_test_runs`.
- Tables altered: `public.api_test_runs`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.api_test_runs.admin insert api test runs`, `public.api_test_runs.admin read api test runs`.
- Indexes: `public.api_test_runs_name_created_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606070005 — 202606070005_launch_control_notes.sql

- Purpose / feature: Launch Control Notes; Applied legacy foundation.
- Classification: data backfill, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606070004`.
- Tables created: `public.launch_control_notes`.
- Tables altered: `public.launch_control_notes`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.launch_control_notes.admin manage launch control notes`.
- Indexes: `public.launch_control_notes_created_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606080001 — 202606080001_trust_relationships.sql

- Purpose / feature: Trust Relationships; Applied legacy foundation.
- Classification: feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606070005`.
- Tables created: `public.trust_relationships`.
- Tables altered: `public.trust_relationships`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.trust_relationships.authenticated insert trust_relationships`, `public.trust_relationships.authenticated read trust_relationships`.
- Indexes: `public.trust_relationships_source_idx`, `public.trust_relationships_target_idx`, `public.trust_relationships_type_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606080002 — 202606080002_trust_timeline_events.sql

- Purpose / feature: Trust Timeline Events; Applied legacy foundation.
- Classification: feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606080001`.
- Tables created: `public.trust_timeline_events`.
- Tables altered: `public.trust_timeline_events`.
- Views: none.
- Functions/RPCs: `public.trust_timeline_actor_id`, `public.trust_timeline_record_agent_activity`, `public.trust_timeline_record_algorithm_run`, `public.trust_timeline_record_audit`, `public.trust_timeline_record_decision`, `public.trust_timeline_record_event`, `public.trust_timeline_record_evidence`, `public.trust_timeline_record_relationship`, `public.trust_timeline_record_signal`, `public.trust_timeline_record_trust_event`, `public.trust_timeline_safe_timestamptz`, `public.trust_timeline_safe_uuid`, `public.trust_timeline_subject_id`, `public.trust_timeline_subject_type`.
- Policies: `public.trust_timeline_events.authenticated insert trust_timeline_events`, `public.trust_timeline_events.authenticated read trust_timeline_events`.
- Indexes: `public.trust_timeline_events_severity_idx`, `public.trust_timeline_events_subject_idx`, `public.trust_timeline_events_type_idx`.
- Constraints: none.
- Triggers: `public.agent_activity.trust_timeline_agent_activity_insert`, `public.audit_logs.trust_timeline_audit_insert`, `public.decisions.trust_timeline_decision_insert`, `public.evidence_files.trust_timeline_evidence_insert`, `public.signals.trust_timeline_signal_insert`, `public.trust_algorithm_runs.trust_timeline_algorithm_run_insert`, `public.trust_events.trust_timeline_trust_event_insert`, `public.trust_relationships.trust_timeline_relationship_insert`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: deterministic seed/configuration inserts.
- Destructive review signals: dropPolicy:2, replaceFunction:14, insert:1.

### 202606080003 — 202606080003_trust_replay_sessions.sql

- Purpose / feature: Trust Replay Sessions; Applied legacy foundation.
- Classification: feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606080002`.
- Tables created: `public.trust_replay_sessions`.
- Tables altered: `public.trust_replay_sessions`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.trust_replay_sessions.authenticated insert trust_replay_sessions`, `public.trust_replay_sessions.authenticated read trust_replay_sessions`.
- Indexes: `public.trust_replay_sessions_created_at_idx`, `public.trust_replay_sessions_subject_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606080004 — 202606080004_trust_workspaces_cases.sql

- Purpose / feature: Trust Workspaces Cases; Applied legacy foundation.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606080003`.
- Tables created: `public.trust_case_relationships`, `public.trust_cases`, `public.trust_workspaces`, `public.workspace_members`.
- Tables altered: `public.trust_case_relationships`, `public.trust_cases`, `public.trust_workspaces`, `public.workspace_members`.
- Views: none.
- Functions/RPCs: `public.record_trust_case_created`, `public.record_trust_case_relationship_created`.
- Policies: `public.trust_case_relationships.authenticated manage trust_case_relationships`, `public.trust_cases.authenticated manage trust_cases`, `public.trust_workspaces.authenticated manage trust_workspaces`, `public.workspace_members.authenticated manage workspace_members`.
- Indexes: `public.trust_case_relationships_case_idx`, `public.trust_cases_workspace_idx`, `public.trust_workspaces_created_by_idx`, `public.workspace_members_workspace_idx`.
- Constraints: `trust_cases_priority_check`, `trust_cases_status_check`, `workspace_members_role_check`.
- Triggers: `public.trust_case_relationships.trust_case_relationship_created_timeline`, `public.trust_cases.trust_case_created_timeline`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:3, dropPolicy:4, replaceFunction:2, update:4, insert:5.

### 202606080005 — 202606080005_operational_governance_engine.sql

- Purpose / feature: Operational Governance Engine; Applied legacy foundation.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606080004`.
- Tables created: `public.governance_actions`, `public.governance_policies`.
- Tables altered: `public.governance_actions`, `public.governance_policies`.
- Views: none.
- Functions/RPCs: `public.create_governance_action_if_needed`, `public.ensure_governance_policy`, `public.governance_from_agent_activity`, `public.governance_from_ai_audit`, `public.governance_from_case_missing_evidence`, `public.governance_from_signal`, `public.governance_from_trust_algorithm_run`, `public.record_governance_action_created`, `public.record_governance_action_updated`.
- Policies: `public.governance_actions.authenticated manage governance_actions`, `public.governance_policies.authenticated manage governance_policies`.
- Indexes: `public.governance_actions_assigned_idx`, `public.governance_actions_policy_idx`, `public.governance_actions_subject_idx`, `public.governance_policies_workspace_idx`.
- Constraints: `governance_actions_status_check`.
- Triggers: `public.agent_activity.governance_agent_activity_insert`, `public.audit_logs.governance_ai_audit_insert`, `public.governance_actions.governance_action_created_records`, `public.governance_actions.governance_action_updated_records`, `public.signals.governance_signal_insert`, `public.trust_algorithm_runs.governance_trust_algorithm_run`, `public.trust_cases.governance_case_missing_evidence`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:2, dropPolicy:2, replaceFunction:9, update:4, insert:7.

### 202606080006 — 202606080006_operational_hardening_rls.sql

- Purpose / feature: Operational Hardening Rls; Applied legacy foundation.
- Classification: compatibility repair, data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `202606080005`.
- Tables created: none.
- Tables altered: `public.ai_agents`, `public.audit_logs`, `public.evidence_files`, `public.governance_actions`, `public.governance_policies`, `public.passports`, `public.signals`, `public.subscriptions`, `public.trust_case_relationships`, `public.trust_cases`, `public.trust_relationships`, `public.trust_timeline_events`, `public.trust_workspaces`, `public.workspace_members`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.trust_case_relationships.workspace members read case relationships`, `public.trust_case_relationships.workspace reviewers create case relationships`, `public.trust_cases.workspace members create trust cases`, `public.trust_cases.workspace members read trust cases`, `public.trust_cases.workspace reviewers update trust cases`, `public.trust_workspaces.authenticated users create own workspaces`, `public.trust_workspaces.workspace owners and members read workspaces`, `public.trust_workspaces.workspace owners update workspaces`, `public.workspace_members.workspace owners and self add members`, `public.workspace_members.workspace owners update members`, `public.workspace_members.workspace participants read members`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:15, update:9.

### 202606080007 — 202606080007_operational_notifications_coordination.sql

- Purpose / feature: Operational Notifications Coordination; Applied legacy foundation.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606080006`.
- Tables created: `public.notifications`.
- Tables altered: `public.governance_actions`, `public.notifications`, `public.trust_cases`.
- Views: none.
- Functions/RPCs: `public.notification_insert`, `public.notify_ai_recommendation_audit`, `public.notify_governance_action_insert`, `public.notify_governance_action_update`, `public.notify_suspicious_agent_activity`, `public.notify_trust_case_update`.
- Policies: `public.notifications.admin manage notifications`, `public.notifications.users create own notifications`, `public.notifications.users read own notifications`, `public.notifications.users update own notifications`.
- Indexes: `public.notifications_type_idx`, `public.notifications_user_read_idx`.
- Constraints: none.
- Triggers: `public.agent_activity.notify_suspicious_agent_activity`, `public.audit_logs.notify_ai_recommendation_audit`, `public.governance_actions.notify_governance_action_insert`, `public.governance_actions.notify_governance_action_update`, `public.trust_cases.notify_trust_case_update`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:5, replaceFunction:6, update:7, insert:4.

### 202606090001 — 202606090001_hiring_security_interview_integrity.sql

- Purpose / feature: Hiring Security Interview Integrity; Applied legacy foundation.
- Classification: compatibility repair, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606080007`.
- Tables created: `public.interview_risk_events`.
- Tables altered: `public.candidate_profiles`, `public.interview_risk_events`, `public.interview_sessions`, `public.recruiter_profiles`.
- Views: none.
- Functions/RPCs: `public.hiring_risk_event_records`.
- Policies: `public.interview_risk_events.interview risk events owner insert`, `public.interview_risk_events.interview risk events owner select`, `public.interview_risk_events.interview risk events owner update`.
- Indexes: `public.interview_risk_events_session_idx`, `public.interview_risk_events_signal_idx`.
- Constraints: none.
- Triggers: `public.interview_risk_events.hiring_risk_event_records`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:3, dropPolicy:3, replaceFunction:1, update:6, insert:5.

### 202606090002 — 202606090002_trust_evidence_chains_receipts.sql

- Purpose / feature: Trust Evidence Chains Receipts; Applied legacy foundation.
- Classification: feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606090001`.
- Tables created: `public.evidence_chains`, `public.verification_receipts`.
- Tables altered: `public.evidence_chains`, `public.verification_receipts`.
- Views: none.
- Functions/RPCs: `public.evidence_chain_record_integrity`, `public.trust_receipt_record_integrity`.
- Policies: `public.evidence_chains.authenticated insert evidence_chains`, `public.evidence_chains.authenticated read evidence_chains`, `public.verification_receipts.authenticated insert verification_receipts`, `public.verification_receipts.authenticated read verification_receipts`.
- Indexes: `public.evidence_chains_subject_idx`, `public.verification_receipts_subject_idx`, `public.verification_receipts_type_idx`.
- Constraints: none.
- Triggers: `public.evidence_chains.evidence_chains_integrity_insert`, `public.verification_receipts.verification_receipts_integrity_insert`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: deterministic seed/configuration inserts.
- Destructive review signals: dropPolicy:4, replaceFunction:2, insert:6.

### 202606090003 — 202606090003_operational_trust_intelligence.sql

- Purpose / feature: Operational Trust Intelligence; Applied legacy foundation.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606090002`.
- Tables created: `public.operational_intelligence_events`.
- Tables altered: `public.operational_intelligence_events`.
- Views: none.
- Functions/RPCs: `public.operational_intelligence_from_agent_activity`, `public.operational_intelligence_from_governance`, `public.operational_intelligence_from_interview_risk`, `public.operational_intelligence_from_trust_case`, `public.operational_intelligence_record_integrity`.
- Policies: `public.operational_intelligence_events.authenticated insert operational_intelligence_events`, `public.operational_intelligence_events.authenticated read operational_intelligence_events`.
- Indexes: `public.operational_intelligence_subject_idx`, `public.operational_intelligence_type_idx`, `public.operational_intelligence_workspace_idx`.
- Constraints: none.
- Triggers: `public.agent_activity.operational_intelligence_agent_activity_insert`, `public.governance_actions.operational_intelligence_governance_insert`, `public.governance_actions.operational_intelligence_governance_update`, `public.interview_risk_events.operational_intelligence_interview_risk_insert`, `public.operational_intelligence_events.operational_intelligence_event_integrity_insert`, `public.trust_cases.operational_intelligence_trust_case_insert`, `public.trust_cases.operational_intelligence_trust_case_update`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:2, replaceFunction:5, update:2, insert:7.

### 202606100001 — 202606100001_runtime_validation_logs.sql

- Purpose / feature: Runtime Validation Logs; Pre-Epic 16 release foundation.
- Classification: feature schema, index creation, policy hardening, table creation, validation.
- Expected order / dependency boundary: after `202606090003`.
- Tables created: `public.runtime_validation_logs`.
- Tables altered: `public.runtime_validation_logs`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.runtime_validation_logs.admin insert runtime validation logs`, `public.runtime_validation_logs.admin read runtime validation logs`.
- Indexes: `public.runtime_validation_logs_created_idx`, `public.runtime_validation_logs_state_created_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606180001 — 202606180001_enterprise_ai_trust_governance.sql

- Purpose / feature: Enterprise Ai Trust Governance; Pre-Epic 16 release foundation.
- Classification: constraint hardening, data backfill, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606100001`.
- Tables created: `public.provenance_events`, `public.trust_alerts`, `public.trust_certifications`.
- Tables altered: `public.ai_agents`, `public.provenance_events`, `public.trust_alerts`, `public.trust_certifications`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.provenance_events.authenticated insert provenance events`, `public.provenance_events.authenticated read provenance events`, `public.trust_alerts.authenticated manage own trust alerts`, `public.trust_certifications.authenticated manage own trust certifications`.
- Indexes: `public.ai_agents_enterprise_status_idx`, `public.ai_agents_owner_email_idx`, `public.provenance_events_subject_idx`, `public.provenance_events_type_idx`, `public.trust_alerts_created_by_idx`, `public.trust_alerts_subject_idx`, `public.trust_alerts_type_status_idx`, `public.trust_certifications_created_by_idx`, `public.trust_certifications_subject_idx`, `public.trust_certifications_type_status_idx`.
- Constraints: `ai_agents_trust_score_check`, `provenance_events_subject_check`, `trust_alerts_status_check`, `trust_alerts_type_check`, `trust_certifications_score_check`, `trust_certifications_status_check`, `trust_certifications_type_check`.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:4, update:2.

### 202606190001 — 202606190001_verifiers.sql

- Purpose / feature: Verifiers; Pre-Epic 16 release foundation.
- Classification: constraint hardening, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606180001`.
- Tables created: `public.verifiers`.
- Tables altered: `public.verifiers`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.verifiers.authenticated create own verifier application`, `public.verifiers.authenticated read verifiers`.
- Indexes: `public.verifiers_email_idx`, `public.verifiers_status_created_idx`.
- Constraints: `verifiers_assigned_cases_check`, `verifiers_completed_reviews_check`, `verifiers_status_check`, `verifiers_trust_score_check`, `verifiers_type_check`.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: none.
- Destructive review signals: dropPolicy:2.

### 202606190002 — 202606190002_session_integrity_signal_separation.sql

- Purpose / feature: Session Integrity Signal Separation; Pre-Epic 16 release foundation.
- Classification: compatibility repair, constraint hardening, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606190001`.
- Tables created: `public.device_channel_evidence`, `public.injection_risk_events`, `public.session_integrity_checks`, `public.verification_signals`.
- Tables altered: `public.device_channel_evidence`, `public.injection_risk_events`, `public.session_integrity_checks`, `public.verification_signals`.
- Views: none.
- Functions/RPCs: `public.record_session_integrity_check`, `public.record_session_verification_flag`.
- Policies: `public.device_channel_evidence.session integrity channel evidence access`, `public.injection_risk_events.session integrity injection access`, `public.session_integrity_checks.session integrity owner access`, `public.verification_signals.session integrity child signal access`.
- Indexes: `public.device_channel_evidence_session_idx`, `public.injection_risk_events_session_idx`, `public.session_integrity_checks_session_idx`, `public.verification_signals_session_idx`.
- Constraints: `injection_risk_level_check`, `injection_risk_score_check`, `session_integrity_status_check`, `verification_signals_category_check`, `verification_signals_risk_check`, `verification_signals_score_check`.
- Triggers: `public.session_integrity_checks.session_integrity_check_records`, `public.verification_signals.session_verification_signal_records`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: deterministic seed/configuration inserts.
- Destructive review signals: cascade:14, dropPolicy:4, replaceFunction:2, insert:4.

### 202606190003 — 202606190003_hopae_connect_upstream_identity.sql

- Purpose / feature: Hopae Connect Upstream Identity; Pre-Epic 16 release foundation.
- Classification: data backfill, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606190002`.
- Tables created: `public.hopae_verifications`, `public.hopae_webhook_events`.
- Tables altered: `public.hopae_verifications`, `public.hopae_webhook_events`, `public.passports`, `public.trust_reports`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.hopae_verifications.users manage own hopae verifications`.
- Indexes: `public.hopae_verifications_owner_idx`, `public.hopae_webhook_verification_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT, UPDATE ON`, `REVOKE ALL ON`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, update:1.

### 202606270001 — 202606270001_screenshot_support_debugging.sql

- Purpose / feature: Screenshot Support Debugging; Pre-Epic 16 release foundation.
- Classification: constraint hardening, data backfill, feature schema, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202606190003`.
- Tables created: `public.support_issues`.
- Tables altered: `public.support_issues`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.support_issues.users create own support issues`, `public.support_issues.users read own support issues`.
- Indexes: `public.support_issues_status_created_idx`, `public.support_issues_user_created_idx`, `public.support_issues_workflow_idx`.
- Constraints: `support_issues_status_check`, `support_issues_type_check`.
- Triggers: none.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON TABLE`, `GRANT SELECT, INSERT ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:2, dropPolicy:2, update:1, insert:1.

### 202607010001 — 202607010001_production_owner_scoped_rls.sql

- Purpose / feature: Production Owner Scoped Rls; Pre-Epic 16 release foundation.
- Classification: data backfill, feature schema, policy hardening.
- Expected order / dependency boundary: after `202606270001`.
- Tables created: none.
- Tables altered: `public.admin_actions`, `public.audit_logs`, `public.governance_logs`, `public.passports`, `public.trust_reports`, `public.verification_cases`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.audit_logs.audit owners insert`, `public.audit_logs.audit owners read`, `public.passports.passport owners insert`, `public.passports.passport owners read`, `public.passports.passport owners update`, `public.trust_reports.trust report owners insert`, `public.trust_reports.trust report owners read`, `public.trust_reports.trust report owners update`, `public.verification_cases.verification case owners insert`, `public.verification_cases.verification case owners read`, `public.verification_cases.verification case owners update`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT SELECT, INSERT ON TABLE`, `GRANT SELECT, INSERT, UPDATE ON TABLE`, `REVOKE ALL ON TABLE`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:24, update:6.

### 202607020001 — 202607020001_critical_trust_infrastructure_alignment.sql

- Purpose / feature: Critical Trust Infrastructure Alignment; Pre-Epic 16 release foundation.
- Classification: compatibility repair, constraint hardening, feature schema, index creation.
- Expected order / dependency boundary: after `202607010001`.
- Tables created: none.
- Tables altered: `public.ai_agents`, `public.verification_signals`.
- Views: none.
- Functions/RPCs: none.
- Policies: none.
- Indexes: `public.ai_agents_registry_status_idx`.
- Constraints: `if`, `verification_signals_category_check`.
- Triggers: none.
- Grant/revoke categories: none.
- Data impact/backfill: none.
- Destructive review signals: dropConstraint:1.

### 202607160001 — 202607160001_release_1_rc1_provider_evidence_gate.sql

- Purpose / feature: Release 1 Rc1 Provider Evidence Gate; Release 1 / Epic 16-17.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening.
- Expected order / dependency boundary: after `202607020001`.
- Tables created: none.
- Tables altered: `public.evidence_chains`, `public.governance_policies`, `public.hopae_verifications`, `public.hopae_webhook_events`, `public.trust_relationships`, `public.trust_replay_sessions`, `public.trust_timeline_events`, `public.verification_receipts`.
- Views: none.
- Functions/RPCs: `public.persist_rc1_trust_assessment`, `public.prevent_trust_memory_mutation`, `public.user_can_access_trust_workspace`.
- Policies: `public.evidence_chains.tenant scoped insert evidence_chains`, `public.evidence_chains.tenant scoped read evidence_chains`, `public.trust_relationships.tenant scoped insert trust_relationships`, `public.trust_relationships.tenant scoped read trust_relationships`, `public.trust_replay_sessions.tenant scoped insert trust_replay_sessions`, `public.trust_replay_sessions.tenant scoped read trust_replay_sessions`, `public.trust_timeline_events.tenant scoped insert trust_timeline_events`, `public.trust_timeline_events.tenant scoped read trust_timeline_events`, `public.verification_receipts.tenant scoped insert verification_receipts`, `public.verification_receipts.tenant scoped read verification_receipts`.
- Indexes: `public.evidence_chains_workspace_idx`, `public.hopae_verifications_correlation_idx`, `public.hopae_verifications_workspace_workflow_idx`, `public.hopae_webhook_workspace_workflow_idx`, `public.trust_relationships_workspace_idx`, `public.trust_replay_workspace_idx`, `public.trust_timeline_workspace_idx`, `public.verification_receipts_workspace_idx`.
- Constraints: none.
- Triggers: `public.trust_timeline_events.trust_memory_append_only`.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:9, dropPolicy:10, replaceFunction:3, update:3, insert:7.

### 202607160002 — 202607160002_release_1_rc2_living_trust_privacy.sql

- Purpose / feature: Release 1 Rc2 Living Trust Privacy; Release 1 / Epic 16-17.
- Classification: data backfill, feature schema, function or RPC, policy hardening.
- Expected order / dependency boundary: after `202607160001`.
- Tables created: none.
- Tables altered: `public.governance_policies`.
- Views: none.
- Functions/RPCs: `public.record_trust_memory_tombstone`.
- Policies: `public.governance_actions.tenant scoped insert governance_actions`, `public.governance_actions.tenant scoped read governance_actions`, `public.governance_actions.tenant scoped update governance_actions`, `public.governance_policies.tenant scoped insert governance_policies`, `public.governance_policies.tenant scoped read governance_policies`, `public.governance_policies.tenant scoped update governance_policies`.
- Indexes: none.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:2, replaceFunction:1, update:4, insert:2.

### 202607160003 — 202607160003_release_1_rc6_production_evidence_gate.sql

- Purpose / feature: Release 1 Rc6 Production Evidence Gate; Release 1 / Epic 16-17.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607160002`.
- Tables created: `public.operational_measurements`, `public.provider_execution_records`, `public.release_evidence_checks`, `public.release_validation_cases`, `public.release_validation_reviews`, `public.webhook_event_ledger`.
- Tables altered: `public.hopae_webhook_events`, `public.operational_measurements`, `public.provider_execution_records`, `public.release_evidence_checks`, `public.release_validation_cases`, `public.release_validation_reviews`, `public.webhook_event_ledger`.
- Views: none.
- Functions/RPCs: `public.export_rc6_performance_summary`, `public.prune_expired_rc6_evidence`, `public.review_release_validation_case`.
- Policies: `public.provider_execution_records.tenant members read provider executions`.
- Indexes: `public.operational_measurements_scope_idx`, `public.operational_measurements_tenant_idx`, `public.provider_execution_records_tenant_idx`, `public.release_evidence_checks_latest_idx`, `public.release_validation_cases_scope_idx`, `public.release_validation_reviews_case_idx`, `public.webhook_event_ledger_retention_idx`, `public.webhook_event_ledger_tenant_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded delete path; staging evidence required.
- Destructive review signals: delete:2, cascade:3, dropPolicy:1, replaceFunction:3, update:2, insert:1.

### 202607170001 — 202607170001_operational_risk_intelligence_shadow.sql

- Purpose / feature: Operational Risk Intelligence Shadow; Release 1 / Epic 16-17.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607160003`.
- Tables created: `public.ori_feature_registry`, `public.ori_inference_records`, `public.ori_model_registry`, `public.ori_model_state_audit`, `public.ori_reviewer_outcomes`.
- Tables altered: `public.ori_feature_registry`, `public.ori_inference_records`, `public.ori_model_registry`, `public.ori_model_state_audit`, `public.ori_reviewer_outcomes`.
- Views: none.
- Functions/RPCs: `public.audit_ori_model_state_change`, `public.prevent_ori_reviewer_outcome_mutation`, `public.prune_expired_ori_inferences`, `public.record_ori_reviewer_outcome`.
- Policies: `public.ori_inference_records.tenant members read ori inference records`, `public.ori_reviewer_outcomes.tenant members read ori reviewer outcomes`.
- Indexes: `public.ori_inference_retention_idx`, `public.ori_inference_tenant_session_idx`, `public.ori_inference_validation_idx`, `public.ori_model_audit_registry_idx`, `public.ori_one_shadow_model_per_scope_idx`, `public.ori_reviewer_outcome_inference_idx`.
- Constraints: `if`, `ori_inference_records_latest_reviewer_outcome_fk`.
- Triggers: `public.ori_model_registry.ori_model_state_change_audit`, `public.ori_reviewer_outcomes.ori_reviewer_outcome_immutable`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded delete path; staging evidence required.
- Destructive review signals: delete:1, cascade:3, dropConstraint:1, dropPolicy:2, replaceFunction:4, update:3, insert:4.

### 202607170002 — 202607170002_provider_abstraction_hopae.sql

- Purpose / feature: Provider Abstraction Hopae; Release 1 / Epic 16-17.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607170001`.
- Tables created: `public.normalized_identity_evidence`, `public.provider_operational_health_snapshots`, `public.provider_registry`, `public.provider_state_audit`.
- Tables altered: `public.hopae_verifications`, `public.normalized_identity_evidence`, `public.provider_execution_records`, `public.provider_operational_health_snapshots`, `public.provider_registry`, `public.provider_state_audit`.
- Views: none.
- Functions/RPCs: `public.persist_provider_identity_evidence`, `public.set_provider_enabled`.
- Policies: `public.normalized_identity_evidence.tenant members read normalized identity evidence`.
- Indexes: `public.normalized_identity_evidence_provider_idx`, `public.normalized_identity_evidence_scope_idx`, `public.provider_execution_session_idx`, `public.provider_operational_health_snapshots_provider_idx`, `public.provider_state_audit_provider_idx`.
- Constraints: none.
- Triggers: none.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:2, dropPolicy:1, replaceFunction:2, update:2, insert:3.

### 202607190001 — 202607190001_identity_signal_engine.sql

- Purpose / feature: Identity Signal Engine; Epic 17.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607170002`.
- Tables created: `public.identity_audit_events`, `public.identity_confidence_results`, `public.identity_provider_capabilities`, `public.identity_provider_transactions`, `public.identity_signal_evidence`, `public.identity_subjects`, `public.identity_verification_requests`.
- Tables altered: `public.public`.
- Views: none.
- Functions/RPCs: `public.identity_workspace_role`, `public.prevent_identity_audit_mutation`.
- Policies: `public.identity_audit_events.tenant members read identity audit events`, `public.identity_confidence_results.tenant members read identity confidence results`, `public.identity_provider_capabilities.authenticated read provider capabilities`, `public.identity_provider_transactions.tenant members read identity provider transactions`, `public.identity_signal_evidence.tenant members read identity signal evidence`, `public.identity_subjects.tenant members read identity subjects`, `public.identity_verification_requests.tenant members read identity verification requests`.
- Indexes: `public.identity_audit_enterprise_created_idx`, `public.identity_confidence_request_idx`, `public.identity_confidence_subject_idx`, `public.identity_provider_transaction_request_idx`, `public.identity_signal_request_idx`, `public.identity_signal_subject_idx`, `public.identity_subject_enterprise_created_idx`, `public.identity_subject_external_reference_idx`, `public.identity_verification_idempotency_idx`, `public.identity_verification_subject_created_idx`.
- Constraints: `identity_audit_actor_check`, `identity_confidence_band_check`, `identity_confidence_score_check`, `identity_confidence_status_check`, `identity_provider_implementation_check`, `identity_provider_runtime_check`, `identity_provider_transaction_latency_check`, `identity_provider_transaction_status_check`, `identity_signal_confidence_check`, `identity_signal_digest_check`, `identity_signal_outcome_check`, `identity_subjects_external_hash_check`, `identity_subjects_type_check`, `identity_verification_idempotency_check`, `identity_verification_request_hash_check`, `identity_verification_signals_check`, `identity_verification_status_check`.
- Triggers: `public.identity_audit_events.identity_audit_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:12, replaceFunction:2, update:2, insert:1.

### 202607190002 — 202607190002_identity_signal_runtime.sql

- Purpose / feature: Identity Signal Runtime; Epic 17.
- Classification: constraint hardening, data backfill, feature schema, index creation, policy hardening.
- Expected order / dependency boundary: after `202607190001`.
- Tables created: none.
- Tables altered: `public.identity_audit_events`, `public.identity_confidence_results`, `public.identity_provider_capabilities`, `public.identity_provider_transactions`, `public.identity_signal_evidence`, `public.identity_verification_requests`.
- Views: none.
- Functions/RPCs: none.
- Policies: `public.identity_provider_capabilities.enterprise members read provider capabilities`, `public.identity_subjects.authorized operators create identity subjects`, `public.identity_verification_requests.authorized operators create identity verification requests`.
- Indexes: `public.identity_audit_request_created_idx`, `public.identity_provider_capability_enterprise_idx`, `public.identity_provider_capability_scope_unique_idx`, `public.identity_provider_event_unique_idx`, `public.identity_provider_query_idx`, `public.identity_provider_transaction_unique_idx`, `public.identity_request_enterprise_id_idx`, `public.identity_signal_provider_event_unique_idx`, `public.identity_signal_provider_query_idx`, `public.identity_subject_enterprise_id_idx`, `public.identity_transaction_enterprise_id_idx`, `public.identity_verification_enterprise_status_idx`, `public.identity_verification_operation_idempotency_idx`.
- Constraints: `identity_audit_request_tenant_fk`, `identity_audit_subject_tenant_fk`, `identity_confidence_contradiction_check`, `identity_confidence_request_tenant_fk`, `identity_confidence_subject_tenant_fk`, `identity_evidence_request_tenant_fk`, `identity_evidence_subject_tenant_fk`, `identity_evidence_transaction_tenant_fk`, `identity_provider_capabilities_id_pkey`, `identity_provider_capabilities_pkey`, `identity_request_subject_tenant_fk`, `identity_signal_payload_hash_check`, `identity_signal_status_check`, `identity_transaction_payload_hash_check`, `identity_transaction_request_tenant_fk`.
- Triggers: none.
- Grant/revoke categories: `GRANT INSERT ON`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:1, dropConstraint:1, dropPolicy:3, update:1.

### 202607200001 — 202607200001_canonical_trust_event_foundation.sql

- Purpose / feature: Canonical Trust Event Foundation; Epic 17.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607190002`.
- Tables created: `public.evidence_object_access`, `public.evidence_objects`, `public.trust_event_audit`, `public.trust_event_chain_heads`, `public.trust_event_envelopes`, `public.trust_event_links`.
- Tables altered: `public.public`, `public.trust_events`.
- Views: none.
- Functions/RPCs: `public.append_trust_event_v1`, `public.prevent_canonical_trust_history_mutation`, `public.prevent_finalized_trust_event_envelope_mutation`, `public.prevent_trust_event_audit_mutation`, `public.reserve_trust_event_envelope_v1`.
- Policies: `public.evidence_object_access.authorized principals read evidence access`, `public.evidence_objects.tenant members read evidence metadata`, `public.trust_event_audit.tenant members read trust event audit`, `public.trust_event_chain_heads.tenant members read trust event chain heads`, `public.trust_event_envelopes.tenant members read trust event envelopes`, `public.trust_event_links.tenant members read trust event links`, `public.trust_events.admin manage trust_events`, `public.trust_events.tenant members read canonical trust events`, `public.trust_events.users create own trust_events`.
- Indexes: `public.evidence_object_access_principal_idx`, `public.evidence_objects_enterprise_idx`, `public.trust_event_audit_enterprise_idx`, `public.trust_event_envelope_delivery_idx`, `public.trust_event_envelope_idempotency_idx`, `public.trust_event_envelope_nonce_idx`, `public.trust_event_envelope_provider_event_idx`, `public.trust_event_envelope_provider_refs_idx`, `public.trust_event_links_target_idx`, `public.trust_events_enterprise_hash_unique_idx`, `public.trust_events_enterprise_sequence_unique_idx`, `public.trust_events_event_id_unique_idx`, `public.trust_events_session_v1_idx`, `public.trust_events_subject_v1_idx`, `public.trust_events_workflow_v1_idx`.
- Constraints: `evidence_access_level_check`, `evidence_object_boundary_check`, `evidence_vault_encryption_check`, `trust_event_chain_head_hash_check`, `trust_event_envelope_disposition_check`, `trust_event_envelope_hash_check`, `trust_event_envelope_protocol_check`, `trust_events_v1_actor_type_check`, `trust_events_v1_event_type_check`, `trust_events_v1_integrity_check`, `trust_events_v1_protocol_check`, `trust_events_v1_required_fields_check`, `trust_events_v1_subject_type_check`.
- Triggers: `public.trust_event_audit.trust_event_audit_append_only`, `public.trust_event_envelopes.finalized_trust_event_envelopes_immutable`, `public.trust_events.canonical_trust_events_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT INSERT ON`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:5, dropPolicy:3, replaceFunction:5, update:4, insert:10.

### 202607200002 — 202607200002_enterprise_trust_consent_manager.sql

- Purpose / feature: Enterprise Trust Consent Manager; Epic 17.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607200001`.
- Tables created: `public.consent_audit_log`, `public.consent_categories`, `public.consent_cookies`, `public.consent_events`, `public.consent_policy_versions`, `public.consent_preferences`, `public.consent_providers`, `public.consent_purposes`, `public.consent_receipts`, `public.consent_region_profiles`, `public.consent_tracker_catalogue`.
- Tables altered: `public.public`, `public.trust_events`.
- Views: none.
- Functions/RPCs: `public.create_consent_policy_v1`, `public.persist_consent_change_v1`, `public.prevent_consent_history_mutation`.
- Policies: `public.consent_categories.tenant members read consent categories`, `public.consent_cookies.tenant members read consent cookies`, `public.consent_events.users read own consent events`, `public.consent_policy_versions.tenant members read consent policies`, `public.consent_preferences.users read own consent preferences`, `public.consent_providers.tenant members read consent providers`, `public.consent_purposes.tenant members read consent purposes`, `public.consent_receipts.users read own consent receipts`, `public.consent_region_profiles.tenant members read consent regions`, `public.consent_tracker_catalogue.tenant members read consent trackers`.
- Indexes: `public.consent_category_scope_idx`, `public.consent_cookies_scope_idx`, `public.consent_events_subject_idx`, `public.consent_policy_version_scope_idx`, `public.consent_provider_scope_idx`, `public.consent_purpose_scope_idx`, `public.consent_receipts_subject_idx`, `public.consent_region_scope_idx`, `public.consent_tracker_scope_idx`.
- Constraints: `consent_essential_required_check`, `consent_preference_one_subject_check`, `consent_receipt_categories_check`, `consent_receipt_one_subject_check`, `if`, `trust_events_v1_event_type_check`, `unknown_trackers_not_essential`.
- Triggers: `public.consent_audit_log.consent_audit_append_only`, `public.consent_events.consent_events_append_only`, `public.consent_receipts.consent_receipts_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:10, dropConstraint:1, replaceFunction:3, update:4, insert:14.

### 202607200003 — 202607200003_provider_consensus_engine.sql

- Purpose / feature: Provider Consensus Engine; Epic 17.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607200002`.
- Tables created: `public.consensus_audit_log`, `public.consensus_conflicts`, `public.consensus_decision_evidence`, `public.consensus_decisions`, `public.consensus_policies`, `public.consensus_policy_versions`, `public.provider_capability_versions`, `public.provider_health_snapshots`, `public.provider_observations`, `public.subject_trust_state`.
- Tables altered: `public.public`, `public.trust_events`.
- Views: none.
- Functions/RPCs: `public.create_consensus_policy_v1`, `public.persist_consensus_decision_v1`, `public.prevent_consensus_history_mutation`, `public.record_provider_health_v1`.
- Policies: `public.consensus_conflicts.tenant reads consensus conflicts`, `public.consensus_decision_evidence.tenant reads consensus evidence`, `public.consensus_decisions.tenant reads consensus decisions`, `public.consensus_policies.tenant reads consensus policies`, `public.consensus_policy_versions.tenant reads consensus policy versions`, `public.provider_capability_versions.tenant reads provider capabilities`, `public.provider_health_snapshots.tenant reads provider health`, `public.provider_observations.tenant reads provider observations`, `public.subject_trust_state.tenant reads subject trust state`.
- Indexes: `public.consensus_decisions_subject_idx`, `public.provider_health_latest_idx`, `public.provider_observations_subject_idx`.
- Constraints: `if`, `trust_events_v1_event_type_check`.
- Triggers: `public.consensus_audit_log.consensus_audit_log_append_only`, `public.consensus_conflicts.consensus_conflicts_append_only`, `public.consensus_decision_evidence.consensus_decision_evidence_append_only`, `public.consensus_decisions.consensus_decisions_append_only`, `public.consensus_policy_versions.consensus_policy_versions_append_only`, `public.provider_capability_versions.provider_capability_versions_append_only`, `public.provider_health_snapshots.provider_health_snapshots_append_only`, `public.provider_observations.provider_observations_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:7, dropConstraint:1, replaceFunction:4, update:3, insert:13.

### 202607210001 — 202607210001_enterprise_trust_architecture.sql

- Purpose / feature: Enterprise Trust Architecture; Epic 18.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607200003`.
- Tables created: `public.evidence_graph_edges`, `public.evidence_graph_nodes`, `public.trust_architecture_audit_log`, `public.trust_decision_contracts`, `public.trust_domain_versions`, `public.trust_kpi_snapshots`, `public.trust_memory_index`, `public.trust_policy_versions`, `public.trust_references`, `public.trust_simulation_results`, `public.trust_simulations`, `public.trust_state_decisions`, `public.trust_subjects`.
- Tables altered: `public.consent_receipts`, `public.evidence_objects`, `public.provider_observations`, `public.public`, `public.subject_trust_state`.
- Views: none.
- Functions/RPCs: `public.apply_trust_state_decision_v1`, `public.create_trust_policy_version_v1`, `public.index_evidence_graph_v1`, `public.materialize_consent_receipt_evidence_v1`, `public.materialize_provider_observation_evidence_v1`, `public.normalize_legacy_evidence_object_v1`, `public.persist_consensus_decision_v1`, `public.persist_trust_simulation_v1`, `public.prevent_trust_architecture_history_mutation`.
- Policies: `public.evidence_graph_edges.tenant reads graph edges`, `public.evidence_graph_nodes.tenant reads graph nodes`, `public.trust_decision_contracts.tenant reads decision contracts`, `public.trust_domain_versions.authenticated reads active domain registry`, `public.trust_kpi_snapshots.tenant reads kpi snapshots`, `public.trust_memory_index.tenant reads trust memory`, `public.trust_policy_versions.tenant reads trust policies`, `public.trust_references.tenant reads trust references`, `public.trust_simulation_results.tenant reads simulation results`, `public.trust_simulations.tenant reads simulations`, `public.trust_state_decisions.tenant reads state decisions`, `public.trust_subjects.tenant reads trust subjects`.
- Indexes: `public.evidence_graph_edges_from_idx`, `public.evidence_graph_edges_to_idx`, `public.evidence_objects_evidence_id_unique`, `public.trust_memory_subject_idx`.
- Constraints: `evidence_objects_epic18_integrity`, `if`, `subject_trust_state_state_epic18_check`.
- Triggers: `public.consent_receipts.consent_receipts_evidence_v1`, `public.evidence_graph_edges.evidence_graph_edges_epic18_append_only`, `public.evidence_graph_nodes.evidence_graph_nodes_epic18_append_only`, `public.evidence_objects.evidence_objects_epic18_normalize`, `public.evidence_objects.evidence_objects_graph_index_v1`, `public.provider_observations.provider_observations_evidence_v1`, `public.trust_architecture_audit_log.trust_architecture_audit_log_epic18_append_only`, `public.trust_decision_contracts.trust_decision_contracts_epic18_append_only`, `public.trust_domain_versions.trust_domain_versions_epic18_append_only`, `public.trust_kpi_snapshots.trust_kpi_snapshots_epic18_append_only`, `public.trust_memory_index.trust_memory_index_epic18_append_only`, `public.trust_policy_versions.trust_policy_versions_epic18_append_only`, `public.trust_references.trust_references_epic18_append_only`, `public.trust_simulation_results.trust_simulation_results_epic18_append_only`, `public.trust_simulations.trust_simulations_epic18_append_only`, `public.trust_state_decisions.trust_state_decisions_epic18_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:11, dropConstraint:1, replaceFunction:9, update:5, insert:35.

### 202607210002 — 202607210002_continuous_trust_runtime.sql

- Purpose / feature: Continuous Trust Runtime; Epic 19.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607210001`.
- Tables created: `public.continuous_trust_assessments`, `public.trust_drift_findings`.
- Tables altered: `public.evidence_graph_edges`, `public.evidence_objects`, `public.public`, `public.subject_trust_state`, `public.trust_alerts`.
- Views: none.
- Functions/RPCs: `public.apply_continuous_trust_assessment_v1`, `public.transition_continuous_trust_alert_v1`.
- Policies: `public.continuous_trust_assessments.tenant reads continuous trust assessments`, `public.trust_alerts.tenant reads continuous trust alerts`, `public.trust_drift_findings.tenant reads trust drift findings`.
- Indexes: `public.continuous_trust_assessments_subject_idx`, `public.evidence_objects_runtime_due_idx`, `public.subject_trust_state_next_evaluation_idx`, `public.trust_alerts_runtime_idx`, `public.trust_drift_findings_subject_idx`.
- Constraints: `evidence_graph_edges_edge_type_epic19_check`, `evidence_objects_freshness_policy_check`, `evidence_objects_superseded_by_fk`, `if`, `subject_trust_state_freshness_check`, `subject_trust_state_score_check`, `trust_alerts_enterprise_fk`, `trust_alerts_severity_epic19_check`, `trust_alerts_status_epic19_check`, `trust_alerts_type_epic19_check`.
- Triggers: `public.continuous_trust_assessments.continuous_trust_assessments_append_only`, `public.trust_drift_findings.trust_drift_findings_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`, `REVOKE INSERT,UPDATE,DELETE ON`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:1, dropConstraint:3, dropPolicy:1, replaceFunction:2, update:6, insert:7.

### 202607230001 — 202607230001_trust_intelligence_engine.sql

- Purpose / feature: Trust Intelligence Engine; Epic 20.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607210002`.
- Tables created: `public.evidence_nodes`, `public.evidence_relationships`, `public.provider_results`, `public.replay_events`, `public.trust_dimensions`, `public.trust_history`, `public.trust_intelligence_signals`, `public.trust_intelligence_updates`, `public.trust_profiles`.
- Tables altered: `public.public`.
- Views: none.
- Functions/RPCs: `public.persist_trust_profile_v1`, `public.project_evidence_node_v1`, `public.project_provider_result_v1`, `public.record_trust_signal_v1`.
- Policies: `public.evidence_nodes.tenant reads evidence nodes`, `public.evidence_relationships.tenant reads evidence relationships`, `public.provider_results.tenant reads provider results`, `public.replay_events.tenant reads replay events`, `public.trust_dimensions.tenant reads trust dimensions`, `public.trust_history.tenant reads trust history`, `public.trust_intelligence_signals.tenant reads trust intelligence signals`, `public.trust_intelligence_updates.tenant reads trust intelligence updates`, `public.trust_profiles.tenant reads trust profiles`.
- Indexes: `public.evidence_nodes_identity_history_idx`, `public.evidence_nodes_source_evidence_idx`, `public.evidence_nodes_type_status_idx`, `public.evidence_relationships_from_idx`, `public.evidence_relationships_to_idx`, `public.provider_results_health_idx`, `public.provider_results_identity_idx`, `public.replay_events_identity_idx`, `public.trust_dimensions_profile_idx`, `public.trust_history_identity_idx`, `public.trust_intelligence_signals_identity_idx`, `public.trust_intelligence_signals_source_idx`, `public.trust_intelligence_updates_identity_idx`, `public.trust_profiles_identity_idx`.
- Constraints: none.
- Triggers: `public.evidence_nodes.evidence_nodes_append_only`, `public.evidence_objects.evidence_objects_trust_intelligence_projection_v1`, `public.evidence_relationships.evidence_relationships_append_only`, `public.provider_observations.provider_observations_trust_intelligence_projection_v1`, `public.provider_results.provider_results_append_only`, `public.replay_events.replay_events_append_only`, `public.trust_dimensions.trust_dimensions_append_only`, `public.trust_history.trust_history_append_only`, `public.trust_intelligence_signals.trust_intelligence_signals_append_only`, `public.trust_intelligence_updates.trust_intelligence_updates_append_only`, `public.trust_profiles.trust_profiles_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: replaceFunction:4, update:10, insert:10.

### 202607230002 — 202607230002_enterprise_trust_graph.sql

- Purpose / feature: Enterprise Trust Graph; Epic 21.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607230001`.
- Tables created: `public.trust_entities`, `public.trust_evidence`, `public.trust_graph_events`, `public.trust_graph_relationships_v2`, `public.trust_sources`.
- Tables altered: `public.public`.
- Views: none.
- Functions/RPCs: `public.mutate_trust_graph_v1`, `public.trust_entity_summary_v1`, `public.trust_graph_orphans_v1`, `public.trust_graph_statistics_v1`.
- Policies: `public.trust_entities.tenant reads trust entities`, `public.trust_evidence.tenant reads trust graph evidence`, `public.trust_graph_events.tenant reads trust graph events`, `public.trust_graph_relationships_v2.tenant reads trust graph relationships v2`, `public.trust_sources.tenant reads trust sources`.
- Indexes: `public.trust_entities_tenant_name_idx`, `public.trust_entities_tenant_type_status_idx`, `public.trust_evidence_entity_idx`, `public.trust_evidence_match_key_idx`, `public.trust_evidence_provider_idx`, `public.trust_graph_events_correlation_idx`, `public.trust_graph_events_entity_idx`, `public.trust_graph_events_resource_idx`, `public.trust_graph_relationships_v2_active_unique_idx`, `public.trust_graph_relationships_v2_source_idx`, `public.trust_graph_relationships_v2_target_idx`, `public.trust_sources_health_idx`.
- Constraints: none.
- Triggers: `public.trust_evidence.trust_evidence_append_only`, `public.trust_graph_events.trust_graph_events_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: replaceFunction:4, update:6, insert:5.

### 202607240001 — 202607240001_trust_dna_engine.sql

- Purpose / feature: Trust Dna Engine; Epic 22.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607230002`.
- Tables created: `public.trust_dimension_scores`, `public.trust_score_history`.
- Tables altered: `public.trust_dimension_scores`, `public.trust_profiles`, `public.trust_score_history`.
- Views: none.
- Functions/RPCs: `public.persist_trust_dna_v2`.
- Policies: `public.trust_dimension_scores.tenant reads trust dimension scores`, `public.trust_score_history.tenant reads trust score history`.
- Indexes: `public.trust_dimension_scores_entity_idx`, `public.trust_profiles_v1_snapshot_uidx`, `public.trust_profiles_v2_entity_version_uidx`, `public.trust_profiles_v2_latest_idx`, `public.trust_score_history_entity_idx`.
- Constraints: `trust_profiles_entity_fk`, `trust_profiles_previous_profile_fk`, `trust_profiles_tenant_id_identity_id_evidence_snapshot_hash_key`, `trust_profiles_v2_shape_ck`.
- Triggers: `public.trust_dimension_scores.trust_dimension_scores_append_only`, `public.trust_score_history.trust_score_history_append_only`.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropConstraint:1, replaceFunction:1, update:2, insert:3.

### 202607240002 — 202607240002_replay_timeline_engine.sql

- Purpose / feature: Replay Timeline Engine; Epic 23.
- Classification: constraint hardening, feature schema, function or RPC, index creation.
- Expected order / dependency boundary: after `202607240001`.
- Tables created: none.
- Tables altered: `public.replay_events`.
- Views: none.
- Functions/RPCs: `public.append_replay_event_internal_v2`, `public.append_replay_event_v2`, `public.capture_trust_dna_replay_v2`, `public.capture_trust_evidence_replay_v2`.
- Policies: none.
- Indexes: `public.replay_events_actor_idx`, `public.replay_events_entity_time_idx`, `public.replay_events_evidence_type_idx`, `public.replay_events_id_uidx`, `public.replay_events_provider_idx`, `public.replay_events_risk_idx`, `public.replay_events_trust_idx`.
- Constraints: `replay_events_entity_fk`, `replay_events_event_hash_ck`, `replay_events_event_type_check`, `replay_events_previous_hash_ck`, `replay_events_risk_after_ck`, `replay_events_risk_before_ck`.
- Triggers: `public.trust_evidence.trust_evidence_replay_capture_v2`, `public.trust_profiles.trust_dna_replay_capture_v2`.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: deterministic seed/configuration inserts.
- Destructive review signals: dropConstraint:1, replaceFunction:4, insert:1.

### 202607240003 — 202607240003_continuous_trust_engine.sql

- Purpose / feature: Continuous Trust Engine; Epic 24.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607240002`.
- Tables created: `public.trust_alert_history`, `public.trust_manual_overrides`, `public.trust_manual_review_history`, `public.trust_manual_reviews`, `public.trust_policy_decisions`, `public.trust_processing_failures`, `public.trust_signal_processing`, `public.trust_signals`.
- Tables altered: `public.public`, `public.trust_alerts`, `public.trust_drift_findings`.
- Views: none.
- Functions/RPCs: `public.apply_continuous_trust_override_v1`, `public.claim_continuous_trust_jobs_v1`, `public.claim_continuous_trust_signal_v1`, `public.fail_continuous_trust_signal_v1`, `public.finalize_continuous_trust_signal_v1`, `public.ingest_continuous_trust_signal_v1`, `public.project_continuous_trust_signal_v1`, `public.record_continuous_trust_signal_rejection_v1`, `public.transition_continuous_trust_alert_v2`, `public.transition_continuous_trust_review_v1`.
- Policies: `public.trust_alert_history.tenant reads alert history`, `public.trust_manual_overrides.tenant reads manual overrides`, `public.trust_manual_review_history.tenant reads manual review history`, `public.trust_manual_reviews.tenant reads manual reviews`, `public.trust_policy_decisions.tenant reads signal policy decisions`, `public.trust_processing_failures.tenant reads signal failures`, `public.trust_signal_processing.tenant reads signal processing`, `public.trust_signals.tenant reads continuous trust signals`.
- Indexes: `public.trust_alert_history_idx`, `public.trust_drift_findings_signal_idx`, `public.trust_manual_overrides_entity_idx`, `public.trust_manual_review_history_idx`, `public.trust_manual_reviews_queue_idx`, `public.trust_policy_decisions_entity_idx`, `public.trust_processing_failures_signal_idx`, `public.trust_signal_processing_queue_idx`, `public.trust_signal_processing_tenant_idx`, `public.trust_signals_entity_time_idx`, `public.trust_signals_fingerprint_idx`, `public.trust_signals_processing_source_idx`.
- Constraints: `trust_drift_findings_source_ck`.
- Triggers: `public.trust_alert_history.trust_alert_history_append_only`, `public.trust_manual_overrides.trust_manual_overrides_append_only`, `public.trust_manual_review_history.trust_manual_review_history_append_only`, `public.trust_policy_decisions.trust_policy_decisions_append_only`, `public.trust_processing_failures.trust_processing_failures_append_only`, `public.trust_signals.trust_signals_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: replaceFunction:10, update:13, insert:19.

### 202607240004 — 202607240004_enterprise_trust_centre.sql

- Purpose / feature: Enterprise Trust Centre; Epic 25.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation.
- Expected order / dependency boundary: after `202607240003`.
- Tables created: `public.trust_alert_activity`.
- Tables altered: `public.trust_alert_activity`.
- Views: none.
- Functions/RPCs: `public.manage_trust_centre_alerts_v1`.
- Policies: `public.trust_alert_activity.tenant reads trust alert activity`.
- Indexes: `public.trust_alert_activity_timeline_idx`.
- Constraints: none.
- Triggers: `public.trust_alert_activity.trust_alert_activity_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: cascade:2, replaceFunction:1, update:3, insert:2.

### 202607310001 — 202607310001_environment_attestation_scope_continuity.sql

- Purpose / feature: Environment Attestation Scope Continuity; Epic 26.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation, view or projection.
- Expected order / dependency boundary: after `202607240004`.
- Tables created: `public.context_contradiction_events`, `public.environment_attestations`, `public.execution_context_declarations`, `public.scope_authorization_leases`, `public.scope_continuity_decisions`, `public.scope_continuity_reviewer_actions`, `public.scope_decision_attestations`.
- Tables altered: `public.public`.
- Views: `public.scope_continuity_replay`.
- Functions/RPCs: `public.persist_scope_continuity_decision_v1`, `public.prevent_scope_continuity_history_mutation`.
- Policies: `public.context_contradiction_events.tenant reads context contradictions`, `public.environment_attestations.tenant reads environment attestations`, `public.execution_context_declarations.tenant reads execution contexts`, `public.scope_authorization_leases.tenant reads scope leases`, `public.scope_continuity_decisions.tenant reads scope decisions`, `public.scope_continuity_reviewer_actions.tenant reads scope reviewer actions`, `public.scope_decision_attestations.tenant reads decision attestations`.
- Indexes: `public.context_contradiction_context_idx`, `public.context_contradiction_decision_idx`, `public.environment_attestation_context_idx`, `public.environment_attestation_subject_idx`, `public.execution_context_execution_idx`, `public.execution_context_subject_idx`, `public.scope_authorization_active_idx`, `public.scope_authorization_subject_idx`, `public.scope_decision_context_idx`, `public.scope_decision_subject_lookup_idx`.
- Constraints: none.
- Triggers: `public.context_contradiction_events.context_contradiction_events_scope_append_only`, `public.environment_attestations.environment_attestations_scope_append_only`, `public.execution_context_declarations.execution_context_declarations_scope_append_only`, `public.scope_authorization_leases.scope_authorization_leases_scope_append_only`, `public.scope_continuity_decisions.scope_continuity_decisions_scope_append_only`, `public.scope_continuity_reviewer_actions.scope_continuity_reviewer_actions_scope_append_only`, `public.scope_decision_attestations.scope_decision_attestations_scope_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: replaceFunction:2, update:1, insert:14.

### 202608010001 — 202608010001_ai_serious_incident_regulatory_lineage.sql

- Purpose / feature: Ai Serious Incident Regulatory Lineage; Epic 27.
- Classification: constraint hardening, data backfill, feature schema, function or RPC, index creation, policy hardening, table creation, view or projection.
- Expected order / dependency boundary: after `202607310001`.
- Tables created: `public.incident_chronology_events`, `public.incident_corrective_actions`, `public.incident_evidence_snapshots`, `public.incident_evidence_supersessions`, `public.incident_external_submissions`, `public.incident_impact_assessments`, `public.incident_regulatory_assessments`, `public.incident_regulatory_trigger_findings`, `public.incident_responsibility_roles`, `public.incident_reviewer_decisions`, `public.incident_submission_packages`.
- Tables altered: `public.evidence_graph_edges`, `public.incident_reviewer_decisions`, `public.public`.
- Views: `public.incident_reporting_replay`.
- Functions/RPCs: `public.append_serious_incident_record_v1`, `public.persist_serious_incident_case_v1`, `public.prevent_serious_incident_history_mutation`, `public.serious_incident_payload_is_minimized_v1`, `public.serious_incident_transition_allowed_v1`.
- Policies: `public.incident_chronology_events.tenant reads incident_chronology_events`, `public.incident_corrective_actions.tenant reads incident_corrective_actions`, `public.incident_evidence_snapshots.tenant reads incident_evidence_snapshots`, `public.incident_evidence_supersessions.tenant reads incident_evidence_supersessions`, `public.incident_external_submissions.tenant reads incident_external_submissions`, `public.incident_impact_assessments.tenant reads incident_impact_assessments`, `public.incident_regulatory_assessments.tenant reads incident_regulatory_assessments`, `public.incident_regulatory_trigger_findings.tenant reads incident_regulatory_trigger_findings`, `public.incident_responsibility_roles.tenant reads incident_responsibility_roles`, `public.incident_reviewer_decisions.tenant reads incident_reviewer_decisions`, `public.incident_submission_packages.tenant reads incident_submission_packages`.
- Indexes: `public.incident_assessment_state_idx`, `public.incident_assessment_system_idx`, `public.incident_chronology_idx`, `public.incident_corrective_action_idx`, `public.incident_impact_idx`, `public.incident_package_idx`, `public.incident_responsibility_party_idx`, `public.incident_reviewer_decision_idx`, `public.incident_snapshot_idx`, `public.incident_submission_idx`, `public.incident_trigger_idx`.
- Constraints: `evidence_graph_edges_edge_type_check`, `if`, `incident_reviewer_decision_approved_package_fk`.
- Triggers: `public.incident_chronology_events.incident_chronology_events_serious_incident_append_only`, `public.incident_corrective_actions.incident_corrective_actions_serious_incident_append_only`, `public.incident_evidence_snapshots.incident_evidence_snapshots_serious_incident_append_only`, `public.incident_evidence_supersessions.incident_evidence_supersessions_serious_incident_append_only`, `public.incident_external_submissions.incident_external_submissions_serious_incident_append_only`, `public.incident_impact_assessments.incident_impact_assessments_serious_incident_append_only`, `public.incident_regulatory_assessments.incident_regulatory_assessments_serious_incident_append_only`, `public.incident_regulatory_trigger_findings.incident_regulatory_trigger_findings_serious_incident_append_only`, `public.incident_responsibility_roles.incident_responsibility_roles_serious_incident_append_only`, `public.incident_reviewer_decisions.incident_reviewer_decisions_serious_incident_append_only`, `public.incident_submission_packages.incident_submission_packages_serious_incident_append_only`.
- Grant/revoke categories: `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropConstraint:2, replaceFunction:5, update:1, insert:44.

### 202608010002 — 202608010002_enterprise_trust_fabric.sql

- Purpose / feature: Enterprise Trust Fabric; Epic 28.
- Classification: data backfill, feature schema, function or RPC, index creation, policy hardening, table creation, view or projection.
- Expected order / dependency boundary: after `202608010001`.
- Tables created: `public.migration_policy_decisions`, `public.trust_contract_evaluations`, `public.trust_contracts`, `public.trust_fabric_decisions`.
- Tables altered: `public.migration_policy_decisions`, `public.trust_contract_evaluations`, `public.trust_contracts`, `public.trust_fabric_decisions`.
- Views: `public.enterprise_trust_objects`.
- Functions/RPCs: `public.ensure_policy_definition_v1`, `public.ensure_policy_definition_v2`, `public.persist_trust_contract_evaluation_v1`, `public.persist_trust_contract_v1`.
- Policies: `public.trust_contract_evaluations.tenant reads trust contract evaluations`, `public.trust_contracts.tenant reads trust contracts`, `public.trust_fabric_decisions.tenant reads trust fabric decisions`.
- Indexes: `public.trust_contract_evaluation_idx`, `public.trust_contract_outcome_idx`, `public.trust_contract_state_idx`, `public.trust_contract_subject_idx`, `public.trust_fabric_decision_state_idx`, `public.trust_fabric_decision_subject_idx`.
- Constraints: none.
- Triggers: `public.migration_policy_decisions.migration_policy_decisions_append_only`, `public.trust_contract_evaluations.trust_contract_evaluations_append_only`, `public.trust_contracts.trust_contracts_append_only`, `public.trust_fabric_decisions.trust_fabric_decisions_append_only`.
- Grant/revoke categories: `GRANT ALL PRIVILEGES ON`, `GRANT EXECUTE ON FUNCTION`, `GRANT SELECT ON`, `GRANT SELECT,INSERT ON`, `REVOKE ALL ON`, `REVOKE ALL ON FUNCTION`.
- Data impact/backfill: bounded update/backfill path; row volume unknown.
- Destructive review signals: dropPolicy:1, replaceFunction:4, update:4, insert:7.

## Pending lock and performance risk

| Migration | Lock level | Likely rewrite | Index build | Row-volume sensitivity | Transaction duration | PostgREST cache | Function compile | RLS risk | Application compatibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `202606100001_runtime_validation_logs.sql` | MEDIUM | possible on altered tables; prove in staging | 2 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202606180001_enterprise_ai_trust_governance.sql` | HIGH | possible on altered tables; prove in staging | 10 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202606190001_verifiers.sql` | MEDIUM | possible on altered tables; prove in staging | 2 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202606190002_session_integrity_signal_separation.sql` | HIGH | possible on altered tables; prove in staging | 4 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 2 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202606190003_hopae_connect_upstream_identity.sql` | MEDIUM | possible on altered tables; prove in staging | 2 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202606270001_screenshot_support_debugging.sql` | MEDIUM | possible on altered tables; prove in staging | 3 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202607010001_production_owner_scoped_rls.sql` | MEDIUM | possible on altered tables; prove in staging | none | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202607020001_critical_trust_infrastructure_alignment.sql` | HIGH | possible on altered tables; prove in staging | 1 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | none | LOW | Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations. |
| `202607160001_release_1_rc1_provider_evidence_gate.sql` | HIGH | possible on altered tables; prove in staging | 8 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 3 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607160002_release_1_rc2_living_trust_privacy.sql` | MEDIUM | possible on altered tables; prove in staging | none | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | 1 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607160003_release_1_rc6_production_evidence_gate.sql` | HIGH | possible on altered tables; prove in staging | 8 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 3 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607170001_operational_risk_intelligence_shadow.sql` | HIGH | possible on altered tables; prove in staging | 6 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 4 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607170002_provider_abstraction_hopae.sql` | HIGH | possible on altered tables; prove in staging | 5 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 2 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607190001_identity_signal_engine.sql` | HIGH | possible on altered tables; prove in staging | 10 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 2 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607190002_identity_signal_runtime.sql` | HIGH | possible on altered tables; prove in staging | 13 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | none | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607200001_canonical_trust_event_foundation.sql` | HIGH | possible on altered tables; prove in staging | 15 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 5 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607200002_enterprise_trust_consent_manager.sql` | HIGH | possible on altered tables; prove in staging | 9 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 3 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607200003_provider_consensus_engine.sql` | HIGH | possible on altered tables; prove in staging | 3 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 4 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership. |
| `202607210001_enterprise_trust_architecture.sql` | HIGH | possible on altered tables; prove in staging | 4 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 9 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607210002_continuous_trust_runtime.sql` | HIGH | possible on altered tables; prove in staging | 5 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 2 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607230001_trust_intelligence_engine.sql` | HIGH | possible on altered tables; prove in staging | 14 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 4 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607230002_enterprise_trust_graph.sql` | HIGH | possible on altered tables; prove in staging | 12 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 4 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607240001_trust_dna_engine.sql` | HIGH | possible on altered tables; prove in staging | 5 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 1 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607240002_replay_timeline_engine.sql` | HIGH | possible on altered tables; prove in staging | 7 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 4 function/RPC definition(s); compile and privilege validation required | LOW | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607240003_continuous_trust_engine.sql` | HIGH | possible on altered tables; prove in staging | 12 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 10 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607240004_enterprise_trust_centre.sql` | MEDIUM | possible on altered tables; prove in staging | 1 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | MEDIUM until measured | refresh/verify after phase | 1 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections. |
| `202607310001_environment_attestation_scope_continuity.sql` | HIGH | possible on altered tables; prove in staging | 10 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 2 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Adds Environment Attestation and Scope Continuity after all trust and replay prerequisites. |
| `202608010001_ai_serious_incident_regulatory_lineage.sql` | HIGH | possible on altered tables; prove in staging | 11 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 5 function/RPC definition(s); compile and privilege validation required | MEDIUM: new/changed policies and grants | Adds protected serious-incident evidence and regulatory lineage without turning screening into a legal decision. |
| `202608010002_enterprise_trust_fabric.sql` | HIGH | possible on altered tables; prove in staging | 6 non-concurrent index declaration(s); relation sizes unknown | unknown; no Production row count used | HIGH until measured | refresh/verify after phase | 4 function/RPC definition(s); compile and privilege validation required | HIGH: replacement must preserve valid tenant reads | Adds composition records over canonical domain sources; it does not replace Trust Object ownership, Replay or Trust Memory. |

## Applied to Production

- `001` — `001_initial_schema.sql`
- `202605260001` — `202605260001_private_beta_schema_fix.sql`
- `20260528` — `20260528_explicit_supabase_api_grants.sql`
- `202605300001` — `202605300001_evidence_upload_flow.sql`
- `202605300002` — `202605300002_align_evidence_file_url.sql`
- `202605300003` — `202605300003_add_signal_metadata.sql`
- `202605310001` — `202605310001_real_evidence_file_upload.sql`
- `202606010001` — `202606010001_intent_requests.sql`
- `202606010002` — `202606010002_autonomy_profiles.sql`
- `202606010003` — `202606010003_passport_state_checks.sql`
- `202606010004` — `202606010004_execution_passports.sql`
- `202606020001` — `202606020001_trust_graph_engine_help.sql`
- `202606020002` — `202606020002_harden_operational_tables.sql`
- `202606020004` — `202606020004_help_question_traceability.sql`
- `202606020005` — `202606020005_trust_assistant_questions.sql`
- `202606020006` — `202606020006_knowledge_articles.sql`
- `202606030001` — `202606030001_data_rights_requests.sql`
- `202606030002` — `202606030002_messages_notifications_appeals.sql`
- `202606030003` — `202606030003_ai_trust_event_pipeline.sql`
- `202606030004` — `202606030004_developer_platform_api_keys.sql`
- `202606030005` — `202606030005_enterprise_access_requests.sql`
- `202606030006` — `202606030006_private_evidence_bucket.sql`
- `202606040001` — `202606040001_feedback_signal_intelligence.sql`
- `202606040002` — `202606040002_ensure_enterprise_access_requests_public_submit.sql`
- `202606040003` — `202606040003_enterprise_access_problem_category.sql`
- `202606050001` — `202606050001_enterprise_access_design_partner_signals.sql`
- `202606050002` — `202606050002_billing_subscriptions_usage_limits.sql`
- `202606050003` — `202606050003_harden_enterprise_access_insert_permissions.sql`
- `202606050004` — `202606050004_submit_enterprise_access_request_rpc.sql`
- `202606060001` — `202606060001_trusted_hiring_mvp.sql`
- `202606070001` — `202606070001_ai_agent_identity_direction.sql`
- `202606070002` — `202606070002_trust_algorithm_runs.sql`
- `202606070003` — `202606070003_integration_status.sql`
- `202606070004` — `202606070004_api_test_runs.sql`
- `202606070005` — `202606070005_launch_control_notes.sql`
- `202606080001` — `202606080001_trust_relationships.sql`
- `202606080002` — `202606080002_trust_timeline_events.sql`
- `202606080003` — `202606080003_trust_replay_sessions.sql`
- `202606080004` — `202606080004_trust_workspaces_cases.sql`
- `202606080005` — `202606080005_operational_governance_engine.sql`
- `202606080006` — `202606080006_operational_hardening_rls.sql`
- `202606080007` — `202606080007_operational_notifications_coordination.sql`
- `202606090001` — `202606090001_hiring_security_interview_integrity.sql`
- `202606090002` — `202606090002_trust_evidence_chains_receipts.sql`
- `202606090003` — `202606090003_operational_trust_intelligence.sql`

## Pending for staging and future Production

- Phase A: `202606100001` — `202606100001_runtime_validation_logs.sql` — SHA-256 `0a87053b1080f4e5d8d24957eaa905c49057956920f597c8e35c7ffe1e8db0df`
- Phase A: `202606180001` — `202606180001_enterprise_ai_trust_governance.sql` — SHA-256 `822d7aed3d795f0684d92b2e1f996626f1dc9955fba83464f80b2a07577d71d1`
- Phase A: `202606190001` — `202606190001_verifiers.sql` — SHA-256 `fb87c08956ce6760f26744fbe0e5086c7f15a2cf02f073fb550858179d85e096`
- Phase A: `202606190002` — `202606190002_session_integrity_signal_separation.sql` — SHA-256 `d3024dbc680c5114b6cdc3a7a5bf153daea718b63b3b4ca20c74f8453cf740cf`
- Phase A: `202606190003` — `202606190003_hopae_connect_upstream_identity.sql` — SHA-256 `2c931809a798ffe9cc014f8e6311c11c97f1c1646c02e31b373b520b0ee1a5dd`
- Phase A: `202606270001` — `202606270001_screenshot_support_debugging.sql` — SHA-256 `bb924f57495091ea3d8fff9953c4788ccaeec83b43366a364007a4744841877c`
- Phase A: `202607010001` — `202607010001_production_owner_scoped_rls.sql` — SHA-256 `9a998f9cc4b76eab35580548c325d19cada79137b6ef9f1c1dfe1bc5aedc8f21`
- Phase A: `202607020001` — `202607020001_critical_trust_infrastructure_alignment.sql` — SHA-256 `6ed6d4c78f7010ca2a1a11638cc68471178f8daa4b9c1bd2ca8b5b57ee723586`
- Phase B: `202607160001` — `202607160001_release_1_rc1_provider_evidence_gate.sql` — SHA-256 `bf0a96d3f73a3e627f7ebb6d9a1ca924f3351394448fed1c251f492cdf277b40`
- Phase B: `202607160002` — `202607160002_release_1_rc2_living_trust_privacy.sql` — SHA-256 `0c7422463dc220faa01779682dce1463bdf2187498fd366537ba247dbe3de389`
- Phase B: `202607160003` — `202607160003_release_1_rc6_production_evidence_gate.sql` — SHA-256 `424d81a2d438a2befb1e50ac36a28c539eeb7c5b7c326801cf41d8d6e23271e6`
- Phase B: `202607170001` — `202607170001_operational_risk_intelligence_shadow.sql` — SHA-256 `7181b126c3b5fad847aa91f18454be3785d2e5e38bde4078a7db0ec355417f64`
- Phase B: `202607170002` — `202607170002_provider_abstraction_hopae.sql` — SHA-256 `c14dfb6619f1d05e2e2942bda2ff69b7626e9d05ec4d29466fdccb390963ff68`
- Phase B: `202607190001` — `202607190001_identity_signal_engine.sql` — SHA-256 `7f54584f99ad8cdddbe6ee62d1d29deb5d52bf2e5aa1b0462f3c07a74c64dbcb`
- Phase B: `202607190002` — `202607190002_identity_signal_runtime.sql` — SHA-256 `0396ee023a8222f05d239f80520c72f081fca97fc6246f92c3546ed7d8297354`
- Phase B: `202607200001` — `202607200001_canonical_trust_event_foundation.sql` — SHA-256 `d1b692baa6fff1601c9ee9d227d228de4e9de2f1021c3d13b5d14b9ea479e55e`
- Phase B: `202607200002` — `202607200002_enterprise_trust_consent_manager.sql` — SHA-256 `b00fb4d39a7a7cf050513be84996bd319ac07ca22602cd489be3c199b639dc15`
- Phase B: `202607200003` — `202607200003_provider_consensus_engine.sql` — SHA-256 `c72673265d36bac4da172da2d5ba52984f9349fce99894ed350f56ee9bc5c348`
- Phase C: `202607210001` — `202607210001_enterprise_trust_architecture.sql` — SHA-256 `78c15860513ec3a02a22bcdd0f92a4f73504502154e03e1a6c4290622de764a2`
- Phase C: `202607210002` — `202607210002_continuous_trust_runtime.sql` — SHA-256 `bc15e19815363832641bfb0f71f4f3cb5294a27cf490cfb0c6c784f94b1de2df`
- Phase C: `202607230001` — `202607230001_trust_intelligence_engine.sql` — SHA-256 `11091673b46238053d06ba75cfd46764e05022e4a0f9b10ed33c96e3e02f2717`
- Phase C: `202607230002` — `202607230002_enterprise_trust_graph.sql` — SHA-256 `6ac18a050e6ddc02953e9545f7aa260555ab0d1c0cf79d1ce7e0c0b98ce7c819`
- Phase C: `202607240001` — `202607240001_trust_dna_engine.sql` — SHA-256 `b9a4918d81bf09e9c030c32ea04b049de705a2d74aec3b3da89f08468ecb3e1c`
- Phase C: `202607240002` — `202607240002_replay_timeline_engine.sql` — SHA-256 `12ad37ef8a2124959a88cd2930765289c0bbfbe966da4c4893fe69e10a3a8c70`
- Phase C: `202607240003` — `202607240003_continuous_trust_engine.sql` — SHA-256 `bdf74c1d95bdbe01e5c3b2227d85d7791f02d10ed36c117178807d6ed5153af8`
- Phase C: `202607240004` — `202607240004_enterprise_trust_centre.sql` — SHA-256 `3983a0e26513ba76eda767385ff35d2c604bafb5a901270a93e4ef2f4434ae32`
- Phase D: `202607310001` — `202607310001_environment_attestation_scope_continuity.sql` — SHA-256 `3d7cef02dca539d7f64c2bf1c0f0d938ce533d3b83ac874276172dbea9ea7d8e`
- Phase E: `202608010001` — `202608010001_ai_serious_incident_regulatory_lineage.sql` — SHA-256 `7831be488d85281673ecfd29500029fbad32d3b8759c6e51bba4384788d028e2`
- Phase F: `202608010002` — `202608010002_enterprise_trust_fabric.sql` — SHA-256 `773a5be556a139848684b09d61fbc2a76da05c38f29f1de9798ccbba5f9deb6b`

## Historical correction continuity

- `provider_operational_health_snapshots` remains the global operational-health table introduced by the corrected, unapplied provider abstraction migration.
- `provider_health_snapshots` remains the tenant-scoped Provider Consensus table.
- Applied legacy `trust_relationships` remains intact; `trust_graph_relationships_v2` is the distinct pending Enterprise graph table.
- The Epic 26 lease-hash correction remains in the unapplied canonical migration and preserves the frozen digest contract.

## Architecture freeze review

Packaging introduced no migration or product-contract change. Trust Object, Trust Contract, evidence taxonomy, trust/provider states, Replay availability, Scope Continuity, serious-incident protected decisions, tenant identity and reviewer authority remain frozen. Compatibility warnings are limited to unknown row volume, non-concurrent index creation, constraint validation, policy replacement and function replacement that require isolated staging evidence before any Production approval.
