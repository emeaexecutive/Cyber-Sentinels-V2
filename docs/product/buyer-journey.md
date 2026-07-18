# Enterprise buyer journey

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Current experience

The canonical buyer surface is `/enterprise/buyer-documentation`, supported by `/enterprise`, `/platform`, `/trust`, `/security`, `/enterprise/pilot-checklist` and `/enterprise/pilot`. Current UI groups four journeys: CISO, CIO/CTO, Compliance, and CEO/Investor. The blueprint requires nine explicit personas; the additional distinctions below are documentation requirements and identified UI-content gaps, not new routes.

All personas converge on the same evidence-first sequence:

```text
Category promise -> mechanism review -> proof and limitation review
-> controlled pilot definition -> retained evidence -> production-gate decision
```

## Chief Information Security Officer

- **Objectives:** reduce blind spots between authentication and consequential action; preserve accountable escalation.
- **Pain points:** fragmented provider signals, unclear authority, evidence loss after a decision, and unsupported security claims.
- **Trust requirements:** tenant isolation, fail-closed behavior, Replay, named reviewers, provider truth and security-test evidence.
- **Primary questions:** What is checked before execution? What happens when a provider or Replay fails? Can the decision be reconstructed?
- **Expected outcomes:** one bounded security workflow, explicit blockers, resolvable evidence and an owned remediation path.
- **Recommended journey:** `/` -> `/trust` -> `/security` -> `/verification-replay` -> `/enterprise/pilot-checklist` -> `/enterprise-access?intent=pilot`.

## Chief Information Officer

- **Objectives:** introduce operational trust without replacing systems of record; define ownership and support.
- **Pain points:** integration sprawl, duplicated control planes, uncertain operating cost and adoption complexity.
- **Trust requirements:** provider-neutral adapters, enterprise deployment boundaries, support ownership, portability and rollback.
- **Primary questions:** Where does Cyber Sentinels sit? Which systems remain authoritative? How is the pilot expanded or stopped?
- **Expected outcomes:** an approved integration model, named owners, bounded pilot plan and evidence-backed production gate.
- **Recommended journey:** `/` -> `/platform` -> `/enterprise` -> `/enterprise/buyer-documentation` -> `/enterprise/pilot`.

## Chief Technology Officer

- **Objectives:** validate architecture, runtime behavior, APIs, scalability and replaceability.
- **Pain points:** vendor lock-in, direct UI/provider coupling, synchronous external dependencies and incomplete failure contracts.
- **Trust requirements:** normalized APIs, versioned evidence, observable latency, deterministic decisions and replaceable adapters.
- **Primary questions:** What are the dependency boundaries? How does Replay work? Which capabilities are implemented versus target?
- **Expected outcomes:** technical validation scope, integration risks, performance budgets and rollback criteria.
- **Recommended journey:** `/platform` -> `/developers` -> `/developers/docs` -> `/developers/authentication` -> `/verification-replay` -> pilot checklist.

## Chief Risk Officer

- **Objectives:** understand operational exposure, decision ownership, escalation and residual risk.
- **Pain points:** opaque scores, missing historical context, unowned exceptions and risk claims without reviewed evidence.
- **Trust requirements:** explainable decisions, policy context, Trust Memory boundaries, ORI limitations and governance history.
- **Primary questions:** What risk does the platform measure? Who can override? How are uncertainty and missing evidence represented?
- **Expected outcomes:** agreed risk taxonomy, escalation thresholds, accountable reviewers and explicit residual-risk acceptance.
- **Recommended journey:** `/trust` -> `/governance` -> `/verification-replay` -> `/enterprise/buyer-documentation` -> controlled pilot.

## Chief Compliance Officer

