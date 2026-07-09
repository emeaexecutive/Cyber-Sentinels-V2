# Ground Truth Program

Cyber Sentinels measures trust only when reviewed evidence exists. Ground truth is the governed record that says what happened, which label was accepted, who reviewed it, which dataset and label versions were used, and whether humans and providers agreed with the outcome.

The program prevents operational trust metrics from becoming estimates. Precision, recall, F1, calibration, false-positive rate, false-negative rate, provider agreement and confidence are not computed until enough reviewed samples exist for the dataset scope.

## Why Ground Truth Matters

Trust decisions affect regulated workflows, AI agent authority, machine identity behavior and human verification. A signal can be useful without being true. A provider result can be configured without being validated. A reviewer can override an outcome without creating a benchmark.

Ground truth creates the measurement boundary:

- every reviewed sample receives a stable ground truth ID;
- every label records label version and dataset version;
- every reviewed outcome records review status, review source and review confidence;
- human agreement and provider agreement remain separate;
- confidence is dataset-scoped and never generalized beyond reviewed coverage.

## Reviewer Model

Reviewers turn operational outcomes into calibration evidence only when the record is complete.

Each review should record:

- final reviewed outcome;
- accountable reviewer or review source;
- review confidence;
- evidence references;
- provider agreement when a provider result exists;
- human agreement when another reviewer, panel or adjudication protocol exists;
- reason for override or dispute.

Review states are:

- `unreviewed` - the sample cannot influence calibration or weighting;
- `in_review` - review has started but the outcome is not final;
- `reviewed` - the sample may contribute to future confidence;
- `disputed` - the sample must not be used for benchmark claims;
- `rejected` - the sample is excluded from calibration and benchmark use.

## Dataset Lifecycle

Datasets are registered before they are used. The registry supports:

- Public;
- Internal;
- Partner;
- Synthetic;
- Provider;
- Benchmark.

Every dataset records:

- quality score;
- coverage;
- review completeness;
- benchmark eligibility;
- dataset version;
- reviewer protocol;
- use boundary.

Benchmark eligibility requires high quality, broad enough coverage and reviewed completeness. Synthetic fixtures can validate behavior, but they do not create production accuracy claims.

## Validation Lifecycle

Validation starts with records and ends with guarded metrics.

1. Register dataset and dataset version.
2. Add sample metadata and expected outcome.
3. Capture system or provider outcome.
4. Complete human review or adjudication.
5. Create a ground truth record.
6. Compute metrics only when the reviewed sample threshold is met.
7. Preserve dataset scope and limitations in reports.

The current threshold is defined in `lib/validation/ground-truth.ts` as `MINIMUM_GROUND_TRUTH_REVIEWED_SAMPLES`.

## Calibration Lifecycle

Reviewed outcomes influence future confidence, calibration, weighting and trust posture, but only under explicit conditions.

- Future confidence: any reviewed outcome can inform confidence history.
- Future calibration: review confidence and human agreement must meet threshold.
- Future weighting: calibration eligibility plus provider agreement must meet threshold.
- Future trust posture: the reviewed outcome must carry a posture contribution.

Calibration should be rerun when dataset versions, label versions, providers, thresholds or review protocols change.

## Implementation Boundary

The ground-truth foundation currently provides typed infrastructure, dataset registry summaries and guarded metric computation. It does not add product features, storage tables, new routes or live provider claims.

Primary implementation:

- `lib/validation/ground-truth.ts`
- `lib/validation/benchmark-harness.ts`
- `app/admin/deployment-readiness/page.tsx`

Until approved reviewed data exists, the correct status is `Awaiting data` or `not_enough_reviewed_samples`, not an inferred metric.
