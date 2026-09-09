# V1 database release gate — 9 September 2026

BRANCH = fix/homepage-worldid-v1-closure-20260906-141022
SOURCE HEAD QUALIFIED = 4fca3d35a7ba7d21766c1f6c6131228d27be4609
PR = #80 — https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/80
MAIN = 9a26cef8281174f7be71c42eed8caadf5e279fd0

This report accompanies an evidence-only follow-up commit. Its commit is the
reconciliation evidence HEAD; the application source and canonical migration SQL
remain unchanged. CI must be checked on that exact follow-up HEAD before merge.

## Migration reconciliation

LOCAL MIGRATION COUNT = 109 canonical; 130 in the reconstructed Staging context
STAGING MIGRATION COUNT = 130 (initially 117)
PRODUCTION MIGRATION COUNT = 108 (unchanged)
UNMATCHED STAGING VERSIONS = 0 against the reconstructed Staging context
UNMATCHED PRODUCTION VERSIONS = 20260819084252, 20260819084329, 20260902083450, 20260903095127, 20260904113046

Initial unmatched Staging versions:
20260814153327, 20260814153337, 20260815172418, 20260815172840, 20260815174612, 20260815180521, 20260815180807, 20260816135031, 20260817175031, 20260817175111, 20260817175137, 20260817175421, 20260817175448, 20260817175455, 20260818075422, 20260825175059, 20260825175143, 20260903093247, 20260904100445, 20260906155836, 20260906165033

Initial local migrations absent from Staging:
20260819082001, 20260820085027, 20260821085309, 20260821174100, 20260822124942, 20260824181053, 20260824184543, 20260901120000, 20260903093116, 20260904100313, 202609060001, 202609060002, 20260907120000

Local migrations still absent from Production:
20260901120000, 20260903093116, 20260904100313, 202609060001, 202609060002, 20260907120000

MIGRATION DRIFT ROOT CAUSE = Environment-specific historical SQL and equivalent
migrations were recorded under different remote timestamps, while several real
Staging forward changes were still missing. Exact remote definitions were
recovered; Git equivalence was additionally established where available. The
original operator is not inferred from a ledger record. One exact duplicate
domain-registry definition remains preserved as historical evidence.

STAGING RECONCILIATION ACTIONS = Archived 21 remote histories outside the global
queue; inserted eight proven local applied aliases; applied five actually
pending migrations through a target-checked isolated CLI context.

Applied aliases: 20260822124942, 20260824181053, 20260824184543, 20260901120000,
20260903093116, 20260904100313, 202609060001, 202609060002.

Actually executed migrations: 20260819082001, 20260820085027, 20260821085309,
20260821174100, 20260907120000.

STAGING MIGRATION HISTORY = RECONCILED
WORLD REPLAY MIGRATION 202609060001 = Already applied under 20260906155836; alias recorded, SQL not rerun
WORLD REPLAY HARDENING 202609060002 = Already applied under 20260906165033; alias recorded, SQL not rerun
OUTCOME REVIEW MIGRATION 20260907120000 = Applied successfully
STAGING DRY RUN = PASS, up to date
UNEXPECTED MIGRATIONS = 0

All original 117 Staging ledger rows and 108 Production ledger rows retain the
same name, statement count and SQL digest. No historical canonical SQL was
edited. No ledger entry was deleted or marked reverted. No reset occurred.
The repository's global Supabase link was not used for mutations.

## Live Staging evidence

STAGING WORLD REPLAY SCHEMA = PASS
STAGING WORLD RPC SECURITY = PASS
STAGING OUTCOME REVIEW SCHEMA = PASS
STAGING OUTCOME REVIEW RPC = PASS
STAGING RLS = PASS

The World table has RLS, unique (nullifier_digest, action), a workspace FK and
the world_id provider constraint. All five relevant RPCs deny PUBLIC, anon and
authenticated execution and allow service_role. The outcome column is nullable
JSONB with the five requested evaluation states and ALLOW/REVIEW/DENY outcomes.
Both new NOT VALID checks enforce new writes; read-only compatibility scans
found zero existing violations. Their historical migration definitions remain
unchanged.

LIVE STAGING OUTCOME REVIEW = PASS
LIVE STAGING REPLAY = PASS
LIVE STAGING TENANT ISOLATION = PASS
RECEIPT RECONSTRUCTION = PASS

