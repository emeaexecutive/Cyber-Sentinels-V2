# Hopae Provider Integration

## Scope

Hopae Connect is an optional upstream identity verification provider. It can verify identity and return assurance, normalized user information, and provenance. It does not calculate or grant a final Cyber Sentinels Trust Score.

Cyber Sentinels remains the trust governance layer. It combines upstream identity evidence with provenance, behavioural context, session integrity, audit trails, AI-agent governance, enterprise escalation, and human review.

> Identity verification is one signal. Cyber Sentinels adds governance, evidence, session integrity and human review.

## Optional by default

`HOPAE_ENABLED=false` is the default. When disabled:

- Hopae API routes return a controlled disabled response.
- No provider API calls are made.
- Existing verification, passport, trust-report, World ID, signup, pricing, homepage, and enterprise-access workflows continue independently.
- The admin integration registry reports Hopae as safely disabled.

Credentials remain server-only. Never prefix Hopae secrets with `NEXT_PUBLIC_` or pass them to client components.

## Provider abstraction

Upstream providers normalize their result to the `UpstreamIdentityProof` contract in `lib/identity-providers/types.ts`:

```ts
type UpstreamIdentityProof = {
  provider_name: string;
  provider_type: string;
  assurance_level: number | null;
  provenance: Record<string, unknown>;
  normalized_user: Record<string, unknown>;
  verification_status: string;
};
```

Hopae-specific REST and webhook handling stays inside its adapter and routes. Downstream trust records consume the normalized upstream proof, not the provider's raw response as a final decision.

Completed Hopae verification can increase the identity-assurance component. Missing provenance limits that uplift, and every outcome remains subject to Cyber Sentinels governance and human review. A Hopae pass must never automatically approve a high-risk candidate, human, or AI agent.

## Future providers

The same abstraction can support additional upstream sources without changing the Cyber Sentinels decision model. Candidate integrations include:

- World ID
- Persona
- Okta
- EUDI Wallets
- Enterprise IAM providers

Each provider should map its native response to the normalized interface, retain source-specific evidence for auditability, and remain optional unless explicitly enabled for a deployment.
