# Stage 3 Trust Journey And Replay Proof

## Scope

Stage 3 makes verification trust visible without adding new infrastructure. The work reuses the existing replay, receipt, trust posture and session integrity surfaces.

## Surfaces

- `/replay/[id]`
- `/verification/receipt/[id]`
- `/trust/receipt/[id]`
- `/dashboard/trust-posture`

## Journey Stages

Each journey view presents the same audit progression:

1. Identity submitted
2. Human presence checked
3. Session integrity checked
4. Injection risk reviewed
5. Governance review opened
6. Manual review completed
7. Receipt issued

## Proof State

The journey graph shows five operational proof fields:

- current verification state
- risk level
- last evidence event
- reviewer action
- final outcome

## Chronology

Replay and receipt chronology should stay readable for enterprise review. Timeline rows should prefer clear timestamps, evidence labels, flags, reviewer actions and trust state changes over abstract scores or automatic conclusions.

## Safety Boundaries

- No new tables.
- No RLS changes.
- No auth weakening.
- No secrets or `.env.local` changes.
- No claim that AI guarantees trust.
- No gamified scoring language.

## Product Language

Use calm audit language:

- Verification Evidence
- Session Integrity
- Governance Review
- Replay Evidence
- Receipt issued
- Human review recorded

Avoid language that implies automatic trust decisions, perfect detection or black-box authenticity judgments.
