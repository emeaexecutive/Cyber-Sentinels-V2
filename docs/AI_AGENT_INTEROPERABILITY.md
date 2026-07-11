# AI Agent Interoperability

Release: 0.8 Standards Foundation

## Agent Passport v2

Agent Passport v2 adds:

- `passportVersion`
- `credentialFormat`
- `credentialIssuer`
- `jurisdiction`
- `governanceStatus`
- `humanOversightStatus`
- `delegationLimits`
- `revocationStatus`
- `schemaVersion`
- `exportFormats`

JSON export is implemented. Future VC and JWT/JWS adapters are represented as planned export formats.

## Machine Identity Trust

Machine identities are first-class:

- service accounts
- API keys
- OAuth clients
- certificates
- key rotation
- credential lineage
- linked AI agent
- linked workflow
- risk posture
- rotation history

## Provider Sovereignty

Every provider readiness record exposes:

- deployment mode
- restricted data support
- customer-owned memory compatibility
- provider shutdown risk
- export support

## Evidence Graph Alignment

The standards-ready graph connects:

Human -> Organization -> AI Agent -> Machine Identity -> Credential -> Workflow -> Authorization -> Execution -> Evidence -> Replay -> Governance -> Trust Memory

Every relationship is explainable and secret-safe.

## Boundary

Cyber Sentinels is the operational trust control plane and independent trust decision layer. It avoids proprietary lock-in by keeping provider, credential and standards adapters replaceable.
