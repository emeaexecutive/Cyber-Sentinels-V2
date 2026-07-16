# Admin Fake Actor Enforcement

## Purpose

Cyber Sentinels gives authorized administrators a controlled workflow for reviewing candidates and sessions with elevated synthetic-actor or integrity risk. The system does not publish accusations, invite public reporting or claim perfect fake detection.

Queue records are assembled from existing candidate, session, provider-signal, replay, receipt and governance evidence. A record appearing in the queue means the available evidence requires review; it does not establish that a person committed fraud.

## Admin workflow

The protected routes `/admin/fake-actors` and `/admin/fake-actors/[id]` require an authenticated, allowlisted administrator and the existing verified admin-access cookie.

An administrator can:

- block workflow access;
- remove an actor from the current workflow;
- mark the review as a false positive;
- escalate the record to governance review;
- report the matter internally;
- export a bounded evidence summary.

Each enforcement action requires a reviewer note. The action records the administrator, timestamp, prior state, workflow reference and evidence references.

## Evidence preservation

Blocking or removing an actor preserves current evidence and review continuity while tenant retention policy applies. Approved deletion or redaction creates an auditable tombstone instead of silently rewriting history. The enforcement service:

1. appends an admin audit event;
2. creates a governance action;
3. updates the candidate or session operational state;
4. retains references to replay, receipt, provider summaries and session-integrity evidence.

The audit snapshot includes normalized provider summaries, not raw provider output. Provider secrets, credentials, identity documents and raw sensitive payloads are excluded from the API and export.

## Status model

The operator-facing states are:

- **Under Review**
- **Blocked**
- **Removed From Workflow**
- **False Positive**
- **Governance Escalated**
- **Evidence Preserved**

“Confirmed Fake” and “Fraudster” are intentionally excluded. A provider signal or risk score is review context, not an absolute identity conclusion.

## False positive handling

Marking a record as a false positive resolves the current governance action and lowers the active workflow risk state. It does not erase the original signal, audit history or reviewer rationale. This preserves accountability and makes later review possible without continuing to treat the actor as blocked.

## Governance escalation

Escalation creates a governance action assigned to the acting administrator with an `escalated` state. Replay, receipt, provider summaries and session-integrity references remain available to the governance reviewer. Human review remains authoritative.

## Protected API surface

The following routes use the same admin guard as other protected operational tools:

- `GET /api/admin/fake-actors`
- `POST /api/admin/fake-actors/[id]/block`
- `POST /api/admin/fake-actors/[id]/remove`
- `POST /api/admin/fake-actors/[id]/report`
- `POST /api/admin/fake-actors/[id]/false-positive`
- `POST /api/admin/fake-actors/[id]/escalate`
- `POST /api/admin/fake-actors/[id]/export`

No route is public. Responses exclude raw provider secrets and the UI does not link the enforcement queue from a public surface.

## Legal and safety language

Operators should use:

- “Based on available evidence”
- “Requires governance review”
- “Evidence preserved”
- “Workflow access blocked”

The system avoids absolute claims because provider results, session anomalies and identity evidence remain probabilistic and contextual. Final decisions require documented governance authority and an auditable rationale.
