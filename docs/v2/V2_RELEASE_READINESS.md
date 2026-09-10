# Final homepage and V2 review - 2026-09-10

## Delivery state supersedes the earlier review below

PR #86 was already merged externally at 2026-09-10 08:40:52 UTC, before this review started. Current main is `2b331578e3ecb9f3719af89c0253ee1b0eb29490`. The merged V2 head was `98917f092dc90da44161e300c53f49e63a4a72cd`; its CI checks passed. This follow-up remains on `v2/operational-trust-intelligence`. No new PR, merge, Production deployment, Production database operation or Epic 2 work was performed.

**PR #86 pre-merge verdict: BLOCKED / no longer applicable because the PR is merged.** It cannot receive these follow-up changes. GitHub mergeability is UNKNOWN for the merged PR, not YES. The repository workflows run on open pull requests or pushes to main, so their prior green results do not qualify a new follow-up SHA. A human must choose the follow-up review/delivery path; creating another PR remains outside this request.

## Fresh Staging qualification

Project: `agpyhygpfmppjkxwcpac`. [Migration ledger](premerge-20260910/migration-ledger.json): exactly 131 versions, names and newline-normalized statement hashes match the previous qualification. [Database sanity](premerge-20260910/database-sanity.json): unchanged V2 RPC, validated V2 constraints, ready/valid indexes, and zero orphan or cross-tenant links. No schema or migration file changed. One additive table, `incident_evidence_links`, continues to reference canonical V1 transaction, evidence and incident records. No duplicate identity, authority, outcome, Replay, Memory or tenant ledger was introduced.

[Authenticated database checks](premerge-20260910/authenticated-rls.json) prove actual owner SELECT, tenant B invisibility, denied direct writes and denied authenticated/anonymous RPC execution. Five tenant-bound FKs and the append-only trigger remain present. The narrow service-role RPC is the atomic writer, rechecking active key, scope, tenant, client and source references; the role has no direct table mutation grant. [Local migration rehearsal](premerge-20260910/local-migration.json) separately passes atomic persistence, Memory, RLS, reference and history-mutation negatives against the targeted PGlite fixture; this is not a full historical migration replay.

The [five named legacy constraint checks](premerge-20260910/legacy-constraint-audit.json) have zero violating rows. These are the five constraints in the V2 review scope, not a claim that the whole Staging database has only five NOT VALID constraints. Historical validation flags outside this scope are not changed.

[Fresh V1/Epic 1 lifecycle](premerge-20260910/customer-zero.json): registered agent, Ed25519 proof, signed configuration/heartbeat, authority, ALLOW, transaction, receipt and Replay; then persisted observations, incident evidence, intervention, containment, remediation, export; authority revocation produced DENY for the same action. The original V1 ALLOW existed before optional V2 records and remained ALLOW afterward. [Application proof](premerge-20260910/application-proof.json) verifies the authenticated Outcome Review, incident UI, graph and Trust Memory. [Stored package integrity](premerge-20260910/stored-export-integrity.json) recomputes the canonical digest after database persistence and confirms original ALLOW with CONTRADICTED evaluation. [Stored links](premerge-20260910/stored-link-integrity.json) verify JCS content digests and the separate PostgreSQL chronology hashes.

[Scope and ownership proof](premerge-20260910/tenant-scope-proof.json) confirms identical 404 semantics for missing and inaccessible resources and 403 for all five V2 operations using a legacy trust:read key. [Additional proof](premerge-20260910/additional-proof.json) covers cross-tenant evidence rejection, matching evidence type/digest requirements, existing outcome reuse and distinct API-client versus first-party provenance. The separate intentionally incomplete chronology remains DRAFT with missing evidence categories and an expired historical heartbeat explicitly unavailable. Expiration is enforced; no independent external-provider execution or integration is claimed. Several diagnostic attempts created additional append-only Staging fixture chronologies; they are retained as evidence, not deleted or presented as completed incidents. A native evidence record whose normalized facts did not match its digest was correctly rejected during a diagnostic attempt.

