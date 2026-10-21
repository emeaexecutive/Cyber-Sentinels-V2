# Production migration rehearsal — 12 October 2026

**Isolated rehearsal PASS. Production promotion remains unapproved.** No Production or Staging mutations, account transitions, ledger repairs, merges or deployments were performed in this rehearsal.

## Preserved recovery point and baseline

The original `production.dump`, created at 2026-10-12 08:26:48 UTC, is 4,103,536 bytes. SHA-256 was recomputed after rehearsal and remains `081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307`. Original manifest and all earlier backup artifacts are preserved. See [database, TLS and separate Storage evidence](PRODUCTION-BACKUP-VERIFICATION-20261012.md). The one verified Storage object is a separate capture, **not** proof of synchronized DB/Storage recovery.

Source project `kecgtsfibkypjuaxqbjx`: 119 ledger entries through `202610020001`, five Auth accounts, no approval table. A final `BEGIN READ ONLY` check at 09:17:43 UTC reconfirmed these values. This establishes unchanged relevant baseline, not a claim that other users made no concurrent business writes.

Fresh restore container `cs-recovery-migration-20261012` used pinned PostgreSQL 17.11 image `public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108`, network `none`, no published ports, original archive mount read-only, cron disabled. Pristine `recovery_validation` was cloned for each trial. The final migration target was `migration_rehearsal_guarded`. Test fixtures were written only to separate disposable databases. Application/provider credentials were synthetic; no Production credentials were needed for the local tests.

## Ordered migrations and integrity

All 15 files passed in this order, with schema changes and the corresponding ledger entry committed atomically per file:

1. `202610040001_p0p1_security_closure.sql`
2. `202610040002_account_access_approval.sql`
3. `202610040003_require_approved_accounts_for_data_api.sql`
4. `202610040004_lock_legacy_passport_decision_writes.sql`
5. `20261006105554_model_approval_evidence_lifecycle.sql`
6. `20261006110619_model_state_replay_event_contract.sql`
7. `20261007150222_account_approval_default_deny.sql`
8. `20261007150224_canonical_trust_memory_function_reconciliation.sql`
9. `20261007150835_canonical_workspace_bootstrap.sql`
10. `20261008093614_canonical_application_access_grants.sql`
11. `20261008105722_canonical_application_schema_reconciliation.sql`
12. `20261008112858_evidence_download_approval_revalidation.sql`
13. `20261008120422_authority_of_record_exact_execution.sql`
14. `20261010110000_employment_access_governance_hardening.sql`
15. `20261012084456_audited_account_approval_transition.sql`

[Machine-readable rehearsal](migration-rehearsal-20261012.json) records source and executed SQL hashes. All 11,133 original rows across 284 tables survive, comparing multisets of row-content hashes projected onto the original columns. New columns are excluded from that comparison. Only two original tables grew: migration-policy decisions 32→35 and migration ledger 119→134; every original row in both survived. The backfill creates exactly five PENDING approvals and five ACCESS_REQUESTED events, zero APPROVED accounts. These are restored copies, not live account changes.

## Failure found and forward fix

The 14 historical migrations applied successfully, but testing reproduced direct `service_role` self-approval and actorless approval. The new fifteenth migration removes direct table/column write grants on approvals and audit events, adds an actor/reason/self-approval guard, and exposes the service-only `set_account_access_status` RPC. The server action verifies the administrator session and allowlist, takes the actor from that session, requires a reason and calls the RPC. Approval and its existing append-only audit event commit together. Historical migrations were not rewritten.

The database trusts the service role to represent the server-verified administrator; it does not independently evaluate the application's administrator allowlist. A stolen service-role credential or privileged database owner remains outside this protection boundary. No claim is made that a database owner cannot alter tables.

## Executed security and application tests

