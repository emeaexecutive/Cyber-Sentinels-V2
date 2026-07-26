# EPIC 20 Recommended Feature Sprint

Date: 2026-07-23

Recommendation: complete a single evidence-backed customer workflow before adding another feature family. The repository already contains substantial identity, governance, Replay, receipt, passport, and graph foundations, but those foundations are distributed across multiple routes and remain dependent on unproved live provider/database operation.

## Priority 1 — Verification Case Workflow

### Customer problem

Security, talent, and compliance operators need one place to initiate a verification, see provider evidence arrive, request more evidence, make an accountable review decision, and issue a receipt. Today those steps exist across identity operations, candidate/session flows, governance, Replay, and receipts without one canonical case lifecycle.

### Current repository state

- Identity subjects, verification requests, provider transactions, evidence, confidence, and operations dashboards exist.
- Hopae has the strongest real adapter/callback/normalization path.
- Governance review, Replay, audit, notification, and receipt components exist.
- Some older verification routes accept manual/default scores or use disclosed demo fixtures.
- Live provider execution and deployed migrations were not proved in EPIC 19.2.

### Precise feature scope

- Establish a canonical verification-case state machine: `draft`, `awaiting_evidence`, `evidence_received`, `review_required`, `approved`, `rejected`, `cancelled`, `receipt_pending`, `completed`.
- Create/initiate a human verification case from an authenticated enterprise workspace.
- Attach normalized provider observations and immutable evidence references.
- Show missing, stale, conflicting, and unavailable evidence explicitly.
- Route risk-bearing or inconclusive cases to a named human reviewer.
- Record reviewer rationale and authority.
- Generate a receipt and Replay reference only from persisted evidence and a recorded outcome.
- Make provider outage recoverable without fabricating a completed verification.

### Data model impact

- Prefer the existing identity subject/request/evidence/provider transaction, governance, Trust Event, Replay, and receipt tables.
- Add a case-lifecycle projection or narrowly extend the existing verification request only if current fields cannot represent the states above.
- Any migration must include `enterprise_id`, append-only outcome/audit history, narrow RLS, idempotency, and rollback notes.

### API impact

- Canonical create/list/detail endpoints for verification cases.
- Idempotent provider-session initiation and callback-to-case attachment.
- Authorized reviewer transition endpoint with reason and evidence references.
- Receipt-finalization endpoint that refuses incomplete evidence/outcome state.
- No breaking removal of existing verification APIs; add adapters or deprecation headers where needed.

### UI routes/components

- Canonical routes: `/dashboard/identity`, `/dashboard/identity/verifications/[id]`, and `/dashboard/governance`.
- Reuse `identity-dashboard`, `verification-detail`, provider operations, decision explanation, Replay timeline, and receipt components.
- Add a case status header, missing-evidence state, reviewer action panel, and receipt readiness boundary.

### Test requirements

- State-transition unit tests and invalid-transition denial.
- Tenant A cannot read or mutate Tenant B cases.
- Provider callback signature, replay protection, idempotency, and duplicate delivery.
- Provider timeout/outage leaves the case recoverable and unverified.
- Reviewer role/authority and required rationale.
- Receipt cannot issue without persisted evidence and a final outcome.
- End-to-end authenticated happy path plus inconclusive/review path.
- Keyboard, mobile, loading, empty, and error-state tests.

### Environment/provider dependencies

- Approved non-production Supabase project with current migrations.
- Two test tenants and separate authenticated users.
- Hopae sandbox credentials and callback URL.
- Background/retry execution suitable for the selected provider lifecycle.

### Acceptance criteria

- An authorized operator can complete one real sandbox case from creation to receipt without leaving the canonical workflow.
- Every status is evidence-backed and auditable.
- Missing/provider-unavailable evidence never appears verified.
- Reviewer action and authority are visible in Replay and the receipt.
- Live two-tenant denial and provider-outage tests pass.

### Risks

- Duplicating legacy verification and passport state.
- Treating provider output as the final trust decision.
- Issuing receipts before evidence persistence completes.
- Provider callbacks arriving late or more than once.

### Explicitly out of scope

- New biometric or deepfake models.
- Additional identity providers beyond making the adapter contract ready.
- Automated employment decisions.
- Broad redesign of all verification/demo routes.

## Priority 2 — Evidence-Driven Trust Passport

### Customer problem

Customers need a durable, understandable view of an actor’s current workflow-specific trust evidence. Current passport surfaces are substantial but mix modern evidence links with legacy/manual score-entry paths, which makes the canonical source of truth harder to understand.

### Current repository state

- Passport list/detail/create/decision APIs and UI exist.
- Evidence, notifications, audit history, reports, verification state, and governance links are present.
- AI-assisted commentary is optional and correctly unavailable without configuration.
- Some passport creation paths accept operator-entered scores/defaults; provider-complete end-to-end evidence was not proved.

### Precise feature scope

