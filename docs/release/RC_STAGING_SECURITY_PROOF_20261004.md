# Release Candidate Staging Security Proof

Date: 2026-10-04\
Staging project: `agpyhygpfmppjkxwcpac` (`Cyber Sentinels Staging`)\
Production project: `kecgtsfibkypjuaxqbjx` (read-only throughout this exercise)\
Branch: `fix/p0p1-production-security-closure`

**Historical snapshot:** This document records the 2026-10-04 DNS-blocked Preview checkpoint. DNS, Vercel binding and `/api/ready` changed on 2026-10-05; the current continuation, hosted qualification results, and superseding decision are in [STAGING_ORIGIN_CLOSURE_20261005.md](STAGING_ORIGIN_CLOSURE_20261005.md). This historical NO-GO remains valid for its checkpoint.

## Result

Staging database security closure: **PROVEN_STAGING** for the direct PostgREST, Storage, and account-approval checks below. Vercel Preview readiness and hosted application/API flows, full canonical agent golden flows, Judge.me sandbox, and real OpenGraph provider remain **UNPROVEN**. Production is **NO-GO**.

## Environment Matrix

Values and credentials were not printed.

| Variable | Local | Preview branch | Staging | Production | Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | MISSING | Supplied only to one-off Preview as Staging URL; not persisted | PRESENT, Staging URL | PRESENT, Production scope | Yes | Branch config unavailable |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | MISSING | Supplied only to one-off Preview as Staging anon key; not persisted | PRESENT, anon key | PRESENT, Production scope | Yes | Branch config unavailable |
| `SUPABASE_SERVICE_ROLE_KEY` | MISSING | Supplied only to one-off Preview; not persisted | PRESENT, service-role key | PRESENT, Production scope | Server runtime | Branch config unavailable |
| `ADMIN_EMAILS` | MISSING | Supplied only to one-off Preview for a disposable Staging admin | Not a DB variable | PRESENT, Production scope | Admin workflows | Hosted workflow unverified |
| `ADMIN_ACCESS_CODE` | MISSING | Supplied only to one-off Preview; not persisted | Not a DB variable | PRESENT, Production scope | Admin workflows | Hosted workflow unverified |
| `NEXT_PUBLIC_SITE_URL` | MISSING | MISSING for this branch | Not a DB variable | PRESENT, Production scope | Some callbacks | Preview blocker for those callbacks |
| `CYBER_SENTINELS_ENVIRONMENT` | MISSING | Set to `staging` only for one-off Preview; not persisted | Explicit Staging project identity | PRESENT in Production deployment configuration | Runtime classification | Readiness still blocked |
| `CYBER_SENTINELS_PUBLIC_ORIGIN` | MISSING | MISSING; readiness returned `CYBER_SENTINELS_PUBLIC_ORIGIN_INVALID` | No stable Staging origin configured | Production origin configured | Stable customer origin | BLOCKER; `*.vercel.app` is rejected for Staging |
| `CONTROL_PLANE_STAGING_QUALIFICATION` | MISSING | Set true only for one-off Preview; not persisted | Staging-only | Not required for Production | Staging control-plane qualification | Not hosted-qualified |
| `OPENGRAPH_APP_ID` | MISSING | Shared Preview metadata says PRESENT; current branch pull says MISSING | Not configured for this release | Shared Production metadata says PRESENT | Real provider execution only | UNVERIFIED; provider remains disabled |
| `OPENGRAPH_PROVIDER_QUALIFIED` | MISSING | Explicitly false in one-off Preview; not persisted | Not enabled | Not enabled | No; explicit qualification gate | Correctly disabled |
| `JUDGEME_SHOP_DOMAIN` | MISSING | MISSING | MISSING | MISSING | Judge.me sandbox/live only | BLOCKED_EXTERNAL |
| `JUDGEME_PRIVATE_API_TOKEN` | MISSING | MISSING | MISSING | MISSING | Judge.me sandbox/live only | BLOCKED_EXTERNAL |

