# CS-ENG-001 — Cyber Sentinels Master Engineering Blueprint

**Edition:** Publication 1.0<br>
**Evidence baseline:** Repository audit at `main` revision `e3fe37a`, 2026-07-19<br>
**Acceptance:** **BLUEPRINT ACCEPTED WITH GAPS**<br>
**Product status:** Buildable engineering base; controlled pilot and General Availability are not approved

## Purpose

This Blueprint is the governing engineering specification for Cyber Sentinels. It describes current implementation, target architecture, validation requirements and operational controls without treating documentation, demo fixtures, source migrations or external configuration as proof of production behavior.

The authoritative current-state classifications are in:

- `CS-ENG-001_GAP_ANALYSIS.md` — point-in-time audit of 84 capabilities;
- `CS-ENG-001-IMPLEMENTATION-MATRIX.md` — Parts 1-6 publication status; and
- `CS-ENG-001-FINAL-REPORT.md` — acceptance and release boundary.

## Reading Model

Every capability uses one of six states: `IMPLEMENTED`, `PARTIALLY IMPLEMENTED`, `DOCUMENTED ONLY`, `MISSING`, `BLOCKED BY CREDENTIALS`, or `BLOCKED BY EXTERNAL CONFIGURATION`. Target diagrams describe intended convergence. They do not override the implementation matrix.

Evidence priority is executed behavior, runtime source/configuration, migrations/tests, environment-specific release artifacts, then documentation. Names in UI copy are not evidence that a capability works.

## Engineering Principles

1. Tenant isolation, authentication, authority and evidence integrity fail closed.
2. Demo, synthetic, Test Mode, sandbox and live evidence remain distinguishable.
3. One concept has one canonical runtime owner and versioned contract.
4. Trust decisions preserve evidence, policy, authority, explanation and audit references.
5. ORI and other intelligence remain non-authoritative until reviewed validation approves promotion.
6. Secrets stay server-side and least-privileged; external settings require external evidence.
7. Database changes use expand/migrate/contract and separate application from schema rollback.
8. A green build or documentation set does not certify production, pilot or GA readiness.

## Current Maturity Baseline

| Dimension | Readiness |
| --- | ---: |
| Repository maturity | 52/100 |
| Architecture | 63% |
| Security | 52% |
| Trust architecture | 56% |
| Identity infrastructure | 38% |
| Enterprise readiness | 49% |
| Production readiness | 46% |
| Testing | 53% |
| CI/CD | 15% |
| Operations | 22% |
| **Overall readiness** | **47%** |

These values are engineering planning indicators, not accuracy, compliance or uptime claims.

## Part 1 — Engineering Foundation

Cyber Sentinels uses Next.js 15, React 19, strict TypeScript, ESLint, Tailwind and npm lockfile reproducibility. Local lint, typecheck, test and build commands exist and passed at the audit baseline. Documentation hierarchy, ADRs, coding standards, definition of done and dependency rules establish governance.

The target foundation adds a pinned Node/npm toolchain, protected-branch evidence, CODEOWNERS, CI enforcement and import-boundary tests. ADRs must link decisions to canonical code and tests. Overlapping trust/domain modules are technical debt, not multiple authoritative implementations.

Primary references: `platform-stack.md`, `framework-configuration.md`, `git-workflow.md`, `coding-standards.md`, `definition-of-done.md`, and `docs/architecture/dependency-rules.md`.

## Part 2 — Platform Architecture

The current application includes 224 page modules, 118 API routes, Supabase browser/server/service clients, 58 SQL migrations, authentication middleware, protected administration and provider abstractions. This is a substantive application platform.

The target platform converges route classification, service ownership, API contracts, generated database types, migration automation and one organization/workspace/RBAC model. Every route must declare audience, authentication, authorization, tenant scope, input/output schema, rate/idempotency rules, audit event and data class. Every tenant-bearing table must have verified RLS or an explicitly approved server-only boundary.

Provider configuration is not provider health. Hopae has the production-candidate adapter but remains credential-blocked. Additional identity providers remain future until they implement the full normalized evidence, callback, audit, health and tenant contract.

Primary references: `docs/architecture/application-structure.md`, `service-layer.md`, `provider-layer.md`, `docs/api/`, `docs/database/`, and `docs/security/authentication-flow.md`.

## Part 3 — Trust Architecture

The intended trust pipeline is:

```text
Identity/provider inputs
  -> normalized immutable evidence envelope
  -> Evidence Graph and contextual state
  -> versioned policy and authority evaluation
  -> optional non-authoritative ORI recommendation
  -> canonical Trust Decision and enforcement receipt
  -> Replay, Trust Memory, audit and reports
```

Current modules implement meaningful parts of this sequence, but no universal versioned envelope proves it across every route and historical record. Evidence shapes, policy engines, decision engines, graph representations, Replay and Trust Memory paths require consolidation. Exact Replay requires immutable input manifests and pinned provider, evidence schema, policy, authority, model, engine and configuration versions.

ORI remains off, shadow or advisory and currently runs without approved reviewed production evidence. It must never independently grant authority. Missing or degraded evidence must yield insufficient evidence, review, step-up, pause or deny according to policy—not invented confidence.

