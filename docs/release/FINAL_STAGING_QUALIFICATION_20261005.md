# Final staging qualification — 2026-10-05

Continuation: see [Staging origin closure](STAGING_ORIGIN_CLOSURE_20261005.md) for the subsequent local guard/readiness fixes, reconciled migration counts and current qualification status. This report retains the observations from the earlier run.

Decision: **NO-GO**. Hosted qualification stopped at the mandatory readiness gate. No Production deployment, migration, account transition, hostname change, or secret change was performed. No hosted mutation tests were run after the gate failed.

## Candidate and hosted observations

- Git base: `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`. The workspace contains pre-existing modified and untracked release files. This is **not a final candidate SHA**; no commit was manufactured to conceal that distinction.
- Inspected Preview: `dpl_7Ci6Qf65FA1VX2gaDgg9mV1kZNTC`, `https://cyber-sentinels-v2-5p89gwge1-keith-speres-projects.vercel.app`. Vercel reports infrastructure Ready; application readiness differs.
- At `2026-10-05T09:51:08.431Z`, authenticated `/api/ready` returned `NOT_READY`, `CONFIGURATION_INVALID`, `CYBER_SENTINELS_PUBLIC_ORIGIN_INVALID`, environment `staging`, origin null, commit SHA null. Process healthy; data plane and API authentication NOT_CHECKED.
- An unauthenticated request returned HTTP 302. Deployment Protection remains enabled. The authenticated request used the existing Vercel CLI login through `vercel curl`; no application authorization was bypassed or disabled.
- `https://staging.cybersentinels.com` is the proposed origin, **not an established URL**. Vercel's domain configuration API reports no CNAME/A records, `misconfigured: true`, external Cloudflare nameservers, and recommended CNAME `cname.vercel-dns.com.`. Project domain inventory has no staging domain.
- Required DNS handoff: Cloudflare DNS-only CNAME, name `staging`, target `cname.vercel-dns.com`. Recheck Vercel's recommendation before applying. Do not change apex/www records or nameservers. Cloudflare access is unavailable in this session. No alias was bound to the unhealthy Preview.
- Supabase inventory confirms `agpyhygpfmppjkxwcpac`, Cyber Sentinels Staging, ACTIVE_HEALTHY, eu-west-3; separate from Production `kecgtsfibkypjuaxqbjx`. This confirms project identity, **not the deployed application's effective secret binding**.
- Read-only Staging query: migration head `202610040004`, 139 ledger rows, 14 PENDING approvals. `public_api_readiness_v1()` returns ready=true with no missing tables/functions. The prior report says 140 ledger rows; reconcile the discrepancy before release.
- Read-only Production query: migration head `202610020001`, 119 ledger rows; five accounts, all email-confirmed, none currently banned, two never signed in, one last signed in over 90 days ago. Categories may overlap. These signals do not establish authorization or justify approval.
- Read-only version-set comparison found 25 Staging-only identities and five Production-only identities. The five Production-only versions (`20260819084252`, `20260819084329`, `20260902083450`, `20260903095127`, `20260904113046`) are explicitly recognized as historical aliases by `tools/release/prepare-migration-context.mjs`. The 25 Staging-only identities comprise the four closure migrations plus 21 older identities; they are not automatically 25 unapplied Production changes. Use the repository's isolated history reconciliation and SQL/checksum review before determining the exact executable set.

## Environment inventory

