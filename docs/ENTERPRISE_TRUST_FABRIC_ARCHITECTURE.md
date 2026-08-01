# Enterprise Trust Fabric™ Architecture

Status: Epic 28 canonical composition architecture. This document describes implemented source and development migration `202608010002`; it is not evidence that the migration has been applied to any remote environment.

## Release and WIP boundary

Epic 28 started from clean `main` at `282e25664775391b890269c37ff60952e80e78d7`, equal to `origin/main`, after PR #14 merged. The branch `wip/epic-26-seven-week-catch-up` contains one 26,312-line preservation commit combining production reconciliation material, consent work and a few application changes. It is classified **unsafe or abandoned for code reuse, with unique concepts documented only**. No code was copied from it and the branch was not deleted. Useful concepts—canonical trust foundation, authority lineage, Replay, Trust DNA, Trust Memory and release gates—were re-audited against `main`.

Epic 26 supplied architectural vocabulary but no code dependency. Epic 27 is represented on `main` by Environment Attestation, Scope Continuity, Serious-Incident Evidence and Regulatory Reporting Lineage. Epic 28 composes those implemented contracts directly.

## Audit matrix

Classification describes executable source, migrations and tested interfaces, never marketing copy.

| Capability | Canonical entity | Canonical service | Canonical API | Canonical UI | Current duplication | Gap | Classification |
|---|---|---|---|---|---|---|---|
| Trust Workspaces | `trust_workspaces`, `workspace_members` | identity enterprise context | existing workspace APIs | dashboard / Trust Centre | older team-workspace helpers | no fabric-specific copy | canonical |
| Identity | `trust_subjects`, identity evidence | `lib/identity-signals/orchestrator.ts` | `/api/identity/*` | identity and Trust Centre surfaces | legacy identity helpers remain | subject-class migration is incremental | integrated |
| Authority Graph | authority grants and graph nodes | `lib/core/authority-graph.ts` | trust architecture subject graph | trust architecture | legacy authorization helpers | persistence remains owned by Authority | integrated |
| Authority Lineage | existing grants, incident responsibilities and scope relations | scope/incident integrations | scope and incident APIs | Trust Fabric drill-down | multiple projections, one source | cross-source identifiers can be incomplete | integrated |
| Trust DNA | existing Trust DNA profile/evaluations | Trust DNA engine | `/api/trust-dna/*` | Trust Centre DNA | legacy score vocabulary exists | Fabric holds references only | canonical |
| Evidence Graph | `evidence_graph_nodes`, `evidence_graph_edges` | trust architecture evidence graph | `/api/evidence-graph`, trust graph APIs | Trust Centre graph | older evidence graph helper | historic records may lack nodes | canonical |
| Trust Events | `trust_events` | trust-event gateway/repository | `/api/trust-events/*` | Replay/Trust Centre projections | older timeline tables remain | cross-era normalization is partial | canonical |
| Continuous Trust | runtime, signals, decisions, alerts, reviews | `src/lib/continuous-trust/*` | `/api/trust/runtime/*` | Trust Centre continuous view | old runtime engines remain | five-state Fabric mapping is a projection | canonical |
| Trust Memory | `trust_memory_index` and existing memory events | existing Trust Memory services | `/api/trust-memory` | Trust Centre / Replay | old memory implementations remain | Fabric never rewrites memory | integrated |
| Replay | replay events/sessions and canonical trust events | existing Replay engines | `/api/replay/*`, Fabric timeline | `/trust-replay`, `/replay/[id]` | multiple historical replay sources | availability state now explicit | integrated |
| Provider abstraction | provider registry, observations and evidence | existing provider adapters plus Fabric adapter contract | `/api/providers` | provider health/integrations | maturity labels remain separate | only one synthetic Fabric adapter | partially integrated |
| Environment Attestation | `execution_context_declarations`, `environment_attestations` | `src/lib/scope-continuity/*` | `/api/trust/scope-continuity/*` | Environment Scope panel | none identified | provider coverage depends on integrations | canonical |
| Scope Continuity | leases, decisions, contradictions | deterministic scope evaluator | scope-continuity APIs | Environment Scope panel | no duplicate lease in Fabric | some subjects lack a current lease | canonical |
| Serious-Incident Evidence | incident assessments, snapshots, impacts | `src/lib/serious-incident/*` | `/api/incidents/*` | serious-incident panel | none identified | specialist review remains required | canonical |
| Regulatory Reporting Lineage | chronology, reviewer decisions, packages, submissions | incident screening/packages | incident regulatory APIs | serious-incident panel | none identified | no automatic legal conclusion | canonical |
| Enterprise Trust Centre | existing protected snapshot | `src/lib/trust-centre/*` | `/api/trust-centre/*` | `/trust-centre` | earlier public Trust Center copy | Fabric added inside existing shell | canonical |
| Governance | policies, reviews, audit records | trust architecture / Continuous Trust | admin policy and review APIs | Trust Centre/admin | historical governance helpers | unified identifiers can be absent | integrated |
| Alerts | `trust_alerts`, immutable activity | Continuous Trust alert service | `/api/trust/alerts/*` | Trust Centre alerts | none identified | incident/alert linking varies | canonical |
| Policies | canonical policy versions and domain policies | policy resolution/validation | trust architecture policy APIs | Trust Centre policies | older policy-engine helpers | retirement remains incremental | integrated |
| Human Review | manual reviews and incident reviewer decisions | Continuous Trust/incident services | manual review and incident APIs | Trust Centre reviewer queue | domain-specific queues are intentional | one cross-domain queue is a projection | integrated |
| Provider Health | provider health snapshots | provider health/readiness | provider health APIs | Trust Centre/providers | adapter maturity was confused with runtime state | five runtime states now canonical | integrated |
| Audit Logs | immutable domain audit logs and Trust Events | owning repositories | audit/export APIs | governance and Trust Centre | several domain logs | unified timeline projects; it does not copy | integrated |
| Enterprise Trust Object | security-invoker `enterprise_trust_objects` view | `evaluateEnterpriseTrust` | `/api/trust-fabric/objects*` | `/trust-centre/fabric` | none; older `EntityIdentity` is not reused | depends on linked canonical records | canonical |
| Trust Contracts | `trust_contracts`, evaluations | `evaluateTrustContract` | `/api/trust-fabric/contracts*` | Fabric active-contract section | no scope lease or grant duplication | issuance UI is intentionally deferred | canonical |
| Enterprise Trust Timeline | source events only | timeline projector | `/api/trust-fabric/timeline/*` | Fabric links to Replay | no duplicate timeline table | source timestamps may be uncertain | canonical |

