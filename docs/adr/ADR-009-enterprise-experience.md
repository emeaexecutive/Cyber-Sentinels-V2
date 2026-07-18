# ADR-009: Enterprise Experience

## Status

Accepted.

## Context

Enterprise buyers and operators need coherent navigation, evidence boundaries and next steps without creating a parallel product or exposing protected operational tools. Repeated concepts and detached documents increase cognitive load and weaken canonical ownership.

## Decision

Use the existing Enterprise route family and shared Enterprise layout as the canonical buyer experience. Public Buyer Documentation and Pilot Checklist are native internal routes. Shared CTA contracts own Request Demo, Book Pilot and Contact Enterprise. Protected operational readiness, control-plane and compliance surfaces retain middleware and server-side access controls.

## Alternatives

- Publish raw Markdown or external documents: rejected because navigation, metadata and accessibility become inconsistent.
- Create a separate Enterprise application: rejected because it duplicates identity, trust and evidence concepts.
- Expose protected operator routes as buyer proof: rejected because it weakens access boundaries.

## Consequences

- One concept has one canonical home with contextual links elsewhere.
- Public and protected route classifications must remain explicit.
- Shared navigation and CTAs require contract tests.
- Enterprise content must preserve evidence-defined claims and limitations.

## Security impact

Public pages contain no customer, pilot, session or provider-secret data. Internal actions remain same-origin and non-authorizing. Protected Enterprise operations continue to require verified authentication and administrative authorization.

## Future work

Complete consented analytics, manual accessibility validation and evidence-backed buyer research without adding route or feature sprawl.
