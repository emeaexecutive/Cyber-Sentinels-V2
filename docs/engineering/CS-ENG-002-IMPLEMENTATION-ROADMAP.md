# CS-ENG-002 Implementation Roadmap

This roadmap is ordered by dependency and risk. Passing a stage means producing the listed exit evidence, not merely merging code.

## Stage 0 - Critical containment

**Goal:** remove the credible cross-tenant team path before any external enterprise use.

- Disable or restrict team invitation/workspace operations until fixed.
- Define the authoritative organization, team and membership model using immutable user IDs.
- Replace `teams` and `team_members` broad policies and grants with operation-specific tenant policies.
- Backfill legacy email membership safely; reject ambiguous rows.
- Add two-tenant SELECT/INSERT/UPDATE/DELETE denial tests.

**Exit:** CRIT-001 is remediated in source, migrated in an isolated database, reviewed, applied under change control and verified with live denial evidence.
**Estimated effort:** M-L.

## Stage 1 - Build and deployment stability

- Declare Node version support and align Vercel/CI/local execution.
- Resolve environment-variable and Stripe price-name drift.
- Implement minimal CI for lint, type-check, default tests, build, migration static checks and dependency audit.
- Verify Vercel Production Branch, preview protection and Git/deployment policy.
- Retain the current manual release evidence until required checks are enforced.

**Exit:** branch protection requires a green, least-privilege workflow; Production mapping/configuration has approved evidence.
**Estimated effort:** M.

## Stage 2 - Authentication and tenancy

- Complete credentialed registration, login, logout, reset, confirmation, expiry and unauthorized-access tests.
- Replace shared/admin allowlist assumptions with a versioned role and delegation model where enterprise roles are required.
- Derive tenant/enterprise IDs from server session membership; reject request-body tenant authority.
- Bind Back Office, reports, exports and delegated actions to explicit role permissions.
- Define MFA/step-up requirements and recovery behavior.

**Exit:** two-tenant end-to-end tests and role matrix demonstrate server, API and UI denial behavior.
**Estimated effort:** L.

## Stage 3 - Database and RLS

- Add Supabase project configuration for local/ephemeral migration execution.
- Produce a final-state table/grant/RLS manifest for every client-facing table and operation.
- Remove null-owner and remaining authenticated-wide sensitive policies.
- Replace email ownership with user/tenant foreign keys where feasible.
- Implement migration replay, lint, drift detection, rollback notes and restore-safe release gates.
- Verify the previously uncertain `enterprise_id` and provider-schema state in the authorized environment.

**Exit:** clean migration replay, zero unexpected drift and full positive/negative RLS coverage.
**Estimated effort:** L.

## Stage 4 - Provider and identity verification

- Select one narrow Hopae-backed identity workflow as the initial supported contract.
- Execute credentialed sandbox initialization, timeout, retry, callback, signature, idempotency, normalization, expiry and revocation tests.
- Keep World ID and other providers disabled until server-side exchanges and evidence contracts exist.
- Add email/phone/device/location/liveness/document signals only through explicit native or provider-backed contracts.
- Implement privacy, retention, residency and restricted-data review for each provider.

**Exit:** one provider-backed workflow has retained sandbox evidence, negative tests and approved Production enablement criteria.
**Estimated effort:** L-XL.

## Stage 5 - Trust runtime

- Choose canonical versions of normalized evidence, Evidence Graph, Replay, Trust Memory, ORI, policy and Trust Decision contracts.
- Persist consequential transitions transactionally with correlation, version, actor, source and reason codes.
- Eliminate serverless process memory as authoritative state.
- Define deterministic replay boundaries, trust decay, revocation, override and audit semantics.
- Retire or isolate legacy/demo engines and duplicate graph/decision implementations.

**Exit:** one end-to-end workflow can be reproduced from retained evidence and yields the same versioned decision.
**Estimated effort:** XL.

## Stage 6 - Enterprise experience

- Bind dashboard, Governance, Back Office, alerts, provider health, reports, exports and settings to canonical tenant data.
- Remove silent Production demo fallback and add loading/error/empty/degraded states.
- Complete role-specific onboarding, accessibility and protected-flow performance validation.
- Run a controlled design-partner workflow and retain outcome evidence.

**Exit:** an authorized pilot user completes the agreed workflow without mock data, cross-tenant access or unsupported claims.
**Estimated effort:** L-XL.

## Stage 7 - Testing and CI/CD

- Bring critical opt-in tests into enforced CI with safe fixtures.
- Add database, RLS, auth, provider, webhook, idempotency, browser E2E and accessibility suites.
- Add secret, dependency, static-security and migration scans with reviewed exceptions.
- Enforce required checks, action pinning, least privilege and protected deployment triggers.
- Automate safe post-deploy smoke checks without exposing credentials.

**Exit:** merge and release gates cover every critical capability and cannot silently skip required suites.
**Estimated effort:** L.

## Stage 8 - Observability and recovery

- Implement structured logs, correlation IDs, centralized error capture, metrics, traces and provider/auth/tenant alerts.
- Establish SLOs, alert ownership, escalation and retention.
- Exercise application rollback, database restore, provider outage, credential compromise, Supabase outage and domain/edge incidents.
- Measure and approve RTO/RPO; record evidence and remediation.

**Exit:** alerts reach an accountable owner and a recovery exercise meets approved objectives.
**Estimated effort:** L.

## Stage 9 - EPIC 17 readiness

- Re-run CS-ENG-002 from a clean baseline.
- Require zero unresolved Critical findings and documented acceptance of remaining High findings.
- Freeze canonical tenancy, identity evidence, confidence, decision, replay and API contracts.
- Approve the EPIC 17 threat model, privacy boundary, evaluation plan and rollout feature flags.

**Exit:** decision changes to **AUDIT PASSED - READY FOR EPIC 17**.
**Current state:** **BLOCKED at Stage 0**.

## Recommended delivery order

`CRIT-001 containment -> authoritative tenancy -> final-state RLS -> CI baseline -> provider-backed identity slice -> canonical trust runtime -> enterprise UX -> full test/operations proof -> EPIC 17`
