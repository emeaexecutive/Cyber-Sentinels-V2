# Decision Intelligence

Release: 0.7

## Purpose

Decision Intelligence turns trust decisions into enterprise decisions. The goal is not to expose raw algorithm output. The goal is to answer:

- Why?
- Why now?
- Why this confidence?
- Why this evidence?
- Why this governance action?
- Why not another outcome?

The canonical implementation is `lib/core/decision-intelligence.ts`.

## Decision Lifecycle

Every decision record moves through:

Event -> Evidence -> Decision -> Governance -> Trust Memory -> Final Outcome

The lifecycle is rendered by the Decision Intelligence Timeline and returned by the trust explanation API as `decisionIntelligence.timeline`.

## Decision Record

Every generated record includes:

- `decision`
- `confidence`
- `decision_summary`
- `primary_reasons`
- `supporting_evidence`
- `runtime_factors`
- `provider_inputs`
- `governance_inputs`
- `trust_memory_inputs`
- `evidence_graph_inputs`
- `limitations`
- `recommended_next_action`

## Evidence Lifecycle

Evidence remains a referenceable input. It is counted, linked to replay when available and connected to Evidence Graph relationships. Evidence is not treated as autonomous truth.

## Provider Contribution

Provider results must show one of:

- Used
- Ignored
- Unavailable
- Timed Out
- Awaiting Credentials

Provider limitations are never hidden. Credential presence does not prove production readiness, and provider output remains evidence for review rather than a final decision.

## Replay Contribution

Replay explains why the decision exists now. Replay availability is shown on the Enterprise Decision Card and retained in the lifecycle timeline.

## Governance Contribution

Governance inputs explain which policy or reviewer path shaped the result. Governance status is displayed on the card and included in the decision lifecycle.

## Trust Memory Contribution

Reviewed outcomes and Trust Memory events improve:

- future explanations
- future confidence context
- future governance recommendations

They do not automatically change enterprise policy.

## Evidence Graph Contribution

Decision Intelligence includes the Evidence Graph relationships that influenced the outcome. These relationships explain how identities, workflows, evidence, replay, governance and Trust Memory connect.

## Enterprise UX

Dashboards should answer:

- What happened?
- Why?
- What should I do?

The Enterprise Decision Card displays decision, confidence, top reasons, evidence count, replay availability, governance status, human review status and next recommended action. Raw algorithm output should stay out of dashboard cards.

## Demo

The demo path is `/trust/transparency?demo=1`.

It shows:

Human -> AI Agent -> Workflow -> Decision -> Explanation -> Replay -> Governance -> Trust Memory

## Known Limitations

- Decision Intelligence explains recorded evidence; it does not make legal or identity certainty claims.
- Provider output requires reviewed validation before accuracy claims.
- Reviewed outcomes can improve future recommendations, but policy changes remain accountable governance actions.
- Missing replay, missing evidence and unavailable providers must remain visible.

## Acceptance Criteria

- API returns `decisionIntelligence`.
- UI renders the Enterprise Decision Card and Decision Intelligence Timeline.
- Provider inputs expose Used, Ignored, Unavailable, Timed Out or Awaiting Credentials.
- Trust Memory inputs state that reviewed outcomes do not automatically change policy.
- Evidence Graph relationships influence the explanation.
- Demo is deterministic and customer-data free.
- Typecheck, acceptance tests and production build pass.
