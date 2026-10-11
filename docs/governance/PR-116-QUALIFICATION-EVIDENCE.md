# PR #116 Qualification Evidence

Evidence labels: **LOCAL** = automated test in this repository (static source assertions or PGlite SQL; PGlite is not Supabase and is never hosted RLS proof). **HOSTED** = exercised against a hosted environment. **NOT EXERCISED** = no run in this review. Nothing here is a compliance certification.

## 1. Admin and account-access evidence matrix

| Scenario | Control | LOCAL evidence | HOSTED evidence |
| --- | --- | --- | --- |
| PENDING (default) | `account_access_approvals.status` defaults to `PENDING`; middleware allows only `APPROVED`; restrictive RLS `security_closure_user_approved()` | `account-approval-default-deny` (all states), `legacy-security-closure` | NOT EXERCISED for the new migration |
| APPROVED | Same gate; `record_account_access_attempt(true)` | same | NOT EXERCISED |
| REJECTED | New status; `DENIED` rows are migrated to it. Staging has 0 `DENIED` rows | same (applies the new migration in PGlite) | NOT APPLIED to Staging |
| SUSPENDED / REVOKED | Per-request `getUser()` plus a DB approval lookup, so an issued session loses access on the next request | same; middleware source assertions | NOT EXERCISED |
| Self-approval | Approvals page blocks `userId === admin.id` for APPROVED; the admin is allowlisted, not tenant-derived | `legacy-security-closure` (static source assertion) | NOT EXERCISED. GAP: no database-level self-approval constraint |
| Existing sessions | No cached approval; every protected request re-reads the status and fails closed with 503 on lookup error | static assertions only. GAP: no behavioural test with a real JWT | NOT EXERCISED |
| Password reset | Recovery JWT or marker is quarantined to the reset path before any approval or admin logic (403 for APIs, redirect for pages); the reset request is `PUBLIC_TRANSPORT`; reset does not change approval status | `password-recovery*`, `auth-callback-redirect-security`, `supabase-ssr-auth-regression` | NOT EXERCISED |
| Protected API | `/api/*` is a customer surface by default; only transport, signed callbacks and V1 API-key routes bypass; V1 API keys inherit owner approval | `legacy-security-closure` (`approvalBoundary`, API-key test) | NOT EXERCISED |
| Employment API | Approval gate plus the workspace role in `architectureContext` (owner, admin, reviewer) | `employment-decision-governance` (API binding) | NOT EXERCISED |
| Back Office | `requireAdminPageAccess`: verified user, email allowlist, signed admin cookie; admin pages bypass the customer approval gate by design | `legacy-security-closure` | NOT EXERCISED |
| Cross-tenant | Tenant-scoped RLS composed with approval; employment service filters every lookup by enterprise | RLS composition test; employment tests | Staging harness (`tests/live/staging-security-closure.test.mjs`) exists but was NOT EXERCISED in this review |
| Login audit | `record_account_access_attempt` writes `BLOCKED_LOGIN_ATTEMPT` and `SUCCESSFUL_APPROVED_LOGIN`; audit failure fails closed | RLS test | NOT EXERCISED |
| Audit immutability | Append-only trigger on update and delete | `approval audit events cannot be rewritten or deleted` | NOT APPLIED to Staging |
| Actor anonymisation on erasure | FKs `ON DELETE SET NULL`; trigger permits only nullification of the actor or user | `account erasure anonymizes actor and subject IDs` | NOT APPLIED to Staging (currently the `user_id` FK is `CASCADE`, which deletes history) |
| Platform-admin bootstrap and recovery | Admin is an email allowlist from deployment configuration plus a verified cookie; no in-app break-glass. Recovery is an owner operation: change the allowlist in deployment configuration and redeploy | not a behavioural test | NOT EXERCISED. Owner must document the recovery contact |

## 2. Migration `20261010110000_employment_access_governance_hardening`

Status: **NOT APPLIED** to Staging or Production.

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
| Staging-only, no local file (historical rehearsal and repair) | `20260814153327`, `20260814153337`, `20260815172418`, `20260815172840`, `20260815174612`, `20260815180521`, `20260815180807`, `20260816135031`, `20260817175111`, `20260817175137`, `20260817175421`, `20260817175448`, `20260817175455`, `20260818075422` | No local counterpart; `…175448` and `…175455` share remote hash `527d0fd5…`, so one is a duplicate replay |
| Missing migration (genuinely unapplied) | `20261008120422_authority_of_record_exact_execution` (sha `F54CA1847680ACAF`), `20261010110000_employment_access_governance_hardening` | Not in the remote ledger |

Nothing is classified as superseded or as an unresolved conflict yet, because that needs a schema-level comparison. Applying `20261010110000` before `20261008120422` is out of order, so the CLI would refuse it without an include-all flag, which must not be used blindly.

Forward-only plan (needs owner approval before any hosted write):

