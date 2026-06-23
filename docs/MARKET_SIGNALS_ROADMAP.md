# Market Signals Roadmap

Cyber Sentinels aligns with a market shift away from one-time identity checks and toward continuous operational trust. The roadmap should stay practical: refine existing Hiring Security, Session Integrity, Trust Posture, Governance Review, receipts and replay before adding new infrastructure.

## Market Signals

### Continuous Identity For Humans, Machines And AI Agents

Identity is becoming continuous. Humans, machines and AI agents may enter the same workflow, create evidence, request access, trigger actions or influence decisions. Cyber Sentinels should remain the governance layer that tracks what changed, what evidence exists, who reviewed it and whether trust needs to be refreshed.

Current alignment:

- `/trust/posture` and `/dashboard/trust-posture` show continuous trust posture over existing verification, session and governance records.
- `/agents` and `/trust/agent/[id]` preview AI agent identity and authorization lineage as staged direction, not a live runtime control system.
- Verification receipts and replay provide explainable proof once activity has occurred.

### Hiring Security / Synthetic Applicant Defense

Hiring Security remains the primary commercial wedge. Enterprise buyers can immediately understand synthetic applicants, proxy interviews, stolen identities, AI-assisted interview fraud and downstream enterprise access risk.

Current alignment:

- `/enterprise/hiring-security` explains the wedge and operational examples.
- `/dashboard/interview-risk` surfaces active flags, candidate/recruiter context, session integrity and governance escalation.
- `/trust/hiring-report/[id]` and receipts/replay provide proof for review.

### Session Integrity / Injection Risk Separation

Identity verification, liveness, deepfake risk, injection risk, channel integrity and session anomalies must remain separate reviewable signals. A verified identity is not the same as a trustworthy session.

Current alignment:

- `/dashboard/session-integrity` reviews separate session signals.
- `/verify/session` records liveness, deepfake risk, injection risk, channel integrity and anomaly values separately.
- `/trust/session/[id]` keeps identity verification state, session integrity state and human review decision visible.

### AI Transparency And Provenance Compliance

Regulatory and enterprise pressure increasingly requires explainable AI context, provenance, audit trails and human accountability. Cyber Sentinels should avoid claiming to be the provenance provider of record unless integrations are complete. The strongest position is governance over evidence and provenance providers.

Current alignment:

- Trust replay reconstructs chronology, evidence, decisions, audit references and summaries.
- Verification receipts provide printable/exportable proof.
- Governance review preserves reviewer action and escalation state.

### Proof-of-Human Provider Abstraction

The market is fragmenting across liveness, identity, human-presence, provenance and credential providers. Cyber Sentinels should sit above these providers as the operational trust layer, not compete with every provider.

Roadmap alignment:

- Keep provider-backed liveness and proof-of-human checks behind a provider abstraction layer.
- Store provider outputs as evidence/signals rather than hard-coded truth.
- Preserve human review, receipt and replay regardless of provider source.

## Existing Feature Alignment

| Route | Status | Alignment |
| --- | --- | --- |
| `/enterprise/hiring-security` | Implemented | Primary commercial wedge for synthetic applicant defense, proxy interviews and enterprise access risk. |
| `/dashboard/interview-risk` | Implemented | Active hiring integrity dashboard with candidate, recruiter, risk event, session and governance context. |
| `/dashboard/session-integrity` | Implemented | Separates liveness, deepfake risk, injection risk, channel integrity and anomaly states. |
| `/trust/posture` | Implemented | Continuous trust posture over context changes, reverification and governance review. |
| `/agents` | Partial / roadmap | AI agent identity concept, positioned as staged governance direction. |
| `/trust/agent/[id]` | Partial / roadmap | Concept agent profile for ownership, signed activity and authorization lineage. |
| `/verify/session` | Implemented | Session integrity review form for separate signal capture. |
| `/trust/session/[id]` | Implemented | Session trust review with separate verification states and human review decision. |

## Controlled Future Roadmap

These are staged roadmap items, not all live production claims:

1. Continuous Trust Posture
2. AI Agent Authorization Lineage
3. Proof-of-Human Providers
4. AI Transparency / Provenance Compliance
5. Provider Abstraction Layer

## Roadmap Discipline

Do not duplicate routes or tables for these signals. Refine existing proof, posture, replay, receipt, governance, hiring and session integrity surfaces first. Build new infrastructure only when a customer workflow proves that the existing surfaces cannot represent the needed evidence, review or audit state.