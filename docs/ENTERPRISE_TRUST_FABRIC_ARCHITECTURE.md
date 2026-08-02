# Enterprise Trust Fabric™ Architecture

Status: Epic 28 canonical composition architecture. This describes repository source and the unapplied development migration `202608010002`; it is not evidence of any remote deployment.

## Release and WIP boundary

Epic 28 started from clean `main` at `282e25664775391b890269c37ff60952e80e78d7`, equal to `origin/main`, after Epic 26 and Epic 27 merged. The single 26,312-line preservation commit on `wip/epic-26-seven-week-catch-up` is **partially superseded and unsafe for implementation reuse**. It mixes production reconciliation material, consent work and unrelated application changes. No code was copied and the branch was neither merged nor deleted. Its unique concepts—non-production preflight, reconciliation ledgers, staged validation and release gates—were recorded and re-audited against `main`.

Epic 26 owns Environment Attestation and Scope Continuity. Epic 27 owns Serious-Incident Evidence and Regulatory Reporting Lineage. Epic 28 composes their records by reference.

## Audit matrix

Classification reflects executable source, migrations and tested interfaces, never marketing copy.

| Capability | Canonical entity | Service | API | UI | Integration state | Duplication | Gap |
|---|---|---|---|---|---|---|---|
| Trust Workspaces | `trust_workspaces`, `workspace_members` | enterprise identity context | existing workspace APIs | dashboard / Trust Centre | canonical | older team helpers | no Fabric copy |
| Human and Agent Identity | `trust_subjects`, identity evidence | identity-signals orchestrator | `/api/identity/*` | identity / Trust Centre | integrated | legacy helpers | linking is incremental |
| Authority Graph | authority grants and graph nodes | canonical authority graph | trust architecture graph | trust architecture | integrated | legacy authorization helpers | Authority owns persistence |
| Authority Lineage | grants, responsibilities, scope relations | scope/incident integrations | scope and incident APIs | Fabric drill-down | integrated | several projections | historic IDs may be incomplete |
| Evidence Graph | `evidence_graph_nodes`, `evidence_graph_edges` | evidence graph service | evidence graph APIs | Trust Centre graph | canonical | older helper | historic records may lack nodes |
| Trust DNA | profiles and evaluations | Trust DNA engine | `/api/trust-dna/*` | Trust Centre DNA | canonical | legacy score vocabulary | references only in Fabric |
| Continuous Trust | runtime, decisions, alerts, reviews | Continuous Trust runtime | `/api/trust/runtime/*` | continuous view | canonical | older engines remain | Fabric maps, never reevaluates |
| Trust Events | `trust_events` | trust-event gateway | `/api/trust-events/*` | Replay projections | canonical | older timeline tables | cross-era normalization partial |
| Trust Memory | `trust_memory_index`, memory events | Trust Memory services | `/api/trust-memory` | Trust Centre / Replay | integrated | old implementations | Fabric never rewrites memory |
| Replay | replay events/sessions, trust events | Replay engines | `/api/replay/*` | `/trust-replay`, `/replay/[id]` | integrated | multiple projections | availability is explicit |
| Provider Abstraction | registry, observations, evidence | provider adapters / Fabric contract | `/api/providers` | provider integrations | partially integrated | maturity separate from runtime | one synthetic adapter only |
| Provider Health | health snapshots | provider health/readiness | provider APIs | Trust Centre/providers | integrated | old maturity/runtime confusion | five states canonical |
| Environment Attestation | declarations and attestations | Scope Continuity domain | scope APIs | Environment / Scope | canonical | none identified | provider coverage varies |
| Scope Continuity | leases, decisions, contradictions | deterministic scope evaluator | scope APIs | Environment / Scope | canonical | no Fabric lease copy | some subjects lack leases |
| Serious-Incident Evidence | assessments, snapshots, impacts | serious-incident domain | incident APIs | incident panel | canonical | none identified | specialist review remains |
| Regulatory Reporting Lineage | chronology, packages, submissions | incident screening/packages | incident APIs | incident panel | canonical | none identified | no automatic legal conclusion |
| Corrective Actions | `incident_corrective_actions` | serious-incident domain | incident APIs | incident / Fabric | integrated | no Fabric action store | effectiveness may be unknown |
| Enterprise Trust Centre | protected snapshot | Trust Centre service | `/api/trust-centre/*` | `/trust-centre` | canonical | earlier public copy | Fabric extends existing shell |
| Governance | policies, reviews, audit records | architecture / Continuous Trust | admin APIs | Trust Centre/admin | integrated | historic helpers | cross-domain IDs vary |
| Human Review | manual and incident decisions | review/incident services | review APIs | reviewer queue | integrated | domain queues intentional | unified queue is projection |
| Policies | versions and domain policies | policy validation | policy APIs | policies | integrated | older policy helpers | retirement incremental |
| Alerts | `trust_alerts`, immutable activity | alert service | alert APIs | alerts | canonical | none identified | incident linking varies |
| Audit Logs | immutable logs and Trust Events | owning repositories | audit/export APIs | governance | integrated | domain logs | timeline projects, never copies |
| Enterprise Trust Object | `enterprise_trust_objects` security-invoker view | `evaluateEnterpriseTrust` | `/api/trust-fabric/objects*` | `/trust-centre/fabric` | canonical | no duplicate store | depends on canonical links |
| Trust Contracts | contracts and evaluations | `evaluateTrustContract` | `/api/trust-fabric/contracts*` | active-contract section | canonical | no lease/grant copy | issuance UI deferred |
| Enterprise Trust Timeline | canonical source events | timeline projector | `/api/trust-fabric/timeline/*` | Replay drill-down | canonical | no new event table | ordering may be uncertain |

