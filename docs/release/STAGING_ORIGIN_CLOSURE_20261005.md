# Staging origin closure and hosted qualification

Date: 2026-10-05. Decision: **NO-GO**. No Production mutation or deployment. No RC commit: the required hosted qualification has not succeeded.

## Preserved starting point

- Branch: `fix/p0p1-production-security-closure`.
- HEAD: `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`; this is a base SHA, not a qualified RC.
- Existing modified/untracked release work was preserved. Initial status, tracked binary diff and migration inventory are in ignored `tmp/staging-origin-closure/initial-status.txt`, `initial-tracked.patch`, and `initial-migrations.txt`. Untracked files were copied into a separate local preservation directory; its path is retained in `preserved-untracked-location.txt`. No reset, discard or overwrite of the security-closure work occurred.
- Initial Preview: `dpl_7Ci6Qf65FA1VX2gaDgg9mV1kZNTC`, `cyber-sentinels-v2-5p89gwge1-keith-speres-projects.vercel.app`. This is a deployment locator, not the canonical Staging origin.
- Production: `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`, SHA `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`, canonical alias `www.cybersentinels.com`. Confirmed through Vercel deployment metadata.
- Staging Supabase: `agpyhygpfmppjkxwcpac`; Production Supabase: `kecgtsfibkypjuaxqbjx`.

## DNS and Vercel binding

### DNS-complete continuation (2026-10-05)

Keith added the requested Cloudflare record. External DNS now resolves `staging.cybersentinels.com` as CNAME `cname.vercel-dns.com` (TTL observed 134 seconds); the target resolves to Vercel IPv4 addresses `76.76.21.241` and `66.33.60.193`. No A/AAAA record exists at the Staging hostname, and the CNAME response confirms DNS-only routing rather than Cloudflare proxying. A successful authenticated HTTPS request through Vercel's protection-aware curl confirms TLS and routing.

The final Preview deployment is `dpl_5t7No6yWqw1Bf5FtpS4WaBTLm5By`, target `cyber-sentinels-v2-e23wqo434-keith-speres-projects.vercel.app`. `staging.cybersentinels.com` now aliases directly to that Preview. Vercel Deployment Protection remains enabled. The apex and `www` Production aliases both still point to the prior Production deployment `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`; neither was changed.

The following describes the **historical pre-DNS checkpoint**, not current DNS state. At that checkpoint, the manual action requested was:

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| CNAME | staging | cname.vercel-dns.com | DNS only | Auto |

Do not change apex/www records or nameservers. This is a DNS access handoff, not a request to relax readiness.

`vercel alias set` targeting the existing non-Production Preview reached certificate issuance and failed with Vercel `api_error`. A follow-up alias lookup returned 404; project-domain inventory still contained only the pre-existing domains. No partial staging alias was left behind and no Production alias was displaced. Domain verification, SSL, resolution and reachability are therefore **not established**. A direct request to the required `/api/ready` URL returned DNS `ENOTFOUND`.

That historical checkpoint's Vercel alias attempt failed before the DNS record existed. The later Preview alias succeeded as described above; a temporary `*.vercel.app` URL is still not treated as the canonical Staging customer origin.

## Implemented origin and project-binding corrections

`lib/public-api/v1/environment.ts` now requires exact Staging and Production origins, separates loopback local/test environments, and rejects unknown domains, apex-as-Staging, arbitrary Preview hosts, wrong ports, non-root paths and credentials in origins. No wildcard allowance was added.

The environment registry explicitly records `staging.cybersentinels.com`. Both release safety guards accept that exact registered hostname with the exact Staging project while retaining Production, mismatched project, unknown host and synthetic-fixture safeguards. Registering the intended hostname is configuration authorization, not a claim that DNS is already verified.

`lib/readiness/project-binding.ts` and `/api/ready` now:

1. Resolve the expected project from the declared hosted environment.
2. Require an exact HTTPS Supabase project origin; reject a conflicting optional `SUPABASE_URL` alias.
3. Reject legacy JWT project/role mismatches and missing/malformed credentials. Decoding a claim is explicitly **not** treated as cryptographic verification.
4. Probe public Auth settings with the browser key and the protected Auth-admin endpoint with the server key at the expected project, using read-only requests, no redirects, no cache and bounded timeouts. Response bodies are discarded, not logged or returned.
5. Return safe status metadata; only successful probes report project identity VALID and, for Staging, Production project NOT_ACTIVE. Existing data/schema/authentication readiness checks must still pass.
6. Return 503 `PROJECT_BINDING_INVALID` before creating a database client if configuration/binding is invalid. The actual route test proves a Production URL causes zero outbound requests.

