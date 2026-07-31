# Supabase Migration Reconciliation

Date: 2026-07-29
Repository: `C:\Users\emeae\Desktop\cyber-sentinels-clean`
Branch: `hotfix/request-demo-turnstile-production`
HEAD and upstream at inspection: `2b597b089aeb04cad5df4c9c23f6f0eb5bcbc6a6`
Linked project reference: `kecgtsfibkypjuaxqbjx`
Status: **BLOCKED — MIGRATION RECONCILIATION REQUIRED**

## 1. Executive summary

The local and remote migration ledgers agree through `202606090003`. The repository then has exactly 26 local migrations that the remote ledger does not record. There are no remote-only timestamps and no duplicate local timestamps.

The gap is not an ordinary unapplied sequence. Read-only remote introspection shows that objects from several pending migrations already exist but have materially different columns:

- `runtime_validation_logs`
- `trust_certifications`
- `trust_alerts`
- `provenance_events`
- `session_integrity_checks`
- `injection_risk_events`
- `verification_signals`
- `device_channel_evidence`
- `hopae_verifications`
- `hopae_webhook_events`
- `trust_relationships`
- `trust_signals`

No pending-created object was proven both present and compatible. The first pending migration would attempt indexes on `deployment_state` and `health_percent`, but the remote `runtime_validation_logs` exposes `overall_status` and `health_score` instead. It would therefore fail without reconciling the table. Migrations `202607230002` and `202607240003` use unconditional `CREATE TABLE` for `trust_relationships` and `trust_signals`; both names already exist remotely with incompatible legacy shapes, so those migrations will fail if reached.

The consent runtime expects `trust_event_chain_heads` and `persist_consent_change_v1`. Both are absent remotely. The original logical consent dependency spine is non-contiguous and includes broad, unrelated, policy-changing migrations:

```text
pre-gap trust_workspaces + workspace_members + trust_events + agents
  -> 202607160001 user_can_access_trust_workspace
  -> 202607190001 identity_workspace_role
  -> 202607200001 canonical trust event foundation
  -> 202607200002 enterprise consent manager
```

`202607160001` also assumes the Hopae objects introduced by `202606190003`, and the repository migration runner cannot safely skip the earlier timestamps. The two consent migrations cannot be applied alone without falsifying or bypassing migration history.

Recommendation: establish an approved, exact production baseline and test the reconciled forward sequence on a database restored from production. Do not run `db push`, migration repair, or a consent-only later timestamp against the linked project in the current state.

## 2. Current local and remote migration state

Read-only commands used:

```powershell
git branch --show-current
git status --short
git log --oneline -15
npx --yes supabase@2.110.0 migration list
npx --yes supabase@2.110.0 db push --dry-run
npx --yes supabase@2.110.0 inspect db table-sizes --linked
npx --yes supabase@2.110.0 gen types typescript --linked --schema public
```

`db push --dry-run` reported the following 26 migrations in timestamp order:

1. `202606100001_runtime_validation_logs.sql`
2. `202606180001_enterprise_ai_trust_governance.sql`
3. `202606190001_verifiers.sql`
4. `202606190002_session_integrity_signal_separation.sql`
5. `202606190003_hopae_connect_upstream_identity.sql`
6. `202606270001_screenshot_support_debugging.sql`
7. `202607010001_production_owner_scoped_rls.sql`
8. `202607020001_critical_trust_infrastructure_alignment.sql`
9. `202607160001_release_1_rc1_provider_evidence_gate.sql`
10. `202607160002_release_1_rc2_living_trust_privacy.sql`
11. `202607160003_release_1_rc6_production_evidence_gate.sql`
12. `202607170001_operational_risk_intelligence_shadow.sql`
13. `202607170002_provider_abstraction_hopae.sql`
14. `202607190001_identity_signal_engine.sql`
15. `202607190002_identity_signal_runtime.sql`
16. `202607200001_canonical_trust_event_foundation.sql`
17. `202607200002_enterprise_trust_consent_manager.sql`
18. `202607200003_provider_consensus_engine.sql`
19. `202607210001_enterprise_trust_architecture.sql`
20. `202607210002_continuous_trust_runtime.sql`
21. `202607230001_trust_intelligence_engine.sql`
22. `202607230002_enterprise_trust_graph.sql`
23. `202607240001_trust_dna_engine.sql`
24. `202607240002_replay_timeline_engine.sql`
25. `202607240003_continuous_trust_engine.sql`
26. `202607240004_enterprise_trust_centre.sql`

No migration was applied and no remote mutation command was run.

## 3. Full migration inventory

All SQL is in schema `public` unless noted. `auth.uid()`, JWT claims, `auth.users`, the `authenticated` role, and `service_role` are database-runtime dependencies, not environment variables. No migration reads an application environment variable. Most migrations are not automatically reversible because they alter policy contracts, add runtime writes, backfill data, or replace constraints.

### 1 — `202606100001_runtime_validation_logs.sql`

- Purpose: runtime deployment validation log.
- Creates/alters: `runtime_validation_logs`.
- Columns expected: `id`, `deployment_state`, `health_percent`, `critical_blockers`, `warnings`, `summary`, `created_at`.
- Indexes: `runtime_validation_logs_created_idx`, `runtime_validation_logs_state_created_idx`.
- Constraints/policies: primary key; two admin JWT policies; drops/replaces policies with the same names.
- Functions/triggers/data: none.
- Dependencies/extensions/environment: `gen_random_uuid`; no explicit extension or environment variable.
- Remote compatibility: **already present but different** (`overall_status`, `health_score`; required index columns absent).
- Reversibility/risk/group: DDL and policy rollback required; **BLOCKING**, Group E.

### 2 — `202606180001_enterprise_ai_trust_governance.sql`

- Purpose: certification, alert, provenance, and AI-agent governance layer.
- Creates: `trust_certifications`, `trust_alerts`, `provenance_events`; alters those tables and `ai_agents`.
- Adds to `ai_agents`: `owner_name`, `owner_email`, `enterprise_id`, `agent_type`, `capabilities`, `permissions`, `trust_score`, `status`, `created_at`, `last_activity_at`; adds compatibility columns to certifications/alerts.
- Indexes: 10 indexes covering certification type/subject/creator, alert type/subject/creator, AI-agent enterprise/owner, and provenance subject/type.
- Constraints/policies: certification type/status/score; alert type/status; AI-agent score; four authenticated policies, replacing prior names.
- Functions/triggers/data: none.
- Dependencies/extensions/environment: pre-existing `ai_agents`; `auth.uid()` and JWT; no explicit extension/env.
- Remote compatibility: all three created tables exist with divergent shapes; alert/provenance naming is materially different.
- Reversibility/risk/group: broad table and RLS rollback; **BLOCKING**, Group E.

### 3 — `202606190001_verifiers.sql`

- Purpose: verifier-network applications.
- Creates/alters: `verifiers`.
- Columns: identity/contact/status/application metadata and timestamps as defined in the file.
- Indexes: unique `verifiers_email_idx`; `verifiers_status_created_idx`.
- Constraints/policies: primary key, unique email, status checks; authenticated read and own-create policies.
- Functions/triggers/data: none.
- Dependencies/extensions/environment: authentication identity; no explicit extension/env.
- Remote compatibility: table absent.
- Reversibility/risk/group: additive but unique/contact schema; **MEDIUM**, Group C.

