# Session Integrity Model

## Purpose

Cyber Sentinels treats identity verification and session integrity as related but separate review layers. The model does not claim that liveness proves identity, that a deepfake-risk check proves authenticity, or that any automated score should decide a hiring outcome.

The model is designed for explainable verification flags, channel integrity evidence, and named human review. It does not require invasive surveillance or continuous behavioral profiling.

## Separate signal categories

### Liveness check

A liveness check asks whether live presence was observed during a specific verification step. It may use challenge response, frame continuity, or provider evidence. A successful liveness check is useful evidence, but it does not establish the person's identity, intent, qualifications, or overall trust.

### Deepfake risk

Deepfake risk records indicators that media may require closer review. It is a risk state, not a guaranteed detector and not proof that content is authentic or synthetic. Reviewers should consider the source, capture channel, identity evidence, and other session states.

### Injection risk

Injection risk concerns replayed, substituted, virtual-camera, or otherwise injected media entering a session through an unexpected path. It is separate from deepfake risk: authentic media can be injected, and synthetic media can arrive through an otherwise intact channel.

### Device and channel integrity

Channel integrity evidence describes whether the configured capture path, device context, and media channel passed available integrity checks. It matters because a verified candidate can still participate through a channel that is incomplete, altered, or untrusted. A failed channel check creates a verification flag and requires human review; it does not automatically accuse or reject the participant.

### Session anomaly risk

Session anomaly risk records reviewable discontinuities or unexpected session events. It is deliberately limited to operational session evidence and must not become invasive behavioral surveillance. An anomaly is context for review, not a conclusion about a person.

### Manual review required

This category records the governance state created when another signal is failed, elevated, or explicitly escalated. A named human reviewer examines the evidence, can request more information, and records the final decision.

## Why no single signal proves trust

Trust decisions depend on identity evidence, session conditions, workflow context, risk flags, and governance. Each signal answers a narrower question:

- Liveness: was live presence observed for this check?
- Deepfake risk: are there media indicators that need review?
- Injection risk: might media have entered through an unexpected path?
- Channel integrity: did the device and capture channel pass configured checks?
- Session anomaly: did a reviewable operational anomaly occur?

None of these questions alone answers whether a person or AI agent should be trusted. Cyber Sentinels preserves the distinctions so reviewers can explain what was checked, what remains uncertain, and why an action was taken.

## Human review model

Every stored session integrity check creates an audit log and timeline event. Elevated or failed states create verification flags. When manual review is required, the workflow creates a governance action for a human reviewer.

The reviewer can compare identity verification state with session integrity state, inspect evidence, request additional checks, and record a decision. The system does not automatically reject a candidate and does not guarantee deepfake detection.

## Product surfaces

- `/verify/session` records a session integrity review.
- `/trust/session/[id]` shows the latest signals for one interview session.
- `/dashboard/session-integrity` provides an operational review queue.
- `/api/session/integrity` evaluates and stores a complete check.
- `/api/session/risk` returns a risk-focused explanation without making a decision.
- `/api/verification/signals` returns all supported explainable signal objects.

