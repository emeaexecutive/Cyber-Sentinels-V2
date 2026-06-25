# Operational Realism Pass

Cyber Sentinels should feel like an enterprise operations surface, not a speculative trust concept. This pass keeps the existing architecture and focuses on practical continuity across hiring security, replay, receipts and dashboard empty states.

## Scope

- Demo flows describe concrete workflow events: candidate intake, verification start, session anomaly, governance assignment, replay chronology, reviewer action and receipt issuance.
- Hiring Security uses operational risk examples: identity inconsistency, proxy interview risk, device or channel anomalies, evidence reviewed by an analyst and governance escalation reasons.
- Replay pages emphasize read-only chronology, timestamps, reviewer action and retained evidence.
- Verification receipts are printable, enterprise-safe and audit-ready, with reviewer attribution, evidence summary, replay reference and pending-governance state.
- Dashboard empty states are explicit: no active governance escalations, no unresolved session integrity events and no replay evidence available yet.

## Language Rules

- Prefer: evidence, reviewer action, analyst review, chronology, escalation reason, session anomaly, verified email, device context, replay reference and receipt.
- Avoid: perfect detection, autonomous trust, AGI, surveillance framing, futuristic overload and unexplained AI claims.
- Keep identity verification separate from session integrity. A verified identity can still require session review.
- Keep hiring decisions separate from session containment. The platform can block or pause a risky session without making an employment judgment.
- Keep human review authoritative. Flags support review; they do not decide candidate trust.

## Enterprise States

- No active governance escalations.
- No unresolved session integrity events.
- No replay evidence available yet.
- Reviewer action pending.
- Reviewer attribution pending.
- Evidence chain preserved with timestamp and subject reference.

## Verification Receipt Standard

Receipts should answer:

- What workflow subject was reviewed?
- What evidence exists?
- What session or identity state changed?
- Who reviewed the case or what reviewer action is pending?
- What outcome was recorded?
- Where is the replay reference?
- Is any governance action still open?

## Runtime Guardrails

This pass does not add tables, weaken RLS, create public admin access or bypass email verification. It reuses existing routes, protected surfaces and runtime validation patterns.