### 4 — `202606190002_session_integrity_signal_separation.sql`

- Purpose: separate liveness, injection, device/channel, and verification signals.
- Creates: `session_integrity_checks`, `injection_risk_events`, `verification_signals`, `device_channel_evidence`; alters each for compatibility.
- Adds: `interview_session_id`, `user_id`, `session_integrity_check_id`, `category`, `created_at`.
- Indexes: four session/category timeline indexes.
- Constraints/policies: FKs to `interview_sessions`; risk/status/score checks; four owner/child RLS policies, replacing old names.
- Functions/triggers: `record_session_integrity_check`, `record_session_verification_flag`; triggers `session_integrity_check_records`, `session_verification_signal_records`.
- Data effects: future trigger writes to `audit_logs`, `trust_timeline_events`, `signals`, and `governance_actions`.
- Dependencies/extensions/environment: `interview_sessions`, `audit_logs`, `trust_timeline_events`, `signals`, `governance_policies`, `governance_actions`; no explicit extension/env.
- Remote compatibility: all four tables already exist with incompatible legacy columns; both functions are absent.
- Reversibility/risk/group: trigger and RLS side effects; **BLOCKING**, Group E.

### 5 — `202606190003_hopae_connect_upstream_identity.sql`

- Purpose: Hopae verification and webhook persistence.
- Creates: `hopae_verifications`, `hopae_webhook_events`; alters `passports`, `trust_reports`.
- Adds: `identity_assurance_score`, `upstream_identity_proofs` to passports/reports.
- Indexes: owner timeline and webhook verification timeline.
- Constraints/policies: verification ID uniqueness; authenticated owner policy.
- Functions/triggers/data: none.
- Dependencies/extensions/environment: `passports`, `trust_reports`, auth; no SQL env dependency.
- Remote compatibility: both Hopae tables exist but use different owner/user, raw payload, and status column contracts.
- Reversibility/risk/group: schema and RLS rollback; **BLOCKING**, Group E.

### 6 — `202606270001_screenshot_support_debugging.sql`

- Purpose: support tickets with diagnostic/screenshot metadata and private storage.
- Creates/alters: `support_issues`; adds 25 compatibility columns including submitter, workflow, provider/trust state, screenshot path, review and browser metadata.
- Indexes: submitter timeline, status timeline, workflow.
- Constraints/policies: FK to `auth.users`; issue/status checks; own-create/own-read policies.
- Functions/triggers/data: upserts the private `storage.buckets` record for support screenshots.
- Dependencies/extensions/environment: `auth.users`, `storage.buckets`; storage service context; no application env read.
- Remote compatibility: table absent; storage bucket state was not introspected.
- Reversibility/risk/group: environment-specific storage change and potentially incompatible pre-existing bucket; **HIGH**, Group E.

### 7 — `202607010001_production_owner_scoped_rls.sql`

- Purpose: replace broad production access with owner-scoped RLS.
- Creates: no table; alters `passports`, `trust_reports`, `verification_cases`, `audit_logs`.
- Adds: `owner_email` to each.
- Indexes/functions/triggers/data: none.
- Constraints/policies: revokes privileges and drops/recreates 11 owner policies; dynamically changes governance/admin policies.
- Dependencies/extensions/environment: current email JWT/user contract; no explicit extension/env.
- Remote compatibility: target tables exist; columns, grants, policies, and legacy null ownership require catalog/data preflight.
- Reversibility/risk/group: authorization contract can make legacy rows inaccessible; **HIGH**, Group D.

### 8 — `202607020001_critical_trust_infrastructure_alignment.sql`

- Purpose: align AI-agent registry and verification categories.
- Creates: no table; alters `ai_agents`, `verification_signals`.
- Adds: `verified_agent_name`, `owner_organization`, `registry_status`, `identity_claims`, `trust_lineage`, `last_trust_recalculation_reason`.
- Indexes: `ai_agents_registry_status_idx`.
- Constraints/policies/functions/triggers/data: drops/replaces `verification_signals_category_check`.
- Dependencies/extensions/environment: migration 4's intended verification schema; no explicit extension/env.
- Remote compatibility: both targets exist but `verification_signals` has a different legacy shape.
- Reversibility/risk/group: constraint contract replacement; **BLOCKING**, Group D.

### 9 — `202607160001_release_1_rc1_provider_evidence_gate.sql`

- Purpose: tenant-scope the RC1 provider/evidence gate and supply the canonical workspace-access helper.
- Creates: no table; alters `governance_policies`, both Hopae tables, `trust_timeline_events`, `trust_replay_sessions`, `evidence_chains`, `verification_receipts`, `trust_relationships`.
- Adds: workspace/owner/correlation fields plus authority, policy, evidence, replay, retention and workflow fields; changes `hopae_webhook_events.raw_event` to nullable.
- Indexes: Hopae correlation/workflow plus workspace indexes for the five canonical proof stores.
- Constraints/policies: FKs to `trust_workspaces`/`trust_cases`; drops/replaces 10 proof-store policies.
- Functions/triggers: `user_can_access_trust_workspace`, `prevent_trust_memory_mutation`, `persist_rc1_trust_assessment`; append-only trigger.
- Data effects: persistence RPC inserts evidence/timeline/relationship/replay rows and updates `verification_receipts` and `hopae_verifications`.
- Dependencies/extensions/environment: migration 5 Hopae tables; pre-gap workspaces, members, cases and proof tables; auth; no explicit extension/env.
- Remote compatibility: targets exist, but the Hopae and relationship source schemas are divergent and full constraint/policy compatibility is unverified.
- Reversibility/risk/group: broad policy and runtime-write contract; **BLOCKING**, Group A.

### 10 — `202607160002_release_1_rc2_living_trust_privacy.sql`

- Purpose: retention/compliance policy metadata and trust-memory tombstones.
- Creates: no table; alters `governance_policies`.
- Adds: `retention_policy`, `compliance_evidence_mappings`.
- Indexes/constraints: none.
- Policies: drops/replaces six governance policy/action tenant policies.
- Functions/triggers/data: `record_trust_memory_tombstone`; runtime inserts into `trust_timeline_events` and `audit_logs`.
- Dependencies/extensions/environment: migration 9 helper and pre-existing governance/timeline/audit tables; no env.
- Reversibility/risk/group: policy replacement and append-only records; **HIGH**, Group D.

### 11 — `202607160003_release_1_rc6_production_evidence_gate.sql`

- Purpose: RC6 release evidence, provider execution, webhook ledger, and operational measurements.
- Creates: `release_validation_cases`, `release_validation_reviews`, `webhook_event_ledger`, `provider_execution_records`, `operational_measurements`, `release_evidence_checks`; alters each and `hopae_webhook_events`.
- Adds to Hopae webhook: signature/duplicate/processing/failure/processed fields.
- Indexes: eight tenant, retention, scope and latest-result indexes.
- Constraints/policies: workspace/case FKs and enum-like checks; tenant provider-execution read policy.
- Functions: `review_release_validation_case`, `prune_expired_rc6_evidence`, `export_rc6_performance_summary`.
- Data effects: migration-time backfill updates all Hopae webhook rows; review RPC updates cases; prune RPC deletes expired webhook-ledger and operational-measurement rows.
- Dependencies/extensions/environment: migrations 5 and 9, trust workspaces/cases; no SQL env.
- Reversibility/risk/group: backfill plus callable deletes; **HIGH**, Group D.

