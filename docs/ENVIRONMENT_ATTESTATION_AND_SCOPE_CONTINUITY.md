# Environment Attestation and Scope Continuity™

Status: first production-grade foundation; development migration created but not applied.

## 1. Problem definition

An AI agent can receive a declared environment and bounded authority while the actual runtime exposes different network, production, monitoring, or target conditions. Cyber Sentinels records the claims, observations, authority, contradictions, and deterministic decision needed to review that mismatch.

Cyber Sentinels does not guarantee detection of every environment escape. It records and evaluates evidence supplied by operators, providers, harnesses, runtime sensors, and independent attestors.

## 2. Operational truth mismatch

The model keeps six facts separate: declared environment, configured harness, observed runtime, delegated authority, requested target, and evidenced execution conditions. A provider statement is not silently promoted to independent observation. Missing evidence is not proof of safety.

## 3. Scope Continuity™

Scope Continuity™ answers whether the authority granted to a subject still matches the conditions in which an action is requested. It is evaluated at a recorded time with a versioned deterministic policy. Outcomes are `allow`, `allow_with_reduced_trust`, `require_human_approval`, `pause`, `deny`, or `revoke_scope`.

## 4. Environment Authority Chain

The chain preserves who declared the environment, configured the harness, approved scope, controlled or monitored the environment, produced an observation, detected a contradiction, and reviewed or contained it. The implementation reuses the canonical Authority Graph for action, purpose, resource, duration, and revocation checks.

## 5. Evidence taxonomy

| Source category | Meaning | Minimum strength |
|---|---|---|
| Provider assertion | A provider-attributed claim | asserted |
| Operator assertion | An accountable operator claim | asserted |
| Harness configuration | Recorded intended test configuration | configured |
| Runtime observation | Runtime-produced observation | observed |
| Independent attestation | Separately attributed attestation | independently_attested |

`cryptographically_attested` is accepted only when verified signature metadata exists. Every item retains source authority, source identity, observation and receipt times, freshness, confidence, integrity status, and third-party identity where applicable.

## 6. Assertions versus attestations

Assertions state what a provider or operator says should be true. Configuration states what a harness was instructed to do. Observations state what a runtime sensor reported. Independent attestations preserve a separate source. The evaluator gives stronger current evidence precedence and records a contradiction when it conflicts with a provider assertion.

## 7. Domain model

- `ExecutionContextDeclaration`: expected environment, reachability, target boundaries, accountable owner, validity, and declaration evidence.
- `EnvironmentAttestation`: attributed observation, environment and reachability facts, control state, evidence strength, freshness, confidence, and integrity.
- `ScopeAuthorizationLease`: bounded objective, tools, actions, targets, environment, duration, action count, classification, approver, revocation, and required evidence.
- `ScopeContinuityDecision`: immutable requested action, evidence availability, outcome, reasons, missing evidence, trust impact, policy, correlation ID, and decision hash.
- `ContextContradictionEvent`: stable classification, severity, evidence references, detector, and time.

Corrections use `supersedes_attestation_id`, `supersedes_lease_id`, or a later reviewer action. Historical evidence is not overwritten.

## 8. Policy engine

The evaluator in `src/lib/scope-continuity/evaluator.ts` is deterministic and does not use an LLM. It validates tenant and context continuity, invokes the canonical Authority Graph, evaluates current evidence, emits contradictions, selects the strongest configured outcome, and hashes the complete decision input.

Stable reason codes include `SIMULATION_OBSERVED_PRODUCTION`, `INTERNET_REACHABILITY_UNEXPECTED`, `PRODUCTION_TARGET_NOT_EXPECTED`, `TARGET_OUTSIDE_AUTHORIZED_SCOPE`, `REQUIRED_ATTESTATION_MISSING`, `ATTESTATION_STALE`, `PROVIDER_ASSERTION_CONTRADICTED`, `MONITORING_UNAVAILABLE`, and `SCOPE_AUTHORIZATION_INVALID`.