Vercel reports `fix/p0p1-production-security-closure` is not present in its connected Git repository, so branch-specific environment configuration remains unavailable. The final one-off Preview was built from the local workspace with Staging-only values passed to that deployment; no project or branch variables were persisted. Deployment: `https://cyber-sentinels-v2-5p89gwge1-keith-speres-projects.vercel.app`, with Vercel Deployment Protection enabled. Authenticated `/api/ready` returned `NOT_READY` / `CONFIGURATION_INVALID` because `CYBER_SENTINELS_PUBLIC_ORIGIN` is absent. The validator rejects `*.vercel.app` as a stable Staging customer origin. No Staging subdomain is configured, so no arbitrary origin was supplied. The unused disposable Staging admin fixture was deleted with HTTP 200. No Production deployment or alias was changed.

## Migration Results

All migrations were targeted to Staging using an isolated, unlinked history context prepared by `tools/release/prepare-migration-context.mjs staging`; `--skip-vault` was used. The current Staging ledger contains 139 versions and has no local/remote mismatch in the reconstructed context.

| Migration | Timestamp / ID | Result | Objects / effect |
| --- | --- | --- | --- |
| `20260926113958_restrict_internal_governance_helper_execution.sql` | `20260926113958` | APPLIED | Four SECURITY DEFINER helper RPCs remain service-role-only |
| `20260929084417_repair_execution_proof_sql_lint.sql` | `20260929084417` | APPLIED | Repairs three existing canonical persistence function errors |
| `202610020001_judgeme_installations.sql` | `202610020001` | APPLIED | Judge.me tenant installation table; no credentials configured |
| `202610040001_p0p1_security_closure.sql` | `202610040001` | APPLIED | Legacy RLS replacements, owner/parent/team checks, nullable compatibility columns, private case-prefixed Storage, audit/signal ownership triggers, certification/verifier constraints |
| `202610040002_account_access_approval.sql` | `202610040002` | APPLIED | Approval and audit tables, signup trigger/backfill, access-attempt RPC |
| `202610040003_require_approved_accounts_for_data_api.sql` | `202610040003` | APPLIED | Restrictive APPROVED-only policies across protected customer tables |
| `202610040004_lock_legacy_passport_decision_writes.sql` | `202610040004` | APPLIED | Revokes authenticated passport UPDATE; admin review uses the platform-admin server path |

The first two closure-migration attempts used a stale isolated context and failed before either closure migration committed. The failed SQL was rolled back; the copied context was rebuilt, verified to contain the corrected loop, dry-run showed only the two pending migrations, and both were then applied. A later database-only approval gate was added as `040003` rather than rewriting the applied `040002` migration.

### Database Lint

Baseline Staging lint had five errors: three application-function errors and two Supabase Storage helper errors. After applying the reviewed prerequisite repairs and security migrations, the three application-function errors were gone. Two existing Storage extension lint errors remain in `storage.list_objects_with_delimiter` and `storage.search` (`v_current` record not assigned). They were present before the closure migrations and are outside this application-owned policy change; do not call the entire Staging lint clean.

## Hosted Tenant Matrix

Live test run ID: `c3be55b0-0cc4-4486-bd5d-41f58821b267`\
Result: **83/83 PASS**. The harness created Auth users/workspaces/teams and representative passports, verification cases, reports, evidence metadata, decisions, signals, agents, API-key rows and Storage objects. All were synthetic, tagged, and removed after the run. Post-run catalog counts: tagged users 0, workspaces 0, teams 0, evidence metadata 0, Storage objects 0.

Fixture identifiers (synthetic and deleted):