All qualification operations are scripted Staging fixtures, with no downstream action or model invocation. Provider, runtime, destination and adjudicated outcomes stay distinct. Purpose interpretation remains PARTIAL; correlation does not establish attribution or global authorization. Export is an evidence pack, not a compliance certification. [Cleanup](premerge-20260910/key-cleanup.json) proves all three issued test keys revoked and subsequently rejected with 401.

[OpenAPI audit](premerge-20260910/openapi-audit.json): 3.1.0, API 2026-08-29, 25 paths / 26 operations. Exact incident routes retain incidents:read, incidents:write and evidence:export scopes. No automatic scope upgrade or API/backend code change in this follow-up.

## Homepage review and changes

The core headline is unchanged: "Before an AI agent acts, prove it has the authority to do so." The Finance Copilot example is labelled illustrative, compacted into action, verified identity, EUR 10,000 authority and a DENY for a EUR 20,000 request. Evidence/receipt/Replay now share one quiet footer instead of repeated cards. A semantic V1 heading introduces the existing five-step control flow.

A fifth, clearly Staging-qualified V2 section explains decision -> execution evidence -> outcome -> incident -> Replay, immutable history, incident exports and Trust Memory. Separate source provenance and unknown context are explicit. It makes no campaign detection, autonomous purpose classification, regulatory compliance or completed future-intelligence claim.

Request a demo now opens the actual `intent=demo` form; Explore the API opens `/developers/docs`. The six-item header replaces ambiguous Trust with Developers. Existing Trust discovery remains in the detailed footer. Pricing remains because the existing consultation/pilot/enterprise plans are a real product model. No dependency, image, animation, client component or global style was added.

