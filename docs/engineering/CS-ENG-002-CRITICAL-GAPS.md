# CS-ENG-002 Critical and High-Priority Gaps

**Release decision:** **AUDIT FAILED - CRITICAL BLOCKERS**
**Production status:** **NOT READY**

## CRIT-001 - Legacy team tables permit authenticated-wide access

**Severity:** CRITICAL
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0013-EVID-0016
**Release blocker:** Yes
**Effort:** M

- **Scenario:** migration `20260528_explicit_supabase_api_grants.sql` grants authenticated select/insert/update and creates `USING (true)` / `WITH CHECK (true)` policies for `teams` and `team_members`. No later migration replaces those policies. Team workspace, summary and invitation runtime paths query or mutate these tables.
- **Business impact:** any authenticated account may be able to enumerate or modify another team's membership and workspace context if the source migrations represent deployed state. That breaks enterprise confidentiality and authorization assurances.
- **Immediate containment:** treat team access, invitations and team workspace features as unsafe for enterprise use; do not onboard external tenants or represent tenant isolation as implemented. If Production exposure is confirmed, disable the affected routes until a reviewed migration is deployed.
- **Remediation:** introduce an authoritative organization/team membership model keyed by `auth.uid()`, replace broad grants/policies for all four operations, derive team context server-side, deny unscoped access, and add two-tenant denial tests.
- **Dependencies:** schema decision, data backfill plan, RLS review, safe migration rollout, test users for two tenants, Production change approval.
- **Exit evidence:** source migration review, ephemeral migration test, live authorized/denied RLS suite, route tests and explicit Production migration-state confirmation.

## HIGH-001 - Enterprise identifiers are client-supplied, not trusted context

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0018-EVID-0019
**Release blocker:** Yes for enterprise multi-tenancy
**Effort:** L

- **Scenario:** agents, trust certifications and trust alerts accept `enterprise_id` from request bodies. The ID is not derived from a server-side membership lookup and is not bound to an authoritative enterprise table.
- **Impact:** users can label their records as belonging to arbitrary enterprises, weakening reports, policy evaluation and future tenant filters.
- **Containment:** do not use `enterprise_id` as an authorization or reporting boundary.
- **Remediation:** create canonical organization/membership tables, derive the enterprise from authenticated context, add foreign keys and server/RLS enforcement, and reject mismatches.
- **Dependencies:** CRIT-001 tenancy design.
- **Exit evidence:** API negative tests and two-tenant database tests.

## HIGH-002 - Broad and null-owner RLS policies remain outside the core hardening set

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0014, EVID-0017-EVID-0020
**Release blocker:** Yes for sensitive enterprise records
**Effort:** L

- **Scenario:** migration history contains multiple authenticated-wide policies. Later migrations harden selected core tables, but certifications/alerts permit `created_by is null`, provenance events remain authenticated-wide, and full final-state policy coverage is not machine-verified.
- **Impact:** legacy/null records or newly introduced tables can escape intended owner boundaries.
- **Containment:** use only explicitly reviewed owner/workspace tables for sensitive pilot data.
- **Remediation:** generate a final-state RLS manifest for every client-facing table, eliminate permissive legacy branches, enforce least privilege for all operations and validate it against a migrated ephemeral database.
- **Dependencies:** migration tooling and authoritative tenancy.
- **Exit evidence:** complete table-policy matrix plus live denial suite.

## HIGH-003 - Applied Supabase schema and the `enterprise_id` state are unverified

**Severity:** HIGH
**Status:** BLOCKED BY CREDENTIALS
**Evidence:** EVID-0018, EVID-0020, EVID-0023
**Release blocker:** Yes
**Effort:** M

- **Scenario:** repository migrations add `enterprise_id` and later provider schema, but there is no `supabase/config.toml`, applied migration ledger, drift output or safe Production schema inspection in the audit.
- **Impact:** runtime code may address columns/functions/policies that are absent or different in Production; fallback writes can hide drift.
- **Containment:** do not interpret a successful Next.js build as database readiness.
- **Remediation:** establish local/ephemeral migration execution, schema diffing, Production migration-ledger inspection and reviewed forward-only remediation.
- **Dependencies:** authorized Supabase access and migration owner.
- **Exit evidence:** zero-drift report and successful clean migration replay.

## HIGH-004 - No repository-enforced CI or required checks

**Severity:** HIGH
**Status:** DOCUMENTED ONLY
**Evidence:** EVID-0040-EVID-0043
**Release blocker:** Yes for controlled enterprise delivery
**Effort:** M

- **Scenario:** Part 6 defines CI architecture and checks, but `.github/workflows` is absent.
- **Impact:** lint, type-check, tests, build, migration checks, dependency scanning and audit validation can be bypassed on merge.
- **Containment:** require a recorded manual validation run for every release.
- **Remediation:** implement least-privilege pull-request and main workflows, pin actions, cache safely and enforce checks in branch protection.
- **Dependencies:** GitHub repository administration.
- **Exit evidence:** green workflow runs and required-check configuration.

## HIGH-005 - Critical tests are opt-in and live tenancy denial is not proven

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0040-EVID-0041
**Release blocker:** Yes
**Effort:** M

- **Scenario:** 46 test files exist, but the default chain reaches 31. Credentialed RLS, deployed-security and provider suites remain opt-in.
- **Impact:** the default green result does not detect the critical team isolation defect or validate authenticated production workflows.
- **Containment:** state the exact 31-file boundary in release evidence.
- **Remediation:** add ephemeral database integration tests to default CI, run approved deployed checks post-release and fail closed on missing critical fixtures.
- **Dependencies:** CI and safe test tenants.
- **Exit evidence:** enforced cross-tenant negative cases.

