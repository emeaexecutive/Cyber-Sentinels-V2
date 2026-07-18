# Provider layer

## Existing layers

Provider code is split across:

- `lib/providers`: verification registry, normalization, Hopae adapter, callback security, health, readiness, telemetry and orchestration;
- `lib/identity-providers`: an older upstream identity-provider contract and Hopae implementation;
- `lib/detection/providers`: detection adapter factory plus configured, placeholder or simulated provider definitions; and
- `lib/integrations`: broader operational and ATS integrations.

## Provider status

| Provider | Observed implementation | Honest state |
| --- | --- | --- |
| Hopae Connect | Full `IdentityProviderAdapter`, authenticated client, HMAC callback verification, evidence normalizer, health check, persistence and replay/receipt integration. | Active only when explicitly enabled and fully configured; otherwise safely disabled. |
| World ID | Authenticated route validates proof shape and uses the common signal normalizer. No provider verification exchange occurs. | Placeholder; route returns `501`. |
| Stripe Identity | Detection-provider factory entry and provider registry entry. Billing Stripe integration is real, but identity-session workflow setup is absent. | Placeholder for identity verification. |
| Persona, Entrust, Onfido | Registry definitions only. | Future/placeholder. |
| Turnstile | Public-form challenge verification and registry entry. | Active when both site and secret keys are configured. |
| Fingerprint/device risk | Registry definition only. | Placeholder. |

## Implemented identity adapter contract

The current `IdentityProviderAdapter` implements:

```text
createSession(input)
retrieveSession(providerSessionId, context)
verifyCallback(envelope)
normalizeEvidence(callback, context)
healthCheck()
```

It also exposes immutable provider ID and environment fields. Server selection currently chooses `hopae_connect`; requesting another identity adapter fails closed.

## Evidence normalizer and pipeline

Provider callbacks are verified before parsing. Normalized identity evidence is tenant- and trust-session-scoped, versioned, idempotent, digest-backed and limited to typed outcomes and safe attributes. The execution pipeline collects provider signals, fuses evidence, runs the authoritative Trust Algorithm and workflow/replay, then runs ORI only as non-authoritative decision support.

Provider evidence never grants authorization directly. The Trust Decision/workflow boundary remains authoritative.

## Requested future interface gap

The blueprint's proposed lifecycle is:

```text
initialize()
verify()
normalize()
health()
shutdown()
```

That interface does not exist. The nearest implemented equivalents are adapter construction, session/callback verification, `normalizeEvidence()` and `healthCheck()`. There is no generic `initialize()` or `shutdown()` lifecycle. Renaming or replacing the live contract would be a runtime migration requiring an ADR, conformance tests and backward compatibility; it is not performed here.

## Dependency rule

No Client Component may invoke provider adapters. `components/provider-evidence-panel.tsx` imports provider types only. Some Server Components and route handlers import provider readiness or orchestration directly; those are service-boundary debt, not evidence of browser-side provider access.

## Required future conformance

Any new provider must declare configuration and safe-disabled behavior; authenticate callbacks; bound timeouts/retries; normalize evidence without raw secret or prohibited payload retention; emit replay/audit references; expose evidence-backed health; and prove that failure does not bypass the authoritative Trust Decision.
