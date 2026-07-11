# Standards Readiness

Release: 0.8 Standards Foundation

## Mission

Cyber Sentinels must interoperate with emerging AI-agent identity, authorization and governance standards without hard-coding any single vendor or draft specification.

The implementation is adapter-first:

- versioned internal records
- JSON export now
- future VC adapter slot
- future JWT/JWS adapter slot
- external authorization gateway
- trust enforcement before execution
- replayable receipts and Trust Memory

## Implemented

- Agent Passport v2 in `lib/core/agent-passport-v2.ts`
- Authorization Gateway in `lib/core/authorization-gateway.ts`
- Trust Enforcement in `lib/core/trust-enforcement.ts`
- Machine Identity Trust in `lib/core/machine-identity-trust.ts`
- Live Trust Sessions in `lib/core/live-trust-session.ts`
- Provider sovereignty fields on provider readiness checks
- Evidence Graph nodes for organization, authorization and execution
- Trust Memory positioned as Enterprise Operational Memory

## Planned

- Verifiable Credential adapter
- JWT/JWS adapter
- customer-specific export policy
- provider-hosting preference controls
- standards-mapping conformance reports

## Standards-Ready

Cyber Sentinels does not implement draft ITU, IETF or vendor-specific standards as hard dependencies. Instead, the platform keeps a stable internal trust model and exposes adapter slots for future alignment.

## Limitations

- Future standards adapters are declared but not implemented.
- Provider sovereignty is readiness metadata, not a hosting guarantee.
- Authorization decisions are policy records and must be replayed.
- Trust enforcement defaults to deny when policy, nonce, timestamp, delegation or purpose validation fails.

## Demo

Verified Human -> Delegated AI Agent -> Authorization Gateway -> Trust Enforcement -> Workflow -> Replay -> Governance -> Trust Memory -> Enterprise Decision

The deterministic demo assembly lives in `lib/core/standards-readiness-demo.ts`.