### 12 — `202607170001_operational_risk_intelligence_shadow.sql`

- Purpose: shadow operational-risk model registry, inferences, reviewer outcomes and validation.
- Creates: `ori_model_registry`, `ori_feature_registry`, `ori_model_state_audit`, `ori_inference_records`, `ori_reviewer_outcomes`.
- Indexes: shadow-scope uniqueness, inference retention/tenant/validation, model audit and review indexes.
- Constraints/policies: workspace/case FKs, model/outcome checks; drops/replaces inference/reviewer read policies; replaces an inference-review FK.
- Functions/triggers: four audit/review/prune functions; model-state audit and immutable-review triggers.
- Data effects: seeds model/feature registries; review RPC updates inferences; prune RPC deletes expired inference payloads.
- Dependencies/extensions/environment: migration 9 helper, workspaces/cases; model/runtime context external to SQL.
- Reversibility/risk/group: environment-specific model seed and callable deletion; **HIGH**, Group D.

### 13 — `202607170002_provider_abstraction_hopae.sql`

- Purpose: provider registry/health/audit and normalized identity evidence.
- Creates: `provider_registry`, `provider_state_audit`, `provider_health_snapshots`, `normalized_identity_evidence`; alters Hopae verification and `provider_execution_records`.
- Adds: provider request/session/status/last-polled fields.
- Indexes: provider state, health, normalized evidence, and provider execution session uniqueness.
- Constraints/policies: FKs to registry, workspaces/cases; normalized-evidence tenant read policy.
- Functions: `set_provider_enabled`, `persist_provider_identity_evidence`.
- Data effects: seeds provider registry; RPCs update registry and Hopae rows and insert normalized evidence.
- Dependencies/extensions/environment: migrations 5, 9 and 11; provider context is application-supplied.
- Reversibility/risk/group: additive but tightly coupled and includes seed/runtime updates; **HIGH**, Group C.

### 14 — `202607190001_identity_signal_engine.sql`

- Purpose: enterprise identity subjects, requests, providers, evidence, confidence and audit.
- Creates: seven identity tables (`identity_subjects` through `identity_audit_events`).
- Indexes: ten external-reference, idempotency, request, subject, provider and audit indexes.
- Constraints/policies: workspace and internal FKs, uniqueness/checks; seven tenant-read policies.
- Functions/triggers: `identity_workspace_role`, `prevent_identity_audit_mutation`; append-only audit trigger.
- Data effects: seeds provider capabilities.
- Dependencies/extensions/environment: workspaces, `workspace_members`, migration 9 helper; no SQL env.
- Remote compatibility: all created objects/functions absent.
- Reversibility/risk/group: non-contiguous consent prerequisite with unrelated feature schema; **HIGH**, Group A.

### 15 — `202607190002_identity_signal_runtime.sql`

- Purpose: runtime/idempotency hardening for migration 14.
- Creates: no tables; alters five identity tables.
- Adds: operation, enterprise/provider transaction/event references, hashes, normalized values, status/provenance, contradiction count and timestamps.
- Indexes: 13 tenant/composite/unique runtime indexes; drops the old idempotency index.
- Constraints/policies: drops/replaces provider-capability primary key; adds not-valid composite tenant FKs; replaces three policies.
- Functions/triggers: none.
- Data effects: migration-time normalization update of all `identity_signal_evidence`.
- Dependencies/extensions/environment: migration 14 and migration 9 helper; no env.
- Reversibility/risk/group: primary-key/index rewrite and backfill; **HIGH**, Group D.

### 16 — `202607200001_canonical_trust_event_foundation.sql`

- Purpose: canonical, hash-chained trust-event ingestion and evidence metadata.
- Creates: `trust_event_envelopes`, `trust_event_chain_heads`, `trust_event_links`, `trust_event_audit`, `evidence_objects`, `evidence_object_access`; alters legacy `trust_events`.
- Adds to `trust_events`: enterprise/event/schema/subject/workflow/session/provider/hash/sequence/canonical/evidence fields.
- Indexes: 14 canonical event, envelope idempotency, chain/link/audit/evidence indexes, including three unique event indexes.
- Constraints/policies: canonical checks and workspace FKs; drops/replaces three legacy trust-event policies and creates seven tenant/evidence policies.
- Functions/triggers: five reserve/append/immutability functions; three append/finalization triggers.
- Data effects: append RPC inserts events, links and audit and updates chain heads.
- Dependencies/extensions/environment: pre-gap workspaces, legacy `trust_events`, `agents`; migration 9 `user_can_access_trust_workspace`; migration 14 `identity_workspace_role`; no explicit extension/env.
- Remote compatibility: legacy targets are present; all six created tables and all five functions are absent.
- Reversibility/risk/group: canonical ledger, uniqueness and legacy RLS replacement; **BLOCKING**, Group A.

### 17 — `202607200002_enterprise_trust_consent_manager.sql`

- Purpose: policy/version catalogue, consent receipts/preferences/events/audit, and persistence RPC.
- Creates: `consent_policy_versions`, `consent_categories`, `consent_purposes`, `consent_providers`, `consent_cookies`, `consent_tracker_catalogue`, `consent_region_profiles`, `consent_receipts`, `consent_preferences`, `consent_events`, `consent_audit_log`.
- Indexes: nine scope/subject indexes; several are unique expression indexes.
- Constraints/policies: workspace and receipt FKs, one-subject and essential-category checks, enum-like checks; 10 authenticated policies.
- Functions/triggers: `prevent_consent_history_mutation`, `persist_consent_change_v1`, `create_consent_policy_v1`; three append-only triggers.
- Data effects: seeds global region, policy, category, purpose, provider and cookie catalogue; persistence RPC writes receipts/preferences/events/audit and calls `append_trust_event_v1`.
- Dependencies/extensions/environment: migration 9 helper, migration 16 trust-event append/chain, `trust_workspaces`; no SQL env.
- Remote compatibility: every consent-manager table and function is absent.
- Reversibility/risk/group: durable consent history, seeded legal catalogue and canonical events; **BLOCKING**, Group B.

### 18 — `202607200003_provider_consensus_engine.sql`

- Purpose: versioned provider capabilities/health/observations and consensus decisions.
- Creates: 10 provider-consensus tables, including a second `provider_health_snapshots` definition.
- Indexes: provider health latest, provider observation subject, consensus decision subject.
- Constraints/policies: tenant FKs and consensus checks; nine tenant-read policies; alters trust-event constraint contracts.
- Functions: four history/persistence/policy/health functions.
- Data effects: seeds consensus policy/capabilities; persistence RPC writes decisions, evidence, conflicts, audit, subject state and trust events.
- Dependencies/extensions/environment: migrations 9, 13 and 16; provider runtime context.
- Remote compatibility: these definitions are absent, but the name `provider_health_snapshots` is first created by migration 13 and is reused with a different intended contract.
- Reversibility/risk/group: overlapping object definition, seed, constraint and ledger effects; **HIGH**, Group D.

