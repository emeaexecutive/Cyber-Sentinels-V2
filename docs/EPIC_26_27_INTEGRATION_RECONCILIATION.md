# Epic 26/27 Integration Reconciliation

## Decision

Epic 26 and Epic 27 are additive, tenant-scoped components of the Enterprise Trust Fabric. Their merged historical migrations are canonical and are not edited by this reconciliation. Epic 26 must be applied before Epic 27.

## Audited surfaces

Epic 26 owns execution-context declarations, environment attestations, scope leases, deterministic continuity decisions, contradiction events, reviewer actions, its security-invoker Replay projection, and its Trust Memory/Evidence Graph writes. Its server-only persistence RPC checks idempotency and writes source-attributed records.

Epic 27 owns the incident case, responsibility, chronology, immutable evidence snapshots, impact, trigger findings, reviewer decisions, packages, external submissions, corrective actions, supersessions, its security-invoker Replay projection, and its Trust Memory/Evidence Graph writes. Legal and regulator conclusions are separate from deterministic operational screening.

## Capability matrix

| Capability | Epic source | Canonical record | Canonical service | API | UI | Shared evidence | Gap |
|---|---|---|---|---|---|---|---|
| Declared context | 26 | `execution_context_declarations` | `ScopeContinuityService` | `/api/trust/scope-continuity/evaluate` | `/dashboard/environment-scope` | Replay, Authority Lineage, graph, Trust Memory | none |
| Environment evidence | 26 | `environment_attestations` | evaluator/repository | evaluate + evidence routes | Environment & Scope | versioned source reference and integrity state | none |
| Scope authority | 26 | `scope_authorization_leases` | evaluator/repository | evaluate | Environment & Scope | `AUTHORIZED_BY`, authority reference | none |
| Continuity decision | 26 | `scope_continuity_decisions` | deterministic evaluator | evaluate/decision/replay | Environment & Scope | contradictions, graph result, Replay, memory | can open/enrich Epic 27 incident through exact reference |
| Contradictions | 26 | `context_contradiction_events` | evaluator/artifact builder | decision/replay | Environment & Scope | `CONFLICTS_WITH`/`RESULTED_IN` | reused by incident and corrective-action links |
| Scope review | 26 | `scope_continuity_reviewer_actions` | repository | reviewer action route | Environment & Scope | authority-attributed Replay | none |
| Incident case | 27 | `incident_regulatory_assessments` | `SeriousIncidentService` | `/api/incidents` | `/dashboard/serious-incidents` | exact Epic 26 references, graph and memory | none |
| Awareness/chronology | 27 | `incident_chronology_events` | workflow/integrations | incident append routes | Serious Incidents | classified source, separate clocks, Replay | none |
| Evidence snapshot | 27 | `incident_evidence_snapshots` | service/repository | incident snapshot route | Serious Incidents | exact Epic 26 IDs, source versions and digest | none |
| Impact/containment | 27 | impact + chronology records | screening/workflow | incident append routes | Serious Incidents | assertion/observation/confirmation stay distinct | none |
| Reviewer decision | 27 | `incident_reviewer_decisions` | workflow/repository | reviewer route | Serious Incidents / Regulatory Readiness | assigned role + authority reference | none |
| Package/submission | 27 | package + external-submission tables | package builder/repository | package/submission routes | Regulatory Readiness | immutable digest, exact approved version | none |
| Corrective action/correction | 27 | corrective-action + supersession tables | workflow/repository | append routes | Serious Incidents | completion and validation evidence; `SUPERSEDES` | none |
| Composed trust view | 28 | provider-neutral reference envelope | Trust Fabric control plane | `/api/trust-fabric` | `/trust-centre/fabric` | references both owners without copying payloads | clean Preview replay required before staging approval |

## Cross-Epic integrity

The Epic 27 service and persistence RPC resolve every Epic 26 reference by both `enterprise_id` and canonical identifier. The deterministic fixture in `src/lib/trust-fabric/cross-epic-scenario.ts` uses the exact Epic 26 context, attestation, authorization lease, continuity decision, enterprise, and correlation references. It creates no shadow copy of any Epic 26 record.

The fixture also composes a canonical AI-agent identity, digest-bound Trust Object, decision envelope, active Trust Contract evaluation and one attributed Enterprise Trust Timeline. The adverse Scope Continuity state remains strongest; the Fabric does not reevaluate or weaken it.

Occurrence, provider observation, detection, human review, organization awareness, materiality, containment request, containment confirmation, reporting decision, submission, acknowledgment, recovery, and closure remain separate clocks. A provider acknowledgment is an assertion and never proves containment. Operational screening can require specialist review but cannot create a legal conclusion.

## Authority and evidence

Reviewer decisions require an assigned role and `authority_reference`. Approved packages are linked to reviewer decisions, digest-bound, immutable after approval, and superseded by a new version rather than mutation. Evidence snapshots retain source versions, integrity digests, missing evidence, and limitations. Corrective-action effectiveness remains unknown until supported by completion and validation evidence.

## RLS and service boundary

All Epic 26 and Epic 27 tenant tables enable RLS. Authenticated access is read-only through `user_can_access_trust_workspace(enterprise_id)`. Mutation RPCs are `security definer`, revoked from public/anon/authenticated, granted only to `service_role`, tenant-check canonical references, and use append-only triggers. Replay views are `security_invoker=true`.

## Release outcome

The staging architecture package is in `supabase/release/epic-26-27/`. It contains hashes, immutable migration references, object inventories, prerequisite checks, post-apply validation, RLS validation, integrity checks, the canonical scenario fixture, rollback limitations, and a forward-repair plan. It neither applies SQL nor contains credentials.

## Provider-health prerequisite correction

Authoritative migration history proved that neither `202607170002_provider_abstraction_hopae.sql` nor `202607200003_provider_consensus_engine.sql` was durably applied. The narrowly corrected Epic 16 migration creates `provider_operational_health_snapshots`; Epic 17 retains tenant-scoped `provider_health_snapshots`. No data migration or Production ledger repair is required. Staging approval still requires a clean disposable Preview replay through Epic 28.
