# RC4 Validation Evidence

## Current evidence boundary

The canonical benchmark reports dataset `validation-dataset-v1`, `0` validation cases and `0/30` reviewed ground-truth samples in this checkout. Precision, recall, false-positive count, false-negative count, calibration and unknown rate therefore remain unavailable on the Validation Dashboard.

The required UI state is **Calibration Incomplete** with the supporting message `Calibration incomplete - insufficient reviewed ground truth.` Zero reviewed samples must never render as zero error rates.

## Decision-source audit

| Source | Current implementation | Evidence | Release boundary |
| --- | --- | --- | --- |
| Deterministic rules | Implemented | Trust lifecycle, authority, policy and enforcement code paths | Explainable workflow logic, not ML inference |
| Heuristic logic | Implemented | `lib/detection/baseline-model.ts`, source-labelled Heuristic Baseline | Review signal only; never an authenticity verdict |
| Provider evidence | Production-candidate path plus prototypes | Hopae normalized evidence; provider readiness registry | Credentials and provider output do not establish accuracy |
| ML inference | Not implemented | Detection status explicitly reports no trained first-party inference | Do not describe heuristics or AI assistance as detection ML |
| Human-reviewed outcome | Awaiting data | Ground-truth and reviewed-outcome contracts exist; current count is zero | Attribution, evidence and dataset version are mandatory |
| Simulated evidence | Test-only | Controlled fixtures and demo contracts | Proves product behavior, not production accuracy |

## Validation Dashboard

The existing protected `/dashboard/validation` surface now displays:

- dataset version;
- ground-truth review threshold;
- reviewed samples;
- precision and recall;
- false positives and false negatives;
- calibration state;
- unknown rate;
- the six-source decision audit.

Metric values come from `computeGroundTruthValidation`. Accuracy-like fields stay `Awaiting data` until the 30-sample reviewed threshold is met.

## Engineering correction

`loadValidationCases` now accepts only case-shaped JSON. The dataset metadata schema is no longer misread as a validation case, which previously caused a runtime failure when the default benchmark traversed `data/validation`.

## Remaining validation blockers

1. Collect at least 30 representative, versioned and reviewed ground-truth samples.
2. Attach reviewer attribution, review confidence, label version and evidence references.
3. Add reviewed provider outcomes before provider agreement can support calibration.
4. Publish only dataset-scoped metrics after all calibration gates pass.