The final Preview was built from the current local workspace and deployed with the exact Staging origin and project-bound configuration. Canonical `/api/ready` returned **READY** over `https://staging.cybersentinels.com`; the response reports `ENVIRONMENT=staging`, origin valid, expected project `agpyhygpfmppjkxwcpac`, actual project identity VALID, all public/server key roles PRESENT and accepted, data plane/authentication READY, and Production project NOT_ACTIVE. `runtime.commitSha` is null because the deployment came from the local workspace rather than a connected Git commit; this is a qualified deployment artifact, not a committed RC.

The readiness probes do not certify provider qualification or all admin/application flows. Effective Admin, API-key and application binding were separately exercised below. `externalControls` remains BLOCKED with `AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED`; the API readiness contract can be READY while that optional external-control evidence remains blocked.

Credential reporting is limited to PRESENT, MISSING, INVALID and WRONG ENVIRONMENT. No key, secret, credential fingerprint or user record is emitted by the binding checks. Supabase key-type handling follows [the official API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

## Effective deployed configuration — outstanding

The final Preview received Staging-only values for `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, anon key, service-role key, `CYBER_SENTINELS_ENVIRONMENT=staging`, `CYBER_SENTINELS_PUBLIC_ORIGIN=https://staging.cybersentinels.com`, API-key pepper and rotation secret. Key/secret values were never printed. Readiness classified URL aliases and credentials PRESENT; live probes accepted the anon key against Staging Auth settings and the server key against Staging Auth admin. Production project activity is `NOT_ACTIVE`. Distinct random pepper/rotation material was generated for this Preview; it was not persisted as a global Vercel environment variable.

The disposable allowlisted Staging platform-admin completed Supabase sign-in and the admin access-code route. Its server-side form changed synthetic account approvals and generated audit events. The API-key pepper successfully verified two independent test keys on the hosted V1 route. `OPENGRAPH_PROVIDER_QUALIFIED` was explicitly false; no real provider dispatch was enabled. No Judge.me credential or OpenGraph provider result was exposed or inferred. Preview values were passed only to the deployment; branch/project environment configuration remains unavailable because the branch is not connected to Vercel's Git remote. The disposable admin/Auth users were deleted; see the cleanup note below.

## Migration reconciliation and database checks

Read-only ledgers were compared with `prepare-migration-context.mjs`'s isolated, unlinked environment-specific contexts. No migration history repair or migration application was needed.

| Check | Staging | Production |
| --- | --- | --- |
| Remote migration count | 139 | 119 |
| Reconstructed local context | 139 | 123 |
| Applied but absent locally | 0 | 0 |
| Local but not applied | 0 | Four closure migrations below |
| Duplicate context versions | 0 | 0 |
| Head | 202610040004 | 202610020001 |

Production's exact pending identities are `202610040001`, `202610040002`, `202610040003`, `202610040004`, in that order. All are after the current Production head. The earlier report's Staging count of 140 was inaccurate; current remote and reconstructed local inventories both contain 139. Cross-environment differences are accounted for by the repository's archived history and five recognized Production historical aliases, not by replaying Staging-specific history onto Production. Ledger equality does not prove complete schema equivalence or historical execution order; the ledger has no reliable execution-time audit here.

Targeted live Staging drift/security checks:

- All 11 inspected security-closure/approval function bodies occur unchanged in local closure migrations (line-ending normalized).
- All 233 public tables have RLS enabled.
- All 30 applicable approval policies are RESTRICTIVE for authenticated, with the expected approval predicate in USING and WITH CHECK. `system_health_checks`, the 31st optional target, does not exist and is intentionally skipped by the migration.
- `evidence-files` is private; authenticated has no passport UPDATE privilege.
- `public_api_readiness_v1()` reports ready=true with no missing tables/functions.
- A full migrations-to-live `public` schema diff was generated into a temporary review file (167,394 bytes; no SQL applied). It contains 64 `CREATE OR REPLACE FUNCTION` body differences that have not yet been individually reviewed; this remains an unresolved schema-drift qualification risk.
- Four structural differences were inspected on live Staging and are name-level equivalents: both absent Hopae index names are covered by unique constraints on the same keys; `provenance_events_subject_check` exists and is validated; and the `trust_signals` observed-time predicate exists validated under `trust_signals_check`. No replacement/drop SQL was applied.
- Shadow replay initially stopped on the same World ID replay-hardening SQL present under two historical Staging identities. The copies have identical SQL lines despite differing line endings. The duplicate was omitted only from a disposable shadow context to complete the diff; repository history and live Staging were not changed.

The current explicit Staging full-schema lint returned no errors, with five non-fatal warnings in application functions (unused locals, dynamic array initialization type warnings and an IMMUTABLE/STABLE mismatch). A separate `--schema storage` lint reproduces SQLSTATE 55000 for `storage.list_objects_with_delimiter` and `storage.search`: both functions are owned by `supabase_storage_admin` and use `FOR v_current IN EXECUTE ...`; the linter explicitly warns it cannot infer the dynamic row type, then flags field access inside the loop. The same pattern appears in `storage.search_by_timestamp`. These are vendor-owned dynamic-SQL analyzer false positives, not app-owned routines. The exact Staging Storage API matrix previously passed same-tenant operations and cross-tenant denials. Do not alter vendor function bodies or claim Storage lint is clean; retain the warnings as a documented extension/tooling limitation.

Supabase security advisors reported 19 INFO findings for RLS without policies, 11 WARN findings for authenticated SECURITY DEFINER functions, one leaked-password-protection warning and one MFA-options warning; no ERROR-level advisor finding was returned. Service-only audit/installations tables intentionally deny direct customer access. The helper-function warnings require caller/ownership checks, not blanket EXECUTE grants or RLS removal. Advisor absence of ERROR is not proof that no critical vulnerability exists. References: [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [SECURITY DEFINER exposure](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [MFA](https://supabase.com/docs/guides/auth/auth-mfa).

## Hosted qualification status at pre-DNS checkpoint (historical)

Readiness was not bypassed. No disposable hosted tenants, accounts, evidence or action requests were created during this continuation.

| Mandatory hosted proof | Result |
| --- | --- |
| Tenant matrix: PostgREST plus application APIs, A→B and B→A | NOT RUN |
| Storage matrix with same-tenant positives and cross-tenant negatives | NOT RUN |
| Signup/authenticate/PENDING/admin approve/deny/suspend/revoke and audit | NOT RUN |
| Canonical Golden Agent Flow and execution/acknowledgement/outcome/receipt | NOT RUN |
| Valid identity/authority/delegation/scope with failed runtime trust | NOT RUN |
| Revoked/expired authority, wrong organisation, scope/tool and revoked-agent negatives | NOT RUN |
| Original Replay after authority/policy/runtime change | NOT RUN |
| Trust Memory historical chronology | NOT RUN |
| OpenGraph ALLOW/REVIEW/DENY executor gating and receipts | NOT RUN |
| Hosted SDK/PowerShell/quickstart/OpenAPI/V1 parity | NOT RUN |

The prior 83/83 direct Staging database/security results remain historical evidence, not a current hosted application pass. OpenGraph gateway remains WORKING_LOCAL; its real provider remains PROVIDER_UNQUALIFIED. Judge.me remains IMPLEMENTED_LOCAL / PROVIDER_UNQUALIFIED; absent development-store credentials alone do not block Core if product claims remain accurate. No Product Truth capability was promoted.

## DNS-complete hosted qualification (2026-10-05)

| Requirement | Result |
| --- | --- |
| DNS | PASS. `staging` is a DNS-only CNAME to `cname.vercel-dns.com`; no A/AAAA conflict. |
| TLS / canonical host | PASS. Vercel-protected HTTPS call to the canonical hostname succeeded. |
| Vercel binding | PASS. Staging points to Preview `dpl_5t7No6yWqw1Bf5FtpS4WaBTLm5By`; apex and `www` remain on Production `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`. |
| Staging environment and Supabase identity | PASS. `/api/ready` returns READY; declared/expected/actual Staging project is `agpyhygpfmppjkxwcpac`; Production project is NOT_ACTIVE. All four URL/key binding statuses are PRESENT and runtime-probed. |
| Other runtime secrets | Staging admin allowlist/access code, API-key pepper and rotation secret were passed to the one-off Preview without printing values or persisting global Vercel variables. API-key hashing passed locally and keys authenticated during hosted V1 calls. A later hosted Replay read returned `API_KEY_INVALID` for the same otherwise-active test key; effective pepper stability needs investigation. |
| Migration state | Staging 139/139 local and remote versions match. Production 119 applied; only `202610040001`–`040004` are pending. No Production migration ran. |
| Full-schema diff | Incomplete qualification. A migrations-to-live shadow diff was generated, not applied. Four structural deltas are equivalent constraints/indexes by name/definition; 64 function-body differences remain unreviewed. Duplicate World ID history was excluded only in a disposable shadow context. |
| Storage lint | The two Storage helper diagnostics are vendor-owned dynamic-SQL PL/pgSQL linter false positives; same-tenant and cross-tenant direct Storage tests remain historical 83/83 evidence. No vendor function was altered. |
| Direct RLS / Storage | Historical Staging harness: 83/83, both tenant directions, synthetic objects cleaned at that run. This suite was not rerun in this continuation. |
| Hosted application tenant APIs | PASS for tested paths. API-key list returned only the caller's own key in both directions (HTTP 200); V1 agent reads returned own entity HTTP 200 and foreign entity `AGENT_NOT_OWNED` HTTP 404 in both directions. |
| Account approval lifecycle | PASS for tested synthetic account. PENDING V1 key denied; platform admin approved through the real UI/action; APPROVED product API succeeded; DENIED, SUSPENDED and REVOKED each persisted and protected API returned 403 `ACCESS_APPROVAL_REQUIRED`. Audit recorded request, approval, success, denial, blocked access, suspension and revocation. |
| Platform-admin boundary | PASS for tested negative. A tenant owner was denied the admin access-code endpoint and approval page (HTTP 307); no platform-admin cookie was issued. |
| Hosted Golden Agent | PARTIAL. Gamma registered; Ed25519 credential/manifest proof verified; ACTIVE bounded authority; signed, server-verified Staging heartbeat supplied exactly configuration + monitoring evidence; canonical ALLOW; REVIEW and governed resolution followed by fresh ALLOW; out-of-scope write DENY; authority revoke followed by DENY; wrong-key and challenge-replay attacks rejected. The complete Golden Flow remains unqualified because no downstream execution/independent acknowledgement was proven. |
| Execution / acknowledgement | NOT PROVEN. Two canonical external-action request records exist; zero external acknowledgements, external outcomes or native enforcement requests. The one submitted outcome is explicitly `AGENT_ASSERTED`, not independent evidence. The example did not access a real repository or prove downstream execution. |
| Zero Trust runtime-failure DENY | NOT PROVEN. Without the required signed runtime evidence, policy returned REVIEW with `EVIDENCE_INSUFFICIENT`/`REQUIRED_EVIDENCE_MISSING`, before the heartbeat was added. No evidence shows the required mandatory-runtime-failure DENY with zero executor calls. |
| Authority negatives | PARTIAL. Out-of-action-scope DENY and post-revocation DENY were observed. Expired authority/delegation, wrong organisation, tool-scope, revoked-agent and invalid-credential hosted matrix remains unproven. All three Gamma test authority contracts are now revoked. |
| Replay after authority change | PARTIAL. Staging service-role read after revocation shows the original transaction remains ALLOW with its original authority reference and policy `external-agent-trust-v1@0.2.0`; its 10 immutable canonical events remain. Customer V1 Replay retrieval then returned `API_KEY_INVALID`, so end-user Replay-after-change is not qualified. |
| Trust Memory chronology | PARTIAL. Service-role inspection found 22 synthetic Gamma/fixture Trust Memory entries, including 5 canonical transaction projections, native identity, verification, authority-change and trust-gap entries. Full customer-path historical chronology is not proven. |
| OpenGraph | HOSTED GATEWAY NOT EXERCISED; PROVIDER UNQUALIFIED. Hosted OpenAPI includes `POST /api/v1/tools/opengraph/site` with `trust:request`; no authenticated gateway attempt was made, no provider flag enabled, and no real OpenGraph request occurred. |
| Judge.me | IMPLEMENTED_LOCAL / PROVIDER_UNQUALIFIED. No development-store credentials/callback were available; this optional provider alone does not block Core. |
| Hosted SDK/API parity | PARTIAL. Hosted OpenAPI exposes the route contract and the Gamma SDK used V1 registration, proof, authority, decisions, review, outcome and revocation. Full hosted parity across SDK, PowerShell, quickstart and all error cases remains unproven; local parity is covered by the regression suite. |
| Cleanup | Mutable disposable Auth users, approval rows/events, API keys, client bindings and manually seeded entities are zero. Append-only qualification evidence remains: 3 synthetic workspaces, 4 Operational Entities, 25 native Replay events, 22 Trust Memory entries, 6 canonical transactions, 69 API audit events and 2 signed heartbeat evidence records. These were retained because append-only protections and restrictive FKs correctly reject deletion; no trigger was disabled. |

The run proves the Staging domain/readiness and meaningful account/API/canonical decision paths. It does not prove external execution, mandatory runtime-failure DENY, complete authority negatives, complete customer-path Replay/Trust Memory, hosted OpenGraph dispatch, or complete Storage-through-application coverage. The reported Agent Gamma ALLOW is authorization only; no downstream action was executed or independently acknowledged.

Deployment Protection stays enabled. Use the existing authenticated `vercel curl` path, plus application session/API-key/admin credentials as appropriate. If raw HTTP automation requires a bypass header, treat Vercel bypass secrets as project-wide, keep them out of URLs/logs, and do not claim they are Staging-scoped. See the previous qualification report for the supported mechanism and scope constraints. No new bypass token or global protection change was made.

## Current local gates

| Gate | Final result |
| --- | --- |
| Staging readiness/environment/actual-route tests | 24/24 PASS |
| Security Closure | 13/13 PASS |
| Product Truth | 13/13 PASS |
| External Agent / V1 | 146/146 PASS |
| OpenGraph | 85/85 PASS |
| Canonical transaction | 213/213 PASS |
| Native identity | 29/29 PASS |
| Delegation | 43/43 PASS |
| Enforcement | 36/36 PASS |
| Replay | 14/14 PASS |
| Supabase auth | 43/43 PASS |
| Provider abstraction | 3/3 PASS |
| Judge.me local installation/boundary/webhook and provider RLS | 29/29 PASS |
| Total | **691 passed, 0 failed, 0 skipped** |
| Typecheck | PASS |
| Lint | PASS, zero warnings |
| Build | PASS, exit 0; 208/208 static pages generated |
| Diff check | PASS |

The scoped secret scanner reported one candidate in `lib/readiness/project-binding.ts`: assignment of `credentialStatus(...)` to the safe `statuses.SUPABASE_SERVICE_ROLE_KEY` field. Manual inspection confirms this is a computed status, not a credential literal. Its other finding is an existing synthetic test fixture. Raw automated result is FAILED because of this false positive; reviewed findings contain no live secret. The scanner was not weakened or allowlisted to hide the finding. No generated logs, ledgers or preservation copies are included in the proposed source changes.

Fresh regression after the hosted continuation and the two Gamma-runner-only changes: `npm run test:external-agent-platform` **147/147 PASS**; `npx tsx --test tests/agent-gamma-boundary.test.mjs tests/control-plane-evidence.test.mjs` **69/69 PASS**; `npm run typecheck` PASS. `npm run lint` returned zero errors and 17 warnings, all in ignored `tmp/hosted-qualification/*.mjs` harness files, not application source. These suite results overlap and must not be summed. The earlier 691/0/0 is the prior checkpoint baseline, not a newly rerun full-suite total.

Additional current-tree regression totals (each command reported zero failures/skips; do not sum because source files overlap between commands):

| Command | Tests passed |
| --- | ---: |
| `npm run test:security-closure` | 13/13 |
| `npm run test:product-truth` | 13/13 |
| `npm run test:canonical-trust-transaction` | 213/213 |
| `npm run test:native-verification` | 29/29 |
| `npm run test:native-delegation` | 43/43 |
| `npm run test:native-enforcement` | 36/36 |
| `npm run test:replay` | 14/14 |
| `npm run test:supabase-auth` | 43/43 |
| `npm run test:synthetic-interaction` | 54/54 |
| `npm run test:providers` | 3/3 |
| `npm run test:opengraph` | 85/85 |
| `npm run test:external-agent-platform` | 147/147 |
| `npx tsx --test tests/agent-gamma-boundary.test.mjs tests/control-plane-evidence.test.mjs` | 69/69 (overlaps external-agent suite) |

Typecheck and final production build pass. Final `git diff --check` passes with only a Git LF-to-CRLF advisory for `config/product-capabilities.json`.

Counts use each final suite run once; retries are not double-counted. The first delegation run failed a stale `WORKING` expectation; it now checks the required `WORKING_LOCAL` vocabulary and passed on rerun. The first lint run rejected the test harness variable named `module`; it was renamed and lint passed. An initial preservation copy inside the source tree affected TypeScript discovery; moving that snapshot outside the source tree preserved the files and restored a passing typecheck. No application type error was suppressed. Logs are retained in ignored `tmp/staging-origin-closure/`.

## Five-account Production transition recommendation

Read-only pseudonymous references below are derived from immutable account IDs; the founder can match them in the restricted account system. No emails, names, full IDs or secrets are published. All five are email-confirmed; no currently active ban was identified. Neither fact establishes authorization.

| Account reference | Observed signal | Classification | Proposed transition |
| --- | --- | --- | --- |
| ACCOUNT-3C4640273A | Has signed in; not inactive over 90 days | REQUIRES HUMAN DECISION | PENDING until individual review |
| ACCOUNT-79AE566A9B | Never signed in | REQUIRES HUMAN DECISION | PENDING; review whether test/unused |
| ACCOUNT-8810E679F6 | Has signed in; not inactive over 90 days | REQUIRES HUMAN DECISION | PENDING until individual review |
| ACCOUNT-A1D7358B44 | Inactive over 90 days | REQUIRES HUMAN DECISION | PENDING; review whether stale/disabled |
| ACCOUNT-B2C264D681 | Never signed in | REQUIRES HUMAN DECISION | PENDING; review whether test/unused |

This is a proposal, not an applied transition. No account can safely be declared PLATFORM ADMIN, KNOWN AUTHORISED USER, TEST or STALE/DISABLED from activity alone. Founder/CPTO must classify each account and approve an exact private UUID transition manifest. Confirmed admins and authorised users may become APPROVED; confirmed test accounts DENIED; confirmed disabled accounts SUSPENDED; unresolved accounts remain PENDING. Verify the separate server-owned admin allowlist and admin authentication. No blanket approval and no Production status writes.

## Production procedure — not authorized for execution

1. PRE-FLIGHT: stable canonical Staging READY; effective credentials verified; all mandatory hosted matrices/golden/negative/history tests pass; scope and risks reviewed; full diff and secret/artifact scan pass. Only then intentionally commit the RC and record its SHA. No automatic promotion.
2. RECOVERY/BACKUP: verify recoverable database checkpoint, isolated restore rehearsal, Storage-object/configuration backup and agreed RPO/RTO. Record recovery owner and checkpoint identifiers.
3. ACCOUNT APPROVAL TRANSITION PREPARATION: obtain explicit approval of the exact five-account manifest and admin recovery path before migrations. Actual status changes must wait until approval tables exist; do not run a nonexistent-table update before migration.
4. MAINTENANCE AND MIGRATIONS: after separate explicit Production authorization, hold business traffic, direct writes/jobs/callbacks as needed. Dry-run the reconstructed Production context, assert the exact four pending versions above, and apply in timestamp order. No history rewrites. Preserve audit and data.
5. ACCOUNT TRANSITION APPLICATION: while traffic is held, apply only the separately approved manifest with actor/time/reason/audit, expected-state and exact-count assertions. Verify the designated admin recovery path. Do not reopen with legitimate users unintentionally stranded by PENDING backfill.
6. APPLICATION: deploy the qualified compatible RC with verified Production-specific configuration. Never roll application back alone across incompatible access/schema semantics.
7. READINESS: exact Production origin/project, runtime SHA, credential probes, schema/auth/data-plane checks all pass.
8. AUTH SMOKE: approved access succeeds; all nonapproved statuses and unauthorized admin/API requests fail server-side.
9. GOLDEN: authorized bounded canary proves decision, allowed execution/acknowledgement, outcome, receipt, historical Replay and memory.
10. ZERO TRUST NEGATIVE: otherwise valid identity/authority with mandatory runtime failure DENYs, executes zero times and persists explanatory evidence.
11. TENANT/STORAGE SMOKE: bounded own-tenant positives and bidirectional denial; inspect affected rows/object integrity rather than HTTP status alone.
12. MONITOR AND CONFIRM: review errors, authentication, readiness, audit continuity, execution counters and evidence integrity; reopen only after release/security-owner signoff. Any DENY reaching execution stops release.

## Forward repair

Keep checkpoints C0 (source/config/migration/account manifest), C1 (recovery), C2 (migrated schema/access/audit), C3 (deployed readiness) and C4 (security/golden/history evidence). Preserve business records, receipts, decision snapshots, idempotency records and audit trails.

| Failure | Contain and repair forward | Recovery gate |
| --- | --- | --- |
| RLS regression | Stop affected application/direct access and jobs; correct precise owner/tenant/parent/approval predicates in a reviewed additive migration; never disable RLS | Both-direction negative and same-tenant positive matrices; C2/C4 |
| Storage regression | Keep bucket private; suspend affected signing/writes; correct case/tenant predicates and assess previously issued URLs | All seven operations, object integrity and legitimate access; C2/C4 |
| Approval failure | Keep customer access blocked; use independently verified recovery admin; repair only reviewed UUIDs with audit | Five states, exact manifest counts and immutable events; C2/C4 |
| Authentication failure | Hold protected traffic; correct issuer/project/callback/cookie/credential configuration; rotate only affected secrets through reviewed incident procedure | Session/revocation/admin/API and binding tests; C3/C4 |
| Migration/application incompatibility | Hold traffic; deploy a compatible forward fix against migrated schema; never blindly downgrade code or security migrations | Exact migration reconciliation, build and hosted suite on new SHA; C0/C3/C4 |
| API regression | Stop affected endpoints/executors; preserve idempotency state; correct the versioned public contract | SDK/examples/OpenAPI parity, error semantics, no duplicate execution; C3/C4 |
| Canonical decision failure | Stop consequential execution; preserve original requests, policies, authority/runtime snapshots and receipts; fix decision path under reviewed version | Golden ALLOW plus every negative with zero unauthorized executor calls; C4 |
| Replay historical-integrity failure | Stop release and label affected Replay unavailable; preserve original immutable evidence; repair reconstruction using original snapshots, never current-state substitution or invented history | Replay-before/after-change equality and retained chronology; C4 |

If a forward fix cannot restore invariants, rehearse recovery into an isolated project, reconcile post-checkpoint writes and object bytes, and seek explicit cutover approval. Do not assume an in-place restore or traditional app rollback is safe.

## Remaining blockers and final decision

DNS, TLS, the canonical Staging Vercel alias, Staging Supabase identity and `/api/ready=READY` are now **PROVEN_STAGING**. Production remains read-only; HEAD is still the uncommitted base `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`, not a final RC SHA. No commit, merge or Production action occurred.

Production remains **NO-GO** because the mandatory runtime-failure Zero Trust flow did not DENY (missing runtime evidence returned REVIEW), no downstream execution or independent acknowledgement was proven, the post-change Replay route could not be re-read with the test API key (`API_KEY_INVALID` despite the stored hash/active row), OpenGraph gateway authorization was not exercised hosted, hosted application-mediated Storage coverage is incomplete, and 64 schema-diff function-body differences remain unreviewed. The full authority-negative matrix and customer-path Trust Memory chronology are incomplete. Storage linter errors are classified as vendor-owned dynamic-SQL false positives, but remain visible warnings. Judge.me remains provider-unqualified and is optional to Core.

All five Production accounts remain **HUMAN DECISION REQUIRED / PENDING**. Existing pseudonymous references and a per-account transition proposal are retained above; no account transition or blanket approval is authorized. No RC commit or Production deployment is authorized by this report. Location Assurance is design-only and is explicitly not part of this release.
