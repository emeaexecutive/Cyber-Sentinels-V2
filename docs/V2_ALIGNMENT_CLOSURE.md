# V2 alignment and authority closure

Base: `f1c12752a130acfc0721f9b124900c7726c5a26e`, clean main after PR #108 was merged normally with head `2f7aee9800617d5f0fa55810755e1669e6107dbd`. CI verify (tests/lint/types/build), Docker, CodeQL, secret scan and Vercel all passed; Supabase Preview was skipped. No bypass was used. Branch: `feat/v2-alignment-and-authority-closure`.

## Evidence register

- [Search coverage](V2_SEARCH_COVERAGE.md): 36/36 keyword families and 28/28 questions; 42 canonical sitemap URLs retained, three articles improved, hub links updated, no new URL or competing intent owner.
- [Provider and plugin readiness](V2_PROVIDER_READINESS.md): current primary-source contracts, versions, qualification limits and operational gaps. Judge.me and OpenGraph live execution remain blocked.
- [Runtime, API and database audit](V2_RUNTIME_ALIGNMENT_AUDIT.md): source/permission evidence and implementation invariants.
- [API route inventory](V2_API_ROUTE_INVENTORY.md): 289 source files with direct gate markers and implementation imports. This inventory is not a claim that every legacy route was penetration-tested.
- [Back office audit](V2_BACKOFFICE_AUDIT.md): canonical, legacy, benchmark and mock surfaces distinguished.
- [Production proof matrix](V2_PRODUCTION_PROOF_MATRIX.md): all requested capabilities, evidence and the remaining controlled release proof.

## Proven fixes

| Severity | Finding | Resolution in this branch | Deployment state |
| --- | --- | --- | --- |
| P0 | Four ordinary internal SECURITY DEFINER writers were callable by anon/authenticated without caller checks, bypassing UI/API boundaries. | Forward-only `20260926113958_restrict_internal_governance_helper_execution.sql` revokes PUBLIC/anon/authenticated execution; preserves service-role and owner-trigger calls. Original function-body PGlite regression verifies denial and authorized behavior. | NOT APPLIED. The deployed permission gap remains a security blocker until a separately approved release applies the migration. |
| P1 | Historical idempotent ALLOW could mint a fresh five-minute execution artifact without reevaluating current authority. | Execution authorization returns null on replay, missing replay state, REVIEW or DENY; fresh ALLOW contract/signature preserved. | Source/tests only; not deployed. |
| P1 | Persisted decision followed by failed lineage writes could return an incomplete successful receipt on retry. | Graph, Replay and material Trust Memory references required before fresh dispatch and both idempotent return paths; internal `CANONICAL_RECEIPT_INCOMPLETE` maps to public V1 `READINESS_UNAVAILABLE`, HTTP 503. | Source/tests only; no automatic repair or redispatch of partial records. |
| P1 | Persona inquiry lifecycle manufactured verification facets/time and omitted exact documented subject binding. | Exact inquiry and `reference-id` checks; missing/conflicting subject rejected. Document/liveness/biometric/time remain unknown, completed inquiry stays pending until verification mapping is qualified. | Isolated adapter, no live qualification. |
| P1 | Public badge endpoint returned demo trust for unknown badge/subject and wrote false verification events. | Valid requests explicitly return HTTP 501 NOT_CONFIGURED; malformed requests remain 400; no simulated score or verification event. | Source/tests only. |
| P1 | Legacy registry, memory and provider views implied unsupported provenance or capability. | Read failures no longer produce demo agents; demo detail labeled; unfiltered events labeled; inferred kill switch removed; benchmark memory projection labeled; World ID verifier implementation distinguished from unestablished live proof. | Source/contracts only; live authenticated browser proof outstanding. |
| P2 | Search coverage/date and API description drift. | Existing resources expanded, editorial date shared by visible date/schema/sitemap; OpenAPI now distinguishes 200 historical replay from 201 evaluation and does not promise an absent automatic webhook retry consumer. | Source/local validation; no indexing, rank or citation claim. |

