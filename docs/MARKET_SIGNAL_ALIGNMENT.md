# Market Signal Alignment

Cyber Sentinels is positioned as operational trust infrastructure above identity, liveness, provenance and proof-of-human providers. The product should not overbuild provider infrastructure prematurely. It should organize provider outputs, session events, evidence, governance review and replayable audit trails into a workflow enterprise teams can understand.

## Implemented Now

- Hiring Security as the primary commercial wedge through `/enterprise/hiring-security` and `/dashboard/interview-risk`.
- Session Integrity through `/dashboard/session-integrity`, `/verify/session` and `/trust/session/[id]`.
- Continuous Trust Posture through `/trust/posture` and `/dashboard/trust-posture`.
- Governance review through existing governance actions and review queues.
- Verification receipts and replayable audit trails through trust receipts and replay views.
- Separate session signals for liveness, deepfake risk, injection risk, channel integrity and anomalies.

## Partially Implemented

- AI agent identity through `/agents` and `/trust/agent/[id]` as concept/roadmap surfaces.
- AI Agent Authorization Lineage as a positioning layer around owner, organization, declared scope, signed activity and human accountability.
- Proof-of-human provider abstraction as a direction supported by existing provider/integration thinking, but not yet a complete production provider layer.
- AI transparency and provenance compliance as evidence, receipt, replay and governance workflows rather than a dedicated compliance automation product.

## Deferred

- Full provider abstraction layer across identity, liveness, human-presence and provenance providers.
- Production-grade proof-of-human provider marketplace.
- Runtime AI agent control, delegated permissions or autonomous enforcement.
- Standalone AI transparency compliance module.
- New tables or routes for roadmap items unless existing trust, session, receipt, replay or governance surfaces cannot represent the workflow.

## Why Cyber Sentinels Sits Above Providers

Identity and provenance providers answer narrow questions: whether an identity check passed, whether media appears manipulated, whether a credential is valid or whether a piece of content has provenance metadata. Enterprise trust decisions need more context.

Cyber Sentinels sits above providers as the governance layer:

- It keeps provider outputs as evidence and signals, not final truth.
- It separates identity verification from session integrity and trust posture.
- It gives human reviewers the chronology, evidence and escalation context they need.
- It preserves receipts and replay so decisions can be explained later.
- It supports provider flexibility without rewriting the enterprise workflow each time a new provider is added.

This keeps the product credible: Cyber Sentinels does not need to be every identity, liveness or provenance provider. It needs to make those signals operationally reviewable, governable and auditable.

## Roadmap Lock

Near-term work should improve clarity and confidence in existing routes. The roadmap remains controlled:

- Continuous Trust Posture
- AI Agent Authorization Lineage
- Proof-of-Human Providers
- AI Transparency / Provenance Compliance
- Provider Abstraction Layer

These should be described as staged capabilities until provider integrations, customer workflows and governance evidence prove they are ready for production claims.