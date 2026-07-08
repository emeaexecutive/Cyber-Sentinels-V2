# Validation Report

Last updated: 2026-07-08

## Program Goal

Strengthen evidence-backed validation without fake certainty. Validation should prove trust outcomes through reviewed datasets, ground truth, calibration, precision, recall, confidence, reviewer agreement, provider agreement, and drift tracking.

## Canonical Validation Layer

- Dataset registry: central index of scenario, source, permission, label quality, reviewer coverage, and retention status.
- Benchmark harness: the only place to compute precision, recall, F1, confusion matrix, calibration, reviewer agreement, provider agreement, and override tracking.
- Reviewed outcomes: final trust labels must retain reviewer identity, rationale, evidence link, and governance outcome.
- Ground truth: separated from model/provider output and never inferred from UI state.

## Required Scenario Families

| Scenario | Validation requirement |
| --- | --- |
| Synthetic applicant | Real/fake session labels, document evidence, virtual-camera indicators, reviewer override reason. |
| Executive impersonation | Media provenance result, C2PA state, deepfake provider state, evidence chain. |
| AI agent runtime | Permission scope, action receipt, anomaly flag, kill-switch status, replay entry. |
| ATS integration | Prepared action, signed webhook receipt, fail-closed status, human review outcome. |
| Session integrity | Liveness/session signals, confidence band, replay link, governance decision. |

## Reporting Boundaries

- Do not publish precision/recall unless backed by named dataset version and reviewed ground truth.
- Do not collapse provider state into vague AI labels.
- Use states such as Real ML, Provider API, Heuristic Baseline, Awaiting Credentials, and Not Implemented where internal/admin surfaces require capability truth.
- Public provider readiness should stay constrained to Live, Simulated, Awaiting Credentials, and Disabled.
