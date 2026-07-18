# Operational Risk Intelligence (ORI)

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose and authority boundary

ORI estimates operational risk and produces a recommendation with evidence limitations. ORI never performs the final trust decision, never authorizes execution and never silently changes an authoritative decision.

The current implementation in `lib/operational-risk/` runs through `runOriAfterAuthoritativeDecision`. Its result states `authoritativeDecisionUnchanged: true`. This sequencing is intentionally safer than treating an unvalidated model as enforcement.

## Current input coverage

| Blueprint input | Current state |
| --- | --- |
| Evidence Graph | Evidence completeness/coverage can be projected into features; no direct full-graph model input |
| Replay | `replay_available` feature |
| Trust Memory | Prior governance review count/history features |
| Provider Consensus | Can be supplied through lifecycle/provider context; not a complete standalone ORI feature today |
| Session Signals | Partial through identity freshness/completeness context |
| Device Signals | Not a current explicit feature |
| Behaviour Signals | Not a current explicit feature set |
| Policy Context | Authority scope mismatch is represented; full policy evaluation is not |

Current registered features focus on identity evidence presence/age, evidence freshness and missing ratio, replay availability, prior Trust Memory review count and authority-scope mismatch. Missing values are retained and can cause abstention.

## Output contract

Current ORI output contains:

- risk score and `LOW`, `MODERATE`, `HIGH` or `UNKNOWN` band;
- confidence band (`HIGH`, `MEDIUM`, `LOW`, `INSUFFICIENT_EVIDENCE`);
- recommendation (`NO_ADDITIONAL_ACTION`, `STEP_UP`, `HUMAN_REVIEW`, `ABSTAIN`);
- explanation through ranked contributions;
- contributing and missing signals;
- evidence coverage and operational limitations;
- feature/model/dataset/threshold/normalization versions;
- artifact-hash verification; and
- execution duration.

`HUMAN_REVIEW` expresses required review as a recommendation. A dedicated `requiredHumanReview` field is a target contract improvement; it must agree with the recommendation and cannot itself create a governance action.

## Modes

| Blueprint mode | Current mapping | Meaning |
| --- | --- | --- |
| Shadow Mode | `shadow` | Compute and retain comparison without influencing workflow |
| Validation Mode | Validation harness/metrics, not a runtime mode | Evaluate only reviewed, non-synthetic outcomes; do not expose production claims |
| Production Recommendation Mode | Closest current mode is `advisory` | Display a recommendation after the decision; this is not production-readiness certification |
| Disabled | `off` | No ORI inference; unsupported configuration fails closed to off |

No mode makes ORI authoritative.

## Validation gate

Current constants require at least 30 reviewed, non-synthetic samples with expected classes before calibration metrics can be computed. Synthetic fixtures test mechanics only. Until that gate and approval criteria are met, public accuracy, precision, recall or calibration claims remain `Awaiting data`/insufficient evidence.

Promotion requires:

1. representative, tenant-approved reviewed outcomes;
2. leakage and drift review;
3. performance by relevant cohort with privacy safeguards;
4. false-positive/false-negative operational analysis;
5. artifact and feature-version reproducibility;
6. security, product, legal and governance approval; and
7. rollback to shadow/off without affecting authoritative decisions.

## Target pipeline migration

The blueprint places ORI before TDE. Current runtime places it after the authoritative decision. A safe migration may provide ORI as one **advisory input** to a future versioned TDE only after validation. TDE must retain authority, abstention must remain possible, policy/authority checks must precede execution, and a human override must be explicit and audited. Until then, diagrams must label ORI as post-decision shadow/advisory processing.

## Failure behavior

Timeout, invalid artifact, missing feature, persistence failure or unsupported mode cannot block or relax the existing authoritative decision. ORI returns abstain/unknown where possible and records the limitation. Telemetry must exclude raw evidence and tenant secrets.

## Observability gaps

ORI records `executionDurationMs` and internal telemetry, but it is not yet a first-class `ori_latency` stage in the shared runtime profiler/platform-health model. Durable latency, abstention, drift and mode-transition dashboards are target work.