The real persistence, attachment, Replay and Memory RPCs were exercised against
Staging. Original ALLOW remained ALLOW, later DENY remained DENY, and evaluation
remained CONTRADICTED. A direct decision mutation was rejected by the immutability
trigger. The application's existing receiptFromRow mapper reconstructed the live
synthetic row without changing application exports. Replay retained both values;
Memory retained separate decision-time and later-review records in order.

Isolation used effective database role authenticated with a synthetic tenant-A
subject: own-row positive control passed, tenant B's reviewed transaction was
invisible, and authenticated review attachment was denied. Service-only routing
and previous-transaction checks separately rejected cross-tenant linkage; those
privileged calls are not the proof of RLS isolation.

World replay: 10 independent concurrent Management API database calls, exactly
1 accepted and 9 WORLD_ID_NULLIFIER_REPLAY rejections, exactly 1 stored claim,
and a fresh connection replay rejected. No real provider credential was used.

CLEANUP = PASS. Outcome fixtures rolled back, including audit/event records.
World claim, synthetic workspace and membership were removed by exact fixture
identifiers. The original 36 canonical rows and 291 events remain; World claims
returned to zero.

## Production and source qualification

PRODUCTION MIGRATION HISTORY = DRIFTED
PRODUCTION FORWARD MIGRATIONS REQUIRED = 202609060001, 202609060002, 20260907120000
PRODUCTION MIGRATION PLAN = READY (not executed)

See [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md) for the three proven aliases, five
recovered Production histories, exact future dry-run set and stop conditions.
Production schema was inspected only after Staging live qualification passed.

FULL NPM TEST = PASS — 1,337 tests, 0 failures, 0 skips
LINT = PASS
TYPECHECK = PASS
BUILD = PASS
SECRET SCAN = PASS — no credentials in saved evidence
MIGRATION INTEGRITY = PASS — canonical migration SQL unchanged
CI = PASS on source HEAD above; follow-up evidence commit requires fresh CI

UNRESOLVED P0 = 0 found in this release gate
UNRESOLVED P1 = 0 found in this release gate
UNRESOLVED P2 = 2 Staging Auth hardening advisories; no database-gate blocker

PR #80 = Database and local source gates PASS; follow-up commit CI must pass before merge.
DECISION OUTCOME REVIEW = WORKING / LIVE STAGING QUALIFIED
WORLD ID = IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED
PRODUCTION CHANGED = NO
PRODUCTION API = NO-GO
MERGED = NO
PRODUCTION DEPLOYED = NO

The CLI emitted a nonblocking local pg-delta catalog-cache warning because
Docker Desktop was unavailable after the five successful SQL migrations; the
subsequent remote dry-run independently confirmed no pending migrations.
One qualification fixture initially omitted required workflowId and was fixed
before the successful run. A cleanup verification initially used an incorrect
membership table name; the transaction rolled back, then exact cleanup using
workspace_members succeeded. No application or database fix was needed.

The Staging security advisor reports two Auth configuration follow-ups:
[leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [MFA options](https://supabase.com/docs/guides/auth/auth-mfa). These settings
were not changed. Its three callable-definer warnings concern existing RLS
helpers that use auth.uid() and an empty search_path; their definitions were
inspected and the authenticated tenant-isolation test passed. The 17
RLS-without-policy informational notices describe deny-by-default tables,
including the intentionally service-only World claim table. No RLS grant was
widened to silence an advisory.

## Evidence and reproduction

- [RECONCILIATION_PLAN.md](RECONCILIATION_PLAN.md): plan written before repairs, per-version evidence and full comparison.
- [initial-ledgers.json](initial-ledgers.json), [final-ledgers.json](final-ledgers.json): immutable history comparison.
- [provenance.json](provenance.json), [mismatch-summary.json](mismatch-summary.json): recovered definitions and version sets.
- [security-verification.json](security-verification.json): live grants, RLS, constraints and compatibility.
- [live-outcome-review.json](live-outcome-review.json): synthetic row, Replay, Memory and authenticated isolation results.
- [live-world-replay.json](live-world-replay.json): all ten concurrent results, fresh connection rejection and cleanup.
- [production-schema-readonly.json](production-schema-readonly.json): Production schema audit.
- Run `node tools/release/verify-live-review-receipt.mjs` to repeat receipt reconstruction from saved live evidence.
- Run `node tools/release/prepare-migration-context.mjs staging` to prepare a local, unlinked 130-file context. Database linkage and execution are separate.
- `supabase/qualification/v1-outcome-review.sql` is a rollback-only Staging qualification, to be executed only through an explicitly target-checked Staging connection.
