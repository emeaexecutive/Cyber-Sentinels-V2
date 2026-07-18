# ADR-007: Cloudflare Edge

## Status

Proposed for edge services; Turnstile integration accepted.

## Context

The application includes Cloudflare Turnstile client and server verification, CSP allowances and environment contracts. Repository source does not prove that DNS, CDN, WAF, bot policy or other Cloudflare edge controls are configured for every environment.

## Decision

Use Cloudflare Turnstile as an optional, server-verified abuse-resistance signal for approved public forms. Treat broader Cloudflare edge capabilities as infrastructure controls that complement, but never replace, Next.js middleware, application authorization, rate limiting, webhook authentication or Supabase RLS. Do not claim edge deployment until configuration evidence is retained.

## Alternatives

- Depend on application rate limits only: insufficient against distributed automated abuse.
- Trust a client challenge without server verification: rejected because tokens are untrusted input.
- Put authorization at the edge only: rejected because domain and tenant context belongs in the application and database.

## Consequences

- Turnstile keys are environment-specific and server verification is mandatory.
- Missing configuration results in an explicit disabled or unavailable state.
- Edge configuration needs separate operational ownership and evidence.
- CSP and privacy documentation must track approved Cloudflare endpoints.

## Security impact

Tokens are bounded, rate-limited and verified server-side with client IP where available. Failure does not authorize a protected action. Edge controls provide defense in depth; bypass or outage must not weaken application authorization.

## Future work

Complete the separately authorized Cloudflare edge design, document DNS/WAF/rate-limit ownership, add deployed verification and revisit this ADR for acceptance of the wider edge posture.