## 9. Contradiction severity

Severities are informational, material, critical, and emergency. A declared simulation with observed production reachability is critical. Unexpected internet access is critical under the default policy. Missing or stale evidence and monitoring unavailability are material. `agent escaped` is not used as a generic machine classification.

## 10. Authority Lineage integration

The authorization lease maps to `AuthorityGrant`, preserving the canonical fail-closed checks for tenant, delegation type, action, purpose, resource, issue/expiry/revocation, and policy version. Environment-specific relationships extend lineage without duplicating delegation logic.

## 11. Evidence Graph integration

The persistence RPC writes execution-context, authorization, attestation, contradiction, and decision nodes into the existing Evidence Graph tables. Relationships reuse canonical uppercase graph conventions such as `AUTHORIZED_BY`, `OBSERVED_BY`, `CONFLICTS_WITH`, and `RESULTED_IN`.

## 12. Continuous Trust integration

Scope outcomes map to explicit trust states: consistent independent evidence becomes verified; missing or degraded evidence becomes degraded; provider conflict becomes contested; pause or deny becomes suspended; scope revocation becomes revoked. The integration does not invent numeric score deductions or silently alter the Continuous Trust scoring model.

## 13. Trust Memory™ integration

Every decision adds a tenant-scoped Trust Memory index entry with outcome, trust impact, reasons, source decision, and time. Declarations, attestations, leases, contradictions, decisions, reviewer actions, and corrections remain append-only. Credentials, tokens, exploit payloads, vulnerable endpoints, raw packets, and unnecessary personal data are excluded.

## 14. Replay

`scope_continuity_replay` projects the same append-only records into declared, observed or independently attested evidence, contradictions, decisions, trust changes, and actual reviewer actions. TypeScript artifacts also show configured and requested stages. Labels are ASSERTED, CONFIGURED, OBSERVED, INDEPENDENTLY ATTESTED, INFERRED, and DECIDED.

No external action appears unless a future integration supplies evidence that it occurred. A required human review is shown as a requirement, not as a completed action.

## 15. API boundaries

- `POST /api/trust/scope-continuity/evaluate`: owner/admin-only evaluation and atomic persistence.
- `GET /api/trust/scope-continuity/decisions/:decisionId`: tenant-scoped decision retrieval.
- `GET /api/trust/scope-continuity/replay/:executionContextId`: tenant-scoped Replay projection.

The mutation requires JSON, enforces actual streamed bytes up to 64,000, rejects cross-site mutation, returns stable errors and correlation IDs, and does not log evidence bodies.

Future external ingestion requires workload authentication, replay protection, signature verification where claimed, source allowlisting, per-source idempotency, and a trusted transport boundary. This Epic does not add a public unauthenticated ingestion endpoint.

## 16. Authentication and authorization

API access reuses enterprise membership resolution. Mutations require owner or admin role; reads accept authorized workspace roles. The server binds every body enterprise ID to the authenticated enterprise. Service-role access remains server-only and the database RPC rejects non-service callers.

## 17. RLS and tenant isolation

Every tenant-owned row carries `enterprise_id`. Composite foreign keys prevent cross-enterprise context, attestation, lease, decision, and reviewer references. RLS is enabled, anonymous access is revoked, authenticated writes are not granted, and tenant reads use `user_can_access_trust_workspace`. Static RLS tests cover cross-tenant denial and service-controlled writes.

## 18. Data minimization

The schema stores classifications, booleans, bounded identifiers, reason codes, hashes, and safe metadata. It does not store credentials, authentication tokens, exploit payloads, vulnerable endpoint secrets, environment values, raw packet captures, or full request bodies.

## 19. Provider attribution

Provider assertions require `providerOrThirdPartyIdentity`. Their evidence strength remains asserted unless separate verifiable evidence supports a stronger classification. A conflicting stronger observation prevails for the decision while both records remain linked.

