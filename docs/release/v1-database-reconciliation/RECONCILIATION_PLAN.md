# STAGING MIGRATION RECONCILIATION PLAN

Target for every database mutation: agpyhygpfmppjkxwcpac. Production kecgtsfibkypjuaxqbjx remains read only. Initial inventory: local 109, Staging 117, Production 108. No database repair has been executed at plan creation.

Restore the 21 exact Staging-only histories in supabase/history/staging, outside the global migration queue. Assemble an isolated CLI context from the unchanged local migration chain plus that archive. This avoids making Staging-specific historical changes pending on Production. Add only the eight proven local aliases; preserve every existing remote ledger entry. Then dry-run the five genuinely pending local versions listed below. --include-all is necessary only because these known pending versions precede the remote head; the exact set must match this plan before execution. Do not apply any archive entry or any unlisted migration.

Existing data baseline: 36 canonical transactions, 291 events, 8 workflows, 3 interventions, 0 provider observations, 0 World claims. Historical SQL is unmodified. No reset, revert, deletion of history, schema reset or Production mutation is permitted.

## Per-version repair evidence

### 20260814153327

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Owner membership trigger and private function are present and enabled.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260814153337

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Workspace/member RLS and owner/admin policies remain present; internal writer RPCs remain service-role-only. Later named policies are retained.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260815172418

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Workspace SELECT permits authenticated creator or tenant member.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260815172840

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Same creator-or-member SELECT policy is present; exact recorded SQL uses ensure_policy_definition_v2.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260815174612

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Native replay event constraint contains authority creation; superseded by chronology extension.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260815180521

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Expanded native replay event vocabulary is present.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260815180807

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Consent evidence writer includes observed_at and freshness_policy_seconds.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260816135031

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Current append_trust_event_v1 retains consent namespace, tenant existence and metadata checks.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260817175031

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Protected workflow tables, tenant FKs, indexes, policies and immutable-decision triggers are present.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260817175111

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: All five named FK indexes are present.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260817175137

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: track_block_evidence_workflow_facts_idx is present.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260817175421

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Required runtime columns, both indexes and app_metadata admin policies are present; null count is zero.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260817175448

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Ten active canonical domain versions and tenant-readable registry policy are present.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260817175455

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Exact SQL duplicates 20260817175448; preserve both historical ledger entries without replay.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260818075422

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Target RLS remains enabled and no public policy references user-editable metadata.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Database-recorded historical definition is retained verbatim; no inference about the original operator is required.

### 20260825175059

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Git-equivalent authority propagation migration; graph/replay/memory functions present and later forecast projections supersede bodies.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260825175143

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Git-equivalent forecast migration; latest graph body matches and later API replay/memory corrections are retained.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260903093247

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Git-equivalent webhook vocabulary; all thirteen event types are present.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260904100445

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Git-equivalent alert normalization; alert_title NOT NULL, legacy title absent (and therefore not a NOT NULL blocker), zero blank titles.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260906155836

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Git-equivalent replay guard; live claim function body matches, table/RLS/index exist; original scope superseded by hardening.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260906165033

- CURRENT LEDGER STATE: APPLIED
- ACTUAL SCHEMA STATE: Git-equivalent hardening; unique(nullifier_digest,action), workspace FK, world_id CHECK and service-role-only RPC verified.
- DESIRED LEDGER STATE: APPLIED_UNCHANGED
- REPAIR ACTION: RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION
- WHY SAFE: Exact definition recovered from ledger; schema effects inspected. Git provenance additionally recovered.

### 20260819082001

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: PENDING_OR_PARTIAL
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER
- WHY SAFE: Consent writer freshness is present, but provider-observation writer lacks mandatory freshness fields. Apply the unchanged complete repair.

### 20260820085027

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: PENDING_OR_PARTIAL
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER
- WHY SAFE: Canonical continuity_signals/provider_neutral_evidence/deployment_gate/execution_continuity columns are absent, as is their persistence/snapshot support. Apply additive columns and writer definitions.

