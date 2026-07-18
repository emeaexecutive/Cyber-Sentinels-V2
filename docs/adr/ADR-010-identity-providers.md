# ADR-010: Identity Providers

## Status

Accepted.

## Context

Cyber Sentinels needs account authentication and optional upstream identity evidence. These are different trust functions: an application session does not prove every real-world identity claim, and an identity-provider assertion does not grant workflow authority.

## Decision

Use Supabase Auth for Cyber Sentinels account sessions. Integrate upstream identity systems through provider-neutral server adapters that return normalized, provenance-bearing evidence. Hopae Connect is the implemented upstream identity adapter when enabled and credentialed. World ID and Stripe Identity remain optional registry capabilities with truthful implementation states. Authorization remains external to identity providers and is evaluated by Cyber Sentinels before execution.

## Alternatives

- Treat Supabase login as sufficient identity assurance: rejected because account authentication and workflow assurance differ.
- Let one upstream identity provider own application sessions and authorization: rejected because it creates lock-in and collapses trust boundaries.
- Accept unsigned provider callbacks or client assertions: rejected because provenance and replay resistance would be absent.

## Consequences

- Account and upstream identity lifecycles remain separate but correlated.
- Provider callbacks require signature, timestamp, idempotency and tenant controls.
- Normalized evidence records limitations and does not synthesize checks a provider did not perform.
- Disabled providers do not block unrelated workflows unless policy explicitly requires them.

## Security impact

Sessions use server-validated Supabase users and verified-email gates. Upstream credentials remain server-only. Identity evidence is minimized, scoped and non-authorizing. Admin access adds allowlist and verification controls beyond ordinary authentication.

## Future work

Add adapter conformance for additional enterprise IAM and wallet providers, formal assurance mapping and credentialed end-to-end evidence without changing the authorization boundary.