## Canonical Trust Object

Supported subjects are `human`, `ai_agent`, `machine_identity`, `device`, `organization`, `workflow`, `application`, `api`, `model`, `document`, `provider`, `infrastructure_resource` and `external_system`. The object exposes enterprise and subject identity, display identity, identity/authority/environment/scope states, evidence completeness, trust and provider states, active contradiction/incident/review/corrective-action references, Trust DNA, Continuous Trust, Replay, Trust Memory and Evidence Graph references, policy identity, evaluation time, correlation and canonical digest.

It stores no source payload and introduces no numerical score. The only Fabric trust states are `verified`, `degraded`, `contested`, `suspended` and `revoked`. The database representation is a security-invoker projection.

## Evidence taxonomy

The canonical classifications are `asserted`, `configured`, `observed`, `independently_attested`, `cryptographically_attested` and `derived`. Every normalized record preserves source identity, type and authority; strength; observation and receipt timestamps; freshness; confidence; integrity; evidence, enterprise, subject, correlation and supersession references; and derived inputs. Cryptographic classification requires verified integrity. Missing evidence remains missing. Provider assertions never become observations merely through normalization.

## Control plane and decision envelope

`evaluateEnterpriseTrust` composes already-evaluated identity, authority, environment, scope, provider and Continuous Trust decisions with incidents, contradictions, reviews, corrective actions, policy and evidence completeness. It preserves the strongest adverse state, deterministic reasons, uncertainty and source references. It does not call an LLM, duplicate domain evaluators, override a reviewer or alter history.

`createDecisionEnvelope` exposes `workflowId`, `actorAuthority` and `canonicalDigest` while retaining compatibility aliases during reconciliation. A `legal_reference` envelope is invalid without an externally authored specialist reference. The Fabric never generates legal conclusions.

## Trust Contracts and timeline

Trust Contracts deterministically compose identity, authority, environment, scope, providers, evidence age, monitoring, contradictions, human review and incident thresholds. They do not replace scope leases. Outcomes are `satisfied`, `satisfied_with_degraded_evidence`, `review_required`, `paused`, `breached` and `revoked`.

The Enterprise Trust Timeline projects Replay, Trust Memory and incident chronology into the twelve canonical categories. Items preserve source authority, timestamp confidence, evidence strength, integrity, supersession, uncertainty and Replay classification. Tenant mixing and duplicate IDs fail closed. No new event table exists.

## Provider and Replay states

The adapter contract preserves canonical evidence classification and the required provider metadata. `syntheticEvidenceAdapter` is the sole Epic 28 adapter. Provider runtime states are `available`, `degraded`, `unavailable`, `contradicted` and `unknown`.

Replay availability is `ready`, `empty`, `evidence_missing`, `source_unavailable`, `generation_failed` or `access_denied`. Activity counts never substitute for attributed provider evidence.

## Database, API and legal boundaries

The forward migration creates contracts, evaluations, decision envelopes and a durable forward-policy reconciliation ledger. Trust Objects and timelines remain projections. Enterprise-first composite keys, RLS, anonymous denial, tenant read predicates, append-only triggers, service-only audited writes, idempotency and canonical digests are enforced. Raw provider payloads, credentials and evidence bodies are not stored.

Fabric APIs authenticate enterprise context, role-bind mutations, enforce streamed size and CSRF controls, reject unknown fields, return stable codes/correlation IDs and do not log evidence bodies. Operational regulatory screening is not a legal conclusion; legal decisions remain external references.

## Limitations

- Source systems do not all share a universal subject UUID.
- Current objects can show partial or unknown evidence until links exist.
- The synthetic adapter is not a production provider integration.
- Timeline ordering is no stronger than source timestamp confidence.
- The historical `provider_health_snapshots` collision blocks a clean Supabase preview before Epic 26 and requires a separate forward repair.
- No production SQL, migration, deployment, environment change or provider configuration is part of Epic 28.
