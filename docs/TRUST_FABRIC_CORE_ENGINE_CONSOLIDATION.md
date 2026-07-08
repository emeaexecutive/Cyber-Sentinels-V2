# Trust Fabric Core Engine Consolidation

Cyber Sentinels is trust infrastructure for humans, AI agents, machine identities and regulated workflows.

## Core Engines

- `lib/core/trust-engine.ts` is the canonical trust posture facade. It merges identity, runtime, provider and governance signals, exposes allow/review/escalate/block outcomes, and keeps explainability attached to every posture result.
- `lib/core/runtime-engine.ts` is the runtime facade for session integrity, AI-agent monitoring, NHI posture, device/session drift, intent risk and trust execution workflows.
- `lib/core/replay-engine.ts` is the operational memory facade. It preserves replay timelines, evidence references, trust changes, workflow execution context, governance actions and provider events.
- `lib/core/governance-engine.ts` is the governance facade for policy routing, review queues, human approvals, escalation, kill-switch state and override traceability.
- `lib/core/ml-validation-engine.ts` is the ML validation facade for benchmark execution, reviewed outcomes, calibration, provider comparison, confidence tracking and source separation.
- `lib/core/trust-graph.ts` models relationships across humans, AI agents, machine identities, credentials, workflows, evidence, governance, replay and providers without duplicating source data.

## Refactored Consumers

- Trust execution API now enters through `runtimeEngine.executeRuntimeWorkflow`.
- Trust algorithm API now enters through `trustEngine.calculateLegacyTrustPosture`.
- Governance policy, routing and threshold APIs now enter through `governanceEngine`.
- Replay, trust posture, trust explainability, audit summary and audit export APIs now enter through `replayEngine`.
- Admin detection status, readiness gate, ML benchmark, ML readiness and back-office ML summaries now enter through `mlValidationEngine`.
- Enterprise control-plane policy previews now consume `governanceEngine`.
- Enterprise and authenticated trust-transparency pages now consume `replayEngine`.

## Continuous Trust Posture

Continuous posture is computed from the canonical trust result and existing posture lifecycle data. The engine records trust increase, trust decay, step-up triggers, recovery, governance restore and replay linkage without creating a second trust score.

## ML Boundary

ML validation keeps `Real ML`, `Provider API`, `Heuristic Baseline`, `Awaiting Credentials` and `Not Implemented` separate. Precision, recall and F1 are not claimable unless calibration is complete on reviewed data. Provider outputs and heuristic logic remain evidence sources, not final authenticity verdicts.

## Security Boundary

This pass did not add public routes, weaken route protection, relax RLS assumptions or expose provider secrets. Admin and back-office visibility continues to rely on existing authenticated access gates and safe summaries.
