# Trust Journey Visualization

## Trust Progression

Cyber Sentinels now presents verification workflows as operational trust journeys. The journey view shows a chronological progression of trust score, milestones, escalations and final outcome without introducing a new scoring system or speculative AI layer.

The visualization appears on:

- `/replay/[id]`
- `/verification/receipt/[id]`
- `/trust/session/[id]`
- `/dashboard/trust-posture`

## Replay Chronology

Replay pages now frame trust history as an audit replay. Events are ordered by timestamp and include:

- verification milestones
- integrity signals
- risk events
- governance actions
- evidence retention
- replay availability
- receipt issuance

The intent is to make investigations readable for security, talent, compliance and governance stakeholders.

## Governance Transparency

Governance states are shown as first-class milestones. The standardized badge set is:

- Verified
- Elevated Risk
- Governance Review
- Session Integrity Failed
- Manual Review Required
- Replay Available
- Trusted Workforce

These badges describe operational review state. They do not automate approval, rejection or identity judgment.

## Verification Storytelling

The journey format answers the enterprise review questions:

- what happened
- what changed
- when risk appeared
- when review opened
- who or what created evidence
- whether replay is available
- whether a receipt was issued

This keeps verification storytelling grounded in evidence and review chronology rather than abstract trust language.

## Operational Trust Journey

The design is intentionally calm and audit-friendly. It avoids flashy visualizations, gaming metaphors and surveillance aesthetics. The graph uses restrained score bars, milestone cards and timestamped events so the workflow feels like enterprise governance evidence.

The journey is built from existing records already loaded by each page. No new routes, APIs, trust concepts or infrastructure were added.
