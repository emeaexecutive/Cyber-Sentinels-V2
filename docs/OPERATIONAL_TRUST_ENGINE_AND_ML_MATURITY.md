# Operational Trust Engine and ML Maturity

## Current ML Maturity

Cyber Sentinels is currently a provider-ready, heuristic and runtime-intelligence trust platform. It has validation scaffolding, provider adapters, benchmark reporting, replay evidence and governance review, but it does not claim production-grade first-party ML detection.

The current ML and detection labels are:

- `Real ML`
- `Provider API`
- `Heuristic Baseline`
- `Runtime Intelligence`
- `Demo Data`
- `Awaiting Credentials`
- `Not Implemented`

`Real ML` is reserved for verified model inference with benchmark evidence. `Provider API` is retained as external evidence, not a final verdict. `Heuristic Baseline` and `Runtime Intelligence` support review and execution routing without claiming trained ML.

## Validation Readiness

The validation framework supports confusion matrix, precision, recall, F1, provider agreement, reviewer agreement, false-positive tracking, false-negative tracking and escalation-rate reporting.

Metrics only carry meaning when computed from approved labelled cases. If no labelled validation dataset is present, the platform must continue to show: `No validation dataset available yet.`

## Trust Execution Architecture

The operational trust engine follows this sequence:

1. Detect signals from provider readiness, heuristic rules, runtime behavior, session integrity, provenance and intent.
2. Decide with weighted trust aggregation, confidence bands, trust decay, runtime posture shifts and governance weighting.
3. Execute the workflow action or pause path.
4. Replay the decision with evidence, source labels, limitations and authority context.
5. Govern escalations through review queues and human authority.

Provider checks run in parallel and use timeout isolation. Slow, missing or failed providers degrade gracefully and remain visible through provider states instead of blocking the workflow or fabricating evidence.

## Replay Philosophy

Replay is enterprise operational memory. It should answer:

- who or what acted;
- under whose authority;
- which workflow was touched;
- what evidence existed;
- what the trust algorithm returned;
- which provider state was available;
- what governance action occurred;
- what workflow execution happened; and
- what final operational outcome was retained.

Replay should remain calm, forensic, regulator-readable and buyer-facing. Missing provenance is not proof of fake. Present provenance is not proof of real. Provenance is one signal.

## Provider Readiness

Provider orchestration uses these states:

- `Live`
- `Simulated`
- `Awaiting Credentials`
- `Timeout`
- `Failed`
- `Disabled`

Credentials alone do not prove provider-backed detection. A live provider state requires an implemented path, configured credentials, runtime execution and retained evidence. Latency, timeout and failed-provider states remain auditable evidence about readiness.

## Auth and Session Trust

Authentication feeds trust posture, session risk and governance escalation. Login, logout, reset password, magic links, email verification, session restoration, step-up auth, MFA readiness, geo intelligence and suspicious login events retain audit and replay context.

SMS and authenticator flows remain readiness structures until provider configuration and enrollment are present. Missing SMS provider configuration must show `Awaiting Credentials`; no SMS sending is faked.

## Runtime Governance

Agent and NHI governance is based on delegated authority, ownership continuity, least privilege, runtime behavior, blast radius and orphaned/shadow identity handling.

Every governed action should preserve:

- actor identity;
- authority actor;
- touched resource;
- action reason;
- evidence chain;
- source labels;
- limitations;
- trust decay;
- governance weighting;
- replay requirement; and
- final outcome.

## Enterprise Readiness

The platform is strongest for regulated-readiness conversations when framed around auditability, replayability, human review, restricted data controls, provider evidence separation and no unvalidated ML claims.

Relevant workflow categories include fintech, insurance, banking, healthcare, hiring, onboarding, claims, approvals and AI-assisted operations.

## Remaining Blockers To Production Maturity

- Add approved labelled validation datasets by workflow and risk class.
- Run source-specific provider benchmarks against reviewed live provider paths.
- Calibrate trust thresholds, decay windows and escalation triggers with pilot data.
- Validate Supabase MFA enrollment, reset, magic-link and recovery behavior in a production-like environment.
- Exercise provider latency, timeout and failure recovery against real external APIs.
- Expand restricted-data egress and redaction tests.
- Seed replay, governance and receipt fixtures for regulated workflow demos.
- Continue mobile, contrast and dashboard-density QA on operational surfaces.