### 19 — `202607210001_enterprise_trust_architecture.sql`

- Purpose: enterprise trust domains, subjects, references, policy/decision contracts, graph, memory, simulation and KPI architecture.
- Creates: 13 architecture tables; alters `evidence_objects`, `consent_receipts`, `provider_observations`, `subject_trust_state`.
- Adds/changes: 18 evidence integrity fields plus architecture references; backfills then sets 16 evidence columns `NOT NULL`.
- Indexes: evidence ID uniqueness and graph/memory indexes.
- Constraints/policies: drops/replaces evidence/state constraints; 12 read policies.
- Functions/triggers: nine normalization/materialization/graph/state/policy/simulation functions; four evidence projection triggers.
- Data effects: backfills every evidence object; materializes historical consent receipts and provider observations into evidence objects and updates source rows.
- Dependencies/extensions/environment: `pgcrypto`; migrations 9, 16, 17 and 18; no env.
- Reversibility/risk/group: major backfill, not-null conversion, triggers and cross-domain coupling; **BLOCKING**, Group D.

### 20 — `202607210002_continuous_trust_runtime.sql`

- Purpose: assessment, drift, freshness and alert runtime.
- Creates: `continuous_trust_assessments`, `trust_drift_findings`; alters `evidence_objects`, `subject_trust_state`, `trust_alerts`, `evidence_graph_edges`.
- Adds/changes: freshness/observation/revocation/assessment/alert fields; backfills and sets observation/freshness `NOT NULL`.
- Indexes: five runtime/freshness/subject/alert indexes.
- Constraints/policies: replaces alert status/type and graph edge constraints; three tenant policies.
- Functions/triggers: assessment and alert-transition functions; two append-only triggers.
- Data effects: migration-time updates to every evidence object and alert; runtime updates subject state and alerts.
- Dependencies/extensions/environment: `pgcrypto`; migrations 2, 9, 18 and 19.
- Reversibility/risk/group: global backfills and public alert contract replacement; **BLOCKING**, Group D.

### 21 — `202607230001_trust_intelligence_engine.sql`

- Purpose: evidence projection, trust profiles/dimensions/history/replay, signals and provider results.
- Creates: nine tables.
- Indexes: 14 tenant/identity/history/source indexes.
- Constraints/policies: workspace FKs and checks; nine tenant-read policies.
- Functions/triggers: four projection/persistence functions and 11 append-only/projection triggers.
- Data effects: future triggers project evidence/provider observations; RPCs insert profiles, history, signals and replay.
- Dependencies/extensions/environment: `pgcrypto`; migrations 9, 16, 18 and 19.
- Remote compatibility: all created objects/functions absent.
- Reversibility/risk/group: broad additive feature with automatic projections; **HIGH**, Group C.

### 22 — `202607230002_enterprise_trust_graph.sql`

- Purpose: enterprise entity/evidence/relationship/source graph.
- Creates unconditionally: `trust_entities`, `trust_evidence`, `trust_relationships`, `trust_sources`, `trust_graph_events`.
- Indexes: 11 entity/evidence/relationship/source/event indexes, including active-relationship uniqueness.
- Constraints/policies: workspace/entity/evidence-node FKs; five tenant policies.
- Functions/triggers: four graph mutation/query functions; two append-only triggers.
- Data effects: mutation RPC inserts/updates entities, relationships and sources.
- Dependencies/extensions/environment: `pgcrypto`; migrations 9, 19 and 21.
- Remote compatibility: remote `trust_relationships` already exists with legacy `source_type/source_id/target_type/target_id`; this migration expects tenant entity UUID relationships and uses unconditional `CREATE TABLE`.
- Reversibility/risk/group: guaranteed name collision unless reconciled; **BLOCKING**, Group E.

### 23 — `202607240001_trust_dna_engine.sql`

- Purpose: Trust DNA v2 profiles, dimension scores and score history.
- Creates: `trust_dimension_scores`, `trust_score_history`; alters `trust_profiles`.
- Adds: entity/version/score/evidence/explanation/risk/recommendation fields.
- Indexes: three profile unique/latest indexes and two score/history indexes.
- Constraints/policies: entity/profile composite FKs; two tenant policies; unconditionally drops `trust_profiles_tenant_id_identity_id_evidence_snapshot_hash_key`.
- Functions/triggers: `persist_trust_dna_v2`; two append-only triggers.
- Dependencies/extensions/environment: migrations 9, 21 and 22.
- Reversibility/risk/group: unconditional constraint drop and profile uniqueness conversion; **BLOCKING**, Group D.

### 24 — `202607240002_replay_timeline_engine.sql`

- Purpose: entity-centric replay timeline v2.
- Creates: no table; alters `replay_events`.
- Adds: ID/entity/time/provider/actor/risk/trust/hash fields.
- Indexes: unique replay ID plus six query indexes.
- Constraints/policies: unconditionally drops/replaces `replay_events_event_type_check`.
- Functions/triggers: four replay append/capture functions; two projection triggers.
- Data effects: future evidence/profile triggers append replay events.
- Dependencies/extensions/environment: migrations 21, 22 and 23.
- Reversibility/risk/group: unconditional constraint replacement and automatic writes; **BLOCKING**, Group D.

### 25 — `202607240003_continuous_trust_engine.sql`

- Purpose: signal ingestion/processing, policy decisions, failures, manual review, alert history and overrides.
- Creates unconditionally: `trust_signals`, `trust_signal_processing`, `trust_policy_decisions`, `trust_processing_failures`, `trust_manual_reviews`, `trust_manual_review_history`, `trust_alert_history`, `trust_manual_overrides`; alters drift and alert tables.
- Adds/changes: signal/review/decision/explanation fields; drops `trust_drift_findings.assessment_id` not-null.
- Indexes: 12 signal/queue/review/alert indexes.
- Constraints/policies: tenant and cross-object FKs/checks; eight tenant policies.
- Functions/triggers: 10 ingestion/job/projection/finalization/failure/review/override/alert functions; six append-only triggers.
- Data effects: RPCs update processing jobs, reviews and alerts and write evidence, references, drift, review and audit rows.
- Dependencies/extensions/environment: `pgcrypto`; migrations 2, 9, 16, 19 and 20.
- Remote compatibility: remote `trust_signals` already exists with legacy `trust_score_id/signal_type/signal_value/weight`; this file expects tenant/entity event signals and uses unconditional `CREATE TABLE`.
- Reversibility/risk/group: guaranteed name collision unless reconciled; **BLOCKING**, Group E.

### 26 — `202607240004_enterprise_trust_centre.sql`

- Purpose: Trust Centre alert activity and management.
- Creates/alters: `trust_alert_activity`.
- Indexes: alert activity timeline.
- Constraints/policies: FKs to workspaces/alerts; tenant-read policy.
- Functions/triggers: `manage_trust_centre_alerts_v1`; append-only activity trigger.
- Data effects: management RPC updates alerts and inserts activity/architecture audit.
- Dependencies/extensions/environment: migrations 2, 9, 19 and 25.
- Remote compatibility: created table/function absent; prerequisite schema absent.
- Reversibility/risk/group: additive but tightly coupled to unresolved alerts; **HIGH**, Group C.

