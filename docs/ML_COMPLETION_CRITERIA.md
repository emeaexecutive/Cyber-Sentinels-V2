# ML Completion Criteria

Cyber Sentinels tracks ML readiness as evidence maturity, not as a marketing claim. The current platform should be described honestly as Level 2: Provider-ready foundation, with active heuristic and runtime review signals but no production-grade first-party ML inference.

## Readiness Levels

1. Level 1 - Heuristic rules only: deterministic rules and workflow evidence produce review signals.
2. Level 2 - Provider-ready: provider adapters, credential checks and source labels are in place.
3. Level 3 - Provider-backed detection active: reviewed provider inference runs against supported workflows.
4. Level 4 - Validation dataset present: approved labelled validation cases exist.
5. Level 5 - Precision/recall/F1 reported: metrics are calculated from labelled cases and source-specific results.
6. Level 6 - Human-reviewed false positives/false negatives: reviewer adjudication exists for FP/FN cases.
7. Level 7 - Enterprise pilot validated: pilot workflows validate outcomes, evidence retention and governance review.
8. Level 8 - Proprietary model-assisted detection benchmarked: first-party model-assisted detection is benchmarked against approved cases.

## Current Honest Level

Current level: Level 2 - Provider-ready.

What works today:

- Heuristic Baseline review signals.
- Runtime Intelligence and signal fusion.
- Provider readiness and credential state checks.
- Replayable evidence, audit logs and governance review.
- False-positive and false-negative tracking structure.

What is not claimed:

- Production-grade detection.
- First-party trained ML inference.
- Precision, recall or F1 without labelled validation cases.
- Provider-backed detection unless an implemented provider endpoint is active.

## Blockers To 65-80% Maturity

- Add approved labelled validation cases.
- Run reviewed provider/model comparisons.
- Report precision, recall and F1 from those cases.
- Track human-reviewed false positives and false negatives.
- Validate at least one enterprise pilot workflow.
- Benchmark any proprietary model-assisted detection before claiming it.
