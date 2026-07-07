# Validation Reality Audit

## Implemented

- Admin-protected ML and detection status routes expose source labels, provider readiness, missing credentials and validation status.
- The benchmark harness supports confusion matrix, precision, recall, F1, provider agreement, reviewer agreement, false-positive tracking, false-negative tracking, escalation rate, confidence calibration and exportable audit metadata.
- Empty or missing labelled datasets return `No validation dataset available yet.`
- Provider adapters normalize outputs and fail closed when credentials are missing or live execution is not implemented.
- Restricted validation data is blocked before provider calls.
- Replay, audit and governance metadata preserve source labels, evidence references, limitations and reviewed outcome context.

## Partially Implemented

- `data/validation/` has safe bucket scaffolds and a metadata contract, but no approved labelled case JSON files are present.
- Reviewed outcome summarization exists in code for false positives, false negatives, escalation outcomes, governance overrides, reviewer notes and replay linkage, but it needs real reviewed cases to produce operational calibration value.
- Provider latency and degraded mode are visible in runtime paths, but real provider latency must be validated against live provider APIs.
- Trust algorithm calibration includes weighted signals, decay, runtime posture shifts and governance weighting, but thresholds still need pilot evidence.

## Simulated

- Demo and scenario flows remain controlled examples.
- Provider readiness may show `Simulated` only when explicitly configured as simulated.
- Runtime trust examples demonstrate operational behavior, not provider accuracy or trained ML performance.

## Awaiting Provider Credentials

Provider-backed evidence remains `Awaiting Credentials` where required environment variables are absent. Credentials alone do not create a live integration. A reviewed adapter path, runtime execution and retained evidence are required before provider evidence can be treated as live.

## Planned

- Add approved labelled validation cases for real sessions, synthetic sessions, virtual camera sessions, forged documents, synthetic voice, runtime anomalies, suspicious agent actions, clean agent actions and governance-reviewed outcomes.
- Run source-specific provider comparisons once live provider paths are reviewed.
- Calibrate precision, recall, F1, escalation thresholds and reviewer agreement by workflow type.
- Expand pilot fixtures for fintech, insurance, onboarding, claims, hiring and AI-agent operations.

## Reality Boundary

Cyber Sentinels does not currently claim production-grade first-party ML detection. Benchmark metrics are dataset-scoped and must not be generalized beyond approved labelled cases. Missing provenance is not proof of fake. Present provenance is not proof of real. Provider and heuristic outputs remain review evidence until governed by a human decision.
