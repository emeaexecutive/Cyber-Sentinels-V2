# PR #26 Salvage Matrix

## Decision

**CLOSE — SUPERSEDED BY THE CURRENT ENTERPRISE TRUST RUNTIME.**

PR #26 (`feature/enterprise-trust-learning`) is based on an obsolete repository boundary, conflicts with current `main`, and introduces a parallel trust-learning runtime, API surface, persistence model, and Trust Centre integration. It must not be merged or rebased wholesale.

The current release already provides canonical Trust Health, Drift, Confidence, Stability, Prediction, Recovery, Narrative, Recommendation, Advisor, Blast Radius, Cascade, Product Truth AI grounding, Operational Entities, Native Verification, Replay, and Trust Memory. Any salvage work must start from current `main` and reuse those canonical contracts.

## Capability matrix

| PR #26 capability | Classification | Current-state comparison | Disposition |
| --- | --- | --- | --- |
| Trust Pattern Engine | `STILL_VALUABLE`, `SHOULD_BE_PORTED` | Recurrence detection across tenant-bound trust events is distinct from the current point-in-time and trend intelligence. The old grouping keys and repositories predate canonical trust transactions and Operational Entities. | Port the deterministic recurrence algorithm only, on a new branch, using canonical transactions/events, tenant scope, evidence provenance, and current policy semantics. Do not port its repository unchanged. |
| Trust Narrative | `ALREADY_REIMPLEMENTED`, `DUPLICATE` | Grounded Narrative and Explanation already operate on canonical trust intelligence and Product Truth evidence. | Do not port. |
| Trust Recommendation | `ALREADY_REIMPLEMENTED`, `DUPLICATE` | Recommendation and Advisor already produce bounded, evidence-linked guidance without directly mutating decisions. | Do not port. Preserve the current policy-authoritative boundary. |
| Trust Prediction | `ALREADY_REIMPLEMENTED`, `DUPLICATE` | Current Prediction uses comparable decision history and is integrated with Drift, Confidence, and Stability. | Do not port. |
| Trust Genome | `DUPLICATE`, `OBSOLETE`, `CONFLICTS_WITH_CURRENT_ARCHITECTURE` | The profile duplicates Trust Health/State/DNA and Operational Entity intelligence while introducing another aggregate identity for trust. | Do not port. |
| Trust Simulation | `ALREADY_REIMPLEMENTED`, `DUPLICATE`, `CONFLICTS_WITH_CURRENT_ARCHITECTURE` | Blast Radius, Cascade, and current policy/decision simulation cover impact analysis on canonical records. The old simulation creates a parallel run model and decision vocabulary. | Do not port the implementation. Provider-outage scenario cases may be added later to the current simulation test suite. |
| Trust Resilience | `STILL_VALUABLE`, `SHOULD_BE_PORTED`, `CONFLICTS_WITH_CURRENT_ARCHITECTURE` | A resilience view is useful, but the proposed code treats workflow evidence as independent evidence, marks discovered authorities active without evaluating current status, and supplies no incident history. Those outputs would overstate assurance. | Redesign the concept on current evidence-independence, authority, incident, recovery, and Operational Entity contracts. Do not port code or persistence directly. |
| Reviewer Feedback | `STILL_VALUABLE`, `SHOULD_BE_PORTED` | Current AI validation/evaluation exists, but durable reviewer feedback tied to a governed output is still useful. | Port only after defining a canonical link to tenant, decision/transaction digest, evidence snapshot, model/prompt identity, reviewer, and Trust Memory. |
| AI model adapter | `ALREADY_REIMPLEMENTED`, `DUPLICATE` | Product Truth evidence grounding and the governance assistant already redact/ground inputs, constrain claims, preserve contradictions, and validate citations with deterministic fallback. | Do not port. |
| Evaluation harness | `STILL_VALUABLE`, `SHOULD_BE_PORTED` | Current AI evaluation covers grounded output quality. PR #26 adds useful explicit cases for tenant isolation, sensitive-data leakage, citation precision, unsupported claims, missing-evidence disclosure, and deterministic fallback. | Port test cases and metrics into the current evaluation harness; do not create a parallel model-evaluation service. |
| Nine trust-learning APIs | `OBSOLETE`, `DUPLICATE`, `CONFLICTS_WITH_CURRENT_ARCHITECTURE` | `/api/trust/learning/*` duplicates current canonical intelligence surfaces and relies on stale repositories/tables. | Do not port. Any approved feedback or pattern function must use the current API conventions and authorization path. |
| Trust Centre integration | `ALREADY_REIMPLEMENTED`, `DUPLICATE` | The current Trust Centre already integrates canonical intelligence and Operational Entity state. | Do not port the panel. Add only approved future signals to the current surfaces. |
| Migration | `OBSOLETE`, `CONFLICTS_WITH_CURRENT_ARCHITECTURE` | The migration creates seven parallel trust-learning/model tables against an older schema and migration boundary. | Do not apply or rename wholesale. Create a fresh migration only for independently approved pattern, feedback, or evaluation persistence after schema and RLS review. |

## Salvage boundary

Only four bounded ideas justify follow-up from current `main`:

1. A canonical, tenant-isolated recurrence/pattern detector.
2. Reviewer-feedback persistence attached to current governed AI outputs and Trust Memory.
3. Additional adversarial AI evaluation cases and metrics.
4. A redesigned resilience projection that uses real evidence independence, authority state, incidents, recovery, and Operational Entity data.

Each item must be independently specified, implemented, migrated, security-reviewed, and qualified. None requires preserving PR #26's branch, APIs, repository layer, UI panel, or migration.

## Closure recommendation

Close PR #26 as superseded. If the four bounded ideas are approved, create clean follow-up work from current `main`; do not reopen, merge, or rebase PR #26.