## 20. Limitations

- Cyber Sentinels does not guarantee detection of every environment escape.
- Cyber Sentinels does not replace EDR, SIEM, firewall, sandbox, secrets manager, or network-isolation systems.
- Provider assertions remain attributed assertions.
- Independent observations are distinguished from provider reports.
- Missing evidence is not proof of safety.
- Decisions depend on available evidence and configured policy.
- Human authority remains explicit for high-risk decisions.
- Integration latency means the feature does not claim universal real-time detection or containment.
- The development migration must be reviewed and applied through the normal non-production migration process before API persistence is operational.

## 21. Future integrations

Planned adapters include signed provider envelopes, cloud workload identity, sandbox/EDR/SIEM observation metadata, network-control attestations, termination and containment evidence, governed external ingestion, reviewer workflows, and time-bounded action-count reservation.

## 22. Demonstration scenarios

Scenario A declares a simulation with no internet or production access, then supplies an independent runtime observation of internet and production reachability while requesting an external production target. The decision is denied, critical contradictions are linked, trust is suspended, and Replay retains attribution.

Scenario B declares the same simulation and supplies a current independent attestation confirming isolation, no internet, no production reachability, and the approved simulated target. The decision is allowed, trust is verified, and Replay retains the evidence path.

## 23. Acceptance criteria

- Deterministic outcomes and stable reason codes.
- Existing Authority Graph reused.
- Assertions and independent evidence remain distinguishable.
- Tenant and context references fail closed.
- Missing and stale evidence remain visible.
- Critical mismatch denies or revokes according to policy.
- Replay never invents external action or completed review.
- Trust impact is explicit without arbitrary score changes.
- Append-only evidence and superseding corrections are supported.
- Authenticated API, RLS, body limit, idempotency, and correlation IDs are present.
- Production database, Production environment, DNS, Turnstile, and WAF remain untouched.

## Architecture audit and gap matrix

| Capability | Current implementation | Evidence | Gap | Reuse | New work |
|---|---|---|---|---|---|
| Authority Lineage | Implemented runtime capability | `lib/core/authority-graph.ts` | No environment lease join | Canonical grant evaluation | Lease adapter and environment checks |
| Evidence Graph | Runtime and database foundation | `lib/evidence-graph`, `evidence_graph_*` | No context/attestation nodes | Existing graph tables and edge conventions | Scope nodes and relationships |
| Trust Memory™ | Runtime and database foundation | `lib/trust-memory`, `trust_memory_index` | No environment decision memory | Append-only memory index | Scope decision entries |
| Replay | Implemented runtime/database capability | `src/core/trust/replay`, `replay_events` | No environment sequence | Chronology, attribution and evidence boundary | Scope Replay projection |
| Continuous Trust | Implemented runtime capability | `src/lib/continuous-trust` | No environment contradiction state adapter | Existing trust states and transitions | Explicit non-numeric trust impact |
| Provider Governance | Implemented provider foundation | provider observations and health | Assertions not environment-specific | Provider identity and health conventions | Environment source attribution |
| Execution Passport | Database-only legacy foundation | `execution_passports` | Not tenant-safe canonical authority | Concepts only; not extended | Scope lease uses Authority Graph instead |
| Environment Attestation | Documentation/marketing only before Epic 26 | prior copy and generic runtime evidence | No canonical model/evaluator | Evidence integrity and source conventions | Full model and validation |
| Scope Continuity™ | Documentation/marketing only before Epic 26 | no runtime evaluator | No deterministic action-time join | Authority, graph, memory, replay | Evaluator, persistence, API and UI |
| UI representation | Generic runtime dashboards | Continuous Trust dashboard | No declared/configured/observed comparison | Authenticated workspace shell | Minimal Environment & Scope panel |

The audit distinguishes code and relational capability from naming in product copy. A name in documentation was not treated as implemented functionality.
