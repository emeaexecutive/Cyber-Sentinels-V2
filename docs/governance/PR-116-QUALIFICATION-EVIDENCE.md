# PR #116 Qualification Evidence

Evidence labels: **LOCAL** = automated test in this repository (static source assertions or PGlite SQL; PGlite is not Supabase and is never hosted RLS proof). **HOSTED** = exercised against a hosted environment. **NOT EXERCISED** = no run in this review. Nothing here is a compliance certification.

## 1. Admin and account-access evidence matrix

| Scenario | Control | LOCAL evidence | HOSTED evidence |
| --- | --- | --- | --- |
| PENDING (default) | `account_access_approvals.status` defaults to `PENDING`; middleware allows only `APPROVED`; restrictive RLS `security_closure_user_approved()` | `account-approval-default-deny` (all states), `legacy-security-closure` | HOSTED PASS (Staging, section 1a): new account is `PENDING`; each state reads back correctly; a user cannot read another's approval |
| APPROVED | Same gate; `record_account_access_attempt(true)` | same | HOSTED PASS: approved account creates tenant data and records a granted login; Preview API returns 200 for its own tenant | New status; `DENIED` rows are migrated to it. Staging has 0 `DENIED` rows | same (applies the new migration in PGlite) | HOSTED PASS: `REJECTED` is a valid state and its transition is audited as `ACCESS_REJECTED`; REJECTED account is denied tenant writes and Preview API access |
| SUSPENDED / REVOKED | Per-request `getUser()` plus a DB approval lookup, so an issued session loses access on the next request | same; middleware source assertions | HOSTED PASS: SUSPENDED and REVOKED accounts are denied; an issued session that worked while APPROVED is denied on the next request after REVOKED (database and Preview API 403 `ACCESS_APPROVAL_REQUIRED`) |
| Self-approval | Approvals page blocks `userId === admin.id` for APPROVED; the admin is allowlisted, not tenant-derived | `legacy-security-closure` (static source assertion) | HOSTED PASS at the database: a customer cannot update, insert or delete approval rows, and a self-update leaves `PENDING`. The page-level admin-self-approval block is not exercised hosted. GAP: no database constraint on an admin approving their own account |
| Existing sessions | No cached approval; every protected request re-reads the status and fails closed with 503 on lookup error | static assertions only. GAP: no behavioural test with a real JWT | HOSTED PASS (see SUSPENDED / REVOKED): the JWT stays valid, so enforcement is the per-request database policy |
| Password reset | Recovery JWT or marker is quarantined to the reset path before any approval or admin logic (403 for APIs, redirect for pages); the reset request is `PUBLIC_TRANSPORT`; reset does not change approval status | `password-recovery*`, `auth-callback-redirect-security`, `supabase-ssr-auth-regression` | NOT EXERCISED hosted (local tests only) |
| Protected API | `/api/*` is a customer surface by default; only transport, signed callbacks and V1 API-key routes bypass; V1 API keys inherit owner approval | `legacy-security-closure` (`approvalBoundary`, API-key test) | HOSTED PASS on Preview: unauthenticated requests redirect to login; non-approved sessions get 403 `ACCESS_APPROVAL_REQUIRED`; cross-site or origin-less mutations get 403. V1 API-key owner-approval path NOT EXERCISED hosted |
| Employment API | Approval gate plus the workspace role in `architectureContext` (owner, admin, reviewer) | `employment-decision-governance` (API binding) | HOSTED PARTIAL: Preview read path returns 200 for an approved tenant owner; a header naming another tenant's workspace returns 403. No hosted POST of a full decision workflow (OPEN to DISCLOSE) was run |
| Back Office | `requireAdminPageAccess`: verified user, email allowlist, signed admin cookie; admin pages bypass the customer approval gate by design | `legacy-security-closure` | HOSTED PASS on Preview with a disposable allow-listed admin: no cookie is not admitted; a wrong code is rejected; the correct code issues the cookie; verified admin opens both pages with 200; a forged cookie from a non-allow-listed user is denied. The disposable admin variables were removed afterwards |
| Cross-tenant | Tenant-scoped RLS composed with approval; employment service filters every lookup by enterprise | RLS composition test; employment tests | HOSTED PASS: another approved user cannot read or update an approved user's workspace; Preview denies a foreign tenant header. The older gateway-bound harness `tests/live/staging-security-closure.test.mjs` was NOT run (the Staging origin is behind SSO and needs a matching build) |
| Login audit | `record_account_access_attempt` writes `BLOCKED_LOGIN_ATTEMPT` and `SUCCESSFUL_APPROVED_LOGIN`; audit failure fails closed | RLS test | HOSTED PASS: a blocked attempt is audited once; a non-approved account cannot record a granted login |
| Audit immutability | Append-only trigger on update and delete | `approval audit events cannot be rewritten or deleted` | HOSTED PASS: even the service role cannot update or delete an event; customers cannot read events |
| Actor anonymisation on erasure | FKs `ON DELETE SET NULL`; trigger permits only nullification of the actor or user | `account erasure anonymizes actor and subject IDs` | HOSTED PASS: deleting a user keeps every audit row and nulls the subject and actor identity (20 anonymised rows from the disposable users remain by design) |
| Platform-admin bootstrap and recovery | Admin is an email allowlist from deployment configuration plus a verified cookie; no in-app break-glass. Recovery is an owner operation: change the allowlist in deployment configuration and redeploy | not a behavioural test | NOT EXERCISED. Owner must document the recovery contact |

