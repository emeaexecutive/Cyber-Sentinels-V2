# Trust Explanation

Release: 0.6

## Mission

Every trust decision produced by Cyber Sentinels must be explainable to an enterprise customer.

If the trust path returns ALLOW, REVIEW, ESCALATE or BLOCK, the platform must explain why.

## Explanation Schema

The Release 0.6 explanation model includes:

- Decision
- Why
- Evidence
- Providers
- Runtime signals
- Governance policy
- Reviewed outcomes
- Trust Memory events
- Evidence Graph relationships
- Replay reference
- Timeline

The canonical implementation lives in `lib/trust-explanation/explanation.ts`.

## API

The Trust Explanation API is `/api/trust/explain`.

Supported modes:

- `GET /api/trust/explain?workflow_id=<id>&subject_type=workflow`
- `GET /api/trust/explain?demo=1`

The endpoint returns the legacy transparency fields plus the Release 0.6 `explanation` object. The demo path is deterministic and contains no customer data.

## UI

The Trust Explanation UI lives at `/trust/transparency`.

It now includes:

- Trust Explanation Card
- Trust Explanation Timeline
- Existing Trust Transparency Report
- Demo path at `/trust/transparency?demo=1`

## Decision Meaning

- ALLOW: current evidence supports continuing under policy.
- REVIEW: evidence supports accountable human review before continuation.
- ESCALATE: risk or governance state requires high-risk review.
- BLOCK: the action should stop while evidence and replay are preserved.

`step_up` and insufficient evidence states are normalized to REVIEW for the enterprise explanation layer.

## Explainability Inputs

The explanation must answer:

- Why did the trust state resolve this way?
- What evidence contributed?
- Which providers contributed?
- Which runtime signals were visible?
- Which governance policy or reviewer path applied?
- Which reviewed outcomes exist?
- Which Trust Memory events changed state?
- Which Evidence Graph relationships support the decision?

## Boundaries

Trust Explanation is not:

- Autonomous truth
- Biometric certainty
- A universal identity score
- Legal advice
- A substitute for enterprise policy or accountable human review

Provider and heuristic outputs are evidence. Governance and reviewed outcomes remain accountable control points.

## Demo

The Release 0.6 demo explains:

Human -> AI Agent -> Workflow -> Provider Evidence -> Replay -> Governance -> Trust Memory -> Decision

The demo is backed by the Evidence Graph demo and rendered through the same Trust Explanation Card and Timeline components used by real records.

## Acceptance Criteria

- API returns a Release 0.6 explanation object.
- Explanation includes evidence, providers, runtime signals, governance policy, reviewed outcomes, Trust Memory and Evidence Graph relationships.
- UI renders the explanation card and timeline.
- Demo explanation is deterministic and customer-data free.
- Tests cover decision normalization and Evidence Graph relationship inclusion.
- Build remains green.
