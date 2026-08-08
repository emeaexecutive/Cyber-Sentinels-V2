# Continuous Operational Trust Intelligence architecture

## Permanent assertion

Operational Entity remains the canonical spine.

Trust Intelligence is DERIVED.
Trust Health is DERIVED.
Trust Drift is DERIVED.
Trust Prediction is DERIVED.
Trust Advisor is DERIVED.
Trust Cascade is DERIVED.

None is an independent source of truth. Each projection resolves to tenant-scoped canonical evidence, authority, provider, decision, incident, outcome, Replay and Trust Memory references. AI output is non-authoritative and cannot replace policy decisions.

## Architecture audit and reuse

| Capability | Existing implementation reused | Qualification action |
| --- | --- | --- |
| Operational Entity | `lib/operational-entities/operational-entity.ts` | Remains the entity and tenancy spine. |
| Trust Continuity | Operational Entity continuity and `src/lib/scope-continuity` | Current and accepted conditions are compared without creating another identity. |
| Trust Drift | `src/lib/continuous-trust/engine.ts` and drift repository/API | Extended in the existing Trust Intelligence layer to compare canonical conditions and require evidence for every changed value. |
| Trust Health | Continuous Trust state plus Trust Decision health | Projected as eight qualitative dimensions; no universal reputation score. |
| Trust Confidence | Existing evidence confidence and assurance inputs | Reframed as confidence in the current conclusion, with preserved evidence. |
| Trust Stability | Existing Trust Intelligence workflow-stability analysis | Extended to configurable 24-hour, 7-day and 30-day material-change windows. |
| Trust Prediction | Existing `lib/trust-engine/predictions.ts` presentation | Bounded operational predictions added to Trust Intelligence; predictions never enforce actions. |
| Trust Recovery | Existing `lib/trust-engine/trustRecovery.ts` and serious-incident recovery | Qualified with evidence-required transitions and immutable adverse history. |
| Trust Narrative | Canonical Decision Intelligence cited narratives | Reused citation rules with a deterministic fallback. |
| Trust Recommendation | Existing rules-based recommendations | Restricted to enumerated, non-executing enterprise actions. |
| Trust Advisor | Existing intelligence/explanation projections | Implemented as orchestration over derived outputs, not as a decision engine. |
| Trust Explanation | `lib/trust-explanation/explanation.ts` | Required questions are projected with canonical references and unknowns. |
| Evidence Graph | `lib/evidence-graph/evidence-graph.ts` | Used for relationship impact, blast radius and cascades. |
| Authority Lineage | `lib/core/authority-graph.ts` and canonical transaction snapshots | Authority changes and dependencies retain exact references. |
| Responsibility Lineage | `lib/operational-entities/federated-evidence.ts` | Remains distinct from delegated Authority Lineage. |
| Replay | Existing Replay engines and canonical transaction writer | Scenario chronology appends to the existing Replay concept. |
| Trust Memory | Existing Trust Memory implementation and canonical writer | Material change references are emitted exactly once; no second history. |
| Enterprise Decision History | Canonical Decision Intelligence history references | Comparable cases are tenant-filtered retrieval only; no silent training. |
| Provider Governance | Existing provider registry, relationships and transition proof | Dependency analysis distinguishes sole-source and independently corroborated entities. |
| Incidents | `src/lib/serious-incident` | Incident opening, remediation and resolution remain canonical inputs. |
| Canonical Trust Transaction | `src/lib/trust-transaction/canonical.ts` | ALLOW/REVIEW/DENY remains deterministic and authoritative. |

## Derived execution boundary

`lib/trust-intelligence.ts` creates content-addressed `TrustChangeEvent` values and projections. It does not persist a new ledger. Materiality uses consequence, authority, environment, evidence quality, provider independence, incidents, outcomes and policy requirements. Protected characteristics and inferred malicious intent are excluded.

Relationship impact traverses existing tenant-scoped references. Cycle detection and a configurable maximum depth prevent recursive runaway cascades. Entities with independent corroboration are not degraded merely because one provider fails.

## Demonstration and performance truth

The Agent Alpha scenario is deterministic and synthetic. It exercises stale evidence, confidence reduction, low-consequence ALLOW, critical REVIEW, unexpected runtime drift, incident opening, Workflow Delta dependency impact, attestation, human confirmation, recovery, Replay and Trust Memory. No code editing is required during the demonstration.

Performance measurements are local, in-process and exclude database/network/provider latency. They do not prove Production scale.