| Tenant | User ID | Workspace ID | Team ID | Passport ID | Case ID |
| --- | --- | --- | --- | --- | --- |
| A | `5df8394f-fa92-4736-9af7-75312ac810e2` | `d16c5591-6731-4cd1-9734-218a6b70fb57` | `8275e5cb-dde6-408f-804a-d3d4a9f9946e` | `4c6ffd00-ff00-408d-ab24-b777cf2c165a` | `c01889de-8941-4e64-8015-158c36add25a` |
| B | `17116478-dc5d-4fcf-9cd9-22024c30c811` | `5c15f8ea-9264-4801-b5f3-497c1c610e56` | `08377b39-721a-4644-acf1-44bc0405f800` | `9a3bbef2-8084-4989-bc31-e9270ed7752c` | `2e44bf3f-b522-49f2-911e-7fb20ce5a819` |

| Operation | A → B | B → A |
| --- | --- | --- |
| SELECT passports, cases, trust reports, evidence metadata, decisions, signals, agents, tenant-bound API-key rows | HTTP 200, zero rows | HTTP 200, zero rows |
| INSERT with foreign team, passport, case, or enterprise/workspace | HTTP 403, SQLSTATE `42501` | HTTP 403, SQLSTATE `42501` |
| UPDATE foreign trust report | HTTP 200, zero affected rows | HTTP 200, zero affected rows |
| DELETE foreign passport | HTTP 403, SQLSTATE `42501`; row remained | HTTP 403, SQLSTATE `42501`; row remained |
| Forge owner A with parent/team B | HTTP 403, SQLSTATE `42501` | HTTP 403, SQLSTATE `42501` |
| Customer updates own passport to verified/approved or score 100 | HTTP 403, SQLSTATE `42501`; state remained `false/pending/pending/50` | Same |

The direct requests used authenticated Supabase sessions against Staging PostgREST, not policy-text inspection.

## Storage Matrix

The `evidence-files` bucket is private. Test object paths were `<verification_case_uuid>/tenant-{a|b}-<run>.pdf`; case ownership and active team membership were resolved from Staging rows.

| Operation | Same tenant | Other tenant |
| --- | --- | --- |
| LIST prefix | HTTP 200, own object visible | HTTP 200, zero objects |
| READ / download | HTTP 200 | Storage HTTP 400 / storage code 404 |
| Create signed URL | HTTP 200 | Storage HTTP 400 / storage code 404 |
| Upload | HTTP 200 | Storage HTTP 400 / storage code 403 |
| Replace | HTTP 200 | Storage HTTP 400 / storage code 403 |
| Delete | HTTP 200, object removed | HTTP 200 empty/ineffective result; service-role check confirmed object remained |
| Service-role read | Succeeds | Succeeds only through trusted service-role fixture |

Both A→B and B→A were tested. These results cover direct Staging Storage API calls; a Vercel Preview browser download/signing path has not yet been exercised.

## Account Approval

Staging backfill at migration time: **14 existing accounts**, **13 email-confirmed**; all were intentionally set to PENDING and received `ACCESS_REQUESTED` events. No approval was inferred from account existence. After test cleanup, the staging baseline returned to 14 approval rows and 14 request events.

Hosted direct PostgREST proof:

| State / operation | Result |
| --- | --- |
| New Auth user | Created as PENDING; request event present |
| PENDING user reads own approval row | HTTP 200, status PENDING |
| PENDING user lists approvals | HTTP 200, only own row visible |
| PENDING user reads approval audit events | HTTP 403, SQLSTATE `42501` |
| PENDING user mutates own approval | HTTP 403, SQLSTATE `42501` |
| PENDING user reads/inserts protected passport | Zero rows / HTTP 403 |
| Admin service transition APPROVED | Subsequent own row visible and successful-login event recorded |
| DENIED / SUSPENDED / REVOKED | Protected SELECT returned zero rows |
| Blocked / approved login audit | `BLOCKED_LOGIN_ATTEMPT` and `SUCCESSFUL_APPROVED_LOGIN` present |