For subsequent automated HTTP tests, retain `vercel curl` with the existing authenticated CLI session where practical. If the harness requires raw HTTP, use a protected automation bypass secret in the `x-vercel-protection-bypass` header, injected from a secret store, never URLs/logs. Vercel documents these secrets as project-wide across deployments, so do not describe one as Staging-scoped; prefer a separate Staging project before provisioning a new test secret. Application session/API-key/admin authentication remains independently required. No new bypass secret was created here. See [Vercel protection bypass documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

These statuses concern shared Preview project metadata only. They do not certify branch overrides, nonempty values, build-time values, Staging provenance, or the existing one-off deployment. No secret values are recorded. Effective Staging-only binding and exclusion of Production secrets remain unverified.

| Variable | Status |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | PRESENT |
| SUPABASE_URL | PRESENT |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PRESENT |
| SUPABASE_SERVICE_ROLE_KEY | PRESENT |
| ADMIN_EMAILS | MISSING |
| ADMIN_ACCESS_CODE | PRESENT |
| NEXT_PUBLIC_SITE_URL | PRESENT |
| CYBER_SENTINELS_ENVIRONMENT | PRESENT |
| CYBER_SENTINELS_PUBLIC_ORIGIN | PRESENT |
| API_KEY_ROTATION_SECRET | MISSING |
| PUBLIC_API_KEY_ROTATION_SECRET | PRESENT |
| CONTROL_PLANE_STAGING_QUALIFICATION | MISSING |
| OPENGRAPH_APP_ID | PRESENT |
| OPENGRAPH_PROVIDER_QUALIFIED | MISSING |
| JUDGEME_SHOP_DOMAIN | MISSING |
| JUDGEME_PRIVATE_API_TOKEN | MISSING |

The current deployed public origin is INVALID according to readiness despite the shared Preview metadata being PRESENT. The readiness code accepts either rotation-secret name, subject to minimum length; the missing primary name alone is not a failure.

## Diagnosis and required resumption sequence

1. Establish DNS control and a stable non-Production hostname. Verify DNS, TLS, project ownership and Preview-only binding before using it.
2. Prepare a reviewed, committed candidate. Configure an explicit Staging environment rather than inheriting unqualified shared Preview values. Verify both Supabase URL names, browser key, server key and all integration secrets against Staging provenance in memory, reporting statuses only. Keep live providers disabled until qualified. Supply disposable Staging admin configuration and a Staging rotation secret.
3. Resolve readiness's project-binding gap: `app/api/ready/route.ts` checks configuration presence and database schema readiness, while `lib/public-api/v1/environment.ts` validates the declared origin/environment without requiring the registered Staging Supabase project. A READY response alone currently cannot prove the requested absence of Production binding. Add explicit project/credential binding validation with negative tests before claiming this gate.
4. Resolve the narrow hostname guard mismatch: `tools/release/environment-safety.ts` and `tools/release/live-staging-guard.ts` currently reject the proposed staging subdomain as Production. After ownership/binding verification, allow only the exact registered Staging host with the exact Staging project; preserve rejection of apex, www, other subdomains, arbitrary Preview origins and the Production project. Do not remove these guards.
5. Build/deploy the immutable candidate to Preview with verified Staging-only inputs, then bind only the staging alias. Confirm callback/redirect allowlists in Staging Auth. Record deployment ID, source SHA and runtime SHA agreement.
6. Require stable-origin `/api/ready` READY, explicit Staging identity/binding, and successful designed auth/data-plane checks. Stop again on any failure.
7. Execute disposable A/B PostgREST and application API matrices, Storage matrices, hosted signup/admin lifecycle, golden/negative transactions, historical Replay, Trust Memory, OpenGraph and client parity. Record actual response codes, denial reasons, identifiers, digests, executor-call counts and cleanup verification. Do not equate a login redirect or infrastructure 401/403 with tenant isolation.

## Hosted evidence matrix

| Requested proof | Current evidence / result |
| --- | --- |
| Tenant isolation | Prior direct Staging PostgREST proof in 20261004 report; hosted application API matrix NOT RUN |
| Storage isolation | Prior direct Staging Storage proof in both directions; hosted application evidence/signing path NOT RUN |
| Account approval | Prior database/service transition proof; real signup/authenticate/admin approve/deny/suspend/revoke lifecycle NOT RUN |
| Golden Agent Flow | NOT RUN; no hosted ALLOW/execution/outcome/receipt evidence captured |
| Zero Trust negative | NOT RUN; no hosted valid-identity/authority plus failed mandatory runtime proof |
| Authority negatives | NOT RUN: revoked/expired authority, out-of-scope action/tool, wrong organisation, revoked agent |
| Replay after change | NOT RUN; historical state preservation not hosted-qualified |
| Trust Memory chronology | NOT RUN; no hosted create/grant/ALLOW/change/DENY/revoke chronology |
| OpenGraph gateway | WORKING_LOCAL; not PROVEN_STAGING; live provider UNQUALIFIED |
| Judge.me | IMPLEMENTED_LOCAL / PROVIDER_UNQUALIFIED; sandbox credentials MISSING in Preview metadata; no live ingestion proof |
| SDK/API parity | Local tests pass; hosted final-candidate parity NOT RUN |

Prior direct tests are **83/83 PASS**, recorded in `RC_STAGING_SECURITY_PROOF_20261004.md`, not rerun here. They cannot substitute for the missing hosted application evidence. Judge.me alone is not a Core blocker provided it remains an optional unqualified capability and release claims reflect that. OpenGraph must pass hosted gateway qualification if included.

Product Truth correction: Account access approval is now PARTIAL; its claim explicitly limits hosted proof to direct PostgREST. Other capabilities receive no promotion. Existing direct isolation evidence retains its explicitly limited PROVEN_STAGING scope.

## Test results

| Current-run gate | Result |
| --- | --- |
| Security Closure | 13/13 PASS |
| External Agent / V1 / client parity | 146/146 PASS |
| OpenGraph | 85/85 PASS |
| Product Truth, rerun after registry correction | 13/13 PASS |
| Counted local tests | **257 passed, 0 failed, 0 skipped** |
| Typecheck | PASS |
| Lint | PASS, no warnings |
| Build | PASS, exit 0; 208/208 static pages generated |
| git diff --check | PASS; Git emitted only its line-ending conversion notice |

Local logs: `tmp/final-qualification/`; corrected-registry validation is `test-product-truth-final.log`. The repeated Product Truth run is not double-counted. Previous broader suite totals remain historical evidence only; do not add them to this run or call them hosted results. This run executed zero hosted mutation scenarios because readiness failed.

## Production account transition proposal — NOT APPROVED / NOT APPLIED

All five current accounts remain unclassified for authorization purposes. No names, emails, tokens or per-account identifiers are included in this report. A reviewed per-account manifest is a mandatory release input; it cannot be inferred from email confirmation, workspace ownership, recent activity, or a user-editable metadata claim.

The platform owner and security reviewer must inspect identities in the restricted administrative system and populate a private manifest containing immutable user UUID, classification, evidence reference, expected current state, proposed state, approving actor UUID, reason, expiry/review date and approval reference. Freeze a digest of that manifest and reconcile its exact account set against a fresh inventory. New accounts invalidate the reviewed census until explicitly classified.

| Classification | Exact proposed disposition after PENDING backfill |
| --- | --- |
| Verified platform administrator | APPROVED only for individually reviewed UUIDs; separately verify server-owned admin allowlist and admin-cookie challenge; no automatic admin-role grant |
| Known legitimate authorised user | APPROVED only for individually reviewed UUIDs with owner authorization |
| Test account | DENIED unless explicitly retained for an approved Production purpose; no deletion in this migration |
| Unknown account | PENDING; protected access remains blocked |
| Confirmed disabled/stale account | SUSPENDED after individual review; inactivity alone is insufficient |

Current concrete safe default: five accounts receive the migration's PENDING backfill; **zero blanket approvals**. This would interrupt legitimate access, so release is blocked until an explicit per-account transition is reviewed. The two never-signed-in and one inactive signals are review candidates, not automatic classifications.

After explicit Production approval, execute only the signed manifest within the maintenance window using the established administrator/service path. Assert each UUID exists, expected state matches, actor is authorized, changed-row count equals the approved count and each transition emits the matching audit event. Populate status-specific actor/time/reason columns. Preserve ACCESS_REQUESTED and all subsequent audit events. Abort on any census/state mismatch. Prove the designated admin recovery path and approved/nonapproved access before reopening traffic. Never approve every historical account or self-approve through client metadata.

## Ordered Production release plan — preparation only

1. PRECHECK: all mandatory hosted proofs pass on one immutable SHA; zero unresolved critical findings; exact release scope and provider claims reviewed; private account manifest explicitly approved. Reconcile remote migration identities/checksums, including the 139/140 Staging discrepancy; do not assume ledger counts alone establish parity.
2. BACKUP/RECOVERY: database owner verifies a fresh recoverable checkpoint and rehearsed restore to an isolated project, records RPO/RTO, and separately inventories/backs up Storage objects and configuration. A database backup alone is not evidence of recoverable object bytes.
3. ACCOUNT TRANSITION PREPARATION: freeze manifest/census and designate verified admin plus recovery operator. Prebuild the compatible application artifact. Arrange maintenance controls for application, direct data access, workers and callbacks so intermediate schema/account states do not receive business traffic.
4. DATABASE MIGRATION: after explicit Production authorization only, generate the isolated Production migration context, perform reviewed dry-run and exact migration-set comparison. Expected closure additions are `202610040001` through `202610040004`; verify all prerequisite repairs rather than assuming Staging's ledger equals Production's. Apply in timestamp order. Halt on unexpected SQL, partial application or schema mismatch; never falsify history with repair commands.
5. ACCOUNT TRANSITION: apply only the reviewed UUID manifest while traffic remains held; verify audit, counts and designated admin recovery access. Account changes require their own explicit approval.
6. APPLICATION DEPLOYMENT: deploy the qualified compatible SHA with reviewed Production-specific configuration. No standalone rollback to an application incompatible with approval/RLS changes.
7. READINESS: require process/environment/data-plane/authentication/schema checks and runtime SHA. Production must bind to the Production project and canonical Production origin.
8. SMOKE: approved login, pending/denied/suspended/revoked denial, admin authentication, V1 credential authentication, Storage own-object access and public contract. Stop on unauthorized access or false success.
9. GOLDEN FLOW: an explicitly authorized bounded Production canary proves decision, allowed execution/acknowledgement, outcome, receipt, evidence, Replay and chronology without unintended consequential effects.
10. SECURITY NEGATIVE: valid identity/authority with failed mandatory runtime must DENY, execute zero times, persist receipt and explain historical denial; bounded tenant/authority/Storage negatives must deny.
11. MONITOR/REOPEN: release owner and security owner sign off; reopen gradually, monitor readiness, auth denials, error rate, audit completeness, executor invocations after non-ALLOW and provider outcomes. Preserve checkpoint IDs and test evidence. Any denied request reaching execution is an immediate stop.

## Forward repair and recovery checkpoints

Checkpoints: C0 immutable candidate/config/migration/account-manifest digests; C1 verified recovery resources; C2 post-migration schema/RLS/approval/audit snapshot; C3 deployed runtime/readiness; C4 smoke/golden/negative/chronology evidence. Capture only safe metadata in general logs; keep account-level material restricted.

| Failure | Containment and forward repair | Required recovery evidence |
| --- | --- | --- |
| RLS issue | Stop affected traffic, jobs and direct API access using reviewed controls; preserve logs. Add a reviewed corrective policy migration with explicit ownership/parent and approval predicates. Never disable RLS or replace with unconditional access. | Disposable same-tenant positive and bidirectional cross-tenant negative matrices pass; no leaked rows/side effects; C2/C4 renewed |
| Account approval issue | Keep customer access blocked; use independently verified admin/recovery path. Correct only approved manifest entries with actor, reason and audit trail. Never mass-approve or delete history. | Exact counts/states/events; all five lifecycle states enforced; C2/C4 renewed |
| Authentication failure | Hold protected traffic; diagnose issuer/project, redirect allowlist, cookie handling and secret provenance. Forward-deploy corrected config/code; rotate only implicated credentials under the reviewed incident process. | Login/session/revocation/admin and V1 tests; no stale access after revocation; C3/C4 renewed |
| Application incompatibility | Keep maintenance controls active. Build and deploy a compatible fix against the migrated schema; do not revert application alone. | Typecheck/lint/build and hosted release suite on new SHA; C0/C3/C4 renewed |
| API regression | Hold affected endpoints/executors, preserve idempotency records and receipts; fix versioned implementation without exposing internal routes. | SDK/PowerShell/quickstart/OpenAPI/V1 parity and duplicate-execution negatives; C3/C4 renewed |
| Storage policy issue | Keep bucket private; stop affected evidence writes/signing. Correct case/tenant/approval policies without public-read grants. Assess already issued URL lifetime if exposure occurred. | Own access works; bidirectional LIST/READ/DOWNLOAD/SIGN/UPLOAD/REPLACE/DELETE denial with object-integrity checks; C2/C4 renewed |

If forward repair cannot restore invariants, the database owner rehearses isolated restoration and reconciles post-checkpoint writes, Storage objects, receipts and audit history before any separately approved cutover. No destructive in-place restore or rollback of security migrations is assumed safe. Reopening requires the relevant checkpoint and security-owner signoff.

## AgentPass extraction assessment — provisional, no extraction

**Yes architecturally; not yet extraction-ready or hosted-qualified.** Pure identity functions can form an independent API without copying Authority Graph, Policy Engine, Decision Engine, Execution Gateway or Trust Memory. Current persistence orchestration cannot be copied wholesale: it directly updates evidence graph, Replay/Trust Memory and continuous-trust signals, and challenge consumption atomically includes those projections.

| Boundary | Exact source / proposed ownership |
| --- | --- |
| Agent registration and owner/organisation identifiers | Identity-focused parts of `lib/operational-entities/operational-entity.ts`, `server.ts`, V1 agent handlers in `lib/public-api/v1/runtime.ts`; extract only registration/bindings, not the whole mixed runtime |
| Ed25519, JWK, manifests, challenges, key possession and verification | `lib/operational-entities/native-verification.ts`; reusable canonical serialization/hash helpers in `src/lib/trust-core/canonicalize.ts` and `hash.ts` |
| Credentials, revocation and owner binding lifecycle | Identity-focused methods `registerNativeCredential`, `registerNativeManifest`, `issueStoredNativeChallenge`, `submitNativeProof`, `revokeNativeCredential`, `revokeNativeManifest`, `revokeNativeOwnerBinding` in `native-verification-server.ts`; refactor persistence/integration coupling first |
| Identity storage | `operational_entities` identity subset; `operational_entity_native_credentials`, `operational_entity_manifests`, `operational_entity_native_challenges`, `operational_entity_native_verifications`, `operational_entity_native_verification_attempts`, `operational_entity_owner_bindings`, identity evidence and client-agent bindings |
| Model/runtime claims | Signed claims and observed-binding results from native verification; claims must not become an assertion of acceptable action risk or permission |
| Cyber Sentinels retained ownership | Delegated authority modules, trust contracts, policy/decision runtime, native enforcement, execution authorization/gateway, canonical transaction receipts, Replay, evidence graph projections and Trust Memory |

Introduce a versioned identity-evidence/revocation event contract and durable delivery boundary. Keep challenge single-use consumption and identity verification atomic within AgentPass; Cyber Sentinels consumes immutable events for its own projections and decisions. Retain tenant scoping, audience checks, expiry, revocation freshness and idempotency. Test independent operation with downstream decision/memory systems absent before extraction. No repository created and no components moved.

## Remaining risks and decision

Missing DNS/control and stable binding, NOT_READY application, unverified effective Staging secrets, missing immutable candidate/runtime SHA, readiness project-binding gap, hostname guard mismatch, unresolved ledger-count discrepancy, unreviewed Production account transition, and all mandatory hosted application proofs remain release blockers. Prior report also records two Supabase Storage helper lint errors; they were not requalified here. No claim of zero unresolved critical findings can be made from this incomplete qualification.

**NO-GO.** Do not deploy Production. Resume only after the Staging setup and readiness prerequisites are satisfied; complete the missing hosted proofs before reconsidering release.
