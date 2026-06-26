# Provider Evidence and Validation Lab

Cyber Sentinels is an orchestration, governance and workflow trust platform. It is not a standalone biometric AI engine and does not claim independent biometric, liveness, deepfake or voice-clone accuracy.

## Supported Providers

The provider abstraction lives in `lib/providers/` and normalizes external verification outputs into workflow evidence.

Current provider support:

- World ID for optional proof-of-personhood evidence
- Stripe Identity for optional identity verification evidence
- Persona placeholder adapter for future identity workflows
- Entrust placeholder adapter for future identity and document-check workflows
- Onfido placeholder adapter retained for future compatibility
- Hopae Connect for optional upstream eID evidence
- Cloudflare Turnstile for bot and abuse-resistance evidence
- Fingerprint / device risk placeholder for device and session integrity evidence

Optional providers fail safely when not configured. Provider secrets stay server-side and are not shown in UI.

## Orchestration Strategy

Cyber Sentinels treats provider output as evidence inside a governed workflow:

- providers produce narrow verification signals
- Cyber Sentinels normalizes those signals
- trust scoring uses transparent rules and provider state
- governance review determines the workflow outcome
- replay preserves what triggered and why
- receipts summarize the evidence chain without exposing provider secrets

Provider pass, fail or pending states are review inputs. They do not automatically authenticate a person or approve a workflow.

## Explainable Signal Model

Normalized verification responses include:

- `provider_name`
- `verification_state`
- `identity_confidence`
- `session_confidence`
- `provider_reference`
- `evidence_summary`
- `risk_flags`
- `governance_recommendation`

The internal trust score model also tracks:

- provider verification
- device integrity
- session continuity
- governance review
- evidence completeness
- workflow anomalies

The scoring model is deterministic and rules/provider based. It is not fake AI scoring and is not a trained biometric model.

## What Is Provider-Backed

Provider-backed evidence can include:

- provider success or failure
- verification latency
- provider confidence
- provider reference
- missing provider evidence
- session integrity signal
- device trust signal

Provider evidence is shown in replay timelines, verification receipts, governance review, trust chronology and validation lab results.

## What Is Rule-Based

The validation lab uses controlled scenarios to test:

- verified human
- failed provider verification
- VPN anomaly
- injected session
- proxy candidate risk
- mismatched device signal
- governance escalation
- incomplete evidence chain

Each scenario shows trust score calculation, provider evidence, triggered signals, escalation reasons, workflow outcome and replay chronology.

## What Is Not Yet Benchmarked

Cyber Sentinels does not currently present independent benchmark results for:

- biometric accuracy
- deepfake detection accuracy
- liveness detection accuracy
- voice-clone detection accuracy
- provider superiority
- proxy candidate detection accuracy

Future benchmarking must define dataset source, sample size, provider version, decision threshold, false positive rate, false negative rate and reviewer protocol before any accuracy claim is made.

## Validation Lab Safety

The admin validation lab is protected and does not create database records. It is a measurable scenario environment for signal testing, not a claims engine.

Use the lab to inspect:

- trust score calculation
- provider-backed verification signal
- external verification evidence
- session integrity signal
- triggered flags
- escalation reasons
- workflow outcome
- replay chronology
