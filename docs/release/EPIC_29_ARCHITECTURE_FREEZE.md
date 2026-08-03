# Epic 29 architecture freeze

Status: frozen for Enterprise Trust Fabric staging and release engineering.

Source baseline: `9f5fbcdaf3683e8c67b920e2b577cf82f89080d0` (`main`, merge of PR #16).

Freeze date: 2026-08-02.

Epic 29 validates and releases the merged architecture. It does not create a new trust architecture. The canonical source descriptions remain `docs/ENTERPRISE_TRUST_FABRIC_ARCHITECTURE.md`, `docs/ENTERPRISE_TRUST_TIMELINE.md`, `docs/ENVIRONMENT_ATTESTATION_AND_SCOPE_CONTINUITY.md`, and `docs/AI_SERIOUS_INCIDENT_EVIDENCE.md`.

## Frozen enumerations

| Contract | Frozen values | Canonical TypeScript source | SQL enforcement |
| --- | --- | --- | --- |
| Trust state | `verified`, `degraded`, `contested`, `suspended`, `revoked` | `fabricTrustStates` in `src/lib/trust-fabric/types.ts` | checks in `202608010002_enterprise_trust_fabric.sql` and owning domain tables |
| Evidence classification | `asserted`, `configured`, `observed`, `independently_attested`, `cryptographically_attested`, `derived` | `evidenceClassifications` in `src/lib/trust-fabric/types.ts` | owning evidence records and validated JSON contracts |
| Provider state | `available`, `degraded`, `unavailable`, `contradicted`, `unknown` | `providerRuntimeStates` in `src/lib/trust-fabric/types.ts` | provider operational/consensus records and Fabric envelopes |
| Replay availability | `ready`, `empty`, `evidence_missing`, `source_unavailable`, `generation_failed`, `access_denied` | `replayAvailabilityStates` in `src/lib/trust-fabric/types.ts` | application contract over canonical Replay projections |

These value sets, their spelling, order-independent semantics, and adverse-state meaning are frozen. Epic 29 must not add aliases or silently map new values into an existing state.

## Canonical contract registry

All entries are version 1 unless an owning record carries an explicit policy or schema version. A path names the current canonical implementation, not a promise that a remote database has applied it.

| Capability | Canonical TypeScript type | Canonical SQL object | Canonical service | Canonical API | Canonical UI | Version |
| --- | --- | --- | --- | --- | --- | --- |
| Trust Object | `EnterpriseTrustObject` | security-invoker `enterprise_trust_objects` projection; owning source tables remain canonical | `evaluateEnterpriseTrust`, `enterpriseTrustFabricRepository` | `/api/trust-fabric/objects`, `/api/trust-fabric/objects/[subjectType]/[subjectId]`, `/api/trust-fabric/overview` | `/trust-centre/fabric` | Fabric v1 |
| Trust Fabric decision envelope | `TrustFabricDecisionEnvelope` | append-only `trust_fabric_decisions` | `createDecisionEnvelope`, `enterpriseTrustFabricRepository` | composed through Trust Fabric object/overview services | `/trust-centre/fabric` | envelope v1 |
| Trust Contract | `TrustContract`, `TrustContractEvaluation` | `trust_contracts`, `trust_contract_evaluations`; `persist_trust_contract_v1`, `persist_trust_contract_evaluation_v1` | `validateTrustContract`, `evaluateTrustContract`, Fabric repository | `/api/trust-fabric/contracts*` | Trust Centre Fabric active-contract section | contract v1 |
| Enterprise Trust Timeline | `EnterpriseTrustTimelineItem` | projection over canonical Replay, Trust Memory, Scope Continuity and incident sources; no new event store | `projectEnterpriseTrustTimeline`, `assertTimelineTenant` | `/api/trust-fabric/timeline/[subjectType]/[subjectId]` | Trust Centre Fabric and Replay drill-down | timeline v1 |
| Evidence taxonomy | `EvidenceClassification`, `FabricEvidenceRecord` | `evidence_objects`, provider observations, domain evidence references | owning evidence normalizers and Fabric composition | `/api/evidence*`, `/api/evidence-graph`, Trust Fabric APIs | Evidence Vault, Evidence Graph and Trust Centre | taxonomy v1 |
| Trust states | `FabricTrustState` | domain state columns and `trust_fabric_decisions.trust_state` | `strongestAdverseState`, `evaluateEnterpriseTrust` | Trust Fabric object/overview APIs | Trust Centre Fabric | state model v1 |
| Provider states | `ProviderRuntimeState` | `provider_operational_health_snapshots` and tenant-scoped `provider_health_snapshots` remain distinct | provider health/readiness services and Fabric adapter contract | `/api/identity/providers/health`, `/api/consensus/providers/health`, `/api/trust/providers/health` | provider status and Trust Centre | provider runtime v1 |
| Replay availability | `ReplayAvailabilityState` | canonical replay events/sessions plus `scope_continuity_replay` and `incident_reporting_replay` projections | `resolveReplayAvailability` and owning Replay services | `/api/replay/*`, `/api/trust/replay/*`, domain replay APIs | Replay surfaces and Trust Centre | availability v1 |
| Evidence Graph | `EvidenceGraph`, `EvidenceGraphNode`, `EvidenceGraphEdge` | `evidence_graph_nodes`, `evidence_graph_edges` | bounded traversal and safe metadata in `src/lib/trust-architecture/evidence-graph.ts` | `/api/evidence-graph`, `/api/trust-architecture/subjects/[subjectId]/graph` | Evidence Graph and Trust Architecture views | graph v1 |
| Authority Lineage | `AuthorityGrant`, `AuthorityGraphRequest`, `AuthorityGraphResult`; domain relationship types | canonical graph nodes/edges plus tenant-bound lease and incident responsibility references | `evaluateAuthorityGraph`; Scope Continuity and serious-incident integrations | trust architecture graph, scope and incident APIs | Trust Architecture, Environment and Scope, incident panels | lineage v1 |
| Environment Attestation | `ExecutionContextDeclaration`, `EnvironmentAttestation` | `execution_context_declarations`, `environment_attestations` | validation/evidence functions and `evaluateAndPersistScopeContinuity` | `/api/trust/scope-continuity/*` | `/dashboard/environment-scope` | Epic 26 v1 |
| Scope Continuity | `ScopeAuthorizationLease`, `ScopeContinuityDecision`, `ContextContradictionEvent` | scope lease/decision/contradiction tables, `scope_continuity_replay`, `persist_scope_continuity_decision_v1` | `evaluateScopeContinuity`, `evaluateAndPersistScopeContinuity` | `/api/trust/scope-continuity/evaluate`, decision and replay routes | `/dashboard/environment-scope` | Epic 26 v1 |
| Serious-incident evidence | `SeriousIncidentAssessmentInput` and incident artifact types | `incident_regulatory_assessments` and append-only incident evidence tables | serious-incident validation, workflow, service and repository | `/api/incidents/[id]/*` | `/dashboard/serious-incidents` | Epic 27 v1 |
| Regulatory lineage | `ScreeningInput`, `ScreeningResult`, `ReviewerDecisionInput`, package/submission types | findings, reviewer decisions, packages, submissions and `incident_reporting_replay` | operational screening, reviewer authorization and package services | regulatory-assessment, reporting-decision, package and submission routes | `/dashboard/regulatory-readiness`, serious-incident panel | Epic 27 v1 |
| Tenant identity | `IdentityEnterpriseRole`, resolved enterprise context | `trust_workspaces`, `workspace_members`, `user_can_access_trust_workspace` | `resolveIdentityEnterprise`; owning repositories always receive `enterpriseId` from server context | all protected canonical APIs | authenticated workspace shell | enterprise context v1 |
| Reviewer authority | `ReviewerRole`, `WorkspaceRole`, `ReviewerDecisionInput` | `incident_responsibility_roles`, `incident_reviewer_decisions` and service-only append RPC | `assertReviewerAuthorization`, `appendReviewerDecision` | `/api/incidents/[id]/reporting-decision` and protected package/correction routes | serious-incident and regulatory panels | reviewer authorization v1 |

## Canonical API rules

- Enterprise identity and actor identity come from authenticated server context, never a client-supplied role.
- Tenant identifiers are bound in every repository query, foreign key, RLS predicate and service RPC.
- Mutations require strict JSON, bounded bodies, CSRF/origin checks, role authorization and safe correlation IDs.
- Unknown fields fail validation. Changed retries fail closed; identical retries remain idempotent.
- Evidence bodies, credentials, provider secrets and private Auth data are never returned or logged.
- Operational screening is not a legal conclusion. Legal state requires an externally authored, authorized decision reference.

## Compatible changes allowed during Epic 29

- Tests, release manifests, runbooks, non-secret health metadata and observability controls.
- Additive indexes or policies only through separately reviewed forward migrations.
- Additive optional response metadata that does not enter canonical digests and does not weaken validation.
- Additional adapters only after explicit scope approval and without changing evidence classification semantics.
- Bug fixes that preserve persisted identifiers, tenant boundaries, hashes, state meaning and API behavior.

## Breaking changes requiring explicit architecture approval

Stop Epic 29 before implementing any change that:

- changes a frozen enum, adverse-state precedence, evidence classification or Replay availability meaning;
- removes, renames or changes the type of a required TypeScript, SQL or API field;
- changes canonical digest inputs, canonicalization, idempotency identity or supersession behavior;
- replaces a canonical projection/store, duplicates an owning domain, or moves authority between domains;
- weakens RLS, tenant-safe composite references, append-only history, actor derivation or service-only writes;
- treats provider assertions as independent evidence, missing evidence as safety, or screening as a legal conclusion;
- changes the Trust Contract/Scope lease boundary or lets the Fabric reevaluate owning-domain evidence;
- requires a destructive migration, Production ledger repair or incompatible application/schema deployment order.

## Freeze conclusion

No incompatible drift was identified at the merged Epic 28 baseline. The registry above is the release target. A dedicated isolated staging target now exists, but hosted migration execution remains blocked until the separately reviewed Epic 29.2 release plan authorizes it.

## Epic 30 documentation-only reservation

The following names are reserved as approved future extensions:

- AI Content Disclosure Evidence;
- Disclosure Assurance™;
- Granular Content Action Lineage;
- C2PA evidence adapter.

These capabilities are not implemented in Epic 29. Any future implementation must reuse the canonical Trust Fabric, Evidence Graph, Replay, Trust Memory and Authority Lineage. This reservation does not authorize Epic 30 product development, a parallel registry, migrations, provider integration or standards-conformance claims.
