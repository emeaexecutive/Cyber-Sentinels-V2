# Trust relationships schema reconciliation

## Decision

The collision is classification **D: two distinct concepts sharing one name**. The applied `public.trust_relationships` table remains the legacy operational relationship log. The unapplied Enterprise Trust Graph relation is corrected to `public.trust_graph_relationships_v2`, the versioned name already selected by the Production-to-target schema review.

This is not a second canonical Evidence Graph. `trust_graph_relationships_v2` is the tenant-safe entity topology owned by the Enterprise Trust Graph service. `evidence_graph_nodes` and `evidence_graph_edges` remain the canonical evidence-lineage representation used by Authority Graph, Epic 26, Epic 27, Replay, and Epic 28 composition. The legacy table remains only for existing operational consumers until a separately approved compatibility retirement; new Enterprise graph code must not write it.

## Clean Preview reconstruction evidence

The fresh disposable PR #16 Preview on 2026-08-02 successfully applied through:

- `202607170002_provider_abstraction_hopae.sql`;
- `202607200003_provider_consensus_engine.sql`;
- `202607210001_enterprise_trust_architecture.sql`;
- `202607210002_continuous_trust_runtime.sql`; and
- `202607230001_trust_intelligence_engine.sql`.

Its first failure was `202607230002_enterprise_trust_graph.sql`, statement 8, SQLSTATE `42P07`: `CREATE TABLE public.trust_relationships` found that relation already present. This clean progression proves the earlier provider-health name correction reconstructs successfully.

## Historical definitions

| Source | Migration/commit | Object purpose | Columns | Tenant key | Constraints | RLS | Consumers |
|---|---|---|---|---|---|---|---|
| Original table creator | `202606080001_trust_relationships.sql`; `435c59a1728fdb2a9e8d77ccf91babbe790fee0b` | Polymorphic operational links used by timeline, receipts, cases, notifications, hiring, passports, and legacy graph UI | `id`, `source_type`, `source_id`, `relationship_type`, `target_type`, `target_id`, `confidence_level`, `explanation`, `created_at` | None in the original applied definition | UUID primary key; source, target, and type indexes; relationship-type insert vocabulary | Enabled; authenticated read and restricted insert; anon revoked; service role full access | Legacy UI pages, notification/repair helpers, and June operational migrations listed below |
| Pending legacy hardening | `202607160001_release_1_rc1_provider_evidence_gate.sql`; `6a62ec83ea2a8012bf636a90a75e7c2699c5fc44` | Adds workspace ownership to the legacy operational table without changing its polymorphic model | Adds `workspace_id`, `owner_user_id`, `correlation_id` | Optional `workspace_id` plus owner fallback | Workspace foreign key and workspace/created index | Replaces legacy policies with owner-or-workspace-scoped read/insert | RC1 operational consumers; migration is remote-blank with the rest of the pending chain |
| Enterprise Trust Graph collision as introduced | `202607230002_enterprise_trust_graph.sql`; `4f817901a638eada170efd6fdd21202a8e33862d` | Versioned tenant entity topology with atomic mutation/event emission | `id`, `tenant_id`, `source_entity`, `target_entity`, `relationship_type`, `confidence`, `metadata`, `version`, `created_at`, `removed_at` | Required `tenant_id` referencing `trust_workspaces` | Composite tenant/entity foreign keys, unique tenant/id, active-edge uniqueness, no self-edge, confidence and vocabulary checks | Enabled; anon/authenticated writes revoked; authenticated tenant read; service role mutation | `src/core/trust/repositories/supabase.ts`, Enterprise Trust Graph RPCs, summary/statistics/orphan queries and focused tests |
| Corrected Enterprise graph object | Same unapplied migration, this repair | Same Enterprise topology under the approved distinct namespace | Unchanged from the introduced Enterprise definition | Unchanged | Unchanged, with versioned index names | Unchanged, with a versioned policy name | Same Enterprise consumers, explicitly updated to `trust_graph_relationships_v2` |

The earlier object is a table, not a view or materialized view. The schemas are not equivalent or safely mergeable: polymorphic nullable endpoints and text confidence cannot satisfy the tenant/entity foreign-key contract, while rewriting the applied legacy object would break its current consumers.

## Application-status proof and historical policy

The sanitized, owner-authorized linked migration ledger captured in `docs/production-migration-history.txt` proves:

- Production includes `202606080001` and continues through `202606090003`;
- `202607160001` and `202607230002` have blank remote entries;
- the Production schema baseline contains the legacy polymorphic `trust_relationships` columns;
- the Supabase branch inventory contains no retained persistent staging branch; and
- PR Preview branches are disposable reconstruction environments, not durable releases.

