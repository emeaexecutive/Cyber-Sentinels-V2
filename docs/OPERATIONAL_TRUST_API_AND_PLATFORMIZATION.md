# Operational Trust API and Platformization

## Platform strategy

Cyber Sentinels provides operational trust infrastructure for workflows,
identities and intelligent systems. The platform layer exposes existing trust
memory through authenticated, read-only projections rather than creating a
parallel scoring or data system.

The initial API surface covers:

- `GET /api/trust/posture?workflow_id=...`
- `GET /api/workflows/{id}/trust`
- `GET /api/replay/{id}`
- `GET /api/receipts/{id}`
- `GET /api/governance/events?workflow_id=...`

## API philosophy

API responses explain what changed, why posture changed, which evidence
contributed and how governance affected the result. Trust is contextual and
probabilistic. Human review remains authoritative.

All endpoints require an authenticated session and query through the existing
Supabase client, so row-level security remains the access boundary. Responses
use explicit field allowlists. Raw evidence snapshots, provider payloads,
credentials, secret keys and tokens are never returned.

## Replayable trust evidence

Replay is the canonical operational evidence chronology. The replay endpoint
links normalized provider evidence, timeline events, evidence-chain summaries,
governance lineage, posture and verification receipts. Receipt responses include
portable evidence and deterministic continuity checks without claiming
cryptographic proof or absolute authenticity.

## Workflow trust interoperability

The workflow endpoint provides one stable representation of:

- current explainable posture;
- chronological trust transitions;
- evidence continuity;
- normalized provider-backed signals;
- governance actions and reviewer attribution;
- replay and receipt references.

This representation can support enterprise workflow integrations without
exporting internal provider payloads.

## Governance continuity

Governance events are workflow-scoped, chronological and human-reviewable.
Assignments, outcomes and resolution notes remain linked to the workflow. An
API consumer can observe governance state but cannot use these read endpoints to
bypass or silently replace reviewer authority.

## SDK and ecosystem direction

`lib/sdk` contains a small client for the five read endpoints and typed event
envelopes for future workflow callbacks. Proposed event names cover trust-state
updates, governance actions, issued receipts and available replay.

Webhook delivery, signing, retries, customer API keys and callback registration
are intentionally not implemented yet. Those require a scoped credential and
tenant-isolation design before production use.

## Ethical and security boundaries

- No hidden capture, behavioral surveillance or universal person scoring.
- No speculative autonomous authority or fabricated AI certainty.
- No weakening of authentication or row-level security.
- No raw provider secrets or sensitive payloads in API responses.
- No webhook delivery until consent, tenant scope, signatures and retention are
  defined.

