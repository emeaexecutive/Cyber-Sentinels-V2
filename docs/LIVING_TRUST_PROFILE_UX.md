# Living Trust Profile UX

The Living Trust Profile is a derived, tenant-scoped read model. It combines canonical identity, organization, workflow, purpose, authority lineage, credential, provider, runtime, Evidence Graph, Replay, Trust Memory™, reviewed outcome, governance and policy evidence. It does not persist a parallel posture or calculate a universal reputation score.

## Display contract

The header shows entity, workflow, purpose, requested action, policy and assessment time, followed by the notice: **Valid for this organization, workflow, purpose and assessment time.**

Eight assurance cards expose current state, reason, source, last updated time, expiry, review state and limitation. Evidence coverage is a contextual coverage indicator, not a score. Current posture, confidence band, evidence completeness, open risks, governance, reassessment, source references, limitations and recommended action remain visible or progressively disclosed.

Authority displays active, constrained, awaiting approval, expired, revoked, suspended or insufficient state plus delegator, delegate, resource scope, permitted/prohibited actions, delegation depth, expiry, policy and last runtime reassessment. Secrets and unnecessary identity data are never displayed.

Trust evolution is sourced from Trust Memory only. Each item exposes previous/new posture, reason, evidence, authority impact, policy, actor or reviewer, Replay reference and timestamp. Missing attribution stays `Not recorded`; unexplained numerical fluctuation is not rendered.

## Responsive and accessible behavior

- Semantic headings, lists, definition lists and native `details` controls support keyboard navigation.
- A screen-reader summary describes contextual posture, assurance coverage and authority state.
- Status text and boundaries carry meaning independently of colour.
- Cards move from one to two to four columns across mobile, tablet and desktop.
- The static contextual coverage ring has an accessible label and no required animation.
- Global reduced-motion rules disable non-essential transitions.
