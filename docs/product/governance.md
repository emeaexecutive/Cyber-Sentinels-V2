# Enterprise governance

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Experience boundaries

`/governance` is a public explanation of owned human review. `/dashboard/governance` is the authenticated operational queue. The public page does not expose customer data; the protected page requires an allowlisted admin or workspace owner/reviewer context and relies on tenant RLS for records.

The public route is linked from the footer but is not in `canonicalPublicRoutes` or the sitemap. Its content ownership should be reconciled with `/trust` without creating another governance route.

## Current capability map

| Required capability | Current implementation | Gap or boundary |
| --- | --- | --- |
| Policy Management | Protected page creates governance policies with workspace, name, description, trigger, severity, action and human-review flag | No full policy version, approval, effective-date or rollback UI; direct server action relies on authenticated context and RLS |
| Authority Management | Workspace roles, access governance, policy authority fields and lifecycle records contribute context | No single authority-management module inside Governance |
| Approval Workflows | Queue supports pending/in-review/escalated and human approve, reject, defer/request evidence and resolve outcomes | Workflow state is implemented; separation of duties and approval quorum are not universal |
| Delegated Authority | Delegation/owner context is modelled in trust and evidence records | No dedicated delegation grant/revoke experience on the governance page |
| Evidence Policies | Policies can trigger missing-evidence review; evidence and provider panels inform decisions | Required evidence schemas/quality/expiry are not fully managed through the current form |
| Retention Policies | Migration source adds `retention_policy`, legal hold and governed tombstones | Current governance UI does not expose the complete retention configuration or disposition workflow |

## Governance workflow

```text
Policy or operational signal
-> governance action
-> tenant reviewer assignment
-> evidence, authority and Replay review
-> approve / reject / escalate / request evidence / resolve
-> audit and trust-state transition
-> Replay and receipt continuity
```

Human governance remains authoritative. AI/provider/ORI output may recommend review but cannot approve, reject or alter policy automatically.

## Reviewer access

The protected page loads workspace memberships and permits review for allowlisted administrators, workspace reviewers or workspace creators. A user without that context receives a reviewer-access-required state. Mutation paths must independently validate authorization and must not rely only on the fact that the form was rendered.

## Policy contract

A production policy requires immutable policy ID/version, tenant, owner, purpose, allowed actions, evidence requirements, authority scope, severity, review action, effective/expiry time, retention configuration, approval state, rollback reference and audit history. Current storage contains several of these fields, but the current UI does not manage the complete contract.

## Authority and delegation

Authentication identifies the account; governance authority is a separate, time-bounded decision. Delegation must name grantor, grantee, scope, purpose, validity, revocation and policy. A reverse graph relation or free-form metadata is insufficient for operational administration.

## Evidence and retention

- Missing, expired and contradictory evidence remain visible and can require review.
- Provider evidence stays attributed and does not determine the final outcome.
- Retention actions must honor legal hold and append a permitted tombstone/audit fact.
- Retention configuration does not represent compliance certification.
- Reviewer notes and evidence access remain tenant scoped.

## Current strengths

- Named reviewer ownership and explicit unresolved/escalated states.
- Evidence, provider, audit, posture and Replay continuity on one operational page.
- Human review is consistently described as authoritative.
- Workspace role and owner checks precede queue rendering.
- Missing evidence has an explicit request/defer path.

## Current risks and recommendations

1. Add `/governance` to the public route contract or consolidate its explanation into `/trust`; do not leave discovery semantics ambiguous.
2. Define one canonical authority/delegation management owner using existing access-governance surfaces.
3. Version and approve policies before activation; retain prior versions for Replay.
4. Require mutation-time role checks in addition to RLS and page rendering.
5. Expose evidence and retention policy fields only after security/privacy review.
6. Replace process-local governance queue diagnostics with durable queue evidence before production reliance.