## 4. Risk and primary group classification

| # | Migration | Risk | Primary group |
|---:|---|---|---|
| 1 | `202606100001` | BLOCKING | E — remote incompatible |
| 2 | `202606180001` | BLOCKING | E — remote incompatible |
| 3 | `202606190001` | MEDIUM | C — unrelated additive |
| 4 | `202606190002` | BLOCKING | E — remote incompatible |
| 5 | `202606190003` | BLOCKING | E — remote incompatible |
| 6 | `202606270001` | HIGH | E — environment/storage ambiguous |
| 7 | `202607010001` | HIGH | D — RLS replacement |
| 8 | `202607020001` | BLOCKING | D — constraint replacement on divergent table |
| 9 | `202607160001` | BLOCKING | A — dependency spine, with broad changes |
| 10 | `202607160002` | HIGH | D — RLS replacement/runtime writes |
| 11 | `202607160003` | HIGH | D — backfill and callable deletes |
| 12 | `202607170001` | HIGH | D — seed and callable deletes |
| 13 | `202607170002` | HIGH | C — unrelated provider feature |
| 14 | `202607190001` | HIGH | A — dependency spine, unrelated identity schema |
| 15 | `202607190002` | HIGH | D — PK/index rewrite and backfill |
| 16 | `202607200001` | BLOCKING | A — canonical event foundation |
| 17 | `202607200002` | BLOCKING | B — consent repair |
| 18 | `202607200003` | HIGH | D — overlapping schema, seed, constraint change |
| 19 | `202607210001` | BLOCKING | D — global backfill/NOT NULL |
| 20 | `202607210002` | BLOCKING | D — global backfill/alert contract |
| 21 | `202607230001` | HIGH | C — unrelated trust intelligence |
| 22 | `202607230002` | BLOCKING | E — existing incompatible table name |
| 23 | `202607240001` | BLOCKING | D — unconditional constraint drop |
| 24 | `202607240002` | BLOCKING | D — unconditional constraint drop |
| 25 | `202607240003` | BLOCKING | E — existing incompatible table name |
| 26 | `202607240004` | HIGH | C — unrelated Trust Centre |

Groups are primary classifications only. A foundational migration can also contain destructive policy changes; the risk column remains controlling.

## 5. Dependency graph

```text
Independent/early:
  1 runtime logs
  2 AI governance
  3 verifiers
  4 session integrity
  5 Hopae
  6 support/storage
  7 owner RLS

4 -> 8 infrastructure alignment

5 + pre-gap trust stores/workspaces/cases
  -> 9 RC1 provider/evidence + user_can_access_trust_workspace
      -> 10 RC2 privacy
      -> 11 RC6 release evidence
      -> 12 ORI
      -> 14 identity engine + identity_workspace_role
          -> 15 identity runtime
          -> 16 canonical trust event foundation
              -> 17 consent manager
              -> 18 provider consensus (also depends on 13)

5 + 9 + 11 -> 13 provider abstraction

9 + 16 + 17 + 18
  -> 19 enterprise trust architecture
      -> 20 continuous trust runtime
      -> 21 trust intelligence (also depends on 16 and 18)
          -> 22 enterprise trust graph
              -> 23 Trust DNA
              -> 24 replay timeline (also depends on 21 and 23)
      -> 25 continuous trust engine (also depends on 16 and 20)
          -> 26 Trust Centre (also depends on 2 and 19)
```

Critical ordering findings:

- Migration 16 requires both the workspace helper from 9 and `identity_workspace_role` from 14.
- Migration 17 requires the append RPC and chain-head table from 16.
- Migration 19 tightly couples canonical events, consent and consensus.
- Migrations 21–26 form a tightly coupled graph/profile/replay/runtime/centre group.
- Migration 18 reuses the name `provider_health_snapshots` first created by 13.
- Migrations 22 and 25 reuse names that already exist in the remote legacy schema.
- No consent-related set is contiguous without unrelated migrations.

## 6. Remote schema comparison

Evidence source: read-only table statistics and generated PostgREST TypeScript types from the linked project. This proves Data API-visible table/column/function state. It does not fully prove non-exposed routines, triggers, grants, policies, constraints, or indexes. Those remain `UNKNOWN` until the supplied catalog queries are run with an approved read-only SQL channel.

### Pending-created objects already present but different

| Object | Remote-visible shape evidence | Conflict |
|---|---|---|
| `runtime_validation_logs` | `created_at, health_score, id, overall_status, summary` | migration expects `deployment_state`, `health_percent`, blocker/warning arrays |
| `trust_certifications` | lacks `created_by`; other fields differ in nullability/type details | `IF NOT EXISTS` preserves old table; later additions do not fully prove constraints |
| `trust_alerts` | `title, description, severity, detected_at` | migration expects `alert_title, alert_description, risk_level, source, metadata` |
| `provenance_events` | `enterprise_id, event_detail, event_type, report_id` | migration expects subject/event-title/risk/metadata model |
| `session_integrity_checks` | subject/risk status model | migration expects interview/user/overall/manual-review model |
| `injection_risk_events` | no `interview_session_id` or `risk_score` | migration expects both |
| `verification_signals` | subject/signal-source model | migration expects session/category/signal-status/badge/evidence model |
| `device_channel_evidence` | evidence type/status model | migration expects interview/integrity/evidence-source model |
| `hopae_verifications` | `user_id`, `cyber_passport_id`, `raw_userinfo`, legacy flow fields | migration expects owner, redirect, assurance and trust-report fields |
| `hopae_webhook_events` | `payload`, `signature_valid`, no raw-event/timestamp contract | migration expects `event_id`, `signature_timestamp`, `raw_event`, processing fields |
| `trust_relationships` | legacy polymorphic source/target model | migration 22 expects tenant entity-to-entity graph and creates unconditionally |
| `trust_signals` | `trust_score_id`, `signal_type`, `signal_value`, `weight` | migration 25 expects tenant/entity/source/fingerprint event model and creates unconditionally |

### Confirmed absent

- Migration 3: `verifiers`.
- Migration 6: `support_issues`.
- Migration 9: all three created/replaced RPCs, including `user_can_access_trust_workspace`.
- Migration 10: `record_trust_memory_tombstone`.
- Migration 11: all six tables and three functions.
- Migration 12: all five tables and four functions.
- Migration 13: all four tables and two functions.
- Migrations 14–15: all seven identity tables and both migration-14 functions.
- Migration 16: all six new tables, including `trust_event_chain_heads`, and all five functions, including `append_trust_event_v1`.
- Migration 17: all 11 consent tables and all three functions, including `persist_consent_change_v1`.
- Migration 18: all consensus objects and functions, except the unresolved overlapping provider-health name from migration 13.
- Migrations 19–21: all newly created architecture/runtime/intelligence objects and functions.
- Migration 22: all objects except the incompatible legacy `trust_relationships`.
- Migrations 23–24: all new objects and functions.
- Migration 25: all objects except the incompatible legacy `trust_signals`.
- Migration 26: `trust_alert_activity` and `manage_trust_centre_alerts_v1`.

