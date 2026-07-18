# Enterprise pilot lifecycle

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Purpose

The pilot validates one consequential workflow with named ownership, approved evidence boundaries, explainable decisions, Replay continuity and rollback. It is evidence gathering, not production certification, provider readiness, compliance approval or an accuracy guarantee.

Current public ownership is split across `/enterprise/pilot`, `/enterprise/pilot-checklist` and `/enterprise-access?intent=pilot`. Protected execution and readiness evidence lives in `/enterprise/pilot-setup`, `/admin/pilot-overview`, `/enterprise/readiness` and operational dashboards.

## Lifecycle

| Phase | Customer objective | Current product evidence | Exit condition | Current gap/state |
| --- | --- | --- | --- | --- |
| Discovery | Select one consequential workflow, decision and accountable sponsor | Buyer Documentation and Enterprise Access form | Problem, owner, purpose and stakeholders recorded | Request records exist; no CRM/product analytics workflow is active |
| Technical Validation | Agree architecture, auth, authority, evidence, failure and data boundaries | Platform, developer docs, security page, pilot checklist | Architecture/security owners accept the bounded design | Deployed security and tenant-denial evidence remains required |
| Identity Provider Integration | Select and configure only the approved provider | Provider abstraction, readiness registry, admin provider status | Credentials, environment, callback, normalization and real health check pass | Hopae path is implemented; retained credentialed target evidence may be absent |
| Pilot Deployment | Configure staging tenant, workflow, policy, reviewers, retention and rollback | Pilot setup, workspace and governance surfaces | Controlled environment and owners are operational | Protected setup depends on customer configuration and applied migrations |
| Operational Verification | Exercise allow, step-up/review, escalate, block and dependency-failure paths | Dashboard, governance, Replay, receipts, platform health | Required cases retain decision, evidence, authority, Replay and owner | Representative reviewed cases and durable operational samples are not guaranteed |
| Trust Reporting | Review portable decision and limitation evidence | Trust Transparency, receipts, JSON/PDF/summary exports | Stakeholders can explain outcome and missing state | CSV Trust Evidence Pack is not implemented; ORI/policy versions are not universal |
| Production Readiness | Evaluate security, provider, performance, validation and support gates | Admin readiness center and evidence-linked readiness model | Critical gates Ready; accepted cautions have owners and dates | Current source intentionally preserves Blocked/Review/Awaiting Data states |
| Expansion | Add another workflow only after the first is controlled and measured | Existing workflow templates and provider-neutral architecture | New scope has independent authority, evidence, policy and rollback | No automatic expansion or cross-workflow trust inheritance is approved |

## Roles and ownership

- **Executive sponsor:** owns business outcome and risk acceptance.
- **Pilot owner:** owns scope, timeline, coordination and evidence completeness.
- **Security owner:** approves authentication, provider, data and incident boundaries.
- **Technical owner:** owns integration, deployment, observability and rollback.
- **Governance reviewer:** owns escalations and final human dispositions.
- **Data/privacy owner:** approves collection, retention, residency and disposition.
- **Cyber Sentinels owner:** coordinates product support and reports limitations without overriding customer authority.

## Success criteria

| Required criterion | Evidence required to pass |
| --- | --- |
| Integration completed | Approved adapter configured in target environment; callback/auth, normalization, timeout and fail-closed tests retained |
| Evidence collected | Representative reviewed cases contain attributable, tenant-scoped evidence and limitations |
| Replay operational | Decision chronology is written, retrievable and reconciled after a tested failure/retry path |
| Trust reports available | Authorized reviewers can generate the supported JSON/PDF/summary formats with explicit missing states |
| Enterprise administrators trained | Named admins/reviewers complete access, governance, provider, report and incident walkthroughs |
| Security review complete | Deployed authentication, authorization, RLS, tenant-denial, secrets and webhook tests are approved |

All six criteria are mandatory. A source-level capability or configured environment variable is not a pass.

## Measures

- 100% of sampled decisions retain decision reason, evidence, authority, reviewer state and Replay reference or an explicit failed-write state.
- 100% of escalations have a named owner, disposition and timestamp.
- No unresolved critical authentication, tenant-isolation, provider-authentication or continuity-write failure remains.
- Agreed latency/error/queue-age thresholds are met on a representative retained cohort.
- Report language matches actual provider, validation and deployment evidence.
- Accuracy metrics are computed only from sufficient reviewed, non-synthetic ground truth.

## Stop and rollback criteria

Stop or return to remediation when tenant isolation fails, authority cannot be established, required evidence is missing, callback integrity fails, Replay cannot be reconciled, an escalation has no owner, retention/security approval is withdrawn, or the measured service boundary exceeds the accepted threshold. Rollback disables the workflow/provider integration without deleting retained audit evidence that policy permits.

## Expansion rule

Expansion is a new controlled scope, not automatic trust transfer. Reassess purpose, authority, evidence, provider, policy, data classification, failure behavior, reporting and operational ownership for every additional workflow, tenant or region.