The database/service transition was tested; the Back Office UI was typechecked and built, but could not be exercised at a hosted Preview URL. Production’s 5 existing users and 3 workspaces have not been classified. Before Production, the platform owner must identify platform admins, known approved customers, test accounts, unknown accounts, and stale/disabled accounts. Do not infer approval from account existence.

## Preview, Providers, and Core Flows

- **Preview:** DEPLOYED, NOT READY. The Staging-bound build completed, but Vercel Deployment Protection is enabled and `/api/ready` returns `NOT_READY` / `CYBER_SENTINELS_PUBLIC_ORIGIN_INVALID`. The origin contract rejects the temporary `*.vercel.app` host; no stable Staging origin exists. No hosted approval workflow or OpenGraph request was exercised. No Preview project/branch variables were persisted.
- **Judge.me:** LOCAL_ONLY / PROVIDER_UNQUALIFIED. Local exact-path/HMAC tests pass; `JUDGEME_SHOP_DOMAIN` and `JUDGEME_PRIVATE_API_TOKEN` are absent in Preview and Production. No development-store installation or callback occurred.
- **OpenGraph:** GATEWAY_WORKING_LOCAL / PROVIDER_UNQUALIFIED. `POST /api/v1/tools/opengraph/site` is bearer-key authenticated, tenant/client-bound, strict-input, authority/target scoped, and runs through the canonical transaction. Default Staging execution is a deterministic no-network adapter; a real provider request requires explicit `OPENGRAPH_PROVIDER_QUALIFIED=true` and App ID. No real provider call occurred.
- **Canonical Golden Flow / runtime-failure denial / authority revoke-expiry negative flow:** NOT HOSTED_PROVEN. Existing local canonical, Ed25519, delegation, enforcement and Replay suites pass, but no Staging operational agent with a full signed credential/manifest/authority and runtime-evidence lifecycle was created through the hosted application.
- **Replay / Trust Memory:** local canonical tests prove decision-time snapshot/chronology behavior. The live RLS suite did not create a canonical transaction, so hosted historical Replay/Trust Memory after authority or policy changes remains unproven.
- **Receipt:** SHA-256 request/evidence/decision digests and persisted decision-time snapshot are present. No separate digital signature over the receipt exists; do not describe current receipts as signed or independently signed certificates.

## API and Legacy Decision Boundaries

- **PUBLIC V1:** `PUBLIC_V1_ROUTE_CONTRACT` and `/api/v1/openapi.json` are the external contract; current route inventory is generated from that allowlist, not all internal Next routes. V1 decision calls resolve tenant-bound API clients, agent bindings, current Trust Contracts and canonical transactions.
- **INTERNAL:** app-only `/api/...` routes, including legacy score projections and internal workflows; not part of the developer API contract.
- **ADMIN:** `/api/admin/...`, Back Office and the legacy passport-decision endpoint; protected by platform-admin allowlist/cookie and service-role work only after that check.
- **PROVIDER CALLBACK:** exact Judge.me webhook path; raw-body HMAC and installation validation remain mandatory.
- **ADVISORY_ONLY:** `/api/trust/check`, `/api/trust/decision`, `/api/trust-algorithm/run`, consensus projections and AI-governance analysis are being marked explicitly non-authorizing. `/api/permissions/check` is retired with HTTP 410. None may authorize consequential execution.
- **CANONICAL:** `/api/v1/trust/decisions`, `/api/trust/execute`, and the existing native delegated-enforcement transaction paths. Only the canonical transaction may authorize consequential execution.

## Entity Model and Safe Deprecation