- Define one canonical Passport read model derived from completed/active verification cases, normalized evidence, authority, decisions, governance, and freshness.
- Remove manual/default risk scores from the canonical creation path; retain legacy routes behind explicit compatibility boundaries.
- Display evidence source, observed time, freshness, confidence meaning, limitations, and unresolved review state.
- Link Passport sections to the originating case, Replay, receipt, and Evidence Graph references.
- Add a clear `insufficient_evidence` state and prohibit a universal “verified” interpretation.

### Data model impact

- Prefer a rebuildable passport projection over duplicating source evidence.
- Store source record IDs, projection version, computed-at time, and integrity status.
- Preserve existing passport IDs and route compatibility.

### API impact

- Versioned Passport read contract with explicit missing/partial states.
- Recompute endpoint restricted to authorized enterprise actors and idempotent by source watermark.
- Existing mutation endpoints remain compatible but cannot manufacture authoritative evidence.

### UI routes/components

- Canonical routes: `/passports` and `/passports/[id]`.
- Reuse Living Trust Profile/Trust DNA, evidence panels, notifications, decision explanation, and Replay links.
- Add source/freshness disclosures and a compact unresolved-evidence panel.

### Test requirements

- Projection determinism and source-watermark tests.
- No manual/default score can become authoritative evidence.
- Stale/missing/conflicting evidence states.
- Tenant isolation and authorization.
- Passport links resolve to the correct case, receipt, Replay, and authority records.
- Responsive and screen-reader coverage.

### Environment/provider dependencies

- Priority 1 verification-case data.
- Current Supabase schema in approved non-production.
- At least one real sandbox provider case and one outage/inconclusive case.

### Acceptance criteria

- Every displayed trust dimension has a source or an explicit absence reason.
- No passport claims identity certainty beyond provider/evidence support.
- Current state, recent change, reviewer decision, and next action are understandable without opening raw records.
- Compatibility routes do not create conflicting canonical truth.

### Risks

- Projection drift from source records.
- Misinterpreting Trust DNA as biometric or immutable identity.
- Breaking existing passport URLs or demo fixtures.

### Explicitly out of scope

- Public universal reputation scoring.
- New ML scoring.
- Cross-tenant passport sharing.
- Replacing the verification receipt.

## Priority 3 — Case-Linked Evidence Graph

### Customer problem

Operators can see individual evidence and Replay entries, but they need a compact answer to: what evidence supported this decision, who had authority, what conflicts remain, and which records are missing?

### Current repository state

- Typed Evidence Graph nodes/edges, build/query logic, migrations, architecture, admin view, and trust-lifecycle integration exist.
- Replay, Trust Memory, authority, governance, provider, decision, and evidence concepts are already represented.
- Live graph population and tenant-denial proof are missing, and the primary graph view is administrative.

### Precise feature scope

- Add a bounded graph view inside the canonical verification case and Passport detail.
- Show only the selected case/decision neighborhood: subject, provider observations, evidence, authority, decision, reviewer, Replay, receipt, and Trust Memory references.
- Provide list/table fallback and text explanation; the visualization cannot be the only representation.
- Mark missing, stale, conflicting, and unverified relationships.
- Link each node to an authorized detail route.

### Data model impact

- Reuse current graph nodes/edges as a rebuildable projection.
- Add projection version/watermark or missing-reference diagnostics only if absent.
- Do not introduce a separate graph database in this sprint.

### API impact

- Tenant-scoped bounded-neighborhood endpoint with strict maximum nodes/edges.
- Explicit completeness, missing-reference, and projection-version fields.
- No raw provider payloads or personal data beyond authorized labels.

### UI routes/components

- Embed in `/dashboard/identity/verifications/[id]` and `/passports/[id]`.
- Reuse existing evidence graph/admin components where accessible and responsive.
- Add an accessible evidence list, relationship filters, legend, empty state, and deep links.

### Test requirements

- Deterministic graph projection from a verification case.
- Cross-tenant node/edge denial.
- Bounded query and performance test.
- Missing/conflicting evidence rendering.
- Keyboard navigation, accessible list fallback, mobile overflow, and high-contrast tests.

### Environment/provider dependencies

- Priority 1 case records and Priority 2 Passport projection.
- Approved non-production database with graph migrations.
- Representative multi-provider/conflict fixtures plus one real sandbox case.

### Acceptance criteria

- A reviewer can trace every final decision input and authority relationship from one case view.
- Missing and conflicting relationships are explicit.
- The view remains usable without the visual graph.
- Tenant isolation and bounded-query tests pass against the live non-production schema.

### Risks

- Visual complexity and inaccessible canvas-only implementation.
- Treating graph proximity as confidence.
- Exposing identifiers across tenants.
- Projection lag being mistaken for missing evidence.

### Explicitly out of scope

- A new graph datastore.
- Organization-wide unrestricted graph exploration.
- Predictive relationship scoring.
- New provider integrations.

## Sprint sequencing

Priority 1 is the release-defining workflow. Priority 2 consumes its evidence into a coherent customer artifact. Priority 3 makes the same evidence and authority chain explainable. Do not start a fourth feature family until those three share one source-of-truth contract and pass live tenant/provider verification.
