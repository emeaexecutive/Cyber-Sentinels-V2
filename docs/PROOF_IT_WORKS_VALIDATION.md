# Proof It Works Validation

Cyber Sentinels should be demonstrable without overstating what has been independently validated. The product separates working software, rule-based MVP logic, optional provider-backed verification and future benchmarking.

## What Works Today

Implemented product surfaces:

- Auth and email-verification flows through the existing Supabase auth architecture.
- Protected routes for dashboard, admin and workflow review surfaces.
- Enterprise access form and intake flow.
- Verification workflows for evidence, review, replay and receipt surfaces.
- Replay chronology and protected verification receipt pages.
- Governance review UI with reviewer ownership, action state and escalation context.
- Database-backed records when Supabase is configured and the relevant tables contain data.
- Public-safe verification status page at `/status/verification`.
- Admin-only verification testbench at `/admin/verification-testbench`.

## What Is Rule-Based

The MVP trust score is transparent and deterministic. It uses:

- identity confidence
- session integrity
- evidence completeness
- governance review state
- risk flags
- provider verification state

This scoring model is not a trained biometric model. It does not independently prove deepfake, liveness, voice clone or biometric accuracy. It is designed to explain workflow review priority, flags and recommended governance action.

## What Depends On External Providers

Optional provider-backed verification can strengthen the evidence chain when configured and exercised:

- World ID
- Hopae
- Stripe Identity
- Persona or Onfido future adapters

Provider signals should be shown as evidence inputs, not as blanket trust guarantees. If a provider is not configured, the product should say so plainly.

## What Requires Future Benchmarking

Cyber Sentinels should not claim measurable accuracy until benchmarks or provider evidence exist for:

- deepfake accuracy
- liveness accuracy
- voice clone detection
- biometric accuracy
- proxy interview detection accuracy
- synthetic applicant detection accuracy

Future benchmarking should define datasets, sample size, test conditions, false positive rate, false negative rate, human review protocol and provider version.

## Test Matrix

| Case | Purpose | Expected Result |
| --- | --- | --- |
| Real human / normal session | Show baseline workflow with complete evidence and approved governance | High score, no rule-based flags, proceed with retained receipt evidence |
| Missing evidence | Show incomplete evidence handling | Lower score, missing evidence flag, request evidence before approval |
| Session injection risk | Show channel or injection anomaly handling | Escalated score, injection and integrity flags, governance review required |
| Proxy candidate risk | Show candidate/session mismatch handling | Escalated score, proxy risk flag, governance review required |
| Failed governance review | Show reviewer authority | Blocked result regardless of partial evidence |
| Verified provider signal | Show provider evidence as an input | Higher score when provider signal is verified and governance approves |

## False Positive / False Negative Plan

False positives:

- Keep flags separate from final outcomes.
- Show the evidence that triggered each flag.
- Require human governance review before adverse workflow decisions.
- Allow reviewers to record rationale, override context and receipt outcome.

False negatives:

- Preserve replay chronology so missed issues can be reviewed later.
- Track which evidence was absent or incomplete.
- Treat provider signals as inputs, not absolute guarantees.
- Revisit scoring weights after real incident review, provider reports and benchmark data.

## Product Copy Guardrails

Use these phrases consistently:

- Detection is one signal.
- Governance review determines final workflow state.
- Cyber Sentinels does not claim perfect detection.

Avoid:

- fake accuracy metrics
- biometric accuracy claims without evidence
- claims that MVP scoring detects deepfakes, liveness failure or voice clones
- claims that provider-backed verification is active when providers are not configured