### 20260821085309

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: PENDING_OR_PARTIAL
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER
- WHY SAFE: Current workflow CHECK vocabularies lack REVIEW and STEP_UP_VERIFICATION. Apply the unchanged expanding constraints.

### 20260821174100

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: PENDING_OR_PARTIAL
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER
- WHY SAFE: Full canonical persistence definition is absent; its local predecessor supplies the same body. Apply in the declared local forward chain without modifying historical SQL; no remote applied version is replayed.

### 20260822124942

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: The stated repair is adding consent to the namespace allow-list. That exact effect and service-role-only grants already exist via 20260816135031, with stronger input validation. Do not replace the stronger live body.

### 20260824181053

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: Recorded SQL at 20260825175059 equals Git SQL; graph/replay/memory effects persist under later function replacements.

### 20260824184543

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: Recorded SQL at 20260825175143 equals Git SQL; forecast graph matches and subsequent replay/memory migrations explain supersession.

### 20260901120000

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: SELECT, INSERT, UPDATE and DELETE on api_keys are already granted to service_role. This migration is only that grant.

### 20260903093116

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: Recorded SQL at 20260903093247 equals Git SQL; exact webhook CHECK vocabulary exists.

### 20260904100313

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: Recorded SQL at 20260904100445 equals Git SQL; canonical title backfill and nullability verified.

### 202609060001

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: Recorded SQL at 20260906155836 is Git-equivalent; live RPC body, RLS, columns and lookup index verified; global scope strengthened by recorded hardening.

### 202609060002

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: INTENDED_EFFECTS_PRESENT
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION
- WHY SAFE: Recorded SQL at 20260906165033 is Git-equivalent; all required hardening constraints and RPC ACLs verified.

### 20260907120000

- CURRENT LEDGER STATE: ABSENT
- ACTUAL SCHEMA STATE: PENDING_OR_PARTIAL
- DESIRED LEDGER STATE: APPLIED
- REPAIR ACTION: APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER
- WHY SAFE: Outcome-review column and attachment RPC are absent. Apply after the canonical column prerequisites.

## Three-way migration comparison

