# Prerequisite objects

- `public.trust_workspaces`
- `public.user_can_access_trust_workspace(uuid)`
- `public.trust_architecture_audit_log`
- `public.evidence_graph_nodes`
- `public.evidence_graph_edges`
- `public.trust_memory_index`
- `public.trust_policy_versions`
- `public.prevent_trust_architecture_history_mutation()`

Preflight must verify these canonical objects and must not assume remote-only state.
