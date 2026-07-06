# ML Validation and Provider Integration Roadmap

## Provider shortlist

Reality Defender and Sensity cover media signals; Pindrop covers voice; a document-forensics provider, Onfido, Veriff and Stripe Identity cover document/identity evidence; World ID covers proof-of-personhood. Commercial, regional, retention and regulated-use review is required before selection.

## Dataset and benchmark method

Build consented/public/synthetic positive and negative cohorts by signal family. Version labels and provenance, keep restricted data out, freeze evaluation splits, run each available source independently, and report confusion matrices, precision, recall, F1, confidence distribution, provider coverage and cross-source agreement. No result is a final authenticity verdict.

Every export must retain its schema version, generation time, case identifiers, detection source, evidence, limitations, reviewer outcome, provider agreement and the exact false-positive/false-negative case identifiers. Provider and baseline outputs remain separate rather than being blended into an unexplained score.

## Measurement goals

Initial goals are measurement quality, representative coverage and stable thresholds—not an invented accuracy number. Precision targets should be chosen with operators to control review burden; recall targets should reflect the cost of missed events. Report cohort size and uncertainty beside every metric.

## Error strategy

- False positives: retain clean controls, segment by device/demographic/quality conditions, calibrate thresholds, route uncertain cases to review and support correction.
- False negatives: expand adversarial and degraded samples, compare independent providers, monitor escapes and preserve review feedback without silently relabelling the holdout set.

## Proprietary path

The explainable weighted baseline establishes feature contracts and evaluation plumbing. Reaching proprietary model-assisted status requires consented training data, documented features, train/evaluation separation, versioned artifacts, reproducible evaluation, drift monitoring and model governance.

## Reaching 65–80% ML maturity

This means completing Level 3 and credible Level 4 evidence, plus part of Level 5: at least one exercised provider per priority modality; representative validation cohorts; reproducible benchmarks; threshold/error review; production monitoring; provider evidence separation; and a versioned proprietary experiment. It is a capability-completeness range, not an accuracy claim.
