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
- **Ledger drift on Staging:** 9 local migrations are unapplied there (`20260819084252`, `20260819084329`, `20260902083450`, `20260903095127`, `20260904113046`, `202609060001`, `202609060002`, `20261008120422`, `20261010110000`) and 23 remote versions are absent locally. Two numbered versions appear in both lists, which needs reconciliation. `supabase db push` is therefore unsafe and must not be used until the drift is understood.

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
