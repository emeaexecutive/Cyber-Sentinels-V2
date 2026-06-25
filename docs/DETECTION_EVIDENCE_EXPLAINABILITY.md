# Detection Evidence Explainability

## Scope

This pass adds explainability language around session and media-risk signals without turning Cyber Sentinels into a detector-only product.

No new tables, migrations or major infrastructure were added.

## Required Positioning

- Detection is one signal.
- Session integrity, evidence and governance determine the final review state.
- This is not a standalone deepfake verdict.

## Applied Surfaces

- `/demo/session-integrity`
- `/trust/session/[id]`
- `/replay/[id]`
- `/verification/receipt/[id]`
- `/dashboard/session-integrity`

## Review Language

Detection evidence should explain:

- why a session or media item was flagged
- how confidence should be interpreted
- which evidence markers support review
- whether metadata or channel integrity changed
- what an exportable investigation report should say

Confidence wording should describe review priority, evidence strength or evidence completeness. It should not imply certainty.

## Guardrails

Avoid absolute claims that state media authenticity as certain, final or guaranteed.

Investigation-style reports should state what was observed, what evidence supports the flag, what remains unresolved, who reviewed the case and which governance state determines the outcome.
