# Real Verification Status

This audit separates working software, rule-based workflow scoring, normalized provider evidence and future provider work. Cyber Sentinels does not claim deepfake, biometric, liveness or voice-clone accuracy.

## Provider Integrations

| Provider | Current status | What works today |
| --- | --- | --- |
| World ID | Placeholder verification endpoint | `/api/verify/world` requires auth, accepts proof-shaped payloads and reports whether `WORLD_ACTION` is configured. It does not call World ID backend verification today. |
| Stripe Identity | Registry support only | Provider status is tracked from `STRIPE_SECRET_KEY`, but no Stripe Identity verification session lifecycle is wired into candidate or session workflows today. |
| Persona | Placeholder adapter | Normalized evidence shape exists for future use. No live Persona API call is made today. |
| Entrust | Placeholder adapter | Normalized evidence shape exists for future use. No live Entrust API call is made today. |
| Onfido | Placeholder adapter | Normalized evidence shape exists for future use. No live Onfido API call is made today. |
| Cloudflare Turnstile | Real bot-protection capability when configured | Turnstile can protect configured forms as a bot/session integrity signal. It is not identity verification. |
| Fingerprint / device trust | Placeholder provider entry | Device-risk normalization exists, but no live Fingerprint provider call is wired into candidate or session workflows today. |

Optional providers should be shown as configured, safely disabled, placeholder or future. Missing optional provider credentials are not proof of product failure.

## Verification Workflow

### `/verify/candidate`

The candidate flow uses authenticated app workflow data. It writes candidate profile records, trust reports, verification events, audit logs, signals and receipts when Supabase is connected.

It currently uses rule-based trust factors from the app. It does not call World ID, Stripe Identity, Persona, Entrust, Onfido or Fingerprint during the candidate submission.

### `/verify/session`

The session flow records operator-entered session integrity evidence through `/api/session/integrity`. It evaluates liveness state, injection risk, channel integrity and session anomaly fields with deterministic rules, then persists session integrity checks and verification signals.

It does not call a live biometric, deepfake, liveness or device-trust provider today.

### `/trust/session/[id]`

The session trust page reads live Supabase records for the authenticated owner:

- interview session
- latest session integrity check
- verification signals
- governance actions
- risk events
- verification receipts

It shows chronology and workflow trust state from stored records. It does not fetch new provider results.

### Receipts And Replay

Receipts and replay can display normalized provider evidence when that evidence exists in workflow snapshots. They do not independently verify provider results or call providers at render time.

## Admin Test Lab

`/admin/test-lab` is admin-only and uses controlled scenarios.

It now distinguishes:

- real provider-backed tests, available only when provider evidence is actually attached to workflow records
- simulated tests for rule-based scoring and replay behavior
- failed provider tests for safe escalation review
- missing provider warnings from the provider registry

The lab is not an accuracy benchmark and does not fake provider success.

## Status Page

`/status/verification` separates:

- Working
- Rule-based
- Provider-backed
- Not yet validated

It also shows provider integration status from the registry so configured, safely disabled, placeholder and future providers are visible without exposing secrets.

## Safe Warnings

Use these warnings on verification surfaces:

- Detection is one signal.
- Cyber Sentinels does not claim perfect real/fake detection.
- Final workflow trust state depends on provider evidence, governance review and replay.

## Current Bottom Line

Cyber Sentinels has working authentication, protected workflows, database-backed records when Supabase is connected, receipts, replay, governance review and transparent rule-based scoring.

It does not yet have live identity-provider verification wired through the core candidate/session flows, except for configured bot-protection surfaces and a World ID placeholder endpoint that does not perform backend provider verification.