Therefore the earlier creator is applied and is not edited. `202607230002` was never durably applied, so its source may receive a narrow historical name correction. The original remains recoverable through Git history at commit `4f817901a638eada170efd6fdd21202a8e33862d`. No Production ledger repair or data migration is required or authorized.

## Consumer boundary

Legacy `trust_relationships` consumers are intentionally unchanged:

- `app/admin/founder-control/page.tsx`, `app/workspace/[id]/page.tsx`, `app/trust-graph/page.tsx`, and `app/trust-replay/page.tsx`;
- agent, passport, hiring-report, and receipt detail pages;
- `lib/communications/createNotification.ts` and `lib/trust-integrity/repair.ts`; and
- migrations `202606080002`, `202606080004` through `202606080007`, and `202606090001` through `202606090003`.

The Enterprise Trust Graph adapter and every migration-local `%rowtype`, read, insert, update, summary, statistics, and orphan query use `trust_graph_relationships_v2`. The API and graph service reach that table through the adapter and mutation RPC. No broad TypeScript type rename is needed because the domain type `TrustRelationship` describes the Enterprise concept rather than a physical table.

## Graph architecture and direction

The graph layers have separate ownership rather than competing canonical records:

| Layer | Canonical persistence | Role |
|---|---|---|
| Legacy operational links | `trust_relationships` | Backward-compatible polymorphic timeline/UI links |
| Enterprise entity topology | `trust_entities`, `trust_graph_relationships_v2` | Tenant entity adjacency, lifecycle, and graph queries |
| Evidence and Authority lineage | `evidence_graph_nodes`, `evidence_graph_edges`, Authority Graph structures | Evidenced causal, authority, review, submission, and remediation lineage |
| Replay and Trust Memory | Their append-only stores plus evidence references | Chronology and durable interpreted memory, not shadow edge stores |
| Epic 28 Trust Fabric | Composed contract/read model | Reads canonical sources and does not create a replacement relationship table |

Direction is source-to-target and tenant-bound. The current canonical vocabulary expresses the requested semantics as follows:

- `AUTHORIZED_BY`: authorization/runtime or agent to the approving authority, lease, or decision;
- `OBSERVED_BY`: observed record to attributed observer/evidence source;
- `CONTRADICTS`: attestation or contradiction to the declaration/claim contradicted;
- requested `RESULTS_FROM` is represented canonically as `RESULTED_IN`, from cause/contradiction to resulting decision;
- `SUPERSEDES`: new immutable record to prior record;
- `REVIEWED_BY`: incident/record to authorized reviewer;
- requested `AFFECTS` is represented canonically as `AFFECTED`, from incident/impact record to affected resource;
- `REMEDIATED_BY`: incident to corrective action; and
- `SUBMITTED_TO`: approved submission package to destination authority.

Unsupported causal relationships are not synthesized. Relationship `confidence` is bounded metadata about the asserted topology; it is not promoted to `evidenceStrength`, authority, or proof.

## Security and lifecycle

`trust_graph_relationships_v2` retains both composite `(tenant_id, entity_id)` foreign keys, so an ID-only cross-tenant reference cannot pass. The database and service reject self-relationships. Active duplicates are unique; removal sets `removed_at` and increments `version` rather than deleting history. Entity deletion is refused while active relationships remain.

RLS is enabled. `anon` and `authenticated` receive no direct writes; authenticated users receive tenant-scoped reads through `user_can_access_trust_workspace(tenant_id)`; the service role writes through `mutate_trust_graph_v1`, which emits an audited `trust_graph_events` record in the same transaction. No security-definer view bypass is introduced.

## Static namespace review

`tests/migration-namespace-reconciliation.test.mjs` scans all tracked migrations for duplicate table/view relation names, globally duplicate index names, repeated named constraints, and repeated policies on the same table. Repeated constraints and policies must have an explicit preceding compatible drop.

Three old guarded table recreations remain explicitly documented and tested because their later migrations immediately reconcile columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`: `api_keys`, `enterprise_access_requests`, and `notifications`. They are not precedent for allowing an unconditional collision. Any new duplicate relation or index fails the test.

## Historical correction boundary

The correction changes only the pending Enterprise object namespace:

- `trust_relationships` to `trust_graph_relationships_v2`;
- its active, source, and target indexes to versioned names;
- its tenant-read policy to a versioned name; and
- migration-local and TypeScript Enterprise consumers to the versioned table.

Columns, checks, tenant isolation, lifecycle, RPC behavior, event emission, grants, and service-only write controls are unchanged. There is no destructive DDL, data copy, backfill, compatibility view, hidden `IF NOT EXISTS`, or Production mutation.