## Canonical Enterprise Trust Object

`src/lib/trust-fabric/types.ts` supports `human`, `ai_agent`, `machine_identity`, `device`, `organization`, `workflow`, `application`, `API`, `model`, `document`, `infrastructure_resource`, `provider` and `external_system`. The object contains enterprise and subject identity, display identity, identity/authority/environment/scope states, evidence completeness, current trust state, contradiction/review/incident summaries, policy and correlation identifiers, and references to Trust DNA, Continuous Trust, Replay, Trust Memory and an Evidence Graph node.

It stores no source payload and introduces no numerical score. The only Fabric trust states are `verified`, `degraded`, `contested`, `suspended` and `revoked`. The database representation is a `security_invoker` view over canonical subjects, current state and graph records.

## Control plane and decision envelope

`evaluateEnterpriseTrust` accepts already-evaluated identity, authority, environment, scope, provider and Continuous Trust decisions, plus incidents, contradictions, reviewer decisions, policy and evidence completeness. It normalizes reason codes, references and operational actions. It does not call an LLM, duplicate domain evaluation, override a reviewer, or alter historical evidence. The strongest adverse state prevails.

`createDecisionEnvelope` produces stable SHA-256/JCS digests and deterministic IDs. It records evaluator and authority, evidence, policy, supersession and correlation. A `legal_reference` envelope is rejected unless it contains an external specialist decision reference. The Fabric never generates a legal conclusion.

## Enterprise Trust Timeline

The timeline accepts attributed items in `IDENTITY`, `AUTHORITY`, `ENVIRONMENT`, `SCOPE`, `PROVIDER`, `POLICY`, `TRUST_STATE`, `INCIDENT`, `REVIEW`, `LEGAL`, `REGULATOR` and `CORRECTIVE_ACTION`. The API projects existing Trust Events, the security-invoker Scope Continuity replay and incident reporting replay. Equal timestamps with non-confirmed confidence receive explicit ordering uncertainty. Tenant mixing and duplicate source IDs fail closed. No new event table is created.

## Provider-neutral adapter contract

The adapter output preserves provider identity/type, source system, evidence category, assertion-versus-observation classification, subject, observed/received timestamps, confidence, evidence strength, integrity state, external reference, normalized data, optional restricted raw-data reference, correlation and digest. `syntheticEvidenceAdapter` is the sole example. Assertions remain assertions; the adapter does not upgrade them to observed fact.

Provider runtime state is separate from adapter maturity. The canonical runtime states are `available`, `degraded`, `unavailable`, `contradicted` and `unknown`.

## Database, RLS and minimization

The forward migration creates only contracts, evaluations and decision envelopes. Trust Objects and the timeline are projections. Tables use enterprise-first composite keys and tenant-safe foreign keys; RLS is enabled; anonymous access is revoked; authenticated access is read-only through tenant predicates; service-only functions serialize idempotent writes and append audit entries. Contracts, evaluations and decisions are append-only. Raw provider payloads, credentials, secrets and evidence bodies are not stored.

The migration also adds `ensure_policy_definition_v1`. It creates an absent forward policy, accepts an identical definition, and raises on drift. Historical applied migrations are untouched. The development migration was not applied remotely.

## API boundaries

Fabric routes require authenticated enterprise context. Contract creation is owner/admin-only; evaluation is owner/admin/reviewer-only. Mutations require same-origin JSON, enforce actual streamed size limits, reject unknown fields, return stable codes and correlation IDs, and do not log evidence bodies. No anonymous ingestion or service credential exposure is present.

## Limitations and migration strategy

- Existing source systems do not all share a universal subject UUID; the projection preserves their subject references.
- Current objects can show partial or unknown evidence until canonical links exist.
- The example adapter is not a real provider integration.
- Timeline ordering is no stronger than source timestamp confidence.
- Legal and regulatory outcomes remain externally authoritative; operational screening is not legal advice.
- No production SQL, migration, deployment, environment change or provider configuration is part of Epic 28.
- After review, operators may apply the forward migration in a controlled non-production environment, validate RLS and source projections, and only then consider a separate production change.
