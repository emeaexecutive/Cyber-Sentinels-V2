# Trust Decision Engine (TDE)

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

The Trust Decision Engine converts bounded evidence, authority and policy context into an operational workflow decision. It is authoritative only inside the governed workflow and does not declare universal identity truth.

Today the canonical runtime path is `lib/runtime/trust-execution-pipeline.ts` using `runTrustAlgorithm()` and `executeTrustWorkflow()`. `evaluateTrustDecision()` is the underlying deterministic decision evaluator. `lib/core/trust-engine.ts` is a facade that combines calculation and explanation. Other legacy decision/calculation paths remain technical debt and must not become parallel authorities.

## Current sequence

```text
runtime signals -> signal fusion -> trust algorithm/decision -> posture
                -> workflow action + audit + Replay + governance + receipt
                -> ORI off/shadow/advisory after the authoritative decision
```

This differs from the target blueprint sequence. No document should claim that current TDE consumes a pre-decision ORI recommendation.

## Input contract

| Blueprint input | Current implementation |
| --- | --- |
| Evidence Graph | Evidence references/coverage can be supplied, but no mandatory graph snapshot is enforced |
| Replay | Replay linkage affects continuity/posture; complete replay manifest is not mandatory before every decision |
| Trust Memory | Governance history, prior posture, freshness and reviewed outcomes are inputs; snapshot version is not consistently pinned |
| ORI | Not an authoritative input; runs after the decision |
| Enterprise Policy | Governance/policy and threshold context exists across lifecycle/workflow paths; a single compiled policy artifact is not always recorded |
| Authority | Human authority, ownership, permission scope and delegation context are evaluated across lifecycle/runtime paths |
| Manual Overrides | `reviewerOutcome` can override the recommendation and is recorded as applied |

Missing evidence yields `insufficient_evidence` rather than success. External provider or heuristic output remains one signal.

## Current decision states and target mapping

| Current canonical state | Workflow action | Closest blueprint state | Mapping caveat |
| --- | --- | --- | --- |
| `allow` | Continue workflow and issue receipt | Verified | Means allowed under current workflow policy, not universal verification |
| `step_up` | Require stronger verification | Verification Required | Direct operational mapping |
| `review` | Open governance review | Verification Required | Review and step-up should remain distinguishable internally |
| `escalate` | High-risk governance event | Escalate | Direct mapping |
| `block` | Block action/workflow and preserve evidence | Reject or Suspend | Target must distinguish terminal rejection from reversible suspension |
| `insufficient_evidence` | Pause and request evidence | Verification Required | Must not be presented as rejection or verification |
| No current direct state | — | Expire | Currently expressed through evidence/posture freshness, not a decision output |

The blueprint output names are a **target external vocabulary**. They must not replace current states until policy semantics, migrations, APIs, reports and backward compatibility are approved.

## Permanent decision envelope

Every future TDE decision record must contain:

- Decision ID and timestamp;
- tenant, workflow, subject and correlation references;
- canonical internal state and external display state;
- immutable evidence references and Evidence Graph snapshot/version;
- Replay reference and replay-integrity state;
- Trust Memory snapshot/version;
- ORI version/mode/recommendation or explicit `not evaluated`;
- policy ID/version and evaluated-rule trace;
- algorithm/tuning/configuration version;
- authority and delegation references;
- reviewer identity and override state, or `no reviewer`;
- decision reason, confidence band, limitations and required next action; and
- enforcement/audit/receipt references.

Current workflow metadata records timestamped audit/replay rows, evidence references, trust score, confidence, source labels, signal weights, decay, governance weighting, reviewer override, reasons, limitations and action. It does not consistently provide a dedicated Decision ID or pin all Replay, Trust Memory, ORI, policy and configuration versions. The complete envelope is therefore a target gap.

## Decision rules

1. Authenticate and derive tenant before reading inputs.
2. Evaluate current authority and enterprise policy before execution.
3. Require attributable, non-expired evidence and surface contradictions.
4. Abstain/pause on insufficient evidence or unavailable mandatory dependencies.
5. Keep algorithm recommendation, reviewer override and enforcement outcome distinct.
6. Persist decision, Replay and audit context idempotently before claiming a durable outcome.
7. Never allow ORI, a provider, heuristic or trust score to authorize directly.
8. Preserve blocked/review truth; do not smooth missing state into success.

## Manual review and enforcement

Reviewer overrides are authoritative only for an identified, authorized reviewer and must preserve the prior algorithm result and reason. The workflow executor routes non-allow decisions to governance, recommends rather than performs destructive kill-switch actions, and creates receipts for allow/block outcomes. Async side effects can leave replay scheduled rather than written; reports must distinguish those states.

## Versioning and replay

Any change to weights, thresholds, state mappings, default values or feature interpretation creates a new decision-engine version. Exact replay uses the recorded version, not current defaults. Current tuning constants are deterministic but lack a universal persisted version identifier in each decision record.

## Current risks

- Multiple trust/legacy calculation modules can confuse ownership.
- Defaults for missing signals contribute neutral/fallback values in the algorithm while the evaluator can still return a decision; mandatory evidence policy must be enforced outside scoring.
- Decision side effects may run asynchronously and fail after the response.
- Full version-pinned replay and decision storage are incomplete.
