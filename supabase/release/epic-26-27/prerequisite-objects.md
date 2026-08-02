# Prerequisite objects

- `public.trust_workspaces`
- `public.user_can_access_trust_workspace(uuid)`
- `public.trust_architecture_audit_log`
- `public.evidence_graph_nodes`
- `public.evidence_graph_edges`
- `public.trust_memory_index`
- `public.trust_policy_versions`
- `public.prevent_trust_architecture_history_mutation()`
- canonical `public.provider_operational_health_snapshots` (global Epic 16 operational definition)
- canonical `public.provider_health_snapshots` (tenant-scoped Epic 17 Consensus definition)

Preflight verifies both provider-health objects and their ownership boundary. The corrected Epic 16 migration precedes Epic 17 in clean lexical replay; no later repair or remote ledger adjustment is required.