| Source | Current consumers | Canonical equivalent | Migration difficulty | Safe deprecation path |
| --- | --- | --- | --- | --- |
| `operational_entities` | Public V1 agent lifecycle, native verification, delegation, enforcement | Authoritative autonomous actor identity/owner/runtime projection | Current canonical source | Preserve; add consumers only through server tenant resolution |
| Native credentials/manifests | Public V1 credential/proof/manifest routes, challenge verification | Agent credential and signed runtime/model claims | Medium; key/manifest lifecycle is append-only | Keep authoritative; do not store private keys or caller-asserted proof as verified |
| `public_api_agent_bindings` | V1 API-key-to-agent ownership; prevents one client claiming another agent | Tenant/client/agent binding | Low | Preserve; all new V1 tools must require binding |
| Legacy `agents` | Legacy trust-algorithm and admin/projection surfaces | `operational_entities` plus native credential/manifest | High due legacy joins and admin screens | Keep, mark projections/advisory; migrate reads/writes by consumer before deprecation |
| Legacy `ai_agents` | Legacy trust algorithm, registry/admin summaries, several old graphs | `operational_entities` plus current authority/evidence bindings | High due distinct owner fields and registry UI | Keep; do not treat registry status as canonical identity or action authority |
| Trust Contracts / authority delegations | Canonical V1 authority and native delegated evaluation | Existing canonical Authority graph | Current canonical source | Preserve; no OpenGraph bypass. Gateway rejects accepted active delegates until using the established delegated-action workflow |

AgentPass readiness: **MODULE BOUNDARY ONLY / NOT EXTRACTED**. The reusable identity surface is operational entities + native Ed25519 credentials/manifests + owner/client bindings; Authority and action decisions stay in Cyber Sentinels. TRACFACE project remains separate and inactive; no extraction or mutation occurred. TrustReplay remains a projection/add-on over canonical evidence, not a separate decision/storage system.

## Test Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors or warnings |
| `npm run build` | PASS |
| `npm run test:security-closure` | 13/13 PASS (local migrations/PGlite plus auth/API regression) |
| `npm run test:external-agent-platform` | 146/146 PASS |
| `npm run test:canonical-trust-transaction` | 213/213 PASS |
| `npm run test:native-verification` | 29/29 PASS |
| `npm run test:native-delegation` | 43/43 PASS |
| `npm run test:native-enforcement` | 36/36 PASS |
| `npm run test:replay` | 14/14 PASS |
| `npm run test:supabase-auth` | 43/43 PASS |
| `npm run test:synthetic-interaction` | 54/54 PASS |
| `npm run test:opengraph` | 85/85 PASS |
| `npm run test:live-staging-security` | 83/83 PASS; disposable objects/accounts cleaned |
| `npm run test:product-truth` | 13/13 PASS |

## Production Transition and GO/NO-GO

Production was read-only. It has 5 Auth users (all email-confirmed), 3 workspaces, 2 distinct workspace owners, 2 workspace members, and 1 active API key. Production is at application SHA `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`, database migration `202610020001`; `main` baseline is `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`. The four closure migrations `202610040001`–`202610040004` are not applied to Production. Required server env names including Supabase URL/service key and admin settings are present in Production scope; values were not read.

**Production GO/NO-GO: NO-GO.** Required gates still missing: a stable Staging origin and READY, externally consumable Preview; hosted application/API and Back Office approval proof; a complete hosted canonical golden + runtime-failure + authority-negative flow; hosted Replay after later state changes; and Judge.me sandbox proof. Preview branch configuration is unavailable because the branch is not in Vercel’s connected Git remote. Two Supabase Storage extension lint errors remain. No Production deployment or database mutation occurred.

Production promotion procedure: first push this reviewed branch and configure branch-specific Preview values bound to Staging; deploy Preview and verify the stable non-Production origin/Auth redirects; run the full hosted tests and DB lint; prepare a separately approved account transition list for the five existing Production users; then dry-run the isolated Production migration context and require the exact reviewed migration set. Apply migrations and app code as a coordinated forward-only release. If anything fails after migration, do not roll the app back alone: approval middleware expects the approval tables and the new restrictive RLS policies. Use a reviewed forward repair and preserve user states/audit records. No Production deployment is authorized by this report.