VERSION | LOCAL | STAGING | PRODUCTION | CLASSIFICATION | ACTION
--- | --- | --- | --- | --- | ---
| 001 | initial_schema | initial_schema | initial_schema | MATCHED | RETAIN |
| 202605260001 | private_beta_schema_fix | private_beta_schema_fix | private_beta_schema_fix | MATCHED | RETAIN |
| 20260528 | explicit_supabase_api_grants | explicit_supabase_api_grants | explicit_supabase_api_grants | MATCHED | RETAIN |
| 202605300001 | evidence_upload_flow | evidence_upload_flow | evidence_upload_flow | MATCHED | RETAIN |
| 202605300002 | align_evidence_file_url | align_evidence_file_url | align_evidence_file_url | MATCHED | RETAIN |
| 202605300003 | add_signal_metadata | add_signal_metadata | add_signal_metadata | MATCHED | RETAIN |
| 202605310001 | real_evidence_file_upload | real_evidence_file_upload | real_evidence_file_upload | MATCHED | RETAIN |
| 202606010001 | intent_requests | intent_requests | intent_requests | MATCHED | RETAIN |
| 202606010002 | autonomy_profiles | autonomy_profiles | autonomy_profiles | MATCHED | RETAIN |
| 202606010003 | passport_state_checks | passport_state_checks | passport_state_checks | MATCHED | RETAIN |
| 202606010004 | execution_passports | execution_passports | execution_passports | MATCHED | RETAIN |
| 202606020001 | trust_graph_engine_help | trust_graph_engine_help | trust_graph_engine_help | MATCHED | RETAIN |
| 202606020002 | harden_operational_tables | harden_operational_tables | harden_operational_tables | MATCHED | RETAIN |
| 202606020004 | help_question_traceability | help_question_traceability | help_question_traceability | MATCHED | RETAIN |
| 202606020005 | trust_assistant_questions | trust_assistant_questions | trust_assistant_questions | MATCHED | RETAIN |
| 202606020006 | knowledge_articles | knowledge_articles | knowledge_articles | MATCHED | RETAIN |
| 202606030001 | data_rights_requests | data_rights_requests | data_rights_requests | MATCHED | RETAIN |
| 202606030002 | messages_notifications_appeals | messages_notifications_appeals | messages_notifications_appeals | MATCHED | RETAIN |
| 202606030003 | ai_trust_event_pipeline | ai_trust_event_pipeline | ai_trust_event_pipeline | MATCHED | RETAIN |
| 202606030004 | developer_platform_api_keys | developer_platform_api_keys | developer_platform_api_keys | MATCHED | RETAIN |
| 202606030005 | enterprise_access_requests | enterprise_access_requests | enterprise_access_requests | MATCHED | RETAIN |
| 202606030006 | private_evidence_bucket | private_evidence_bucket | private_evidence_bucket | MATCHED | RETAIN |
| 202606040001 | feedback_signal_intelligence | feedback_signal_intelligence | feedback_signal_intelligence | MATCHED | RETAIN |
| 202606040002 | ensure_enterprise_access_requests_public_submit | ensure_enterprise_access_requests_public_submit | ensure_enterprise_access_requests_public_submit | MATCHED | RETAIN |
| 202606040003 | enterprise_access_problem_category | enterprise_access_problem_category | enterprise_access_problem_category | MATCHED | RETAIN |
| 202606050001 | enterprise_access_design_partner_signals | enterprise_access_design_partner_signals | enterprise_access_design_partner_signals | MATCHED | RETAIN |
| 202606050002 | billing_subscriptions_usage_limits | billing_subscriptions_usage_limits | billing_subscriptions_usage_limits | MATCHED | RETAIN |
| 202606050003 | harden_enterprise_access_insert_permissions | harden_enterprise_access_insert_permissions | harden_enterprise_access_insert_permissions | MATCHED | RETAIN |
| 202606050004 | submit_enterprise_access_request_rpc | submit_enterprise_access_request_rpc | submit_enterprise_access_request_rpc | MATCHED | RETAIN |
| 202606060001 | trusted_hiring_mvp | trusted_hiring_mvp | trusted_hiring_mvp | MATCHED | RETAIN |
| 202606070001 | ai_agent_identity_direction | ai_agent_identity_direction | ai_agent_identity_direction | MATCHED | RETAIN |
| 202606070002 | trust_algorithm_runs | trust_algorithm_runs | trust_algorithm_runs | MATCHED | RETAIN |
| 202606070003 | integration_status | integration_status | integration_status | MATCHED | RETAIN |
| 202606070004 | api_test_runs | api_test_runs | api_test_runs | MATCHED | RETAIN |
| 202606070005 | launch_control_notes | launch_control_notes | launch_control_notes | MATCHED | RETAIN |
| 202606080001 | trust_relationships | trust_relationships | trust_relationships | MATCHED | RETAIN |
| 202606080002 | trust_timeline_events | trust_timeline_events | trust_timeline_events | MATCHED | RETAIN |
| 202606080003 | trust_replay_sessions | trust_replay_sessions | trust_replay_sessions | MATCHED | RETAIN |
| 202606080004 | trust_workspaces_cases | trust_workspaces_cases | trust_workspaces_cases | MATCHED | RETAIN |
| 202606080005 | operational_governance_engine | operational_governance_engine | operational_governance_engine | MATCHED | RETAIN |
| 202606080006 | operational_hardening_rls | operational_hardening_rls | operational_hardening_rls | MATCHED | RETAIN |
| 202606080007 | operational_notifications_coordination | operational_notifications_coordination | operational_notifications_coordination | MATCHED | RETAIN |
| 202606090001 | hiring_security_interview_integrity | hiring_security_interview_integrity | hiring_security_interview_integrity | MATCHED | RETAIN |
| 202606090002 | trust_evidence_chains_receipts | trust_evidence_chains_receipts | trust_evidence_chains_receipts | MATCHED | RETAIN |
| 202606090003 | operational_trust_intelligence | operational_trust_intelligence | operational_trust_intelligence | MATCHED | RETAIN |
| 202606100001 | runtime_validation_logs | runtime_validation_logs | runtime_validation_logs | MATCHED | RETAIN |
| 202606180001 | enterprise_ai_trust_governance | enterprise_ai_trust_governance | enterprise_ai_trust_governance | MATCHED | RETAIN |
| 202606190001 | verifiers | verifiers | verifiers | MATCHED | RETAIN |
| 202606190002 | session_integrity_signal_separation | session_integrity_signal_separation | session_integrity_signal_separation | MATCHED | RETAIN |
| 202606190003 | hopae_connect_upstream_identity | hopae_connect_upstream_identity | hopae_connect_upstream_identity | MATCHED | RETAIN |
| 202606270001 | screenshot_support_debugging | screenshot_support_debugging | screenshot_support_debugging | MATCHED | RETAIN |
| 202607010001 | production_owner_scoped_rls | production_owner_scoped_rls | production_owner_scoped_rls | MATCHED | RETAIN |
| 202607020001 | critical_trust_infrastructure_alignment | critical_trust_infrastructure_alignment | critical_trust_infrastructure_alignment | MATCHED | RETAIN |
| 202607160001 | release_1_rc1_provider_evidence_gate | release_1_rc1_provider_evidence_gate | release_1_rc1_provider_evidence_gate | MATCHED | RETAIN |
| 202607160002 | release_1_rc2_living_trust_privacy | release_1_rc2_living_trust_privacy | release_1_rc2_living_trust_privacy | MATCHED | RETAIN |
| 202607160003 | release_1_rc6_production_evidence_gate | release_1_rc6_production_evidence_gate | release_1_rc6_production_evidence_gate | MATCHED | RETAIN |
| 202607170001 | operational_risk_intelligence_shadow | operational_risk_intelligence_shadow | operational_risk_intelligence_shadow | MATCHED | RETAIN |
| 202607170002 | provider_abstraction_hopae | provider_abstraction_hopae | provider_abstraction_hopae | MATCHED | RETAIN |
| 202607190001 | identity_signal_engine | identity_signal_engine | identity_signal_engine | MATCHED | RETAIN |
| 202607190002 | identity_signal_runtime | identity_signal_runtime | identity_signal_runtime | MATCHED | RETAIN |
| 202607200001 | canonical_trust_event_foundation | canonical_trust_event_foundation | canonical_trust_event_foundation | MATCHED | RETAIN |
| 202607200002 | enterprise_trust_consent_manager | enterprise_trust_consent_manager | enterprise_trust_consent_manager | MATCHED | RETAIN |
| 202607200003 | provider_consensus_engine | provider_consensus_engine | provider_consensus_engine | MATCHED | RETAIN |
| 202607210001 | enterprise_trust_architecture | enterprise_trust_architecture | enterprise_trust_architecture | MATCHED | RETAIN |
| 202607210002 | continuous_trust_runtime | continuous_trust_runtime | continuous_trust_runtime | MATCHED | RETAIN |
| 202607230001 | trust_intelligence_engine | trust_intelligence_engine | trust_intelligence_engine | MATCHED | RETAIN |
| 202607230002 | enterprise_trust_graph | enterprise_trust_graph | enterprise_trust_graph | MATCHED | RETAIN |
| 202607240001 | trust_dna_engine | trust_dna_engine | trust_dna_engine | MATCHED | RETAIN |
| 202607240002 | replay_timeline_engine | replay_timeline_engine | replay_timeline_engine | MATCHED | RETAIN |
| 202607240003 | continuous_trust_engine | continuous_trust_engine | continuous_trust_engine | MATCHED | RETAIN |
| 202607240004 | enterprise_trust_centre | enterprise_trust_centre | enterprise_trust_centre | MATCHED | RETAIN |
| 202607310001 | environment_attestation_scope_continuity | environment_attestation_scope_continuity | environment_attestation_scope_continuity | MATCHED | RETAIN |
| 202608010001 | ai_serious_incident_regulatory_lineage | ai_serious_incident_regulatory_lineage | ai_serious_incident_regulatory_lineage | MATCHED | RETAIN |
| 202608010002 | enterprise_trust_fabric | enterprise_trust_fabric | enterprise_trust_fabric | MATCHED | RETAIN |
| 202608060001 | rc2_enterprise_operational_readiness | rc2_enterprise_operational_readiness | rc2_enterprise_operational_readiness | MATCHED | RETAIN |
| 202608060002 | end_to_end_trust_transaction | end_to_end_trust_transaction | end_to_end_trust_transaction | MATCHED | RETAIN |
| 202608080001 | provider_neutral_evidence_independence | provider_neutral_evidence_independence | provider_neutral_evidence_independence | MATCHED | RETAIN |
| 202608080002 | provider_neutral_workspace_rls_forward_repair | provider_neutral_workspace_rls_forward_repair | provider_neutral_workspace_rls_forward_repair | MATCHED | RETAIN |
| 202608080003 | native_operational_entity_verification | native_operational_entity_verification | native_operational_entity_verification | MATCHED | RETAIN |
| 202608090001 | native_delegated_authority | native_delegated_authority | native_delegated_authority | MATCHED | RETAIN |
| 202608090002 | native_enforcement_outcome_proof | native_enforcement_outcome_proof | native_enforcement_outcome_proof | MATCHED | RETAIN |
| 202608100001 | pgcrypto_routine_search_path | pgcrypto_routine_search_path | pgcrypto_routine_search_path | MATCHED | RETAIN |
| 202608100002 | runtime_persistence_compatibility | runtime_persistence_compatibility | runtime_persistence_compatibility | MATCHED | RETAIN |
| 202608100003 | alpha_beta_persistence_repairs | alpha_beta_persistence_repairs | alpha_beta_persistence_repairs | MATCHED | RETAIN |
| 202608100004 | continuous_trust_legacy_consensus_fk_repair | continuous_trust_legacy_consensus_fk_repair | continuous_trust_legacy_consensus_fk_repair | MATCHED | RETAIN |
| 202608100005 | optional_legacy_consensus_pointer | optional_legacy_consensus_pointer | optional_legacy_consensus_pointer | MATCHED | RETAIN |
| 202608110001 | external_agent_trust_api | external_agent_trust_api | external_agent_trust_api | MATCHED | RETAIN |
| 20260814153327 | - | customer_workspace_bootstrap | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260814153337 | - | staging_product_closure_security_reconciliation | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260815172418 | - | customer_workspace_creator_returning | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260815172840 | - | customer_workspace_creator_returning_guard_reconciliation | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260815174612 | - | gamma_authority_replay_event | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260815180521 | - | native_replay_chronology_extension | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260815180807 | - | consent_evidence_freshness | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260816135031 | - | staging_repair_append_trust_event_consent_namespace | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260817173631 | track_block_protected_workflow | track_block_protected_workflow | track_block_protected_workflow | MATCHED | RETAIN |
| 20260817175031 | - | track_block_protected_workflow | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260817175111 | - | track_block_fk_indexes | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260817175137 | - | track_block_evidence_index | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260817175347 | reconcile_enterprise_trust_domain_registry | reconcile_enterprise_trust_domain_registry | reconcile_enterprise_trust_domain_registry | MATCHED | RETAIN |
| 20260817175421 | - | runtime_validation_legacy_shape_rehearsal | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260817175448 | - | reconcile_enterprise_trust_domain_registry_v2 | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260817175455 | - | reconcile_enterprise_trust_domain_registry_idempotency | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260818075145 | remove_user_metadata_rls_authorization | remove_user_metadata_rls_authorization | remove_user_metadata_rls_authorization | MATCHED | RETAIN |
| 20260818075422 | - | remove_user_editable_rls_authorization | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260819082001 | consent_evidence_freshness_repair | - | consent_evidence_freshness_repair | LOCAL_PENDING | APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER |
| 20260819084252 | - | - | consent_evidence_freshness_repair | REMOTE_ONLY | PRODUCTION_READ_ONLY_REVIEW_AFTER_STAGING |
| 20260819084329 | - | - | restrict_evidence_trigger_functions | REMOTE_ONLY | PRODUCTION_READ_ONLY_REVIEW_AFTER_STAGING |
| 20260820085027 | vale_canonical_provider_preview | - | vale_canonical_provider_preview | LOCAL_PENDING | APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER |
| 20260821085309 | track_block_policy_identity_continuity | - | track_block_policy_identity_continuity | LOCAL_PENDING | APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER |
| 20260821174100 | reconcile_canonical_persist_search_path | - | reconcile_canonical_persist_search_path | LOCAL_PENDING | APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER |
| 20260822124942 | repair_production_consent_event_metadata | - | repair_production_consent_event_metadata | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260824181053 | authority_integrity_authorization_propagation | - | authority_integrity_authorization_propagation | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260824184543 | trust_forecast_operational_intelligence | - | trust_forecast_operational_intelligence | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260825175059 | - | authority_integrity_authorization_propagation | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260825175143 | - | trust_forecast_operational_intelligence | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260828165913 | close_public_api_security_contract | close_public_api_security_contract | close_public_api_security_contract | MATCHED | RETAIN |
| 20260829094528 | harden_public_api_rate_limit_isolation | harden_public_api_rate_limit_isolation | harden_public_api_rate_limit_isolation | MATCHED | RETAIN |
| 20260829164824 | close_public_api_customer_zero | close_public_api_customer_zero | close_public_api_customer_zero | MATCHED | RETAIN |
| 20260831121500 | fix_public_api_replay_subject | fix_public_api_replay_subject | fix_public_api_replay_subject | MATCHED | RETAIN |
| 20260831124000 | expand_canonical_replay_event_types | expand_canonical_replay_event_types | expand_canonical_replay_event_types | MATCHED | RETAIN |
| 20260831125500 | fix_public_api_trust_memory_source_id | fix_public_api_trust_memory_source_id | fix_public_api_trust_memory_source_id | MATCHED | RETAIN |
| 20260901120000 | grant_service_role_api_keys_privileges | - | - | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260902083450 | - | - | grant_service_role_api_keys_privileges | REMOTE_ONLY | PRODUCTION_READ_ONLY_REVIEW_AFTER_STAGING |
| 20260903093116 | reconcile_public_api_webhook_event_types | - | - | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260903093247 | - | reconcile_public_api_webhook_event_types | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260903095127 | - | - | reconcile_public_api_webhook_event_types | REMOTE_ONLY | PRODUCTION_READ_ONLY_REVIEW_AFTER_STAGING |
| 20260904100313 | normalize_continuous_trust_alert_contract | - | - | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260904100445 | - | normalize_continuous_trust_alert_contract | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260904113046 | - | - | normalize_continuous_trust_alert_contract | REMOTE_ONLY | PRODUCTION_READ_ONLY_REVIEW_AFTER_STAGING |
| 202609060001 | world_id_durable_replay_guard | - | - | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 202609060002 | world_id_replay_hardening | - | - | HISTORICAL_DRIFT | RECORD_LOCAL_VERSION_AS_APPLIED_WITHOUT_SQL_EXECUTION |
| 20260906155836 | - | world_id_durable_replay_guard | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260906165033 | - | world_id_replay_hardening | - | REMOTE_ONLY | RESTORE_EXACT_SQL_TO_STAGING_HISTORY_ARCHIVE_AND_ISOLATED_CLI_CONTEXT; NO_DATABASE_MUTATION |
| 20260907120000 | add_decision_outcome_review_to_canonical_trust | - | - | LOCAL_PENDING | APPLY_UNCHANGED_LOCAL_SQL_IN_VERSION_ORDER |
