# ADR-008: Provider Abstraction

## Status

Accepted.

## Context

Provider neutrality requires an implementable boundary for session creation, result retrieval, callbacks, normalization and health. Without a shared contract, each integration would duplicate credentials, errors, retries, evidence mapping and observability.

## Decision

Use a provider registry plus adapter interfaces under `lib/providers`. `IdentityProviderAdapter` owns session creation, retrieval, callback verification, evidence normalization and health checks. Provider service/orchestration selects adapters server-side. Canonical errors, runtime states, correlation, evidence types and safe failure are shared.

## Alternatives

- Direct SDK calls from routes or UI: rejected because coupling and security behavior would spread.
- One generic HTTP proxy with no typed adapter: rejected because provider semantics and evidence mapping would remain implicit.
- A provider-specific database schema per integration: rejected because downstream systems would inherit vendor details.

## Consequences

- Adapter conformance and callback tests are required.
- Provider-specific details stop at the normalization boundary.
- Registry status distinguishes implementation, configuration and runtime health.
- Adapter maintenance adds work but permits replacement and controlled fallback.

## Security impact

Adapters centralize server-only credentials, signature verification, timeouts, retry safety, response validation, evidence minimization and sanitized errors. Orchestration cannot treat key presence as provider health.

## Future work

Add an automated adapter conformance suite, explicit provider-selection policy and migration guidance for legacy provider paths.