## 2. Migration `20261010110000_employment_access_governance_hardening`

Status: **APPLIED to Staging (`agpyhygpfmppjkxwcpac`) on 2026-10-11 with owner approval; NOT APPLIED to Production.** `20261008120422_authority_of_record_exact_execution` was applied first, then this migration, each individually and verified (section 1a).

Findings from the read-only Staging preflight (project `agpyhygpfmppjkxwcpac`, metadata SELECTs only):

- All dependency tables, the required functions and the `trust_memory_index` unique key exist; RLS is enabled on all four target tables; there is a restrictive policy on approval events.
- The `trust_events` columns used exist. **A defect was found and fixed:** the trust-memory trigger referenced `trust_events.correlation_id`, which does not exist in the repository schema or on Staging. The PGlite fixture had invented it, which masked the defect. The trigger no longer uses it; the fixture and test now match the real schema.
- The new migration sorts after every local migration.
- **Ledger drift on Staging:** a direct comparison of local files with `supabase_migrations.schema_migrations` (147 remote rows, 133 local files) gives **7 local-only and 22 remote-only versions**; the CLI's earlier 9/23 count wrongly included `202609060001/2`, which exist on both sides with identical names. See section 2a. `supabase db push` is unsafe and must not be used.

### 2a. Staging ledger reconciliation (read-only, 2026-10-11)

The ledger stores statement hashes, not file checksums, so content equality is not provable from it. Local values are SHA-256 prefixes; remote values are MD5 of the joined statements, so the two are not comparable and are listed only for later per-file review.

| Class | Versions | Basis |
| --- | --- | --- |
| Same name, different version (probably equivalent; schema comparison pending) | local `20260819084252`, `20260902083450`, `20260903095127`, `20260904113046` against remote `20260819082001`, `20260901120000`, `20260903093247`, `20260904100445`; remote `20260817175031`, `20260825175059`, `20260825175143`, `20260906155836`, `20260906165033` against local `20260817173631`, `20260824181053`, `20260824184543`, `202609060001`, `202609060002` | Identical migration name |
| Historical marker (no executable SQL, already applied to Production) | local `20260819084329_restrict_evidence_trigger_functions` (sha `7B9643C9111C9D04`) | File says "do not replay"; whether Staging has the equivalent function privileges is unverified, so a **genuine divergence cannot be ruled out** |
| Staging-only, no local file (historical rehearsal and repair) | `20260814153327`, `20260814153337`, `20260815172418`, `20260815172840`, `20260815174612`, `20260815180521`, `20260815180807`, `20260816135031`, `20260817175111`, `20260817175137`, `20260817175421`, `20260817175448`, `20260817175455`, `20260818075422` | No local counterpart; `â€¦175448` and `â€¦175455` share remote hash `527d0fd5â€¦`, so one is a duplicate replay |
| Missing migration (genuinely unapplied) | `20261008120422_authority_of_record_exact_execution` (sha `F54CA1847680ACAF`), `20261010110000_employment_access_governance_hardening` | Not in the remote ledger |

