# Staging function drift and database lint — 2026-10-06

Read-only assessment of Staging `agpyhygpfmppjkxwcpac`. No hosted schema was changed. The shadow database used reconstructed Staging history; seven exact duplicate migration bodies were replaced by markers in the temporary shadow copy only. This normalization is not a hosted migration.

## Function classification

All 64 reported definitions are classified below. 63 normalized bodies match. Nine apparent search-path differences are already accounted for by later `ALTER FUNCTION` migrations; comparing only the latest `CREATE FUNCTION` misses these changes. The one semantic difference is an existing archived Staging repair. No unknown function-body differences remain.

The six `public, extensions` settings are prescribed by `202608100001_pgcrypto_routine_search_path.sql`; the three empty paths by `20260814153337_staging_product_closure_security_reconciliation.sql`. Neither `anon` nor `authenticated` can CREATE objects in `public` or `extensions` (fresh catalog check). Language and SECURITY DEFINER/INVOKER attributes match the reconstructed CREATE definitions. Owners below are observed live; owner equality with a separately dumped shadow catalog has not been independently proven.

| Function | Classification | Live owner | Security | Effective path assessment |
|---|---|---|---|---|
| `accept_operational_entity_delegation_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `append_canonical_trust_transaction_replay_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `append_trust_event_v1` | SEMANTIC DIFFERENCE (archived Staging repair) | postgres | DEFINER | CREATE attributes match |
| `apply_trust_state_decision_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `attach_canonical_decision_outcome_review_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `audit_ori_model_state_change` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `bind_native_enforcement_decision_v1` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `claim_world_id_nullifier_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `consume_native_entity_challenge_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `consume_public_api_rate_limit_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `create_consensus_policy_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `create_consent_policy_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `create_public_api_review_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `create_trust_policy_version_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `emit_canonical_trust_transaction_memory_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `export_rc6_performance_summary` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `extend_canonical_trust_transaction_graph_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `identity_workspace_role` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `index_evidence_graph_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `normalize_legacy_evidence_object_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `persist_consensus_decision_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `persist_consent_change_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `persist_delegated_action_evaluation_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `persist_native_enforcement_correlation_v1` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `persist_public_api_authority_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `persist_trust_simulation_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `preserve_authority_delegation_payload_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `preserve_native_evidence_payload_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `preserve_native_manifest_payload_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `preserve_provider_transition_history_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `preserve_trust_contract_content_v2` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `prevent_canonical_trust_history_mutation` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `prevent_enterprise_policy_governance_mutation` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `prevent_finalized_trust_event_envelope_mutation` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `prevent_identity_audit_mutation` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `prevent_ori_reviewer_outcome_mutation` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `prevent_trust_memory_mutation` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `project_continuous_trust_signal_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `protect_canonical_decision_fields_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `protect_public_api_client_evidence_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `protect_track_block_evidence_v1` | FORMATTING / DUMP DIFFERENCE | postgres | INVOKER | CREATE attributes match |
| `prune_expired_ori_inferences` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `prune_expired_rc6_evidence` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `public_api_key_has_current_role_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `public_api_readiness_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `record_canonical_external_acknowledgement_v1` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `record_canonical_external_outcome_v1` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `record_enterprise_policy_governance_event_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `record_ori_reviewer_outcome` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `record_provider_health_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `record_trust_memory_tombstone` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `register_native_agent_operational_entity_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `register_native_entity_manifest_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `request_canonical_external_execution_v1` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `reserve_native_enforcement_request_v1` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `reserve_trust_event_envelope_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `resolve_canonical_manual_review_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `resolve_public_api_review_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `review_release_validation_case` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `revoke_public_api_authority_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `revoke_trust_contract_with_delegation_cascade_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `rotate_public_api_key_v1` | FORMATTING / DUMP DIFFERENCE | postgres | DEFINER | CREATE attributes match |
| `user_can_access_trust_workspace` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |
| `user_has_trust_workspace_role` | SEARCH_PATH DIFFERENCE — explained by later ALTER | postgres | DEFINER | Matches explicit later migration |

`append_trust_event_v1` is the sole semantic difference: the live body matches the archived Staging repair `20260816135031_staging_repair_append_trust_event_consent_namespace.sql`, including required context and UUID validations. The later cross-environment repair `20260822124942_repair_production_consent_event_metadata.sql` changes the shadow reconstruction. Do not overwrite the live validation with a blind dump normalization. This is understood deployment-history divergence, not an unexplained authentication or tenant-boundary change.

Two missing index names (`hopae_verifications.verification_id`, `hopae_webhook_events.event_id`) are redundant with existing UNIQUE constraints on the same columns. The differently named trust-signal timestamp constraint enforces the same five-minute bound. Constraint naming is not counted as security enforcement loss.

## Application lint

Fresh CLI lint reports five application functions, six warning messages, and zero application errors.

| Function | Warning | Security/runtime relevance | Action |
|---|---|---|---|
| `apply_trust_state_decision_v1` | Unused `current_id` | Cosmetic; no privilege or tenant-boundary effect | Optional cleanup |
| `reserve_native_enforcement_request_v1` | Text-to-array initialization of `reasons` | Literal empty array conversion; runtime qualification required | Prefer explicit `text[]` cast in future maintenance |
| `trust_timeline_safe_timestamptz` | IMMUTABLE function calls STABLE timestamp conversion | Real volatility metadata mismatch; used for ISO timestamps in timeline triggers; no index use found in repository | Mark STABLE in a reviewed maintenance migration; no demonstrated access-control defect |
| `public_api_readiness_v1` | Two text-to-array initializations | Empty-array literals; readiness RPC has executed successfully | Optional explicit casts |
| `claim_world_id_nullifier_v1` | Unused `existing_count` | Cosmetic | Optional cleanup |

Storage-owned `list_objects_with_delimiter` and `search` produce static-analysis errors for dynamic SQL record fields. Earlier empty/nonempty runtime calls passed; no vendor function was edited. `search_by_timestamp` additionally reports uncertain dynamic-SQL OUT-variable assignments. CLI exit 1 therefore must not be represented as an all-clear exit code. See [plpgsql_check limitations](https://github.com/okbob/plpgsql_check) and [Supabase Storage schema ownership](https://supabase.com/docs/guides/storage/schema/design).