1. Compare the effective Staging schema with a fresh database built from the local migrations (the repo's `schema-equivalence` and `reviewed-schema-equivalences.json` tooling) to settle the "same name, different version" and "Staging-only" rows.
2. Check the privileges the historical marker would have set.
3. Record accepted equivalences. Any version rename in the ledger needs explicit approval, because `migration repair` rewrites history and is forbidden without it.
4. Apply `20261008120422`, then `20261010110000`, one at a time with the guarded script, verifying after each.

Constraint and idempotency review: the DDL uses `if not exists` / `drop ... if exists`; the unconditional `drop constraint` on `status_check` follows the add in the same transaction. It is wrapped in one transaction (`begin`/`commit`), so a failure rolls back completely. Status rows are rewritten from `DENIED` to `REJECTED` (0 rows on Staging; Production not inspected).

Staging execution plan (needs explicit owner approval; none given):

1. Owner confirms the target is `agpyhygpfmppjkxwcpac` and takes or confirms a restorable Staging copy.
2. Reconcile the ledger drift first (identify which of the 9 local-only versions are genuinely unapplied versus applied under another version).
3. Apply this single file through the guarded script with the exact project ref. Never use `db push` against the whole ledger.
4. Re-run the metadata preflight; run `tests/live/staging-security-closure.test.mjs` with Staging credentials; run `supabase db lint --linked --project-ref agpyhygpfmppjkxwcpac --schema public --level error --fail-on error`.
5. Verify: status constraint shows `REJECTED`, both triggers exist, `user_id` is nullable with `SET NULL`, and an approval transition writes one audit row.

Rollback / forward repair: the migration is transactional, so failure leaves Staging unchanged. After success, prefer forward repair. Reverting the status constraint would reject new `REJECTED` rows. Restoring `ON DELETE CASCADE` would reintroduce loss of audit history on erasure, so it is not recommended. If needed, drop the two triggers (the append-only guard and the trust-memory projection); both are additive.

Production: no application without a separate approval after Staging evidence.

## 3. Employment Decision Governance coverage

Covered, with the existing building blocks reused and no second decision engine: AI finding with model and provider provenance; policy version binding; Evidence Graph, Replay and Trust Memory reconciliation against a canonical transaction; reviewer identity and current Trust Contract authority; independent-review rationale; challenges and evidence-backed overrides; human determination; disclosure with delivery-receipt matching; hash-chained Trust Events; Trust Memory projection; tenant-scoped queries; opaque references.

Missing or customer-owned (documented, not built): DPIA, candidate-notice content, retention schedule, an automated test of the Preview or Staging employment API with a real session, and a legal conclusion on applicability.

## 4. Remaining-risk register

| Risk | Owner | State |
| --- | --- | --- |
| Migration unapplied; ledger drift on Staging | Platform owner | Open |
| Hosted RLS for the new migration not exercised | Platform owner | Open |
| Preview has no public Supabase configuration for this branch, so protected routes return 503 (fail-closed) | Platform owner | Open |
| Vercel commit status stuck at pending although the deployment is Ready | Platform owner / Vercel | Provider discrepancy |
| No database-level self-approval constraint | Engineering | Open |
| No behavioural session-revocation test | Engineering | Open |
| Fresh Production recovery point not created (see `recovery-capture-runbook.md`) | Owners | Blocked |
| Legal applicability, DPIA, notices, retention | Legal / DPO | Open |
| `app/about-us/page.tsx` and `docs/SUPABASE-MIGRATION-RECONCILIATION.md` have unrelated uncommitted edits (the latter appears to delete `supabase/config.toml` from a table cell) | Author | Left untouched |

## 5. Incident ledger (retrieved 2026-10-11; 48-hour window)

Collected: GitHub Actions runs, GitHub commit statuses, the Vercel deployment build log and Preview environment-variable names. **Not collected in this review:** Supabase Auth, database, PostgREST, Storage and Edge Function logs, and Vercel runtime logs. Those remain unverified rather than clean.

| Time (UTC) | Source | Incident | Cause | Remediation | Current state |
| --- | --- | --- | --- | --- | --- |
| 2026-10-10 15:56-16:12 | Actions run `38065632277` (head `26f3dd2`), `38066091406` (`cb35a3b`), `38066749053` (`3bfdc0a`) | Redacted secret scan failed on three heads | Historical synthetic fixture matched a secret rule | Fixture changed and one exact fingerprint allow-listed | HISTORICAL. Later heads `62708e9`, `b98d594`, `a2e8be8`, `5858ddf` all pass |
| 2026-10-10 (earlier head) | CodeQL | Clear-text logging alert in the live Staging harness | Fixture IDs were logged | Counts-only logging | HISTORICAL. CodeQL passed on all heads after the fix |
| 2026-10-10 16:37 | Vercel `dpl_FTZsTeavQwXMyPrTaKZoJfHpKojQ` (head `5858ddf`) | GitHub commit status stays "pending" | Deployment log shows build completed and status Ready; the commit status was never updated | None possible from the repository | ACTIVE provider discrepancy. Not treated as a pass |
| 2026-10-11 | Preview `/admin/access-approvals`, `/api/employment/decisions` return 503 | Protected routes unavailable | Not an application defect: for this branch only the secret `SUPABASE_URL` is set. `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable keys are bound only to branch `fix/cpto-qualified-preview`, so the middleware fails closed (`middleware.ts` returns 503 when public Supabase configuration is absent) | None applied: creating Preview variables is a shared-infrastructure write, and the project the other branch's values point at is unverified | ACTIVE. A 503 is fail-closed behaviour, not a security PASS |
| 2026-10-11 | Staging ledger vs local | 7 local-only, 22 remote-only versions | See section 2a | Plan only | ACTIVE |
| earlier | Vercel Preview failure on an earlier head | Cause not determined | Not retrievable | None | UNRESOLVED, historical |

Required for the Preview protected-route PASS (owner action): add `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key for branch `feat/authority-of-record-tenente`, pointing only at Staging `agpyhygpfmppjkxwcpac`, and confirm the Staging database carries the approval migration. Then run the unauthenticated tests (redirect to login or 401 or 403) and authenticated tests for PENDING, APPROVED, REJECTED, SUSPENDED and REVOKED accounts with disposable Staging users. None of these has been run.
