# Dataset Program

The dataset program exists to make validation credible without fabricating metrics. Precision, recall, F1, false-positive rates and false-negative rates remain unavailable until reviewed, versioned and representative datasets exist.

## Current Foundation

| Capability | Current Evidence | Gap | ERM Action |
| --- | --- | --- | --- |
| Dataset registry | `lib/validation/dataset-registry.ts` and `lib/validation/dataset-manager.ts` | Buckets exist, but reviewed coverage is incomplete. | Keep registry as the single source for dataset categories. |
| Label quality | Registry tracks label quality and reviewer status. | Label provenance is not complete enough for accuracy claims. | Require source, consent/license, reviewer and confidence per case. |
| Review process | Reviewed outcomes and governance overrides exist. | Reviewer agreement and calibration contribution are sparse. | Require reviewer ID, notes, override reason and outcome state. |
| Benchmark coverage | Harness reports dataset coverage and eligibility. | Some scenario buckets have no reviewed cases. | Add cases across real, synthetic, deepfake, injected, virtual camera, document and agent-risk buckets. |
| Ground truth | Validation cases support expected outcomes and reviewer outcomes. | Ground truth is not independently adjudicated at scale. | Freeze holdout sets only after independent review. |
| Versioning | Dataset manager reports `validation-dataset-v1`. | No durable dataset release ledger yet. | Version every dataset change before comparing benchmark runs. |
| Confidence | Dataset manager computes conservative confidence. | Confidence is readiness evidence, not statistical certainty. | Use confidence only to gate benchmark eligibility. |
| Review history | Benchmark history and reviewed outcomes are exposed. | Persistence/history needs pilot traffic. | Store benchmark snapshots only after dataset versions are stable. |

## Required Case Metadata

Each validation case must retain:

- dataset version
- scenario category
- source and collection permission
- expected label
- reviewer outcome
- reviewer ID or review group
- review timestamp
- confidence
- provider agreement or disagreement
- governance override details
- replay or evidence reference
- limitations

## Benchmark Eligibility

A dataset bucket is benchmark eligible only when:

- at least one case exists
- at least one reviewed outcome exists
- label quality is reviewed or adjudicated
- confidence is at or above the benchmark threshold
- source rights and restricted-data handling are known
- the case can be traced to evidence or replay

## Metrics Boundary

The system may calculate precision, recall, F1, false positives and false negatives only for the dataset, version, threshold and test conditions being evaluated. If reviewed data is insufficient, the required output remains:

`Validation incomplete - insufficient reviewed dataset.`

## 30-Day Dataset Priorities

1. Build an adjudicated holdout set for real human sessions and normal workflow cases.
2. Add reviewed synthetic face, deepfake video and injected session examples.
3. Add reviewed forged-document and virtual-camera cases.
4. Add AI-agent runtime anomaly cases with governance outcomes.
5. Record provider agreement separately from baseline or trust-engine scores.
6. Publish benchmark history only after dataset versions are frozen.
