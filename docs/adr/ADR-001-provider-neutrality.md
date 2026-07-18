# ADR-001: Provider Neutrality

## Status

Accepted.

## Context

Cyber Sentinels consumes identity, bot-protection, device-risk and verification evidence from external systems. Vendor output varies in schema, assurance, availability and commercial lifecycle. Treating one provider as the platform's truth source would couple governance and authorization to an external implementation and encourage unsupported capability claims.

## Decision

Cyber Sentinels remains provider-neutral. External systems contribute normalized, attributed evidence with source, state, version, timing, limitations and references. The Cyber Sentinels Trust Decision and authorization boundary remain authoritative. Provider selection is a server-side governance decision and is never inferred solely from credential presence.

## Alternatives

- Standardize on one identity provider: simpler initially, but creates lock-in and makes provider availability a platform-wide failure.
- Let each workflow integrate providers directly: fast locally, but duplicates security, normalization and audit behavior.
- Treat provider confidence as the decision: rejected because confidence is not authorization or reviewed truth.

## Consequences

- New providers require normalization and evidence contracts.
- Buyer and operator surfaces must show truthful provider states.
- Some capabilities remain disabled or awaiting credentials without a fallback claim.
- More adapter and contract testing is required.

## Security impact

Provider compromise or misconfiguration cannot directly authorize execution. Tenant scope, callback authentication, evidence minimization, provenance and safe failure remain enforced by Cyber Sentinels.

## Future work

Add policy-driven provider selection, contract conformance tests and portability metrics without weakening the authoritative decision boundary.
