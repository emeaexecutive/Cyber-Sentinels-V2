# RC4 Provider Reality

## External maturity vocabulary

Provider-facing readiness uses only:

- `Live` — a production-candidate adapter completed a successful real check with normalization, timeout handling and audit evidence;
- `Test` — an implemented adapter is executing in a controlled or non-production mode;
- `Awaiting Credentials` — an implemented path cannot execute because required server-side configuration is absent;
- `Prototype` — an adapter shape or normalization contract exists, but an endpoint-specific production path does not;
- `Disabled` — the path is intentionally unavailable.

Timeout, failure and degradation remain internal runtime telemetry. They are not additional provider maturity states.

## Adapter audit

| Adapter | RC4 maturity | Implemented evidence | Remaining blocker |
| --- | --- | --- | --- |
| Hopae Connect | Production candidate; Awaiting Credentials in this checkout | Authenticated session start, bounded provider request, signed and timestamped callback, idempotency, status re-fetch, normalization, evidence-quality gate, authority/policy evaluation and atomic Replay/Graph/Memory/receipt persistence | Sandbox or production credentials, applied migration, successful target-environment run and reviewed pilot outcome |
| Cloudflare Turnstile | Test or Awaiting Credentials | Server-form bot protection when configured | Deployment health and form-specific evidence; never identity proof |
| Supabase Auth | Test or Awaiting Credentials | Session authentication and tenant-scoped application access | Successful deployed health plus RLS denial-path evidence |
| Reality Defender | Prototype | Credential check, supported-signal and normalized-result contract | Endpoint-specific call, data-egress review and reviewed outcomes |
| Sensity | Prototype | Credential and normalized-result contract | Endpoint-specific call and reviewed media dataset |
| Pindrop | Prototype | Voice-signal adapter contract | Endpoint-specific call and reviewed voice dataset |
| Document Forensics | Prototype | Document-risk adapter contract | Approved provider endpoint and reviewed document dataset |
| Onfido | Prototype | Registry and detection adapter contracts | Endpoint-specific implementation and restricted-data review |
| Veriff | Prototype | Detection adapter contract | Endpoint-specific implementation and reviewed identity workflow |
| World ID | Prototype | Proof-of-personhood registry and adapter contracts | Workflow-specific proof exchange and reviewed evidence |
| Stripe Identity | Prototype | Identity registry and adapter contracts | Workflow-specific session implementation and reviewed evidence |
| C2PA | Prototype | Provenance adapter contract | Supported-media verification and reviewed conflict cases |
| SynthID | Prototype | Provenance adapter contract | Supported-media verification and reviewed coverage |
| Persona | Prototype | Disabled registry blueprint | Endpoint, workflow, audit and privacy design |
| Entrust | Prototype | Disabled registry blueprint | Endpoint, workflow, audit and restricted-data design |
| Fingerprint / device risk | Prototype | Disabled registry blueprint | Consent, privacy, endpoint and replay design |
| External unattributed source | Disabled | Safe fallback rejects unsupported provider identity | A recognized provider identifier is required |

## Production-candidate path

Hopae Connect is the one complete production-candidate provider path. A successful request in a production-configured environment is labelled `Live`; sandbox execution is `Test`; missing configuration is `Awaiting Credentials`. No current environment evidence is promoted to Live by source inspection alone.

The generic provider-status control that merely echoed configuration was removed. Provider status now shows recorded evidence and limitations without pretending to execute a connection test.
