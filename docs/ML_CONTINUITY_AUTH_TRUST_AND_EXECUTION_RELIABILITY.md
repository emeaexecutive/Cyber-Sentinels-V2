# ML Continuity, Auth Trust and Execution Reliability

## Current ML status

Cyber Sentinels currently exposes ML and detection status through `/admin/detection-status`, `/api/detection/status`, `/api/ml/status`, `/api/ml/readiness` and `/api/ml/benchmark`.

The current implementation is a provider-ready and heuristic-backed foundation. It does not claim production-grade first-party ML detection. Detection and trust surfaces must label evidence with one of the canonical source labels:

- `Real ML`
- `Provider API`
- `Heuristic Baseline`
- `Runtime Intelligence`
- `Governance Review`
- `Demo Data`
- `Awaiting Credentials`
- `Not Implemented`

`Real ML` is only valid when a verified model is implemented, executed and benchmarked. `Provider API` is only valid when a configured provider path returns retained evidence. `Heuristic Baseline` and `Runtime Intelligence` are deterministic governance aids, not trained ML.

## Benchmark readiness

`lib/validation/benchmark-harness.ts` supports:

- confusion matrix;
- precision;
- recall;
- F1;
- false positive tracking;
- false negative tracking;
- reviewer agreement;
- provider agreement; and
- confidence calibration.

When no approved labelled validation cases exist, the benchmark response remains: `No validation dataset available yet.`

No precision, recall, F1, production accuracy or provider efficacy claim is valid without representative labelled data and source-specific results.

## Auth trust model

Authentication is treated as the first trust event in a workflow. Login, logout, reset password, session restoration, MFA challenge, suspicious login, geo mismatch, step-up auth and blocked-session events can be retained through auth replay events.

The auth trust model evaluates:

- authenticated user state;
- verified email;
- MFA or phone verification readiness;
- session integrity;
- geo consistency;
- device continuity;
- trust posture;
- session risk; and
- governance lock state.

Suspicious auth events affect replay metadata, session risk, trust posture and governance-review routing. They do not bypass Supabase auth, weaken RLS or expose admin tooling.

## MFA and geo readiness

MFA readiness is implemented as a provider-state model, not a fake delivery system.

SMS OTP is `Awaiting Credentials` unless SMS provider configuration is present. Authenticator-app MFA is `Awaiting Credentials` unless provider-backed TOTP configuration is present. Challenge metadata is replay-safe readiness evidence, not proof that an SMS or authenticator code was delivered.

Geo/session intelligence remains labelled as `Heuristic Baseline` and `Runtime Intelligence` unless a provider supplies evidence.

## Agent and NHI governance

Agent and NHI execution must answer:

- who or what acted;
- under whose authority;
- what resource was touched;
- why the action was allowed, reviewed or blocked;
- which evidence references exist; and
- which final action occurred.

Trust workflow execution now retains authority actor, touched resource, source labels, evidence chain, action reason, trust score source, governance-review requirement and replay requirement in the replay/audit metadata.

## Session integrity

Session integrity separates:

- liveness;
- deepfake risk;
- injection risk;
- virtual camera risk;
- emulator risk;
- tampered app risk;
- frame integrity;
- device/channel integrity;
- impersonation risk; and
- manual review.

Provider-dependent session signals remain `Awaiting Credentials` until provider or device-attestation evidence exists. No single session signal proves identity, trust or media authenticity.

## Real-time trust execution

The real-time execution path connects:

- parallel signal collection;
- provider orchestration;
- heuristic baseline;
- signal fusion;
- trust algorithm;
- posture update;
- trust cache;
- workflow execution;
- audit log;
- replay writer;
- governance queue; and
- receipt generation for allow/block outcomes.

Provider checks run in parallel and are bounded by timeout windows. Timeout and failed providers are isolated from the decision path and retained as degraded provider states instead of silently blocking the whole workflow or fabricating evidence.

## Provider readiness

Provider states are normalized as:

- `Live`
- `Simulated`
- `Awaiting Credentials`
- `Timeout`
- `Failed`
- `Disabled`

Credentials alone do not prove provider capability. A provider must have a reviewed adapter path, credentials, runtime execution and retained evidence before it can be treated as live evidence.

Restricted validation data must not enter provider calls. Provider outputs remain evidence for governance review, not automatic authenticity verdicts.

## Replay as trust record

Replay is the operational memory for workflow trust. It should show:

- actor;
- workflow;
- intent;
- evidence chain;
- detection source;
- trust score source;
- authorization lineage;
- governance action;
- execution action; and
- final outcome.

Replay records must be clear enough for forensic review while avoiding secrets, unnecessary PII and internal implementation leakage.

## Data ownership and sovereignty

The platform posture remains:

- restricted data egress blocked;
- PII and secrets redacted before provider calls;
- provider interactions audited;
- AI training disabled by default;
- external retention disabled by default;
- customer-owned operational memory; and
- provider-agnostic orchestration.

Cyber Sentinels governs workflow trust and operational evidence. It does not claim to replace model providers or provide unvalidated proprietary frontier detection.

## Remaining gaps

- Add approved labelled validation datasets for representative workflows.
- Run source-specific provider benchmarks after live provider paths are reviewed.
- Calibrate thresholds by workflow, data class and risk posture.
- Add operational tests against real Supabase password reset, magic link and MFA enrollment flows.
- Validate provider latency behavior against real external APIs.
- Seed replay and governance fixtures for regulated workflow demonstrations.
- Expand redaction tests for restricted-data provider egress.
