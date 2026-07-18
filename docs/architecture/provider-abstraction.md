# Provider abstraction

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose and boundary

The provider layer converts external verification results into attributed evidence. A provider result is never an authorization or final trust decision. UI code consumes application services or normalized view models; it must not call provider SDKs, credentials or private adapter methods.

The canonical registry is `lib/providers/registry.ts`, the current contract is `IdentityProviderAdapter` in `lib/providers/types.ts`, and server-side selection is in `lib/providers/provider-service.ts`.

## Current inventory

| Provider | Purpose | Authentication | Evidence produced | Failure modes and retry | Security and current state |
| --- | --- | --- | --- | --- | --- |
| Hopae Connect | Identity session verification | Server-held client credentials; HMAC and timestamp validation for callbacks | Normalized identity-session outcome, assurance, timestamps, source digest, attributes and limitations | Bounded timeouts; safe retrieval may retry throttling; session creation is not blindly retried | Implemented and server selected only when enabled and configured; raw identity payloads are not retained |
| World ID | Proof-of-personhood route boundary | Request proof shape is validated; provider verification is not connected | No provider-verified evidence currently | Returns a fail-closed `501` rather than a synthetic success | Placeholder, not Live |
| Stripe Identity | Future identity verification | No active identity adapter credentials or callback path | None | Factory fails closed | Placeholder. Billing Stripe is a separate concern and is not identity evidence |
| Persona | Future identity verification | Not implemented | None | Disabled/future adapter | Must not be represented as configured or Live |
| Entrust | Future identity verification | Not implemented | None | Disabled/future adapter | Must not be represented as configured or Live |
| Onfido | Future identity verification | Not implemented | None | Disabled/future adapter | Must not be represented as configured or Live |
| Cloudflare Turnstile | Bot/challenge signal | Secret-validated server verification | Challenge outcome used as a bounded signal | Timeout/provider failure must not become a pass | Active integration, but not identity proof |
| Fingerprint device risk | Future device-risk signal | Not implemented | None | Placeholder fails closed | Must remain distinct from identity verification |
| External unattributed | Compatibility attribution for evidence without a registered provider | None | Attributed as external/unknown, never silently promoted | Missing attribution reduces confidence | Compatibility state, not a selectable provider |

## Current adapter contract

`IdentityProviderAdapter` currently exposes:

- `createSession()`;
- `retrieveSession()`;
- `verifyCallback()`;
- `normalizeEvidence()`; and
- `healthCheck()`.

The blueprint's permanent lifecycle contract is:

```ts
interface ProviderLifecycle {
  initialize(): Promise<void>;
  verify(input: ProviderVerificationInput): Promise<ProviderVerificationResult>;
  normalize(result: ProviderVerificationResult): NormalizedProviderEvidence;
  health(): Promise<ProviderHealth>;
  shutdown(): Promise<void>;
}
```

This is a **target contract**, not the current interface. `createSession` plus `retrieveSession` currently implement parts of `verify`; `healthCheck` corresponds to `health`; explicit `initialize` and `shutdown` hooks do not exist. Adopting the target requires an ADR and compatibility adapter so existing callbacks and sessions are not broken.

## Required execution rules

1. Resolve a provider from the server-owned registry and deployment policy.
2. Confirm implementation, enablement, credentials and an actual health result independently.
3. Authenticate the outbound request and validate the inbound callback before parsing it as trusted evidence.
4. Normalize into a provider-neutral structure and preserve provider attribution, mapping version and limitations.
5. Persist through the evidence boundary with tenant, correlation and idempotency context.
6. Feed evidence to policy and trust orchestration; never accept provider output as direct authorization.
7. Record an explicit unavailable, timeout, invalid-signature or malformed state on failure.

## Retry and failure contract

- Retry only operations documented as safe or protected by an idempotency key.
- Apply bounded timeouts, capped attempts and jittered backoff for transient failures.
- Do not retry invalid signatures, invalid timestamps, malformed payloads, policy denials or authentication failures.
- Do not blindly retry session creation because a timed-out request may have succeeded remotely.
- Surface `Awaiting credentials`, `Configured`, `Live`, `Offline` and placeholder states truthfully. An environment variable alone does not prove Live health.
- Persist enough correlation data to reconcile ambiguous outcomes without storing secrets or full raw identity payloads.

## UI isolation

No Client Component currently invokes a provider adapter. Provider types may be used to render attributed state, but credentials, SDK clients, callback verification, registry mutation and health calls remain server-only. A future direct provider import from UI code is an architecture violation.

## Verification and gaps

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Provider registry with unique IDs | Nine IDs in `lib/providers/registry.ts` | Implemented |
| Session, callback, normalization and health abstraction | `IdentityProviderAdapter` | Implemented |
| Explicit initialize and shutdown lifecycle | No equivalent methods | Gap |
| Multiple production identity adapters | Hopae only; others fail closed | Gap |
| Durable provider SLA history | Health snapshots exist; in-process latency is not a retained SLA | Partial |
| UI cannot access provider internals | Provider execution remains server-side | Implemented boundary |

## Change control

Adding or promoting a provider requires security review, callback and replay-protection tests, normalization fixtures, retention classification, data-residency review, honest health reporting and rollback instructions. A provider must not be selected merely because an API key exists.
