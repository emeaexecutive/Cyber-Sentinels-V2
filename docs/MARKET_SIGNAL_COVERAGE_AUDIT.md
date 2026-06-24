# Market Signal Coverage Audit

Date: 2026-06-24

## Summary

Cyber Sentinels already covers the current market signals needed for a demo or pilot through existing trust posture, hiring security, session integrity, governance, replay, receipt, and provider integration surfaces. No new tables, APIs, or speculative routes are recommended from this audit.

The only product change made with this audit was public navigation compression: the prominent public nav now stays focused on Platform, Hiring Security, Session Integrity, Governance, Demo, Pricing, and Enterprise Access.

## Covered Now

### Continuous Identity / Agent Trust

Current routes:

- `/agents`
- `/agents/[id]`
- `/trust/posture`
- `/dashboard/trust-posture`

Coverage:

- Continuous trust posture is explained as an operational state rather than a one-time identity check.
- Agent risk is represented through owner, provider, model, status, permission scope, trust score, trust history, permissions, and governance records.
- Governance review remains visible as the review layer for elevated risk and agent activity.
- Protected agent detail views enforce ownership or admin access before rendering operational records.

Assessment: covered for demo and pilot readiness. The public `/agents` surface remains appropriately strategic, while protected detail and posture pages carry the operational evidence model.

### Hiring Security

Current routes:

- `/enterprise/hiring-security`
- `/verify/candidate`
- `/verify/recruiter`
- `/interview/session/[id]`
- `/dashboard/interview-risk`

Coverage:

- Fake applicants, proxy interviews, stolen identities, AI-assisted interview fraud, injected sessions, and recruiter verification are represented.
- Candidate identity, recruiter identity, profile consistency, liveness, interview-session integrity, and governance escalation are described as separate review inputs.
- Voice and video mismatch concerns are present as review flags instead of binary accusations.
- Human governance review remains the decision layer before relying on a workflow outcome.

Assessment: covered. Existing wording is aligned with calm enterprise audit language and avoids claims that AI guarantees trust.

### Session Integrity

Current routes and APIs:

- `/verify/session`
- `/trust/session/[id]`
- `/dashboard/session-integrity`
- `/api/session/integrity`
- `/api/session/risk`

Coverage:

- Liveness, deepfake risk, injection risk, device or channel integrity, and session anomaly risk are modeled as separate explainable signals.
- Session verification records can persist integrity checks, verification signals, injection risk events, and device or channel evidence.
- Session risk APIs return flagged signals and manual-review state without treating any single signal as proof of identity or trust.
- Dashboard review keeps channel failures, injection flags, liveness, deepfake risk, and anomaly review separate.

Assessment: covered. No duplicate session-integrity route or API is needed.

### Proof-of-Human Providers

Current surfaces:

- Integration registry
- Runtime validation checks
- Admin integrations review
- Hopae helper and webhook/event handling
- World ID status handling

Coverage:

- World ID and Hopae are treated as optional proof or upstream eID providers.
- Missing World ID, Hopae, OpenAI, Stripe, Turnstile, and email configuration is represented as warnings or disabled states, not public-app blockers.
- Hopae can remain safely disabled until credentials and `HOPAE_ENABLED=true` are present.
- Cyber Sentinels remains the decision and governance layer rather than delegating trust decisions to a provider.

Assessment: covered for provider abstraction and runtime safety. Deeper provider workflows should wait for real pilot requirements.

### Navigation

Prominent public navigation now keeps only:

- Platform
- Hiring Security
- Session Integrity
- Governance
- Demo
- Pricing
- Enterprise Access

Assessment: covered. Lower-priority, experimental, or auth utility routes remain accessible by URL or workflow entry points, but are not emphasized in the public nav.

## Partially Covered

### AI Transparency / Provenance

Current routes and APIs include provenance/media review surfaces such as:

- `/verify/provenance`
- `/trust/media/[id]`
- `/api/provenance`
- `/api/provenance/verify`
- `/api/provenance/report/[id]`

Coverage:

- Media provenance, metadata, watermark, upload-chain context, evidence chain, audit activity, signals, timelines, and governance review are present.
- The current copy correctly positions provenance and detection as signals, not authenticity guarantees.
- API behavior records governance actions, trust cases, receipt bundles, and replay context on a best-effort basis where available.

Assessment: partially covered and intentionally lightweight. This should remain a roadmap/provider-abstraction surface for now, not a full compliance dashboard.

### Continuous Agent Operations

Coverage:

- Agent posture, owner accountability, provider/model context, permissions, and governance review are represented.
- Full runtime agent control, automated policy enforcement, and continuous machine-to-machine authorization are not built out.

Assessment: partially covered by design. The current approach is enough for market signal coverage without overbuilding speculative infrastructure.

## Deferred

The following should remain deferred unless a real pilot, runtime error, or customer workflow proves the need:

- New tables for market-signal coverage.
- Duplicate trust posture, session-integrity, provenance, or governance APIs.
- A full AI compliance dashboard.
- A generalized proof-of-human provider orchestration layer.
- Runtime agent control infrastructure.
- Public navigation expansion for experimental concepts.

## No-Build Decision Rationale

The platform already expresses the relevant market signals through existing routes, APIs, dashboards, and governance review language. Adding major infrastructure now would create unnecessary route duplication, schema surface area, and product clutter.

The best current decision is to preserve the existing architecture, keep provider integrations warning-based when optional configuration is missing, and use the existing evidence, chronology, receipt, replay, dashboard, and governance surfaces for demo and pilot conversations.

Runtime validation for this audit:

- `npm run build`
- `git status`