### Present prerequisites, compatibility not fully proven

`trust_workspaces`, `workspace_members`, `trust_events`, `agents`, `evidence_chains`, `governance_policies`, `trust_replay_sessions`, `verification_receipts`, and `trust_timeline_events` are present. Their remotely exposed columns support parts of the intended chain, but constraints, policies, grants, triggers and exact types remain `UNKNOWN`. The legacy `trust_events` has none of the canonical event/hash/enterprise columns before migration 16.

### Present and compatible

No object created by the pending migrations is classified `ALREADY PRESENT AND COMPATIBLE`. Catalog-level proof is insufficient and the exposed columns of every detected name collision differ.

## 7. Consent minimum dependency chain

| Required object | Creating migration | Direct prerequisites |
|---|---|---|
| `trust_event_chain_heads` | `202607200001` | `trust_workspaces`, `trust_events` |
| `append_trust_event_v1` | `202607200001` | chain heads, envelopes, events, links, audit |
| canonical event RLS | `202607200001` | `user_can_access_trust_workspace`, `identity_workspace_role`, `agents` |
| `consent_policy_versions` | `202607200002` | `trust_workspaces` |
| `consent_cookies` | `202607200002` | consent policy/catalogue conventions |
| `consent_tracker_catalogue` | `202607200002` | consent policy/catalogue conventions |
| `consent_receipts` | `202607200002` | `trust_workspaces`, policy version contract |
| `persist_consent_change_v1` | `202607200002` | receipts, preferences, events, audit, `append_trust_event_v1` |

Exact original ordered migration dependency set:

1. `202606190003_hopae_connect_upstream_identity.sql` — object prerequisite for the broad RC1 migration.
2. `202607160001_release_1_rc1_provider_evidence_gate.sql` — creates `user_can_access_trust_workspace`.
3. `202607190001_identity_signal_engine.sql` — creates `identity_workspace_role`.
4. `202607200001_canonical_trust_event_foundation.sql` — creates chain heads and append RPC.
5. `202607200002_enterprise_trust_consent_manager.sql` — creates consent persistence.

Logical schema prerequisites also include the pre-gap `trust_workspaces`, `workspace_members`, `trust_cases`, `trust_events`, and `agents`.

This set is not contiguous. In the migration ledger, migrations 1–15 precede the canonical event migration. It also contains:

- incompatible Hopae table assumptions;
- broad proof-store RLS replacement;
- unrelated provider, identity, support, ORI, release-evidence and owner-policy work;
- unique indexes and constraint changes;
- data backfills in intervening migrations.

It cannot be safely isolated by applying the two consent files. A new migration timestamp after `202607240004` also cannot be reached by normal ordered push while the 26 earlier timestamps remain pending. Marking those timestamps applied would falsify history unless an approved exact baseline process first proves their effects.

## 8. Destructive and data-changing analysis

Migration-time changes:

- 7 revokes privileges and replaces owner RLS policies.
- 8 drops/replaces the verification category constraint.
- 11 updates every existing Hopae webhook row.
- 15 drops/replaces a primary key/index contract and updates every identity evidence row.
- 18 changes trust-event constraints and seeds consensus data.
- 19 backfills evidence objects, sets 16 columns not null, materializes historical consent/provider evidence, and updates source rows.
- 20 updates every evidence object and trust alert, sets not-null fields, and replaces alert/graph constraints.
- 23 unconditionally drops a profile constraint.
- 24 unconditionally drops a replay constraint.

Callable/runtime changes:

- 9 updates verification and Hopae rows.
- 10 inserts tombstone timeline/audit records.
- 11 pruning deletes expired webhook and measurement data.
- 12 pruning deletes expired ORI inference data.
- 13 updates provider/Hopae state.
- 16 updates chain heads.
- 17 inserts durable consent history and canonical trust events.
- 21–26 add projection triggers and RPCs that insert/update graph, profile, replay, signal, review and alert state.

No `TRUNCATE`, `DROP TABLE`, or migration-time `DELETE FROM` was found. The identified deletes are inside explicitly invoked pruning functions. This does not make the sequence safe: policy replacement, incompatible `IF NOT EXISTS`, unconditional object creation, unique indexes, backfills and not-null conversions are independently blocking.

## 9. Read-only verification and preflight queries

Run these only through an approved read-only connection. They expose metadata and aggregate counts, not business rows.

### Object and column existence

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

### Function signatures

```sql
select n.nspname as schema_name,
       p.proname as routine_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;
```

### Constraints, RLS, policies and grants

```sql
select tc.table_name, tc.constraint_name, tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee, privilege_type;
```

### Existing collision and compatibility checks

```sql
select table_name,
       count(*) filter (where column_name in ('deployment_state','health_percent')) as expected_runtime_columns,
       count(*) filter (where column_name in ('overall_status','health_score')) as legacy_runtime_columns
from information_schema.columns
where table_schema = 'public' and table_name = 'runtime_validation_logs'
group by table_name;

select table_name, array_agg(column_name order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'trust_alerts','session_integrity_checks','verification_signals',
    'hopae_verifications','hopae_webhook_events','trust_relationships','trust_signals'
  )
group by table_name
order by table_name;
```

### Duplicate checks before unique indexes

```sql
select lower(email), count(*) from public.verifiers group by lower(email) having count(*) > 1;
select correlation_id, count(*) from public.hopae_verifications where correlation_id is not null group by correlation_id having count(*) > 1;
select enterprise_id, sequence, count(*) from public.trust_events where schema_version = 'trust-event-v1' group by enterprise_id, sequence having count(*) > 1;
select enterprise_id, event_hash, count(*) from public.trust_events where schema_version = 'trust-event-v1' group by enterprise_id, event_hash having count(*) > 1;
select evidence_id, count(*) from public.evidence_objects group by evidence_id having count(*) > 1;
select tenant_id, entity_id, version, count(*) from public.trust_profiles where profile_version = 'trust-dna-v2' group by tenant_id, entity_id, version having count(*) > 1;
```

Queries for tables that are absent must be run conditionally after existence is confirmed; an undefined-table error is itself an expected preflight result.

### Nulls before `SET NOT NULL`

```sql
select
  count(*) filter (where evidence_id is null) as evidence_id_nulls,
  count(*) filter (where domain_key is null) as domain_key_nulls,
  count(*) filter (where subject_id is null) as subject_id_nulls,
  count(*) filter (where payload_hash is null) as payload_hash_nulls,
  count(*) filter (where received_at is null) as received_at_nulls
from public.evidence_objects;

select
  count(*) filter (where observed_at is null) as observed_at_nulls,
  count(*) filter (where freshness_policy_seconds is null) as freshness_policy_nulls
from public.evidence_objects;
```

### Orphans before foreign keys

```sql
select count(*) from public.hopae_verifications h
where h.workspace_id is not null
  and not exists (select 1 from public.trust_workspaces w where w.id = h.workspace_id);

select count(*) from public.identity_signal_evidence e
where not exists (
  select 1 from public.identity_subjects s
  where s.enterprise_id = e.enterprise_id and s.id = e.subject_id
);

select count(*) from public.consent_receipts r
where not exists (select 1 from public.trust_workspaces w where w.id = r.enterprise_id);
```