Primary references: `docs/architecture/provider-abstraction.md`, `evidence-normalizer.md`, `evidence-graph.md`, `replay-engine.md`, `trust-memory.md`, `ori.md`, `trust-decision-engine.md`, and `docs/security/trust-architecture-requirements.md`.

## Part 4 — Enterprise Experience

The product includes a coherent public enterprise spine, protected dashboards, workspaces, governance, Back Office, reports, receipts and pilot material. Enterprise readiness depends on real tenant administration, role enforcement, authenticated usability, representative performance, accessible reports and reviewed design-partner evidence.

Production surfaces must show whether data is real retained data, approved test data, simulated demo data, awaiting credentials, unavailable or unconfigured. Silent fallback to demo records is prohibited in Production. Product analytics remains missing until consent, minimization, event governance, retention and withdrawal are implemented.

Primary references: `docs/product/enterprise-site-map.md`, `buyer-journey.md`, `pilot-lifecycle.md`, `dashboard.md`, `governance.md`, `back-office.md`, `trust-reports.md`, `accessibility.md`, `performance.md`, and `analytics.md`.

## Part 5 — Security and Production Controls

Security source foundations include Supabase session validation, verified-email protection, admin gates, extensive RLS migrations, provider/webhook signature controls, server-only secrets, selected rate limits, security headers, audit records and privacy/data-rights paths.

The security target requires universal tenant/RBAC coverage, live multi-tenant RLS denial, enforced MFA/step-up, distributed rate limiting, complete API-to-audit coverage, secret inventory/rotation, CSP hardening, provider target proof and deployed security tests. `teams` and `team_members` require source RLS or an approved replacement; older email-owner policies require migration to durable tenant identity.

Cloudflare, Vercel, Supabase and provider dashboard settings remain external controls. Repository documentation may specify and record them but must not infer them.

Primary references: `docs/security/`, `next.config.mjs`, `middleware.ts`, `lib/env.ts`, `lib/security.ts`, `lib/bot-protection.ts`, and the migration set.

## Part 6 — Engineering Operations

Part 6 establishes the publication-ready operating specification:

- Testing: `docs/testing/testing-architecture.md`, `test-inventory.md`, `test-strategy.md`, `test-data-management.md`, and `production-smoke-tests.md`.
- CI/CD: `ci-architecture.md`, `required-ci-checks.md`, and `production-deployment.md`.
- Database: `docs/database/migration-operations.md`.
- Releases: `docs/releases/release-process.md`, `RELEASE_TEMPLATE.md`, `production-readiness-checklist.md`, and `go-no-go-template.md`.
- Observability/operations: `docs/operations/observability-architecture.md`, `health-checks.md`, `alert-matrix.md`, `incident-operations.md`, `INCIDENT_TEMPLATE.md`, `disaster-recovery.md`, `recovery-test-plan.md`, and `operations-responsibility-matrix.md`.
- Rollback: `docs/runbooks/application-rollback.md` and `database-rollback.md`.

These documents are approved specifications. They do not claim that CI workflows, centralized telemetry, alerts, on-call staffing, rollback drills, backups or recovery exercises currently exist. Operational status advances only when configuration and exercised evidence are attached.

## Production and Release Model

The canonical source branch is `main`, the canonical target is Vercel Production, and the canonical domain is `https://www.cybersentinels.com`. Git-connected deployment is preferred. Direct CLI deployment requires explicit approval and `vercel --prod`. Preview URLs are never canonical.

A release requires immutable scope/SHA, required quality/security/migration gates, go/no-go approval, external platform verification, production smoke, observation and rollback ownership. Application rollback uses an auditable Git revert by default. Database recovery is a separate forward-fix/restore decision.

## Known Critical Gaps

1. Universal tenant/RBAC and verified RLS are incomplete.
2. CI workflows and required-check enforcement do not exist.
3. Applied migration state and restore capability are not verified.
4. No approved live identity-provider path or provider consensus exists.
5. Trust/evidence/Replay version envelopes are not universal.
6. Central alerts, incident program and exercised disaster recovery are absent.
7. Controlled-pilot gates remain failed or blocked.

The complete prioritized list and effort estimates are maintained in `CS-ENG-001_GAP_ANALYSIS.md`.

## Acceptance and Governance

This Blueprint is accepted as a reliable engineering reference **with gaps**. It is not a certification that all described target capabilities exist. Changes to architecture, APIs, database, security, testing, operations or product claims update the relevant modular document, implementation matrix and evidence in the same reviewed change.

## Next Program — EPIC 17 Identity Intelligence

Recommended sequence:

1. Identity Signal Model.
2. Provider Consensus.
3. Identity Confidence Engine.
4. Device and Session Intelligence.
5. Behaviour Consistency.
6. Identity Timeline.
7. Enterprise Identity APIs.
8. Identity Intelligence UX.
9. Security and Validation.
10. Production Release.

EPIC 17 inherits—not assumes—the P0 prerequisites for tenant/RBAC, canonical evidence and decision contracts, CI, migration safety, test data governance and operational telemetry.
