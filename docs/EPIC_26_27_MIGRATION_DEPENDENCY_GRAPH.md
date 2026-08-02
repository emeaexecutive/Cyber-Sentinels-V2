# Epic 26/27 Migration Dependency Graph

```text
trust_workspaces + user_can_access_trust_workspace
  ├─ trust_architecture_audit_log
  ├─ evidence_graph_nodes + evidence_graph_edges
  ├─ trust_memory_index
  └─ trust_policy_versions
             │
             ▼
202607310001_environment_attestation_scope_continuity.sql (Epic 26)
  ├─ execution_context_declarations
  ├─ environment_attestations
  ├─ scope_authorization_leases
  ├─ scope_continuity_decisions + decision-attestation links
  ├─ context_contradiction_events + reviewer actions
  └─ scope_continuity_replay / persist_scope_continuity_decision_v1
             │ exact enterprise-scoped canonical references
             ▼
202608010001_ai_serious_incident_regulatory_lineage.sql (Epic 27)
  ├─ assessment / responsibility / chronology / snapshot / impact
  ├─ trigger findings / reviewer decisions / packages / submissions
  ├─ corrective actions / supersessions
  └─ incident_reporting_replay / incident persistence RPCs
             │
             ▼
202608010002_enterprise_trust_fabric.sql (Epic 28 composition)
```

## Ordered application

1. Apply all canonical prerequisites through `202607300001_enterprise_trust_architecture.sql`.
2. Apply `202607310001_environment_attestation_scope_continuity.sql`.
3. Apply `202608010001_ai_serious_incident_regulatory_lineage.sql`.
4. Apply `202608010002_enterprise_trust_fabric.sql`.
5. Run the package post-apply, RLS, and integrity validation scripts.

The package does not duplicate migration bodies. SHA-256 pins prevent an altered historical file from being mistaken for the audited artifact.

## Referenced object inventory

| Layer | Tables/views | Functions/RPCs | Ordering reason |
|---|---|---|---|
| Prerequisite | `trust_workspaces`, `trust_architecture_audit_log`, `evidence_graph_nodes`, `evidence_graph_edges`, `trust_memory_index`, `trust_policy_versions` | `user_can_access_trust_workspace(uuid)`, `prevent_trust_architecture_history_mutation()` | tenant access, audit, graph, memory and append-only foundations must exist first |
| Epic 26 | seven tables listed in the graph; `scope_continuity_replay` | `prevent_scope_continuity_history_mutation()`, `persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid)` | owns canonical context, attestation, lease and decision references |
| Epic 27 | eleven incident tables; `incident_reporting_replay` | minimized-payload validator, append-only guard, transition guard, case persistence RPC and append-record RPC | reads Epic 26 canonical records and extends the shared graph edge constraint |

## Foreign-key and tenant alignment

- Every root record references `trust_workspaces(id)`.
- Epic 26 child links use `(enterprise_id, id)` for context→attestation, context/lease→decision, decision↔attestation, decision→contradiction, and decision→reviewer action.
- Epic 26 supersession links are tenant-scoped and self-reference attestations, leases, and reviewer actions.
- Every Epic 27 child uses `(enterprise_id, incident_id)`; supersession links also include the child `id`.
- Package approval, reviewer approved-package, external submission, corrective-action approval, and evidence-correction approval use enterprise+incident composite references.
- Runtime RPC lookups for context, attestation, lease, and continuity decision always constrain `enterprise_id`; JSON references cannot cross tenants.

## Checks, views and classifications

Epic 26 constrains subject type, environment class, attestation source, freshness, evidence strength, lease contradiction response, decision outcome, contradiction severity, trust impact, reviewer action, integrity hash shape, valid time windows, and non-self supersession. Epic 27 constrains initial/workflow states, reviewer roles, party types, timestamp confidence, evidence classification, containment states, impact confidence/source/strength, trigger tiers, decision types, package and submission states, corrective-action source/effectiveness, correction record types, minimized payloads, hash shapes, and non-self supersession. The exact values are pinned by the audited migration hashes and statically asserted; no PostgreSQL enum type or remote-only type is required.

Both Replay views are `security_invoker=true`. Epic 26 classifications preserve asserted/configured/observed/independently-attested/decided facts. Epic 27 preserves `TECHNICAL EVIDENCE`, `PROVIDER ASSERTION`, `PROVIDER CONCLUSION`, `CYBER SENTINELS OPERATIONAL SCREENING`, `REVIEWER DECISION`, `LEGAL CONCLUSION`, `REGULATOR RESPONSE`, and `CORRECTIVE ACTION` without collapsing one into another.

## Shared graph and Trust Memory

Epic 26 uses `AUTHORIZED_BY`, `OBSERVED_BY`, `CONFLICTS_WITH`, and `RESULTED_IN` in the shared graph. Epic 27 installs the union constraint containing the pre-existing edge types plus `INVOLVES`, `OPERATED_AS`, `RAN_IN`, `CONTRADICTS`, `CAUSED_OR_PRECEDED`, `DETECTED_BY`, `AFFECTED`, `REQUESTED_FROM`, `CONTAINMENT_REQUESTED`, `ACKNOWLEDGED_BY`, `CONFIRMED_BY`, `INDEPENDENTLY_CONFIRMED_BY`, `SUPPORTS_TRIGGER`, `REVIEWED_BY`, `DECIDED_BY`, `INCLUDES`, `INCLUDED_IN_PACKAGE`, `SUBMITTED_TO`, `CORRECTED_BY`, `REMEDIATED_BY`, `VALIDATED_BY`, `RECORDED_IN_MEMORY`, and `RECONSTRUCTED_BY_REPLAY`. The union retains the continuous-trust edge types; static validation rejects their accidental removal.

Both persistence layers insert into `trust_memory_index` with the original canonical source ID. Corrections append a new memory event and `SUPERSEDES` relationship; they never rewrite the earlier fact.

## RLS, grants, policies and indexes

All 18 tenant tables enable RLS. Authenticated users receive `SELECT` only through a tenant-read policy calling `user_can_access_trust_workspace(enterprise_id)`. Anon receives nothing. Persistence RPC execution is revoked from public, anon, and authenticated and granted to service role. Replay select is available through RLS and security-invoker semantics. Compound indexes begin with `enterprise_id` and cover subject/context, state/time, incident chronology, active responsibility, snapshot time, findings, package version, submissions, corrective actions, and corrections. The exact inventory is machine-readable in `supabase/release/epic-26-27/expected-inventory.json`.

## Transaction phases

Each canonical migration is a single forward migration and can execute transactionally under the migration runner. Apply Epic 26 and Epic 27 as separate ordered phases so a failure has a precise owner and postcondition. Do not combine or copy their SQL into a release script. Epic 27 is invalid before Epic 26 because its persistence RPC directly resolves the four Epic 26 object families.

## Forward-only rule

If prerequisite state differs, stop. Do not edit a merged migration or remote migration ledger. Repair through a new timestamped migration that records the detected state, desired state, explicit replacement reason, and postcondition. Policy reconciliation uses the Epic 28 versioned helper and its append-only decision ledger.
