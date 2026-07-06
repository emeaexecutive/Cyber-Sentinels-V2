# Validation Dataset Plan

Status: planned; no representative validation dataset is currently present.

## Test categories

The first controlled dataset should include consented, provenance-documented examples of:

- real human sessions;
- synthetic faces;
- injected sessions;
- virtual camera sessions;
- fake documents;
- voice clones;
- suspicious AI-agent actions;
- normal AI-agent actions; and
- normal workflow approvals.

Each case needs a stable ID, lawful collection basis, consent/usage boundary, source provenance, expected outcome, detection source, environment, provider/model/rule version, reviewer outcome and evidence references. Separate development, calibration and holdout sets. Keep demographic, device, language, accessibility and adverse-condition coverage visible without treating protected traits as risk signals.

## Metrics

- Precision: correct positive findings divided by all positive findings.
- Recall: correct positive findings divided by all ground-truth positives.
- False positives: normal cases incorrectly escalated or blocked.
- False negatives: ground-truth risk cases missed.
- Latency: end-to-end and provider execution time distributions.
- Provider agreement: agreement between provider outputs on the same eligible case.
- Reviewer agreement: agreement between independent authorized reviewers and documented adjudication.

Report counts and denominators with every metric. Do not publish aggregate accuracy until each category has representative coverage and a locked holdout evaluation. Segment results by category and operating threshold; never calculate performance from demo fixtures.

## Governance and regulated controls

Use data minimization, tenant isolation, encryption, retention/deletion schedules, regional storage controls and documented access. Do not store provider secrets or unnecessary raw identity media in benchmark output. Record disputes, appeals and reviewer corrections. A benchmark result informs calibration; it does not create an automatic adverse decision.

## Delivery sequence

1. Approve taxonomy, ground-truth protocol and data-handling assessment.
2. Register cases through `lib/validation/benchmark-harness.ts`.
3. Run rules and eligible providers separately so source performance remains attributable.
4. Adjudicate disagreements with independent reviewers.
5. Freeze a holdout set and publish versioned results with limitations.
6. Monitor drift, false positives, false negatives and latency after controlled deployment.
