# Trust Engine Calibration

## Current method

The current trust score is deterministic and explainable. It combines rule-derived workflow dimensions with normalized provider signals when an implemented provider supplies evidence. It is not a trained authenticity, biometric, deepfake, voice-clone or document-forensics model.

`lib/trust-engine.ts` weights identity confidence (16%), provider verification (10%), session integrity (18%), behavioral consistency (10%), evidence completeness (12%), authorization lineage (12%), governance review (10%) and replay continuity (12%), then applies workflow anomalies as a negative 18% factor. Other score modules use documented rule weights and explicit penalties for evidence gaps, provider failure, injection risk and governance state. Scores are clamped to 0–100 and route work for review; they do not prove identity or authenticity.

## Calibration approach

Calibration must use registered, ground-truthed cases and retain the exact rule, provider and future model version. Compare score movement and governance routing against expected outcomes, then measure precision, recall, false positives, false negatives, latency and reviewer agreement per category. Threshold changes need a documented reason, before/after benchmark and approval.

## Future ML signal

A validated ML model may become one bounded input to the existing dimensions. Its output must carry model/version, input provenance, execution timestamp, confidence semantics, operating threshold, latency and evidence reference. ML must not silently overwrite provider evidence, authorization state or reviewer outcomes.

## Why governance and replay remain core

Classification can be wrong, unavailable or contested. Governance records accountable authority and the final operational action. Replay preserves what evidence existed, how trust changed, why a threshold fired and who reviewed it. These controls remain necessary regardless of model quality.

## Data required before proprietary ML

Cyber Sentinels needs lawful, representative and consented examples across normal and risk conditions; reliable ground truth; separate calibration and holdout sets; demographic, device and environment coverage; independent reviewer adjudication; false-positive and false-negative outcomes; latency measurements; drift monitoring; and retention/data-sovereignty controls. Until those exist, proprietary detection-accuracy claims are unsupported.
