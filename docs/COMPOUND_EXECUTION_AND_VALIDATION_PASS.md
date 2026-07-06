# Compound ML, Replay and Enterprise Validation Pass

Last reviewed: 2026-07-06

## Current ML maturity

Cyber Sentinels has an explainable heuristic baseline, typed validation cases, measurable confusion-matrix/precision/recall/F1 evaluation, and fail-closed provider adapters. This is a Level 2 provider-ready foundation moving toward Levels 3–4. It is not trained enterprise ML, and credentials alone do not establish live inference.

## Replay philosophy

Replay is enterprise-owned operational memory: a time-bounded reconstruction of actor, workflow, evidence state, trust evolution, Authorization Lineage, Governance Review and operational outcome. It preserves what was knowable and who acted; it does not manufacture certainty after the fact.

## Validation status

The harness now separates source-specific results, records false-positive and false-negative case IDs, measures provider and reviewer agreement, includes confidence distribution, and returns a versioned JSON-exportable audit envelope. The repository contains a safe dataset scaffold but no approved labelled cases, so no accuracy claim or benchmark result is currently available.

## Provider readiness

Reality Defender, Sensity, Pindrop, Veriff, Onfido, World ID and Stripe Identity use one normalized adapter contract. Missing credentials display `Awaiting Credentials`. Present credentials without reviewed endpoint execution remain `Disabled`, preventing a configured secret from being mistaken for provider-backed detection.

## Fintech and insurance readiness

Regulated readiness depends on evidence preservation, source separation, named human review, replay exports, audit continuity, restricted-data controls, correction/appeal paths and deployment-specific provider approval. The acceptable pilot remains decision-support only.

## AI sovereignty enforcement

Restricted data is blocked before provider use. Permitted provider context is redacted, policy-evaluated and logged across start, completion and failure states. Audit metadata explicitly records enterprise-owned operational memory and provider-interaction tracking. Customer chronology remains independent of provider availability.

## Next execution priorities

1. Add approved, licensed and representative labelled validation cases.
2. Implement and exercise one reviewed provider endpoint per priority modality.
3. Freeze evaluation cohorts and publish cohort counts beside every metric.
4. Calibrate thresholds with operators using false-positive, false-negative and reviewer-disagreement review.
5. Add signed benchmark exports and deployment-specific retention/residency evidence.
6. Begin a versioned proprietary experiment only after training/evaluation separation and model governance exist.