## HIGH-006 - Identity verification is not end-to-end across advertised signals

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0021-EVID-0027
**Release blocker:** Yes for identity-verification claims
**Effort:** XL

- **Scenario:** Hopae has substantive runtime code but is credential-gated; World ID explicitly lacks server verification; other document, liveness, phone, device, biometric and deepfake providers are registry/adapters, mock or heuristic paths.
- **Impact:** the product cannot make reliable multi-signal identity or proprietary-detection claims.
- **Containment:** label results by source and keep unverified signals out of allow decisions.
- **Remediation:** prioritize one provider-backed identity workflow, implement contract tests, signed/idempotent callbacks, evidence normalization, expiration/revocation and calibrated confidence before expanding providers.
- **Dependencies:** vendor accounts, privacy review and canonical tenancy.
- **Exit evidence:** sandbox transaction evidence and approved Production readiness review.

## HIGH-007 - Trust runtime has competing contracts and mixed durability

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0028-EVID-0033
**Release blocker:** Yes for enterprise audit claims
**Effort:** XL

- **Scenario:** multiple graph, replay, decision, trust engine and memory implementations coexist. Some queues, caches, events and telemetry are process-local while other paths persist to Supabase.
- **Impact:** equivalent workflows can produce different records and cannot always be deterministically reconstructed after a serverless restart.
- **Containment:** identify the Hopae/RC1 evidence path as the narrow canonical pilot path; avoid universal Trust OS claims.
- **Remediation:** version one evidence/decision/replay contract, persist all consequential transitions transactionally and retire or isolate demo/legacy engines.
- **Dependencies:** tenancy, schema and product contract decisions.
- **Exit evidence:** canonical integration and deterministic replay tests.

## HIGH-008 - Rate limiting is process-local and inconsistently applied

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0035, EVID-0036
**Release blocker:** Yes for public high-risk APIs
**Effort:** M

- **Scenario:** only a minority of route modules show rate-limit evidence, and `checkRateLimitPlaceholder` is process memory.
- **Impact:** distributed/serverless requests can bypass limits; expensive, verification and mutation endpoints remain abuse-prone.
- **Containment:** constrain public exposure and use provider/edge quotas where verified.
- **Remediation:** add durable/edge rate controls by actor, tenant and IP hash; specify fail-safe behavior and tests.
- **Dependencies:** Cloudflare or durable store configuration.
- **Exit evidence:** multi-instance/load and edge-policy tests.

## HIGH-009 - Observability and alerting are not operationally retained

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0033, EVID-0048-EVID-0049
**Release blocker:** Yes for an enterprise SLA
**Effort:** L

- **Scenario:** health/status and telemetry helpers exist, but centralized error monitoring, traces, SLOs, alert delivery and retention are not evidenced.
- **Impact:** security, tenant, provider and availability failures may not be detected or reconstructed promptly.
- **Containment:** operate only as a limited internal/pre-pilot service with manual checks.
- **Remediation:** implement structured correlation IDs, central logs/errors/metrics, provider and auth alerts, ownership and test notifications.
- **Dependencies:** monitoring platform and on-call ownership.
- **Exit evidence:** retained signals and a successful alert drill.

## HIGH-010 - Recovery plans are unexercised

**Severity:** HIGH
**Status:** DOCUMENTED ONLY
**Evidence:** EVID-0049
**Release blocker:** Yes for enterprise production
**Effort:** L

- **Scenario:** application/database rollback and DR procedures exist, but no restore, rollback or regional/provider outage exercise is recorded.
- **Impact:** stated RTO/RPO and recovery safety are assumptions.
- **Containment:** do not publish recovery objectives as achieved.
- **Remediation:** assign owners, verify backups/PITR externally, execute non-destructive restore and application rollback exercises, and record measured outcomes.
- **Dependencies:** Supabase/Vercel access and an isolated recovery target.
- **Exit evidence:** approved recovery-test report with timings and data-integrity checks.

## HIGH-011 - Production configuration controls are only partially verifiable

**Severity:** HIGH
**Status:** BLOCKED BY EXTERNAL CONFIGURATION
**Evidence:** EVID-0044-EVID-0047
**Release blocker:** Yes for formal production approval
**Effort:** S

- **Scenario:** a Ready Production deployment and canonical aliases are verified, but Production Branch, preview protection, environment completeness, notification policy, Cloudflare DNSSEC/WAF/bot/rate-limit controls and Supabase dashboard state are not established by repository or CLI output.
- **Impact:** deployment and edge governance may differ from the documented policy.
- **Containment:** retain the evidence boundary and do not infer dashboard state.
- **Remediation:** conduct a two-person dashboard review and store redacted control evidence.
- **Dependencies:** platform administrators.
- **Exit evidence:** dated, approved configuration checklist.

## HIGH-012 - Demo fallback can obscure missing production data

**Severity:** HIGH
**Status:** PARTIALLY IMPLEMENTED
**Evidence:** EVID-0034
**Release blocker:** Yes for buyer-facing operational claims
**Effort:** M

- **Scenario:** several enterprise/workspace pages substitute demo records or metrics when data/tables are absent.
- **Impact:** operators and buyers can mistake illustrative data for retained production evidence.
- **Containment:** keep visible demo/test labels and do not use those surfaces for customer decisions.
- **Remediation:** fail explicitly in Production, separate demo routes/data sources and add empty/error/loading tests.
- **Dependencies:** canonical data contracts.
- **Exit evidence:** browser tests proving no silent Production fallback.
