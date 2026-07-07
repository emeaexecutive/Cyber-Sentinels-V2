# Advanced Runtime Trust and Signal Fusion

## Runtime trust philosophy

Runtime trust is an evolving, evidence-backed posture. Cyber Sentinels measures how trust changes while a workflow is underway, preserves the reasons for that change, and routes material drift to accountable governance.

The runtime engine in `lib/runtime/runtime-trust-engine.ts` remains deterministic. It aggregates reviewable signals such as device mismatch, impossible velocity, suspicious session change, repeated failed verification, provenance conflict, AI-agent runtime anomaly, unusual authorization patterns, virtual camera indicators, and document mismatch signals.

Each evaluation returns the previous score, current score, drift, posture, risk progression, weighted signal contributions, evidence weighting, provider agreement adjustment, anomaly aggregation, escalation triggers, and a plain-language explanation. This is labelled `Runtime Intelligence`; it is not trained machine learning and is not a final authenticity verdict.

## Signal-fusion logic

`lib/detection/signal-fusion.ts` combines bounded evidence from:

- `Real ML`, only when a verified model and evidence record exist;
- `Provider API`, only when a reviewed provider adapter supplies evidence;
- `Heuristic Baseline`;
- `Runtime Intelligence`;
- `Demo Data`;
- `Awaiting Credentials`;
- `Not Implemented`.

Unavailable or unimplemented sources remain visible in the source ledger but do not contribute scored risk. Fusion returns one of `allow`, `review`, `escalate`, `block`, or `insufficient evidence`, plus a confidence band, confidence spread, evidence summary, source transparency, provider status, escalation reason, and limitations.

Reviewer outcomes may govern the recommendation, but the override is explicit. Fusion never claims certainty, never reports unsupported precision or recall, and never replaces accountable governance review.

## Explainable trust graph

`lib/trust/trust-graph.ts` connects actors, workflows, authorization lineage, evidence, replay records, governance actions, provider responses, receipts, and trust transitions. It reports:

- relationship counts by lineage type;
- evidence references used by edges and transitions;
- transition explanations showing why trust changed;
- completeness for actor, workflow, authorization, evidence, replay, governance, and transition coverage;
- missing links when relationships reference unavailable nodes.

The graph exists to show why trust changed, not merely to display a final score.

## ML maturity state

Cyber Sentinels is a provider-ready trust orchestration system with explainable runtime intelligence and benchmark scaffolding. No first-party production ML detection is active unless a model artifact, inference path, versioned evidence record, and validation results are present.

Current operating boundary:

- `Real ML`: reserved for verified model inference.
- `Provider API`: provider-backed evidence, not product-owned certainty.
- `Heuristic Baseline`: deterministic review logic.
- `Runtime Intelligence`: deterministic runtime aggregation and signal fusion.
- `Demo Data`: controlled examples only.
- `Awaiting Credentials`: integration cannot provide evidence yet.
- `Not Implemented`: capability is not available.

## Benchmark maturity

`lib/validation/benchmark-harness.ts` compares heuristic baseline, provider results, runtime replay validation, and signal-fusion recommendations. It reports confusion matrix, precision, recall, F1, confidence spread, confidence calibration, reviewer agreement, provider agreement, governance overrides, reviewer disagreement, escalation rate, false-positive rate, false-negative rate, detection-source coverage, and trust drift tracking.

Benchmark maturity is explicit:

- Level 1: validation dataset required.
- Level 2: labelled validation baseline available.
- Level 3: provider comparison and reviewer calibration in progress.

Metrics are scoped to approved labelled cases. They must not be generalized beyond the dataset, workflow, provider state, and review policy used to generate them.

## Governance escalation model

Runtime escalation is triggered by high-impact signals, material trust degradation, unusual authorization patterns, or open governance review. Escalated and blocked recommendations must route to a named reviewer before execution continues.

AI agents are governed operational actors. Their delegated authority, workflow access, memory scope, action receipts, runtime behavior, unusual action patterns, blast radius, kill-switch status, and oversight state must remain reviewable and replayable.

## Replay evidence philosophy

Replay is the evidence fabric. It should show who acted, what acted, the evidence chain, trust evolution, Authorization Lineage, governance actions, provider responses, runtime anomalies, and operational outcome.

Replay is customer-owned operational memory. Restricted data must be blocked from external processing. Permitted provider calls require policy evaluation, redaction, audit metadata, training disabled by default, and external retention disabled by default.

## Regulated trust operations

The same accountable chronology applies to fintech, insurance, banking, healthcare, onboarding, approvals, claims, hiring, and AI-assisted workflows. Cyber Sentinels provides explainability, governance, replayability, operational accountability, and audit continuity. It does not replace regulated systems of record or accountable decision-makers.

## Remaining gaps to enterprise-grade ML maturity

1. Approve representative labelled datasets for each workflow, cohort, and runtime condition.
2. Validate runtime weights, fusion thresholds, and confidence calibration against held-out data.
3. Complete reviewed live provider endpoints with redaction, audit, retention, and fail-closed controls.
4. Publish bounded precision, recall, F1, false-positive, and false-negative results with dataset scope.
5. Establish reviewer adjudication, drift monitoring, and threshold-change governance.
6. Validate graph completeness and replay reconstruction against real pilot evidence.
7. Complete security, privacy, model-risk, residency, and regulated-use review before any production ML claim.