- [35 restored-database approval, V1, RLS and Gateway checks](migration-approval-tests-20261012.json): unauthorized/missing-cookie admins denied; self-approval, missing actor/reason and direct updates denied; two synthetic administrators approve one another; all five restored accounts can be approved with session-derived actors and immutable events. Owner-selected live administrators remain undecided.
- All 36 stored API-key records inherit unapproved owners after backfill. The real V1 authentication implementation was exercised with a locally minted key through approval, suspension, rejection, revocation, reapproval and membership loss. Existing plaintext Production keys were neither recovered nor used; the stored-record check plus the common authentication path is the evidence for existing-key enforcement.
- The actual Trust Gateway POST handler and database dependencies passed ALLOW/REVIEW/DENY, idempotent retry, pending-account denial, tenant isolation, receipts, Replay and Trust Memory checks. Session/provider fixtures were synthetic. This was handler execution, not a hosted browser or external-provider end-to-end test.
- [25 authority checks](migration-authority-tests-20261012.json): local HTTP/MCP adapters, exact authorized execution, concurrency/idempotence, REVIEW/DENY no execution, signed receipts, immutable historical lineage and cross-tenant denial on the migrated native database.
- [Five guarded failure/repair checks](migration-failure-repair-guarded-20261012.json): injected failure rolls back DDL and ledger; retry succeeds; stale ledger rejects replay; failure in the second file preserves only the committed first; retry produces five approval rows/events exactly once.
- Full `npm test`: 2,048 passed, zero failures/skips before adding the new approval test to `test:core-closure`. Additional final targeted test results are recorded in the qualification addendum. These checks do not qualify a new hosted Staging deployment.

## Staging ledger reconciliation

Staging `agpyhygpfmppjkxwcpac` has 149 ledger rows. Compare [captured baselines](migration-baselines-20261012.json), [version reconciliation](migration-ledger-reconciliation-20261012.json), and [effective-schema results](migration-staging-comparison-20261012.json).

The restored database after the original 14 files matches the current effective Staging application schema, excluding the explicitly classified Supabase-managed `rls_auto_enable` helper. After the new fix there are five expected application differences: two table ACLs, one guard trigger and two functions. The comparison correctly reports FAIL until Staging receives and qualifies the forward fix. Six local-only and 21 Staging-only version identifiers now remain. Current schema equivalence does not prove historical SQL equivalence. Preserve all remote history; do not run blind `migration repair`, `db push --include-all`, or delete/relabel ledger entries. Review same-name/different-version pairs individually with source provenance before any separately approved ledger repair. The new fix requires ordinary forward application and hosted qualification, not a historical repair.

## Repeatable local commands

Use a new container/database/output name on every repeat. Existing artifacts are intentionally not overwritten.

```powershell
$archive = 'C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\20261012T082626Z-01474853552c4315ad62e4497df96bbe'
$suffix = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')
$target = "cs-recovery-migration-$suffix"
$database = "migration_rehearsal_$suffix"
node tools/release/recovery-restore-20261009.mjs $archive $target --execute-local "$archive\manifest.json"
if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
docker start $target
try {
  node tools/release/rehearse-production-migrations.mjs $archive $target $database
  if ($LASTEXITCODE -ne 0) { throw 'Migration rehearsal failed' }
  node tools/release/run-migration-approval-tests.mjs $archive $target $suffix $database
  if ($LASTEXITCODE -ne 0) { throw 'Application checks failed' }
} finally { docker stop $target }
```

## Reviewed Production execution plan — NOT executed

The offline generator produced `C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\reviewed-migration-plan-20261019`. Its `plan.json` SHA-256 is `9f85337601a0aa4c5fa4746d5e4a7c06fed80443f39f9178b07699f4582ac23a`. All 16 generated SQL execution hashes exactly equal the successful guarded rehearsal. The compiler removes only reviewed outer BEGIN/COMMIT wrappers, adds an exact pre-file ledger-baseline check, advisory transaction lock, 10-second lock timeout, 10-minute statement timeout and atomic ledger insert. It never connects to a database.

Before execution, Keith must approve the change, name the operator and two distinct authorized administrators, decide all five account dispositions from the private inventory, approve the account lockout/transition plan and confirm a current recovery point. Qualify the new RPC, app action and hosted admin bootstrap on Staging first. The old admin page cannot write after migration 15; coordinate the approved application release and audited account transitions. Do not approve accounts by direct SQL to avoid this sequencing constraint. Migration-induced locking/access interruption needs an approved change window; a DB-only pg_dump did not require write quiescence.

The following is the exact reviewed command sequence, **only after those gates and explicit approval**. Use a verified PostgreSQL 17 executable and the already validated CA. Never relax `verify-full`. Run in a dedicated PowerShell process without transcription, obtain the database password through the authorized dashboard workflow, and enter it only at the masked prompt. It is used transiently by libpq; do not log environment values. Do not execute this during rehearsal.

