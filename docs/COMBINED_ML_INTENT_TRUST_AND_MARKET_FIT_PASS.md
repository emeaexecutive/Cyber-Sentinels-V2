# Combined ML, Intent Trust and Market-Fit Pass

## ML maturity status

Cyber Sentinels is positioned as an AI Trust Control Plane with bounded ML maturity. The current implementation uses heuristic baseline scoring, runtime intelligence, provider-ready adapters, validation harness output and signal fusion. It does not claim first-party trained ML inference, production detection accuracy, precision or recall unless labelled validation data and provider/model results exist.

If no labelled dataset exists, the benchmark response remains: "No validation dataset available yet."

## Intent-aware trust model

`lib/trust/intent-risk.ts` adds intent-aware heuristic/risk scoring before execution. It supports human, agent, NHI and workflow actors; declared intent; expected and actual permission; data sensitivity; workflow criticality; anomaly reason; delegated authority; human ownership and action-before-execution review.

Recommendations are constrained to `allow`, `review`, `escalate` and `block`. This is not confirmed ML.

## Agent accountability model

Agent governance now keeps compatibility with existing registry data while supporting human owner, supervising admin, delegated authority, signed action receipt, expiry/revocation state, decision log, escalation owner, kill-switch status and audit trail fields.

Every agent action should remain answerable as:

- who or what acted
- under whose authority
- what was touched
- what was approved, reviewed, escalated or blocked
- what evidence exists

## NHI governance model

The agent registry now supports discovered, approved and shadow posture; owner/orphan state; credential type; access scope; runtime escalation; last activity; governance review state and blast radius. These fields are normalized without adding tables or routes.

## Session and live video integrity

Session integrity keeps liveness, deepfake risk, injection risk, virtual-camera risk, emulator risk, tampered-app risk, frame integrity, device/channel integrity, impersonation risk and manual review separate. Source labels remain constrained to Provider API, Heuristic Baseline, Runtime Intelligence, Demo Data, Awaiting Credentials and Not Implemented.

## Provenance compliance

`lib/trust/provenance-confidence.ts` adds C2PA and SynthID placeholders, AI-generated disclosure state, evidence timeline count, exportable audit summary and governance alert language.

Important boundaries:

- Missing provenance does not mean fake.
- Present provenance does not guarantee real.
- Provenance is one signal in trust orchestration.

## Signal fusion

`lib/detection/signal-fusion.ts` now accepts intent risk, session integrity risk, provenance confidence, provider signals, heuristic baseline, runtime trust, agent posture risk, governance history and reviewer outcome. It returns recommendation, confidence band, evidence summary, escalation reason, source transparency and limitations.

Reviewer outcomes remain authoritative when supplied.

## Replay as trust record

Replay now foregrounds actor, workflow, declared intent, evidence chain, detection source, authorization lineage, governance action, trust-state change and final outcome. It remains a forensic operational memory surface, not a mutable decision engine.

## Market-fit UX clarity

Public and enterprise surfaces now describe Cyber Sentinels as protecting operational trust across humans, AI agents, non-human identities, live sessions, documents, media and regulated workflows.

The buyer answer remains:

> The moat is not owning the AI model. The moat is owning the trust record.

## Remaining gaps to reach 65-80% ML maturity

- Add approved labelled validation cases across real sessions, synthetic media, forged documents, injected sessions, agent actions and normal workflows.
- Exercise live provider adapters and record provider agreement against baseline and reviewer outcomes.
- Establish cohort-specific precision, recall, F1, false-positive and false-negative thresholds.
- Add reviewer agreement and disagreement review loops for calibration.
- Retain confidence calibration evidence over time.
- Validate signal-fusion weights against benchmark data before presenting them as production-grade.
- Keep ML/provider state explicit as Live, Simulated, Awaiting Credentials or Disabled.
