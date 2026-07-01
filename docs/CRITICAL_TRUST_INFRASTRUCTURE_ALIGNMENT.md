# Critical Trust Infrastructure Alignment

## Scope

This alignment extends existing Cyber Sentinels routes, tables, APIs, and evidence views. It does not add duplicate registries, posture systems, session routes, or receipt tables. Existing authentication and row-level security remain in force.

## What already existed

- AI agent surfaces: `/agents`, `/agents/[id]`, `/agent-registry`, `/agent-registry/[id]`, `/api/agents/*`, `ai_agents`, `agent_activity`, trust timeline, and audit records.
- Continuous posture: `/trust/posture`, `/dashboard/trust-posture`, `/api/trust/posture`, passport posture, session checks, verification signals, governance actions, and timeline events.
- Session integrity: `/verify/session`, `/dashboard/session-integrity`, `/trust/session/[id]`, `/api/session/integrity`, and `/api/verification/signals`.
- Evidence reporting: verification receipts, evidence chains, replay chronology, governance actions, provider evidence normalization, JSON receipt APIs, and print/PDF-ready receipt views.
- Synthetic-identity review context: identity state, media-risk signals, provider evidence, provenance, session integrity, governance queues, and replay.

## What was added or refined

### AI agent identity

The existing `ai_agents` table is extended safely with:

- `verified_agent_name`
- `owner_organization`
- `registry_status`
- `identity_claims`
- `trust_lineage`
- `last_trust_recalculation_reason`

The existing agent API accepts these fields. The existing registry detail view now exposes verified name, owner organization, registry status, identity claims, trust lineage, recalculation reason, and audit history. Identity claims remain declared or evidence-supported review context; they are not automatically treated as verified.

### Continuous trust posture

The existing posture model now states:

- subject coverage for humans, agents, and systems
- context-shift alerts
- governance review state
- an explainable trust recalculation reason

Human posture is represented by existing passport records, agent posture by `ai_agents`, and system posture by session/workflow integrity records. No new posture table was introduced.

### Session and injection integrity

Existing signals retain the operator-facing labels:

- Live Presence
- Deepfake Risk
- Injection Risk
- Device / Channel Integrity
- Manual Review Required

Virtual-camera risk, frame integrity, and device attestation are present only as explicit pending provider placeholders. They do not produce an authenticity or fraud conclusion.

### Synthetic identity risk

The existing evidence report now groups:

- document risk
- identity conflict checks
- provenance status
- provider evidence
- escalation queue state

Missing evidence is shown as not assessed or unverified. The interface does not claim confirmed fraud without retained provider evidence and a governance decision.

### Evidence reporting

The existing receipt is labeled as an **Evidence Report** and includes:

- signed-summary structure with issuer attribution
- chain-of-custody notes
- provenance status
- evidence timeline
- JSON export link
- print/PDF-ready presentation

The report explicitly avoids “legal proof” and “confirmed fake” language. A cryptographic signature is asserted only when a stored signature reference exists.

## Provider credentials required

Live virtual-camera detection, frame-integrity analysis, device attestation, document verification, biometric/liveness verification, and upstream identity-provider evidence require configured provider credentials, documented adapters, and retained response references. Without them, Cyber Sentinels fails closed to pending, unverified, or manual-review states.

## Placeholders

- Virtual camera risk
- Frame integrity
- Device attestation
- Any document-risk or identity-conflict field without provider evidence

Placeholder values are clearly identified and never converted into an automated final trust decision.

## Future validation

- Apply the migration in a controlled Supabase environment and verify existing rows receive safe defaults.
- Validate provider-specific schemas and signature references before presenting cryptographic signing status.
- Test document-risk and identity-conflict mappings with credentialed provider fixtures.
- Benchmark session signals independently; do not publish accuracy claims without external validation.
- Verify JSON and print/PDF report output with representative enterprise workflows.
- Review registry status transitions and trust recalculation reasons with governance operators.

## Security boundary

The migration adds columns and updates an existing signal-category constraint only. It creates no new table and does not loosen grants, authentication, ownership filters, or RLS policies.
