# Verification Provider Orchestration

Cyber Sentinels is not a standalone deepfake detector. It is the orchestration, governance, evidence and replay layer around verification providers.

The product should keep provider outputs explainable, replayable and reviewable. A provider can supply identity, proof-of-personhood, bot-protection, device-risk or session-integrity evidence. Cyber Sentinels turns those outputs into workflow trust signals that support trust scoring, governance review, verification receipts and replay chronology.

## Provider Strategy

Provider logic should stay behind a small abstraction layer in `lib/providers/`.

The app should avoid hardcoding vendor-specific logic across receipts, replay, governance and timeline surfaces. UI surfaces consume normalized provider signals:

- `provider_name`
- `verification_state`
- `identity_confidence`
- `session_confidence`
- `provider_reference`
- `evidence_summary`
- `risk_flags`
- `governance_recommendation`

Provider secrets must remain server-side. Public and protected UI should only show status, evidence references and normalized review context.

## Orchestration Layer Concept

Cyber Sentinels sits above provider results:

- Providers answer narrow questions.
- Cyber Sentinels connects those answers to workflow evidence.
- Governance review determines final workflow state.
- Replay preserves what was known at the time.
- Receipts summarize the outcome without exposing raw provider secrets.

Provider failures should degrade safely into review context. A missing optional provider is a warning or disabled state, not a platform outage unless a pilot explicitly depends on it.

## Supported Providers

Current abstraction support:

| Provider | Role | Current posture |
| --- | --- | --- |
| World ID | Proof-of-personhood signal | Optional, safely disabled unless configured |
| Stripe Identity | Identity verification source | Optional, server-key gated |
| Hopae Connect | Upstream eID identity proof | Optional, enabled only with server credentials and `HOPAE_ENABLED=true` |
| Cloudflare Turnstile | Bot-protection signal for forms | Optional provider signal, production forms fail safely when configured checks fail |
| Persona | Future identity adapter | Placeholder adapter |
| Entrust | Future identity and document-check adapter | Placeholder adapter |
| Onfido | Future identity adapter | Placeholder adapter |
| Fingerprint / device risk | Future device/session-risk signal | Placeholder adapter |

## Explainable Trust Signal Model

Normalized provider signals include:

- identity confidence
- session integrity
- provider verification state
- risk flags
- governance escalation recommendation
- evidence references

These signals can feed:

- transparent trust scores
- replay chronology
- verification receipts
- governance review
- workflow outcome summaries

They must not be presented as:

- claims that AI made the decision
- absolute authenticity guarantees
- perfect-proof claims
- automatic approval

## Workflow Integration

Provider signals now appear as explainable evidence in:

- verification receipts
- replay detail
- trust replay explorer
- governance review
- trust timeline

The trust score model can consume normalized provider signals and adjust identity confidence, session integrity, provider verification state and risk flags. This remains MVP rule-based scoring, not a trained biometric or media-authenticity model.

## Future Provider Roadmap

Future work should focus on provider-specific adapters behind the existing abstraction:

- World ID server-side proof verification
- Stripe Identity verification session lifecycle
- Persona inquiry normalization
- Entrust verification report normalization
- Onfido check normalization
- Hopae webhook normalization into receipt evidence
- device-risk provider enrichment for session integrity
- provider timeout and retry policies
- provider evidence storage policy
- benchmarked provider accuracy only when supported by evidence

Do not add raw provider responses to public UI. Do not treat provider pass/fail as final truth. Keep provider results as explainable trust signals governed by workflow review, replay and receipts.
