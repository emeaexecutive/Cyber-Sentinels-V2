# Detection Proof and Enterprise Validation

Last reviewed: 2026-07-06

## Current ML reality

Cyber Sentinels has no proprietary detection-model inference, model artifacts or validated model-accuracy results. `Real ML` is therefore inactive. General-purpose AI used for governed summaries is not detection ML and cannot establish authenticity.

## Provider capability reality

Implemented providers can contribute normalized evidence when their adapter, credentials and runtime requirements are satisfied. Provider results are labelled `Provider API` and remain separate from Cyber Sentinels rules and governance outcomes. Media, voice and document-forensics provider entries remain `Awaiting Credentials` or `Not Implemented` until an adapter executes and retains an evidence reference. Credentials alone do not prove capability.

## Heuristic capability reality

Deterministic rules currently identify reviewable workflow conditions such as session discontinuity, injection indicators, evidence gaps, provider-state changes, authorization discontinuity and suspicious agent behavior. These are labelled `Heuristic Rules`. They support routing and explanation, not real/fake conclusions. Controlled examples and fixtures are labelled `Demo Data`.

## Detection proof chain

Production evidence should preserve:

1. the observed event and timestamp;
2. detection source: `Real ML`, `Provider API`, `Heuristic Rules`, `Demo Data`, `Awaiting Credentials` or `Not Implemented`;
3. evidence available at that time;
4. the reason trust changed and the before/after state;
5. the accountable reviewer or actor;
6. approve, escalate, block or request-evidence action; and
7. the final operational outcome and receipt/replay reference.

The benchmark harness registers real/fake sessions, synthetic identity, virtual camera, document fraud, suspicious and normal agent behavior, and normal workflow cases. It records expected outcome, source, trust movement, provider state, governance result, reviewer agreement and accountable overrides. It does not generate accuracy claims.

## Production-safe now

- Explainable rule-based workflow routing with human review.
- Source-separated provider evidence when a real adapter executes.
- Admin-protected detection inventory and fail-closed provider states.
- Evidence preservation, governance actions, replay chronology and receipts.
- Restricted-data egress blocking, mandatory redaction and provider-policy audit events.
- Customer-controlled operational memory across provider changes.

## Not validated yet

- Proprietary deepfake, voice-clone, document-fraud or biometric detection.
- Representative precision, recall, false-positive or false-negative rates.
- A consented validation corpus and locked holdout dataset.
- Cross-provider accuracy or agreement claims.
- Production thresholds across demographic, device, language and accessibility conditions.
- Deployment-specific provider contracts, residency, retention and regulated-use eligibility.

## Fintech and insurance pilot requirements

1. Select a narrow, non-autonomous workflow and define accountable decision authority.
2. Approve data classification, residency, retention, deletion and provider/subprocessor controls.
3. Establish representative normal and risk cases with independent ground truth.
4. Validate rules and each provider separately; record precision, recall, error counts, latency and reviewer agreement with denominators.
5. Exercise reviewer overrides, appeals, provider failure, revocation, evidence export and replay reconstruction.
6. Verify RLS, tenant isolation, audit immutability, signing-key custody and incident response.
7. Prohibit automated adverse decisions and unsupported authenticity or fraud claims.

Enterprise credibility comes from attributable evidence, reproducible replay and accountable outcomes, not decorative scores or unvalidated AI language.
