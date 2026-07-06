# Explainable Trust and AI Accountability

## Explainable trust philosophy

Cyber Sentinels is an independent enterprise trust layer, not a black-box scoring authority. Trust decisions should connect a bounded score or posture to its source, confidence, evidence, limitations, authorization context, reviewer rationale and audit history. Provider output and heuristic signals are review evidence; neither becomes a final authenticity or regulated decision without accountable governance.

The value is not merely detecting risk. It is preserving enough evidence to explain what happened, what changed, who or what acted, under whose authority, why trust changed and how the final operational outcome was reached.

## Replay as the trust record

Replay is durable operational memory. It reconstructs:

- the human, AI agent or non-human identity that acted;
- the workflow and declared purpose;
- delegated authority and Authorization Lineage;
- evidence available at each material point;
- trust-state changes and their detection source;
- reviewer actions, escalation and rationale;
- the final outcome and unresolved conditions.

Replay remains read-only, evidence-first and customer-controlled. It is not an activity feed presented as proof; missing evidence stays visibly missing.

## AI accountability model

AI agents are governed operational identities. Consequential actions should retain agent identity, accountable human or organization, declared intent, least-privilege scope, runtime risk, blast-radius context, authorization lineage, governance review, kill-switch or revocation state and an action receipt.

A receipt is described as signed only when a verifiable signature reference exists. Human authority remains accountable for consequential or regulated outcomes.

## ML maturity status

Current maturity is **Level 2 — Provider-ready foundation**. Cyber Sentinels has explainable deterministic signals, provider interfaces, governance workflows, benchmark structures, evidence receipts and replay. It does not currently claim first-party enterprise-grade ML detection.

Allowed detection and trust sources are:

- `Real ML`
- `Provider API`
- `Heuristic Baseline`
- `Demo Data`
- `Awaiting Credentials`
- `Not Implemented`

The explainable baseline may use provenance conflicts, repeated verification failures, session anomalies, virtual-camera indicators, impossible workflow velocity, authorization anomalies and suspicious runtime behaviour. Model-assisted baseline results are labelled `baseline_model_assisted`, not enterprise-grade AI detection.

## Benchmark maturity

The validation harness supports confusion matrix, precision, recall, F1, provider agreement, reviewer agreement, false-positive tracking, false-negative tracking, case count and detection-source coverage. Output is JSON-exportable and includes schema version, generation time, case references, source policy, evidence and limitations.

When no approved labelled cases exist, the benchmark reports **“No validation dataset available yet.”** Precision, recall and F1 must remain unavailable rather than inferred.

## Provider governance

Provider states are constrained to `Live`, `Simulated`, `Awaiting Credentials` and `Disabled`. Credentials alone do not establish a live integration. Restricted data egress is blocked; permitted payloads require redaction and policy evaluation; provider interaction requires auditable metadata. AI training and external retention are disabled by default.

Provider evidence remains separable from Cyber Sentinels scoring and human governance. Deployment-specific contracts, residency, retention, deletion, security and regulated-use eligibility require verification before production use.

## Independent trust layer positioning

Enterprises will use multiple models, identity providers, clouds, security stacks and workflow systems. Cyber Sentinels is designed to preserve one explainable accountability contract across them. The enterprise controls the trust record; providers contribute bounded evidence but do not own operational memory.

This same continuity model supports fintech, insurance, banking, healthcare, onboarding, claims, approvals, hiring and AI-assisted operations without replacing systems of record or accountable decision-makers.

## Remaining gaps to reach 65–80% ML maturity

1. Approve representative labelled datasets for each workflow and risk cohort.
2. Complete reviewed provider endpoints with redaction, audit, retention, health-check and failure controls.
3. Run reproducible benchmarks and publish bounded metrics with dataset scope and case counts.
4. Establish reviewer-agreement targets, adjudication and false-positive/false-negative review.
5. Calibrate thresholds by regulated workflow and monitor drift.
6. Verify action-receipt signatures where runtime providers support signing.
7. Complete security, privacy, model-risk, residency and regulated-use reviews before production claims.
