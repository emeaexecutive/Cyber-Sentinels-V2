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