- **Objectives:** connect policy, evidence, reviewer action and retention into an auditable record.
- **Pain points:** rationale separated from proof, uncontrolled exports, incomplete policy versions and overclaimed compliance.
- **Trust requirements:** authorization lineage, evidence references, retention controls, audit APIs and bounded report language.
- **Primary questions:** Which policy was evaluated? Can evidence be exported safely? What is missing from the record?
- **Expected outcomes:** control mapping, sample Trust Evidence Pack, retention review and documented compliance gaps.
- **Recommended journey:** `/trust` -> `/regulatory` -> `/security` -> `/enterprise/buyer-documentation` -> protected Trust Report review.

## Head of Identity

- **Objectives:** integrate identity/proof providers while keeping authentication distinct from authorization.
- **Pain points:** provider-specific payloads, inconsistent assurance, credential-driven provider selection and stale identity state.
- **Trust requirements:** provider abstraction, signature validation, normalized evidence, step-up, expiry and provider health truth.
- **Primary questions:** Which provider is implemented? How are callbacks secured? How does identity evidence affect but not authorize a workflow?
- **Expected outcomes:** approved provider, mapping/retention contract, failure tests and step-up operating procedure.
- **Recommended journey:** `/developers/authentication` -> `/platform` -> `/trust/data-sovereignty` -> `/security` -> pilot technical validation.

## Enterprise Architect

- **Objectives:** place the trust layer within current identity, workflow, data and governance architecture.
- **Pain points:** parallel systems, unclear sources of truth, non-rebuildable projections and route/service duplication.
- **Trust requirements:** dependency direction, canonical ownership, tenant boundaries, adapter-first interoperability and recovery design.
- **Primary questions:** What owns evidence, policy and decisions? Which projections are rebuildable? What changes during deployment?
- **Expected outcomes:** target architecture, integration decision record, data flow, non-functional requirements and migration plan.
- **Recommended journey:** `/platform` -> `/developers/docs` -> `/methodology` -> `/security` -> `/enterprise/pilot-checklist`.

## Recruitment Director

- **Objectives:** protect consequential hiring workflows while keeping human review and candidate fairness explicit.
- **Pain points:** identity/session signals conflated with hiring decisions, opaque detection claims and disconnected reviewer evidence.
- **Trust requirements:** hiring as a bounded workflow, separate signal categories, named reviewers, Replay and appealable evidence.
- **Primary questions:** What does the platform verify? What remains a signal? Who makes the hiring decision?
- **Expected outcomes:** one pilot workflow, documented human authority, evidence/report boundary and no autonomous hiring verdict.
- **Recommended journey:** `/solutions` -> `/enterprise/hiring-security` -> `/verification-replay` -> buyer documentation -> pilot checklist.

## Investor

- **Objectives:** assess category differentiation, defensibility, enterprise adoption and evidence-backed readiness.
- **Pain points:** feature sprawl, speculative claims, unclear buyer path and production readiness inferred from prototypes.
- **Trust requirements:** one platform narrative, canonical trust pipeline, controlled-pilot evidence, provider reality and measurable gates.
- **Primary questions:** Why now? What is defensible? Which enterprise problem converts into a pilot? What is not yet production-ready?
- **Expected outcomes:** clear category thesis, proof journey, adoption constraints and honest readiness position.
- **Recommended journey:** `/` -> `/platform` -> `/enterprise` -> `/enterprise/buyer-documentation` -> `/enterprise/pilot`.

## Conversion contract

The shared current actions are `Request Demo`, `Book Pilot`, `Contact Enterprise`, `Buyer Documentation` and `Pilot Checklist`. Each context should expose one primary and one supporting action rather than all actions at equal visual weight. Form submission is the measurable conversion; a CTA click is not a successful request.

## Current gaps

- CIO and CTO are combined despite different operating and architecture questions.
- Risk, Identity, Enterprise Architecture and Recruitment personas are not dedicated buyer cards.
- CEO and Investor are combined; the Part 4 persona list requires Investor specifically, not CEO.
- Current journeys describe evidence well but do not show procurement owner, timeline or decision authority for each persona.
- No consented product analytics verifies where personas enter, abandon or convert.