```powershell
$ErrorActionPreference = 'Stop'
$planDir = 'C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\reviewed-migration-plan-20261019'
$planHash = '9f85337601a0aa4c5fa4746d5e4a7c06fed80443f39f9178b07699f4582ac23a'
if ((Get-FileHash -LiteralPath "$planDir\plan.json" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $planHash) { throw 'Plan changed' }
$plan = Get-Content -LiteralPath "$planDir\plan.json" -Raw | ConvertFrom-Json
foreach ($m in $plan.migrations) {
  if ((Get-FileHash -LiteralPath "$planDir\$($m.name)" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $m.executionSha256) { throw 'Execution SQL changed' }
  if ((Get-FileHash -LiteralPath "supabase\migrations\$($m.name)" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $m.sourceSha256) { throw 'Source bytes changed: review/regenerate/rehearse' }
}
$pg = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
if (!(Test-Path -LiteralPath $pg)) { throw 'PostgreSQL 17 psql missing' }
$env:PGHOST = 'aws-0-eu-west-3.pooler.supabase.com'
$env:PGPORT = '5432'
$env:PGUSER = 'postgres.kecgtsfibkypjuaxqbjx'
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = 'C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\prod-supabase.cer'
$env:PGCONNECT_TIMEOUT = '15'
$env:PGOPTIONS = '-c default_transaction_read_only=off'
$secret = Read-Host 'Approved Production database password' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  & $pg -X -w -v ON_ERROR_STOP=1 -c '\conninfo'
  if ($LASTEXITCODE -ne 0) { throw 'Verified TLS connection failed' }
  foreach ($m in $plan.migrations) {
    & $pg -X -w -v ON_ERROR_STOP=1 -f "$planDir\$($m.name)"
    if ($LASTEXITCODE -ne 0) { throw "STOP: inspect failure in $($m.name); do not continue" }
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  $secret.Dispose()
}
# Close this dedicated PowerShell process to discard the remaining connection settings.
```

Verify ledger 135, all original row hashes/counts relative to the approved fresh recovery point, five account backfill rows/events, security grants and approved account outcomes before reopening customer access. If Production drifted since the 12 October snapshot, stop and repeat the rehearsal against a new preserved recovery point; this plan is not permission to ignore drift.

## Failure handling and approval boundaries

On a SQL error, stop the sequence. The current file rolls back; earlier committed files remain. Read the ledger and compare with the exact expected prefix in `plan.json`, inspect private logs, and verify data before retrying **only the first unapplied file and subsequent files**. A blind rerun from file one intentionally fails the ledger guard. If the connection dropped around COMMIT, determine commit state from the ledger before retrying. Do not infer rollback from a client disconnect alone.

The drill proves transaction rollback/retry, not a reverse migration. A committed defect requires a newly reviewed additive forward-repair migration, tested against a fresh disposable copy of the partial state and owner-approved before application. Reverting application code does not undo RLS/grants or restore account access. Destructive Production restore, reverse schema changes, migration-history repair and Storage reconciliation each require a separately approved recovery plan and write-coordination assessment. Preserve the original archive regardless of that decision.

The private owner inventory is `OWNER-ACCOUNT-REVIEW-20261012.md` beside the original archive, outside Git. It contains account UUIDs, masked emails, current status/last sign-in and workspace/API-key relationships, no passwords/key values/hashes. All five dispositions remain UNDECIDED. Keith has not yet selected the two administrators. Both Staging migrations and the application candidate were explicitly approved and qualified. Approval remains required for merge, Production deployment and Production migration execution.

## Superseding 16-migration plan � 19 October 2026

The earlier 15-migration results above remain historical evidence. The current execution commands now reference the separately preserved 19 October plan, including migration 16, `20261012122704_require_active_customer_sessions.sql`. Its expected final Production ledger count is 135. All 16 source and compiled execution hashes exactly match the successful `migration_rehearsal_session16v2` evidence beside the original archive; there were zero mismatches. Generating this plan made no Production connection. The original 15-file plan and original backup remain preserved.

The session-security delta (three functions, schema privileges and restrictive approval policy) compares equal between the isolated rehearsal database and captured Staging definitions, supplementing the earlier full application-schema comparison. See `staging-session-delta-equivalence-20261019.json`. This is effective-schema evidence, not a rewrite of historical migration names or ledger records.

The hosted human Turnstile challenge and login passed on 19 October with the exact provider hostname `staging.cybersentinels.com`. Final qualification and cleanup results are recorded in `STAGING-CLOSURE-20261019.md`. The five Production account decisions and two authorized administrator identities remain owner decisions; no live account was changed.
