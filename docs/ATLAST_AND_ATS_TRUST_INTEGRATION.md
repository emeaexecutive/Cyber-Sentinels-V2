# Atlast and ATS Trust Integration

## Positioning

> Atlast runs hiring. Cyber Sentinels verifies trust inside hiring workflows.

Cyber Sentinels is the hiring trust layer above recruiting systems: a candidate
provenance layer, interview integrity layer, and replay/evidence layer. It does
not replace the ATS or make hiring decisions. It connects recorded verification
evidence, trust posture, replay chronology, receipts, and human governance to
the workflow identifiers an ATS already owns.

## Atlast research summary

Research checked on 28 June 2026 found Atlast's official public site at
<https://www.atlasthq.com/>. The site describes Atlast as an AI recruiting
operating system that runs sourcing, screening, scheduling, refinement,
engagement, and onboarding. It also says Atlast can work on top of an existing
ATS or provide a light ATS.

No public Atlast developer API reference, webhook schema, authentication
specification, or integration credentials were found in the reviewed public
material. Cyber Sentinels therefore treats Atlast as:

- **Status:** Placeholder
- **Readiness:** Awaiting API documentation and credentials
- **Live connectivity:** Not claimed

The product name is `Atlast`; it is not normalized to a separate provider named
`Atlas`.

## Integration strategy

The generic adapter keeps provider payloads outside the trust domain. A signed
provider event is normalized into a small event contract, linked to an existing
candidate or interview workflow, and recorded in operational chronology.
Cyber Sentinels can then prepare or perform bounded trust actions:

1. create or update the candidate verification workflow;
2. calculate contextual trust posture from recorded state;
3. attach an existing replay link;
4. generate or attach a verification receipt only when evidence exists;
5. escalate a human governance review when policy requires it.

Missing evidence, receipts, and replay records remain missing. The adapter does
not manufacture success states or placeholder proof.

## Supported events

- `candidate.created`
- `candidate.updated`
- `interview.scheduled`
- `interview.completed`
- `offer.created`
- `verification.requested`

The generic receiver is `POST /api/integrations/ats/webhook`. It requires a
supported provider, a supported event type, and a valid HMAC-SHA256 signature
over the exact raw request body. Providers without a configured secret fail
closed. Atlast currently fails closed because its provider-specific contract
has not been documented.

## Provider status meanings

- **Connected** — credentials and an export endpoint exist and
  `ATS_<PROVIDER>_API_VERIFIED=true` explicitly records that provider-side API
  access was validated.
- **Webhook configured** — signed inbound delivery is configured, but outbound
  API access is not connected.
- **Awaiting API credentials** — enablement was requested but credentials are
  missing.
- **Placeholder** — only the adapter boundary exists; no live integration is
  claimed.
- **Disabled** — the provider was explicitly disabled.

Secret values are server-only and are never rendered in the admin UI, returned
by integration APIs, or written into audit metadata.

## Why Cyber Sentinels sits above the ATS

An ATS remains the system for jobs, candidates, stages, interviews, and offers.
Cyber Sentinels preserves the separate trust questions around those records:
where candidate claims came from, what interview integrity evidence changed,
which reviewer acted, why governance escalated, and what replayable evidence
supports a receipt. This separation keeps the integration portable and keeps
trust state explainable without weakening ATS ownership or Cyber Sentinels
auth and RLS.

## Future Atlast API checklist

Before changing Atlast from Placeholder:

- obtain official developer documentation and account credentials;
- verify the canonical API base URL and authentication method;
- document webhook event names, signing algorithm, timestamp tolerance, and
  replay protection;
- map candidate, application, job, interview, offer, and tenant identifiers;
- confirm API scopes, rate limits, pagination, retry guidance, and idempotency;
- confirm data residency, retention, deletion, and audit requirements;
- validate a sandbox or test tenant with provider-approved payloads;
- define receipt/replay write-back fields and URL constraints;
- add contract fixtures and signature tests using non-secret test values;
- complete security and privacy review;
- set the provider-specific verification flag only after end-to-end validation.

Greenhouse, Lever, Workday, Ashby, and SmartRecruiters use the same generic
boundary until their provider-specific contracts are implemented and verified.