Nothing is classified as superseded or as an unresolved conflict yet, because that needs a schema-level comparison. Applying `20261010110000` before `20261008120422` is out of order, so the CLI would refuse it without an include-all flag, which must not be used blindly.

Forward-only plan, with step 4 done:

1. Compare the effective Staging schema with a fresh database built from the local migrations (the repo's `schema-equivalence` and `reviewed-schema-equivalences.json` tooling) to settle the "same name, different version" and "Staging-only" rows. **Not done.**
2. Check the privileges the historical marker would have set. **Not done.**
3. Record accepted equivalences. Any version rename in the ledger needs explicit approval, because `migration repair` rewrites history and is forbidden without it. **Not done.**
4. Apply `20261008120422`, then `20261010110000`, one at a time. **Done, individually, with verification after each.**

How they were applied: `db push` was not used. Each file was sent through `supabase db query --linked --project-ref agpyhygpfmppjkxwcpac` and its `supabase_migrations.schema_migrations` row was inserted in the same transaction. The ledger rows hold the whole file as one statement, which differs from how the CLI splits statements, so future `migration list` output may show different hashes for these two versions. The other 20 drift rows were not touched.

Constraint and idempotency review: the DDL uses `if not exists` / `drop ... if exists`; the unconditional `drop constraint` on `status_check` follows the add in the same transaction. It is wrapped in one transaction (`begin`/`commit`), so a failure rolls back completely. Status rows are rewritten from `DENIED` to `REJECTED` (0 rows on Staging; Production not inspected).

Pre-apply review of `20261008120422`: additive only (one nullable column, two function definitions, two constraint rewrites that widen the allowed values, no data deletion). Every table, column and the `extensions.digest` function it needs existed on Staging; the affected tables were small (9 delegations, 1 enforcement request, 614 replay events) and their counts were unchanged afterwards. Its grants are `service_role` only.

Pre-apply backup: Staging has **no backups and no PITR** (`backups list` is empty). That was not a pre-apply backup. As a substitute, a restricted local snapshot of the affected function and constraint definitions and the 16 approval and 30 event rows was saved outside Git (sha256 `ACDCEA8D6D6121E9C5C8D3CE4854F8BA6C79F98B203441A97B7D0D804A8ED36B`). It is a mitigation, not a recovery point.

Staging execution record (approved by the owner on 2026-10-11):

1. Target confirmed as `agpyhygpfmppjkxwcpac`; the Production ref was explicitly refused in the command.
2. Ledger drift for the other versions was not reconciled first (steps 1 to 3 above remain open).
3. Applied the two files individually, never `db push`.
4. Post-checks: the status constraints show the new values, both triggers exist, `user_id` is nullable with `SET NULL`, execute rights stay off for `anon` and `authenticated`, row counts are unchanged (16 approvals, 30 events, 0 `DENIED`), and `supabase db lint --linked --schema public --level error` exits 0.
5. Hosted tests: section 1a.

Rollback / forward repair: the migration is transactional, so failure leaves Staging unchanged. After success, prefer forward repair. Reverting the status constraint would reject new `REJECTED` rows. Restoring `ON DELETE CASCADE` would reintroduce loss of audit history on erasure, so it is not recommended. If needed, drop the two triggers (the append-only guard and the trust-memory projection); both are additive.

Production: no application without a separate approval after Staging evidence.

### 1a. Hosted evidence (2026-10-11)

Hosted Staging, `tests/live/staging-approval-lifecycle.test.mjs`: 9 tests and 35 checks passed against project `agpyhygpfmppjkxwcpac` with disposable users. It covers the lifecycle for PENDING, APPROVED, REJECTED, SUSPENDED and REVOKED, tenant-write denial, the login-attempt RPC, customer self-approval and write denial, immediate loss of access for an issued session after revocation, cross-tenant read and update denial, audit immutability, and erasure anonymisation. Fixtures were removed (0 users and 0 workspaces left). The run used a service-role key only inside the process and logged counts and check names only.

Hosted Trust Memory trigger: a block run on Staging inside a transaction that is always rolled back confirmed that a `governance.employment_decision.*` event on the real `trust_events` table projects to `trust_memory_index` with domain `EMPLOYMENT` and the event hash, and that another governance event does not.

Hosted Preview, deployment `rcmxnb6jd` built from head `93adf0e` (26 of 26 checks, via the authenticated Vercel CLI session because the Preview sits behind Vercel SSO): the matrix in section 1 for unauthenticated, non-approved, approved, cross-tenant, revoked-session, CSRF, platform-admin and forged-cookie cases. Before the Staging configuration was set, the same routes returned 503 and 500; the runtime logs gave the exact causes (`NEXT_PUBLIC_SUPABASE_*` missing, then `SUPABASE_SERVICE_ROLE_KEY` missing, then `ADMIN_EMAILS` missing), and these were configuration gaps, not application defects.

Not covered by any hosted run: password-reset bypass, V1 API-key approval inheritance, a complete employment workflow from OPEN to DISCLOSE through the API, the older gateway harness, and the admin self-approval block on the page.

## 3. Employment Decision Governance coverage

Covered, with the existing building blocks reused and no second decision engine: AI finding with model and provider provenance; policy version binding; Evidence Graph, Replay and Trust Memory reconciliation against a canonical transaction; reviewer identity and current Trust Contract authority; independent-review rationale; challenges and evidence-backed overrides; human determination; disclosure with delivery-receipt matching; hash-chained Trust Events; Trust Memory projection; tenant-scoped queries; opaque references.

Missing or customer-owned (documented, not built): DPIA, candidate-notice content, retention schedule, a hosted run of the full OPEN-to-DISCLOSE workflow through the API (only the read path and tenant denial were exercised on Preview), and a legal conclusion on applicability.

## 4. Remaining-risk register

| Risk | Owner | State |
| --- | --- | --- |
| Migrations applied to Staging only; Production not applied; 20 other Staging ledger rows unreconciled and the two new ledger rows were written by SQL, not the CLI | Platform owner | Open |
| Hosted RLS and approval lifecycle verified on Staging only (35 checks); not verified on Production | Platform owner | Open for Production |
| Preview protected routes (resolved): public Supabase variables were missing for this branch | Platform owner | Resolved 2026-10-11; verified by 26 hosted checks |
| Preview now holds a Staging service-role key (sensitive, branch-scoped) for any deployment of this branch | Platform owner | Open. Remove the variable when qualification ends |
| Vercel commit status can sit at pending after a redeploy of the same SHA | Platform owner / Vercel | Provider behaviour; status was `success` when the deployment completed |
| No database-level self-approval constraint | Engineering | Open |
| Staging has no backups and no PITR | Platform owner | Open |
| Password-reset bypass, V1 API-key approval and a full OPEN-to-DISCLOSE employment run are not covered hosted | Engineering | Open |
| Production lacks the approval schema (15 migrations behind); backfill would mark 5 existing users `PENDING` (section 6) | Platform owner | **P1 blocker for Production** |
| Fresh Production recovery point not created (see `recovery-capture-runbook.md`) | Owners | Blocked |
| Legal applicability, DPIA, notices, retention | Legal / DPO | Open |
| `app/about-us/page.tsx` and `docs/SUPABASE-MIGRATION-RECONCILIATION.md` have unrelated uncommitted edits (the latter appears to delete `supabase/config.toml` from a table cell) | Author | Left untouched |

## 5. Incident ledger (retrieved 2026-10-11; 48-hour window)

Collected: GitHub Actions runs, GitHub commit statuses, the Vercel deployment build log, Vercel runtime error logs for the Preview, and Preview environment-variable names. **Not collected in this review:** Supabase Auth, database, PostgREST, Storage and Edge Function logs. Those remain unverified rather than clean.

| Time (UTC) | Source | Incident | Cause | Remediation | Current state |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 15:56-16:12 | Actions run `38065632277` (head `26f3dd2`), `38066091406` (`cb35a3b`), `38066749053` (`3bfdc0a`) | Redacted secret scan failed on three heads | Historical synthetic fixture matched a secret rule | Fixture changed and one exact fingerprint allow-listed | HISTORICAL. Later heads `62708e9`, `b98d594`, `a2e8be8`, `5858ddf` all pass |
| 2026-10-10 (earlier head) | CodeQL | Clear-text logging alert in the live Staging harness | Fixture IDs were logged | Counts-only logging | HISTORICAL. CodeQL passed on all heads after the fix |
| 2026-10-10 16:37 | Vercel `dpl_FTZsTeavQwXMyPrTaKZoJfHpKojQ` (head `5858ddf`) | GitHub commit status stays "pending" | The deployment finished and was Ready; that commit's status was not updated before the branch moved on | None possible from the repository | HISTORICAL. For head `93adf0e`, deployment `dpl_884rUeSvK2Md1NYmde8gqYPUZFxD` reports meta commit SHA `93adf0e` and the GitHub status reached `success` ("Deployment has completed") |
| 2026-10-11 | Preview `/admin/access-approvals`, `/api/employment/decisions` return 503, then 500, then admin redirects | Protected routes unavailable | Runtime logs: `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` missing for this branch; then `SUPABASE_SERVICE_ROLE_KEY` missing; then `ADMIN_EMAILS` missing | Owner-approved branch-scoped Staging variables added; Preview rebuilt | RESOLVED. 26 of 26 hosted route checks pass on deployment `rcmxnb6jd` |
| 2026-10-11 | Staging ledger vs local | 7 local-only, 22 remote-only versions | See section 2a | The two genuinely unapplied versions were applied; the rest is unreconciled | ACTIVE for the 20 remaining rows |
| earlier | Vercel Preview failure on an earlier head | Cause not determined | Not retrievable | None | UNRESOLVED, historical |

Preview protected-route result: see section 1a. The Preview variables set for this branch are the Staging public URL and anon key, a sensitive Staging service-role key, and (temporarily, since removed) a disposable admin allow-list entry and access code.

## 6. Production schema compatibility (read-only, 2026-10-11)

Metadata and count-only SELECTs against Production `kecgtsfibkypjuaxqbjx`; nothing was written. The reads used the authenticated Supabase CLI session, whose temporary login role was not confirmed as read-only, so this does not satisfy the backup runbook's read-only database credential requirement.

| Check | Production | Staging (after this review) |
| --- | --- | --- |
| Latest ledger version | `202610020001` (119 rows) | includes `20261010110000` |
| `account_access_approvals`, `account_access_approval_events` | **Do not exist** | exist, hardened |
| `security_closure_user_approved`, `record_account_access_attempt`, `audit_account_access_status_change` | **Missing** | present |
| Local migrations Production lacks | **15** (`202610040001` to `20261010110000`) | none of those 15 are unapplied |
| Users | 5 (1 with a sign-in in the last 30 days) | disposable |

Consequence (**P1 release blocker**): the PR's middleware and routes assume the approval tables. `202610040002_account_access_approval.sql` backfills every existing user as `PENDING`, so applying the chain to Production without a plan would lock out all five existing accounts, and V1 API keys inherit the owner's approval state. Deploying the application first would make protected routes fail closed.

Required before any Production promotion (all owner decisions, none performed):

1. Apply the 15 missing migrations to Production in order, one at a time, in an approved change window, only after a verified fresh recovery point exists (the Production recovery point is BLOCKED).
2. Decide which of the 5 existing users are legitimate, and approve them as a platform admin immediately after the approval migration, using an audited path (not a direct row edit), before the application release.
3. Confirm any V1 API-key owners are approved first.
4. Set the Production admin allow-list and access code deliberately (never reuse the Preview values).
5. Re-run the hosted approval lifecycle test and the Preview matrix against a Production-like Staging first, then verify Production with read-only checks.
