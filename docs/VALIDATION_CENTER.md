# Validation Center

## Canonical surface

RC5 upgrades the existing protected `/dashboard/validation` route into the Validation Center. No parallel route or validation engine was created.

## Evidence shown

- ground-truth availability;
- provider evidence;
- human-reviewed outcomes;
- synthetic test coverage;
- unknown rate;
- precision and recall;
- false positives and false negatives;
- calibration status;
- retained workflow observations;
- deterministic, heuristic, provider, ML, human-reviewed and simulated source audit.

Every metric is labelled `Live`, `Test`, `Estimated` or `Unavailable`. `Live` is reserved for retained operational observations. Controlled datasets and benchmarks are `Test`. No RC5 metric is labelled `Estimated` unless an estimation method is explicitly implemented. Missing reviewed evidence is `Unavailable`.

## Current status

The repository contains no benchmark-eligible reviewed cohort. Precision, recall, unknown rate and calibration remain unavailable and the required status is:

`Calibration incomplete - insufficient reviewed ground truth.`

## Release blocker

Release evidence requires at least 30 approved, versioned reviewed samples with ground-truth quality, reviewer attribution and representative workflow coverage.
