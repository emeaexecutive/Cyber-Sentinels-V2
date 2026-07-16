# Enterprise Trust Fabric Architecture

Release 1.1 uses one internal Trust Fabric contract for trust requests. It does not introduce a second Trust Engine, public API or workflow-specific platform silo.

## Canonical service composition

| Service | Existing canonical seam |
| --- | --- |
| Identity | `lib/core/entity-identity.ts` |
| Authority | `lib/core/authority-graph.ts` and the existing authorization gateway |
| Trust Engine | `lib/core/trust-engine.ts` and the existing trust algorithm |
| Runtime | `lib/core/runtime-engine.ts` and lifecycle runtime context |
| Policy | Existing governance and policy evaluation |
| Decision Intelligence | `lib/core/decision-intelligence.ts` |
| Enforcement | `lib/core/trust-enforcement.ts` |
| Replay | Existing lifecycle/replay writers and replay engine |
| Evidence Graph | `lib/evidence-graph/evidence-graph.ts` |
| Trust Memory™ | `lib/trust-memory/trust-memory.ts` |
| Validation | Existing benchmark and reviewed-ground-truth seams |
| Provider Orchestrator | Existing provider registry/orchestrator plus explainable consensus |
| Governance | Existing governance engine and review queue |

`lib/core/trust-fabric.ts` is a thin orchestration façade over these services. `requestTrust()` normalizes the entity and workflow template, evaluates the authority graph, creates provider consensus, and delegates execution to `executeTrustLifecycle()`. It is a contract, not a new engine.

## Internal request contract

Input contains tenant and correlation IDs plus:

- entity: canonical identity record;
- workflow: template, workflow ID and lifecycle stage;
- action: requested action and declared purpose;
- signals: normalized provider observations with category, state, model, version, latency, confidence, limitations and evidence;
- policy: version, evidence requirement, governance and validation state;
- authority: grants, authentication/approval state, nonce and requested scope;
- runtime: session, anomaly, device, provenance and evidence context.

Output contains trust posture, decision, enforcement action, evidence references and graph, Replay reference, Trust Memory™ reference/evolution, governance availability, next action, limitations and the full lifecycle trace.

## Execution order

1. Normalize the tenant-scoped entity.
2. Resolve the authority chain and fail closed on missing, expired, revoked or expanded scope.
3. Normalize provider signals and create explainable consensus without blind averaging.
4. Evaluate trust, runtime, policy and decision context.
5. Enforce the decision before execution.
6. Write the lifecycle through Replay, Evidence Graph, Trust Memory™ and governance.
7. Validate tenant isolation, required graph node types and Trust Memory references.
8. Return the next accountable action and explicit limitations.

## Performance boundary

The existing in-process profiler records provider, consensus, trust, authorization, enforcement, Replay, Evidence Graph, Trust Memory, governance queue, database, queue and cache stages. These measurements support readiness review; they are not production APM or fleet-wide telemetry.

## Non-goals

- No new public route, database, queue or Trust Engine.
- No autonomous provider verdict or hidden confidence average.
- No workflow-specific identity, policy, replay or memory silo.
- No claim that configured, simulated or unreviewed provider output is production truth.

## Release 1.0 RC1 evidence gate

RC1 reuses `POST /api/trust/execute` for authenticated `Establish Trust` session creation and `POST /api/providers` for timestamped HMAC callbacks. Hopae transport stays in the adapter. `executeCanonicalTrustAssessment()` is a thin action over the existing lifecycle orchestrator, authorization gateway, enforcement, Replay, Evidence Graph, Trust Memory and Evidence Pack builders.

Provider evidence is normalized and quality-gated before the Trust Decision. A service-role-only PostgreSQL function commits idempotency, Replay, the explicit evidence-to-receipt graph edge, append-only Trust Memory, receipt, audit and provider references in one transaction. Canonical proof and graph relationship tables are workspace/owner scoped; legacy unscoped rows are not exposed to ordinary authenticated sessions.

## Release 1.0 RC2 contextual profile

`lib/trust/living-trust-profile.ts` is a derived read model over the existing service composition. It does not calculate a universal score, persist duplicate posture, or replace authorization. Its key includes tenant, entity, workflow, purpose, action, policy version and time.

The Authority Graph now attenuates permitted and prohibited actions, resource scope, approvals, purpose, policy version and depth across organization, human, agent, sub-agent and machine-identity chains. `evaluateContinuousAuthorization()` records material context-change triggers and returns to the existing enforcement, receipt, Replay and Trust Memory path. Governed controls and retention tombstones are proof contracts, not claims that an unintegrated external system executed them.

## Release 1.0 RC3 experience boundary

RC3 does not change the service composition. It consolidates public navigation and homepage explanation around one nine-stage operational-trust flow, then sends architecture to Platform and assurance depth to Trust. The same Living Trust Profile service now exposes complete authority context and Trust Memory attribution to the existing workspace/demo component. Public Trust content explains the model without exposing tenant evidence; protected operations remain behind middleware and RLS.