[Final Preview](https://cyber-sentinels-v2-feuydffiq-keith-speres-projects.vercel.app) is READY at application SHA `61b9701ff113e996cfe07806702f9c36bb1ef48e`; target is Preview, with no Production alias. Browser tests block all non-GET/HEAD requests and seed a labelled browser-only rejected-optional consent fixture; they do not claim server consent persistence or submit demo requests. Automated checks cover WCAG A/AA rules, overflow, headings, keyboard mobile navigation, reduced motion, and CTA destinations at 1440, 1280, 1024, 768, 430 and 390 pixels. The final optimized Preview has measured CLS 0 at every width, versus 0.179-0.231 before the loading fix. The existing shared loading placeholder exposed the footer at 70vh; `app/loading.tsx` now reserves a full viewport so the footer does not jump out of view when content arrives. No loaded-page whitespace or application decision behavior changed. Local homepage output remains 674 B / 107 kB first-load JS. LCP in the final unthrottled browser sample was 0.548-0.880 seconds; this is laboratory evidence, not field Core Web Vitals. Screenshots were inspected at all six widths, including separate desktop/mobile viewport captures.

## Final qualification and verdict

[Full local qualification](premerge-20260910/local-validation.json): 1,514 tests / 1,514 PASS / 0 FAIL / 0 SKIP. Lint, typecheck, optimized build and redacted commit secret scan PASS. Older source-contract tests were updated to reflect the authorized fifth homepage section, Developers navigation and demo/docs destinations; no test was removed or skipped. Windows emitted a non-fatal Webpack cache rename warning; compilation and build completed successfully. Public fixture UUID scan findings were reviewed and exempted only by exact commit/path/rule/line fingerprint.

[Final visual qualification](premerge-20260910/homepage-visual.json) PASS: six widths, zero overflow, one main heading, zero automated WCAG A/AA violations, visible keyboard outlines, working mobile toggle, reduced-motion preference and both CTA destinations. Three [additional complete runs](premerge-20260910/browser-repeat-qualification.json) also PASS without page errors. The demo form was inspected with five required fields; no external demo request was submitted.

P2: a recoverable React hydration error appeared in preliminary Preview navigation and once immediately after the loading-fix deployment. It was not reproduced in the final run or three subsequent complete runs. The failed diagnostic is retained in [hydration investigation](premerge-20260910/homepage-hydration-investigation.json); the cause is not established and this review does not claim it was fixed. Other P2 items remain the named historical NOT VALID flags, partial purpose interpretation and unqualified independent external-provider execution. No P0 or release-critical P1 was identified by the completed checks.

V1 Production GO remains at `b0f6b37d41714efa940852b3ef955e9c7317c513`; its actual Production alias still resolves to that READY deployment. No Production database access, migration, deployment, environment or alias mutation was performed. Temporary Staging key/session exports, service credentials, localhost key/certificate and generated `.env.local` were removed after revocation and qualification.

Implementation verdicts: V2 foundation READY; Epic 1 READY; database READY; homepage READY with the disclosed P2 observation. Delivery verdict: PR #86 BLOCKED as a pre-merge destination because it is already merged; hosted CI for the follow-up SHA is not run (only the prior merged head has full green CI). A new review path requires human authorization because this brief prohibits another PR. Production promotion remains NOT AUTHORIZED. No Epic 2 work began.

## Earlier CPTO review (historical)

# CPTO V2 release readiness — 10 September 2026

Review scope: V2 foundation and Epic 1 only, on PR [86](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/86). No merge or Production promotion is authorized. The original dirty workspace and three stashes were preserved; work used the existing isolated V2 worktree.

## Source and evidence boundary

Starting V2 HEAD: b227fb434e3390e7461846dda5018a35d84fc147. V2 base, current origin/main and merge-base: 046662dbb372e78c8ca2fe8057e6afe9fd56eb78. PR base main, head v2/operational-trust-intelligence. All starting checks passed. Reviewed application source: 5e899ad031aebab93f3b70f02dfac6a673f528e5. Final PR head and CI are recorded in the PR; this document accompanies the review fixes and fresh evidence.

Production remains READY on b0f6b37d41714efa940852b3ef955e9c7317c513, deployment dpl_3yX9aPfmjumxNH2DS56dnzTFL7zc. The Production domain still resolves to that deployment. Read-only Production database inspection confirms the V2 table and migration are absent. No Production data, schema, RLS, grants, environment or alias was changed. V2 deployment target is Preview, not Production; see [deployment inspection](review-20260910/deployments.json).

## Database-first review

[Live catalog](review-20260910/database-catalog.json) covers 44 relevant tables: canonical transactions/events, evidence, existing receipt and Replay persistence, Memory, workspaces/membership, keys, identity/credentials/manifests, authority/delegations, outcomes, continuous trust and all incident structures. Reuse is sound: the V1 transaction remains the root, and V2 adds references and attributed chronology. No duplicate decision, receipt, Replay, Memory, identity, authority or tenant system was found.

One V2 table exists: incident_evidence_links. It supplies composite tenant/incident/event/transaction/evidence constraints that free-text incident evidence references and graph edges could not enforce. Existing incident assessments, chronology, submission packages, canonical evidence, public/native/external outcomes, Outcome Review, graph and Memory are reused. Separate execution_observations, trust_outcomes, trust_incidents, trust_evaluations, regulatory_evidence_exports and cross-context ledgers were avoided. No new table or migration was necessary during this review.

| Migration | Review |
| --- | --- |
| 20260909163513_operational_incident_evidence_foundation.sql | Only V2 migration; unchanged during review; Staging applied, Production absent |
| Purpose | Link operational incident chronology to canonical V1 records without duplicating ledgers |
| Existing tables changed | incident_regulatory_assessments: evidence_mode column; nullable jurisdiction/ai_system_id only for CANONICAL_OPERATIONAL via legacy-required-context constraint. evidence_objects: composite unique index. api_keys: allowed-scope constraint extended; no scope UPDATE |
| New table | incident_evidence_links, append-only, bounded details, digest, tenant and canonical references |
| Constraints/FKs | Four checks, five FKs, primary key and tenant composite uniqueness; all V2 constraints validated; zero orphaned links |
| Indexes | Tenant incident/time, transaction and evidence lookups plus unique indexes; all new indexes valid and ready |
| RLS/grants | Existing workspace ownership predicate; authenticated SELECT only. No anon table grant; service_role SELECT only; writes through narrowly scoped RPC |
| RPC | persist_operational_incident_v2; SECURITY DEFINER justified for atomic restricted writes; fixed public,pg_temp search_path; PUBLIC/anon/authenticated EXECUTE revoked; service_role EXECUTE allowed; key scope/expiry/revocation/tenant/client checked; advisory lock serializes incident writers |
| Compatibility | No V1 transaction call depends on V2; old incident context requirements preserved; no historical decision or migration rewritten |
| Risk | Moderate for eventual Production schema promotion because shared incident/key constraints change; acceptable for this Staging-qualified review. Separate Production authorization remains mandatory |
| Retention / forward fix | Evidence references retain source retention/revocation semantics; unavailable evidence blocks completeness. Append-only history; stop V2 writers and add forward correction if needed, no destructive rollback |

Live Staging agpyhygpfmppjkxwcpac has exactly the expected 131 migrations, identical to the previously qualified branch ledger. No unexpected migration or altered historical statement hash was found. [Integrity inspection](review-20260910/database-integrity.json) proves zero orphan links, valid V2 constraints/indexes and zero pre-migration API keys with V2 scopes.

Five existing constraints remain marked NOT VALID: evidence integrity/freshness/supersession, canonical event types and Outcome Review shape. [Direct data checks](review-20260910/legacy-constraint-audit.json) found zero violating rows for all five. These predate V2 and still enforce new writes. They are disclosed P2 validation debt; this review does not silently claim every historical constraint has a validated flag or rewrite the V1 migration history.

Fresh [authenticated-role Staging SQL](review-20260910/authenticated-rls.json) proves actual owner reads, cross-tenant invisibility, direct-write denial and RPC denial using real test-user ownership. Service-role success was not used as proof of tenant isolation. The targeted local PGlite migration rehearsal was also rerun successfully; it is a captured-column dependency fixture, not a full V1 database replay.

## Fresh customer zero and security

[Customer zero](review-20260910/customer-zero.json) exercised normal public API authentication against actual Staging: registration, Ed25519 credentials, signed manifest, possession proof, VERIFIED identity, authority, signed heartbeat, ALLOW, transaction/receipt/Replay, V2 observations/outcome/incident/intervention/containment/remediation/export, authority revocation, then DENY. Original ALLOW and digests remain unchanged. No optional V2 context existed before ALLOW. Challenge and heartbeat replay were rejected.

[Application proof](review-20260910/application-proof.json) exercises the existing authenticated Outcome Review, persisted Memory and graph, and desktop/mobile UI. Original ALLOW plus later adjudicated DENY and CONTRADICTED remains valid. No browser page error or mobile horizontal overflow occurred. [Additional proof](review-20260910/additional-proof.json) includes existing public outcome persistence, cross-tenant evidence denial, absent evidence and forged authority-field denial, and distinct first-party/API-client provenance in one chronology. The historical heartbeat was expired by correlation time; the incomplete chronology correctly remained DRAFT.

[Expanded tenant/scope proof](review-20260910/tenant-scope-proof.json) rejects cross-tenant canonical reads, incident creation, context Replay, authority revocation, outcome submission and authenticated Outcome Review. Absent and inaccessible incident/evaluation requests share the same 404 code/message. A newly issued key restricted to legacy trust:read scope receives 403 on every V2 operation. This complements the historical-key database audit; it does not pretend a newly issued key is an old key.

[Persisted export integrity](review-20260910/stored-export-integrity.json) independently recomputes the actual stored package digest after database triggers and matches integrity_digest, content_digest and package_digest. Seven persisted evidence references, original ALLOW and later CONTRADICTED review are retained. Package references and sources were fetched from tenant-bound persisted data, not replaced by fixture responses.

All three temporary API keys were [revoked](review-20260910/key-cleanup.json); subsequent HTTP requests return 401 API_KEY_REVOKED. The bounded test authority is revoked. Historical qualification artifacts are preserved; fresh review artifacts use a separate directory.

## Release fixes

The review fixed three narrow integrity defects: an orphan evidence digest was silently discarded without its reference; a link projection did not compare structural transaction/kind/evidence fields against its digested details; retention timestamps were compared lexically instead of as instants. These now reject invalid input or produce DRAFT/gaps. Five focused regression cases were added and all pass. No V1 authorization code or historical migration changed.

OpenAPI now expresses conditional evidence requirements, separate outcome fields and purpose-only observations. Qualification helpers accept a separate evidence output directory so reruns preserve history. Setup supplies local-only consent configuration. No Production bypass was introduced.

## Capability classification

| Capability | Classification | Actual boundary |
| --- | --- | --- |
| Execution observations | WORKING | Attributed ingestion/linking; scripted operational claims, no claimed downstream execution |
| Outcomes | WORKING | Provider/runtime/destination remain separate; existing public/native/external records reused |
| Incident model / evidence links | WORKING | Existing incident root and append-only composite tenant links |
| Intervention / remediation | WORKING | Attributed reports; not automatic approval or validated corrective actions |
| Canonical regulatory export | WORKING | Server-derived dimensions and stored integrity; canonical readiness is not regulatory approval |
| Replay / Trust Memory extensions | WORKING | Existing authorization/receipt references and appended chronology/evaluation, persistence verified |
| Decision Evaluation | WORKING foundation | Existing Outcome Review reused; Epic 4 remains FOUNDATION |
| Cross-provider context | WORKING foundation | First-party control plane plus API-client assertions, multiple sessions and timestamps; no independent external-provider integration claimed |
| Purpose lineage | PARTIAL | Declared/observed purpose and immutable lineage work; drift/mismatch interpretation remains unresolved, no derived detector or automatic policy action |
| Epic 1 | WORKING | Actual Staging database lifecycle passed |
| Hiring / MCP gateways | DESIGN ONLY | No Epic 2/3 implementation added |
| Operational Trust Intelligence / specialist model | NOT BUILT | No learning, attribution, campaign detection or automatic policy mutation |

Provider classification: first-party control-plane verification is PRODUCTION EXERCISED by the established V1 record and freshly TEST-SANDBOX EXERCISED here. V2 API-client evidence ingress is TEST-SANDBOX EXERCISED, with explicitly scripted source claims. Additional independent external-provider V2 qualification is NOT CONFIGURED for this proof. World ID retains IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED.

## API, tests and release verdict

[Actual OpenAPI audit](review-20260910/openapi-audit.json): OpenAPI 3.1.0, API version 2026-08-29, 25 paths, 26 operations. Five V2 operations: POST /api/v1/incidents; GET /api/v1/incidents/{incidentId}; POST .../chronology; GET .../replay; POST .../exports. Required scopes are incidents:write, incidents:read and evidence:export; existing evidence/outcome APIs retain their V1 scopes.

Full suite: 1,514 passed, zero failures, skips and TODOs; all 1,481 baseline cases retained. No baseline test file deleted and no only-tests found. Thirty-three focused V2 tests include five new integrity regressions. Unit fixtures are explicitly mocked inputs; Staging HTTP, authenticated SQL, persistence, export and browser evidence are separate real integration checks. Test-only helpers pin Staging, public proof processes reject service-role environment credentials, and the heartbeat Staging flag remains opt-in and database-pinned. Lint, typecheck and optimized build all PASS; [local validation](review-20260910/local-validation.json) records the reviewed source. Final CI results are recorded in the PR.

Current [Staging security advisors](review-20260910/security-advisors.json) report no new V2 object finding. Existing project notices remain: [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and [MFA options](https://supabase.com/docs/guides/auth/auth-mfa). These pre-existing notices are disclosed and are not represented as a clean project-wide audit.

P0: none identified. P1: review fixes above resolved, subject to final CI. P2: five historical NOT VALID flags with zero violating rows; purpose-drift/mismatch interpretation and independent external-provider qualification are incomplete by explicit foundation scope, not claimed as delivered intelligence.

Closure target: V2 FOUNDATION READY; EPIC 1 READY; V1 REGRESSION NONE; DATABASE READY for Staging-qualified review; PR READY FOR REVIEW once final checks pass. This is not Production qualification. Next required action: human review of PR86 and separate explicit authorization before any Production promotion. The V2 PR remains unmerged.