The canonical decision engine, existing authority/delegation model and provider-evidence separation remain the architecture. Judge.me gained only a bounded raw-byte HMAC helper; it does not establish installation binding, delivery freshness, replay protection or authority. No OpenGraph network transport was enabled.

## Database observations

Read-only Production inspection on 26 September 2026: PostgreSQL 17, 243 public tables with RLS enabled, 116 applied migrations through `20260913132642`. Canonical and delegation mutation RPCs inspected were service-only; the four legacy helper exceptions above were proved from effective ACLs and function definitions. Selected aggregate orphan checks returned zero for transaction events, incident-to-transaction links, delegation-to-authority links and cross-tenant parent delegations. Empty delegation data cannot establish exercised delegation behavior.

Advisors also reported 28 RLS-without-policy informational notices, six mutable search-path warnings, broad function-execute notices (mostly trigger functions) and leaked-password protection disabled. These are retained findings, not all classified as exploitable. RLS enabled is not sufficient evidence of tenant isolation; source role checks, RPC grants and local regression tests provide narrower evidence. No production rows, roles, credentials, grants or settings were changed. No obsolete tables or columns were deleted merely because they appeared unused.

SQL REQUIRED = YES, solely for the proven helper-execution gap. NEW TABLES = 0; NEW MIGRATIONS = 1; NEW API SCOPES = 0; ENV CHANGES = 0; DEPENDENCY CHANGES = 0. No plugin installed or paid dependency added.

## Branch validation: 28 September 2026

- `npm test`: **1,793 passed**, zero failed, skipped or cancelled across the full command pipeline. This includes the final three real-adapter malformed-reference regressions, canonical completeness/idempotency, delegation/revocation, Persona failure/binding, auth/session, API contracts, Judge.me, OpenGraph and search checks.
- Focused regressions passed: canonical adapter/core/integration 75; public V1 security/OpenAPI 46; identity provider resilience/runtime 61; search 7; migration namespace/history 11. The new permission test executes the original helper bodies and the forward migration in PGlite, checks denied client roles and retained service/owner-trigger access. No hosted negative-write test was performed.
- `npm run lint`, `npm run typecheck` and `npm run build`: passed on the final source; build generated 208 static pages. No dependency or lockfile changes.
- `npm run security:secrets:scoped`: passed; zero real-secret candidates and one existing test fixture. Secret values were not emitted.
- `git diff --check`: passed. All 74 relative file links in the 12 changed Markdown documents resolved locally.
- Local built-server browser verification (`node --experimental-strip-types tools/search-verify.mjs`): 42 canonical pages, 20 additional internal destinations, 1440px and 390px resource navigation/overflow checks, JSON-LD/metadata, sitemap, robots, PDF canonical and private noindex assertions; **zero assertion failures**. Artifacts remain local under `artifacts/search/`.

The browser run retained **11 configuration-limited observations**: `/help` did not fully render without local Supabase settings; `/status`, `/trust-replay`, `/developers/api-keys`, `/dashboard/governance` and `/data-rights` returned configuration-dependent 503 responses; anonymous redirect checks for `/dashboard`, `/workspace`, `/admin`, `/operational-entities` and `/developers/api-keys` could not establish the configured live flow. `/operational-entities` streamed a server error after HTTP 200 without protected content. Private noindex assertions passed. These are not certified authenticated backoffice journeys. One initial cold-start browser timeout was followed by a successful full rerun against the ready server.

## Remaining external proof

Production application/migration release, authenticated role-based browser checks, qualified real-provider calls, owner Search Console/Bing verification, indexing/citation measurement, outbound retry-consumer qualification and alert ownership remain explicit external/operational work. They are not simulated or marked complete by this branch. No merge or deployment of this branch is authorized by this report.