### Rows affected by backfills

```sql
select count(*) from public.hopae_webhook_events
where processed_at is null or processing_status is null;

select count(*) from public.identity_signal_evidence
where signal_status is null or normalized_value is null or contradiction_count is null;

select count(*) from public.evidence_objects
where evidence_id is null or domain_key is null or subject_id is null
   or source_type is null or payload_hash is null;

select count(*) from public.consent_receipts where evidence_object_id is null;
select count(*) from public.provider_observations where evidence_object_id is null;

select count(*) from public.trust_alerts
where status in ('active','in_review')
   or severity is null or detected_at is null or subject_reference is null;
```

### Rows eligible for callable deletes

```sql
select count(*) from public.webhook_event_ledger where retention_expires_at < now();
select count(*) from public.operational_measurements where retention_until < now();
select count(*) from public.ori_inference_records
where retention_expires_at < now() and reviewer_outcome_id is null;
```

### Constraints to be dropped/replaced

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conname in (
  'identity_provider_capabilities_pkey',
  'trust_profiles_tenant_id_identity_id_evidence_snapshot_hash_key',
  'replay_events_event_type_check',
  'trust_alerts_status_check',
  'trust_alerts_type_check'
)
order by conname;
```

There are no type-conversion statements in the 26 files. The meaningful rewrite risks are backfills, nullability, primary/unique keys, FKs, checks and RLS.

## 10. Application dependencies and routes affected

The repository contains production-build code that expects pending schema. The failure is therefore not limited to a dormant migration folder.

### Required by the current Turnstile/request-demo hotfix

None of the 26 migrations is required for the Turnstile challenge itself or the enterprise-access insert. The Request Demo/Turnstile fix must not be coupled to this migration push.

### Required by current consent production paths

These routes directly use the absent consent repository objects and can return controlled 503/5xx responses:

- `GET`, `POST`, `PATCH /api/consent`
- `POST /api/consent/cookies`
- `POST /api/consent/withdraw`
- `GET /api/consent/history`
- `GET /api/consent/receipt/[id]`
- `GET /api/consent/catalogue`
- `GET /api/admin/consent/summary`
- `GET`, `POST /api/admin/consent/policies`

`GET /api/consent/policy` is code-backed and does not by itself prove a database dependency. Consent persistence reads `trust_event_chain_heads` before calling `persist_consent_change_v1`; the first missing relation produces the observed controlled failure.

### Other live API families backed by absent pending schema

- Identity/provider: `/api/identity/subjects`, `/api/identity/subjects/[id]/signals`, `/api/identity/subjects/[id]/confidence`, `/api/identity/verifications`, `/api/identity/verifications/[id]`, `/api/identity/providers`, `/api/identity/providers/health`, `/api/providers`, and provider callbacks.
- Canonical trust events: `/api/trust-events`, `/api/trust-events/[id]`, `/api/trust-events/[id]/integrity`, `/api/trust-events/ingest/[provider]`, `/api/trust-events/sessions/[sessionId]`, `/api/trust-events/subjects/[subjectId]`, `/api/trust-events/workflows/[workflowId]`, and `/api/trust-events/providers/health`.
- Consensus: `/api/consensus/decisions`, `/api/consensus/decisions/[id]`, `/api/consensus/decisions/[id]/explanation`, `/api/consensus/evaluate`, `/api/consensus/policies`, `/api/consensus/providers`, `/api/consensus/providers/health`, `/api/consensus/subjects/[subjectId]`, `/api/consensus/subjects/[subjectId]/timeline`, `/api/admin/consensus/policies`, `/api/admin/consensus/policies/[id]`, `/api/admin/consensus/simulate`.
- Trust architecture: `/api/trust-architecture`, `/domains`, `/health`, `/kpis`, `/decisions/[decisionId]`, `/replay/[decisionId]`, `/simulations`, `/simulations/[simulationId]`, `/subjects/[subjectId]`, `/subjects/[subjectId]/graph`, `/subjects/[subjectId]/timeline`, plus `/api/admin/trust-architecture/policies` and `/policies/[policyId]`.
- Continuous trust: `/api/trust/runtime`, `/runtime/[subjectId]`, `/events`, `/timeline`, `/evidence`, `/providers/health`, `/recalculate`, `/refresh`, `/replay/[decisionId]`, `/signals`, `/jobs/process`, `/alerts`, `/alerts/[id]`, `/alerts/[id]/acknowledge`, `/dismiss`, `/resolve`, `/manual-reviews`, `/manual-reviews/[id]/decision`, and `/entities/[entityId]/{drift,manual-review,override,recalculate,signals,state,transitions}`.
- Trust Centre/graph/profile/replay: `/api/trust-centre/overview`, `/search`, `/reports`, `/alerts/bulk`, `/alerts/[id]/activity`, together with trust entity/graph routes backed by `src/core/trust`.
- Operational/admin: `/api/admin/reviews`, `/api/support/issues`, `/api/admin/support/[id]`, `/api/session/integrity`, `/api/verifiers`, `/api/ready`, `/api/stripe/webhook`, `/api/provenance`, `/api/agents`, and `/api/trust/certifications` each reference one or more pending-created or divergent objects.

Classification:

- Currently live/current-production requirement: consent API and shared provider/webhook paths.
- Admin-only: all `/api/admin/**`, provider administration, release/ORI reviews, support review.
- Hidden or feature-gated: trust architecture, consensus, continuous-trust, Trust Centre and much of identity orchestration; reachability flags were not proven from database introspection.
- Demo/UI use: dashboard, workspace, replay and governance pages read several pending objects.
- Unreferenced: many audit/history/supporting tables are written only by SQL functions/triggers.

Any route listed above can fail when it reaches the relevant repository call. Some handlers deliberately normalize missing-schema errors to 503; others may surface 500. Exact HTTP behavior depends on each handler's error wrapper and runtime configuration.

## 11. Strategy comparison

### Strategy 1 — Apply all 26 in order

**Rejected in the current state.**

- Migration 1 is incompatible with the existing remote table and is expected to fail on its index columns.
- Migrations 4 and 5 use `IF NOT EXISTS` in ways that silently retain incompatible legacy tables.
- Migrations 22 and 25 unconditionally create names that already exist.
- Remote policy, constraint, trigger and routine compatibility is not fully inventoried.
- Backfill/unique/not-null preflight counts have not been approved.
- No tested production restore/rollback run exists.

### Strategy 2 — One later consent compatibility migration

**Not independently safe with the current ledger.**

A forward compatibility migration could technically define only a reconciled workspace helper, canonical trust-event subset and consent objects. However:

- a timestamp after `202607240004` is not normally reachable while 26 earlier files are pending;
- bypassing or marking earlier migrations applied is prohibited and would falsify history without a baseline;
- the later original migrations would collide with compatibility objects if the old sequence is ever applied;
- canonical event RLS currently couples to two earlier helpers.

This becomes viable only after an approved baseline/rebase process determines how the 26 old files are retired, superseded or represented without lying about production state.

### Strategy 3 — Establish a clean production baseline

**Recommended.**

Create an exact schema-only production baseline, review the differences against all 26 files, and author a new forward sequence from that proven baseline. Any ledger reconciliation or migration repair must be an explicit, reviewed operational action after staging validation; it is not authorized by this report.

## 12. Recommended strategy

1. Freeze production database DDL and the local migration folder during reconciliation.
2. Obtain an approved schema-only dump/catalog export of production, including tables, columns, indexes, constraints, routines, triggers, RLS, policies and grants.
3. Record how the 12 conflicting objects were created despite absent migration timestamps.
4. Decide object-by-object whether the remote legacy contract or the pending contract is canonical. Do not let `IF NOT EXISTS` make this decision implicitly.
5. Build a reviewed baseline representation of actual production.
6. Author a forward-only, idempotent reconciliation sequence from that baseline. Separate consent/canonical-event restoration from unrelated Trust Centre/ORI/identity work where dependencies permit.
7. Test on a production restore and approve preflight counts.
8. Only then approve the exact ledger reconciliation mechanism and production runbook.

The smallest safe consent outcome is not “apply migrations 16 and 17.” It is a reconciled forward package that supplies:

- a verified workspace membership helper;
- the canonical event envelope/head/link/audit and append RPC contract;
- the consent catalogue/receipt/preference/event/audit schema;
- exact RLS, grants and service-role RPC signatures expected by the application;
- a future-safe treatment of the 26 existing timestamps.

## 13. Staging validation plan

Required environment: a Supabase branch, temporary staging project, or isolated database restored from a current production backup. A clean empty local database is insufficient because it will not reproduce the schema drift.

1. Restore production schema and sanitized/controlled data or a protected production backup clone.
2. Capture catalog inventories before any migration.
3. Run all preflight queries and retain aggregate results.
4. Apply the proposed reconciled baseline/forward sequence, not the current 26 as-is.
5. If evaluating the original 26, run them only on a disposable production restore and record the first failing statement and transaction rollback.
6. Compare full post-migration catalog state and PostgREST-generated types.
7. Reload PostgREST schema cache and test every consent route.
8. Run application tests, request-demo tests, RLS tests, build and targeted integration tests.
9. Verify service-role functions remain inaccessible to anon/authenticated where intended.
10. Exercise backup restore and measure recovery time before production approval.

Do not create a paid project or branch without owner approval.

## 14. Conditional production execution plan

No production execution is currently approved. Once staging is complete:

1. Schedule a maintenance/change window and freeze writers affected by backfills.
2. Confirm a current restorable backup/PITR checkpoint and named rollback owner.
3. Re-run schema fingerprint and preflight counts against production.
4. Abort if the schema fingerprint or counts differ from the approved staging inputs.
5. Apply only the reviewed reconciliation artifact in a controlled transaction where supported.
6. Inspect migration ledger and catalog state.
7. Reload PostgREST schema and run consent smoke tests.
8. Verify Request Demo independently; do not make its availability depend on consent migration success.
9. Monitor database errors, function failures, RLS denials and API 5xx/503.

## 15. Rollback plan

- Primary rollback: restore the verified pre-change backup/PITR point to an isolated project, then promote or restore according to the approved Supabase operational procedure.
- Transaction rollback is useful only for failures before commit; it is not a complete rollback after new application writes use the changed schema.
- Do not rely on ad hoc down SQL for consent receipts, trust events, evidence projections or policy changes.
- Preserve pre-change schema dump, migration ledger, policy/grant inventory, PostgREST types and aggregate preflight results.
- Define recovery point objective, recovery time objective, decision owner and application maintenance behavior before production.
- If a production attempt fails, do not use `migration repair` merely to silence the ledger; reconcile actual committed DDL first.

## 16. Package and configuration review

| File | Finding |
|---|---|
| `.gitignore` | Local change ignores `.vercel` and `.env*`. Protecting local credentials is required; the broad `.env*` rule could also ignore a deliberate example file, so review whether an exception such as `!.env.example` is needed. Safe concept, unrelated to migrations. |
| `package.json` | Matches HEAD; no current CLI dependency change. |
| `package-lock.json` | Matches HEAD; no current CLI dependency change. |
| `supabase/.gitignore` | CLI-generated ignores for `.branches`, `.temp` and local env/key files. Safe to commit after team review; not required for this analysis. |
| `supabase/config.toml` | CLI-generated local development configuration. It contains no linked project reference or credential, but includes generic local ports/settings. Optional and unrelated to the remote reconciliation; review before commit. |

Supabase and Vercel CLIs should not be added as application runtime dependencies. Prefer pinned `npx` versions or dedicated CI/tooling installation. The inspection used `supabase@2.110.0` without changing package manifests.

Existing unrelated modifications to Request Demo/Turnstile files, `docs/RC2-RELEASE-MANIFEST.md`, and `vercel-inspect.json` were preserved and not edited.

## 17. Open questions

1. Which process created the 12 remote object collisions without corresponding migration ledger entries?
2. Are the remote legacy shapes or pending shapes the intended production contracts?
3. What are the exact remote indexes, constraints, triggers, RLS policies, grants and non-PostgREST-exposed routines?
4. Are any hidden/feature-gated route families intentionally deployed before their schema?
5. Who approves the legal/product contents of the consent catalogue seed?
6. What retention approval governs the RC6 and ORI prune functions?
7. Is production PITR enabled, and has restore been exercised?
8. Will the migration history be re-baselined, or will reconciled replacements supersede the 26 files?
9. What is the approved deprecation/rename plan for legacy `trust_relationships` and `trust_signals`?
10. Should the canonical trust-event RLS depend on the entire identity migration, or should a smaller reviewed membership helper be introduced in the future baseline?

## 18. Explicit go/no-go criteria

### No-go now

- Any `supabase db push` to the linked project.
- Any migration repair, reset, manual applied marker or consent-only bypass.
- Any run without a production-restored staging database.
- Any run while a pending-created object is `UNKNOWN`, `PARTIALLY PRESENT`, or `ALREADY PRESENT BUT DIFFERENT`.
- Any unique/not-null/FK/constraint change without approved zero-conflict preflight counts.
- Any destructive/callable retention behavior without owner approval.
- Any production run without a tested backup restore and rollback owner.

### Safe for staging migration test only when

- a disposable staging database is restored from current production;
- full catalog metadata is captured;
- the reconciliation artifact is reviewed;
- backup/restore is confirmed;
- no production connection is used.

### Safe for controlled production migration only when

- all 26 histories are reconciled against the full remote catalog;
- every collision has an approved resolution;
- staging has applied the exact artifact successfully;
- application/RLS/PostgREST tests pass;
- all backfill/destructive preflight results are approved;
- a tested rollback plan and change window exist.

Those criteria are not currently satisfied.

## 19. Analysis integrity

- Remote mutations: **none**.
- Migrations applied: **none**.
- Migration history repaired or marked: **none**.
- Production deploy or PR merge: **none**.
- Files created by this analysis: `docs/SUPABASE-MIGRATION-RECONCILIATION.md`.
- Files edited by this analysis: no pre-existing file.
- Final status: **BLOCKED — MIGRATION RECONCILIATION REQUIRED**.
