# Isolated restore execution — 9 October 2026

> Current status: see [recovery closure and matrix](recovery-closure-20261009.md). This is the historical restore-phase record. Its 51-object blocker is now resolved; its statements about no Production contact and runtime coverage describe that earlier phase.

**RECOVERY BLOCKED.** The corrected native restore completed with exit 0. Ownership/security fidelity and full service recovery are not yet proven; `isolatedRestoreValidated=false`. Production was not contacted or changed. All isolated targets are stopped and retained.

## Root cause of the first restore failure

The archive's ownership order was already correct:

| Archive position | Operation |
| --- | --- |
| TOC entry 778; list line 369 | Create `public.rls_auto_enable()`, recorded owner `postgres` |
| Extracted schema line 7661 | `ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres` |
| TOC entry 4879; list line 3588; schema line 39691 | Create `ensure_rls` |
| Schema line 39696 | `ALTER EVENT TRIGGER ensure_rls OWNER TO postgres` |

The function had the correct archived owner before trigger creation. The initial restore session was `supabase_admin`, so the trigger would initially be created by a superuser, then assigned to `postgres`. Supabase's protection rejects that intermediate superuser/non-superuser combination before the later ownership statement can execute. This is a **creation-session mismatch**, not evidence that function ownership was delayed or remapped by bootstrap.

The check is in [Supabase supautils `privileged_role.c`](https://github.com/supabase/supautils/blob/27c041d9b7c2f30ea0a628bc54f7f0ff74f12b08/src/privileged_role.c); [upstream tests](https://github.com/supabase/supautils/blob/27c041d9b7c2f30ea0a628bc54f7f0ff74f12b08/test/sql/event_triggers.sql) exercise rejection of a superuser creating a trigger over a non-superuser-owned function. The isolated runtime reproduced the same rule. No protection was disabled and neither `postgres` nor the function was elevated.

## Corrected procedure, executed

Private artifacts reside in `%LOCALAPPDATA%\CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f`.

Target `cs-recovery-20261009-739ff760-r4`, ID `b82b11579e9b0dc1bb7666e2a24b5043a0f9beb2ae536863ec7241ec01d4b863`, uses the previously pinned Supabase PostgreSQL 17.11 image, network `none`, no published ports, a read-only artifact mount, and disabled active cron jobs. It was created fresh. The source-defined NOLOGIN Realtime role was created without additional grants or elevated attributes. The validation database was created from `template0`, owned by `postgres`.

Two earlier fresh-container preparations (`r2`, `r3`) stopped on initialization-readiness checks **before database creation or restore execution**. Their preparation records are retained. Readiness was corrected to wait until the image's final PostgreSQL process (including its `.postgres-wrapp` executable name) had replaced the initialization shell and accepted connections. They are not additional failed archive restores.

The local `restore-r4.mjs` records exact invocation arguments and guards. SQL generation is offline:

1. Verify the original archive SHA-256 and the target's image, server version, isolation and cron settings.
2. Partition the archive TOC into a body list and an event-trigger list. Include **every entry exactly once**: 3,572 body entries plus all seven event-trigger entries = 3,579 listed entries. No object is omitted or disabled. This explicit partition supersedes the earlier blanket prohibition on filtered TOCs only for this complete two-phase reconstruction.
3. Extract body SQL normally, preserving all original ownership and ACL statements, and extract event-trigger SQL with `--use-set-session-authorization`. The latter emits `SET SESSION AUTHORIZATION 'postgres'` before `ensure_rls`, then `SET SESSION AUTHORIZATION 'supabase_admin'` for the six platform triggers.
4. Run body SQL, a function-owner assertion, and event-trigger SQL through one `psql --single-transaction -v ON_ERROR_STOP=1` invocation. The body includes schema/functions, their ownership, table data and ordinary post-data objects. The final phase creates the event triggers as their archived owners. Existing privilege separation is preserved.

Exact extraction and restore commands for the prepared artifact names:

```powershell
# Only after the fresh target and archive identity guards in restore-r4.mjs pass.
$recoveryDir = Join-Path $env:LOCALAPPDATA 'CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f'
$restoreExe = 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe'
& $restoreExe --use-list "$recoveryDir/restore-r4-body.list" --file "$recoveryDir/restore-r4-body.private.sql" "$recoveryDir/production.dump"
if ($LASTEXITCODE -ne 0) { throw 'Body extraction failed' }
& $restoreExe --use-list "$recoveryDir/restore-r4-events.list" --use-set-session-authorization --file "$recoveryDir/restore-r4-events.private.sql" "$recoveryDir/production.dump"
if ($LASTEXITCODE -ne 0) { throw 'Event extraction failed' }
# Already executed successfully; never rerun into this populated database.
docker exec cs-recovery-20261009-739ff760-r4 psql -X --no-password -U supabase_admin -d recovery_validation -v ON_ERROR_STOP=1 --single-transaction -f /recovery/restore-r4-body.private.sql -f /recovery/restore-r4-owner-gate.sql -f /recovery/restore-r4-events.private.sql
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; stop and retain evidence' }
```

The owner gate checks `public.rls_auto_enable()` is owned by `postgres` and that `postgres` remains non-superuser before any event trigger is created. Post-restore inspection confirms `ensure_rls` and its function both belong to `postgres`, enabled normally, and the six platform triggers/functions belong to `supabase_admin`. No `--no-owner`, `--no-acl`, clean/reset, trigger disabling, privilege escalation or Production endpoint was used.

## Validation evidence

| Gate | Result |
| --- | --- |
| Restore | PASS: complete transaction, exit 0; stdout/stderr retained |
| Table counts | PASS: all 283 archive COPY blocks match direct restored `count(*) FROM ONLY` results |
| Table contents | PASS: column lists and SHA-256 over sorted COPY rows match for all 283 tables |
| Migration ledgers | PASS against archive: application 119, Auth 82, Realtime 89, Storage 73 rows; exact content matches |
| Frozen release version inventory | All 118 frozen migration filenames occur in the ledger; extra `202610020001` is already documented as the Production head in `docs/release/FINAL_STAGING_QUALIFICATION_20261005.md`. No migration was replayed or ledger rewritten; SQL-statement/file equivalence is not claimed |
| Schemas/functions/RLS/policies | 3,291 named schema blocks on each side; 3,240 match exactly including recorded owner. All 358 policy definitions and application function definitions match. Remaining 51 differences are extension-object owner/ACL blocks |
| Ownership/grants | **NOT PASS:** 51 extension-object owner/ACL blocks record `postgres` in the archive and `supabase_admin` after extension installation; application blocks match. Example: `extensions.armor(bytea)`. This is a separate restore-fidelity issue, not an `ensure_rls` regression |
| Foreign keys | PASS: 452 FK orphan checks, zero violations, including null semantics and unvalidated-constraint inventory |
| Tenant isolation probes | PASS for tested workspace paths: owner read/update, cross-tenant read/update denial, spoofed-owner insert denial, member read, revoked-member denial and anonymous denial. Synthetic writes rolled back; no probe workspaces remain |
| Trust Event integrity | PASS: 202 canonical events verified using the repository hash implementation (unchanged from frozen release), stored-field consistency and previous links; both chain heads consistent |
| Continuity relationships | No cross-tenant canonical-event or canonical replay-session linkage mismatch; audit/replay-session/trust-memory COPY contents match archive |
| Full runtime workflows | NOT PROVEN: database-only checks do not exercise authenticated HTTP flows, provider callbacks, Storage delivery or Realtime services |

The 51 extension-object discrepancies were preserved, not silently repaired by changing protected ownership. Extension objects are installed by `CREATE EXTENSION` and their ownership is not fully reconstructed by ordinary archive function-owner statements. The next investigation should establish the source-supported extension creation/ownership context and compare effective ACLs before any further isolated correction. Restore success alone cannot waive this gate.

## Limits and disposition

- All row-count/content comparisons use **archive-derived evidence**, not an independently captured dump-time source snapshot.
- Storage has one metadata object row; external binary payloads were not backed up and are outside this PostgreSQL archive.
- `replay_events` is empty, so no data-level chain coverage is possible for that table. Native replay, audit and memory data preservation is demonstrated; polymorphic source links, external signatures and complete service behavior remain limited.
- Workspace probes are scoped evidence, not exhaustive tenant-denial proof for every API, pending/revoked account state or every table/function.
- Source cluster-global settings/memberships, original encryption keys, provider configuration and extension-version equivalence are not independently established.
- The original archive and manifest are unchanged. `isolatedRestoreValidated` remains false. All local targets are stopped; no Production connection or mutation occurred.

Evidence files in the restricted directory: `restore-r4-execution.json`, `restore-r4.stdout.private.log`, `restore-r4.stderr.private.log`, `restore-r4-validation.json`, `restore-r4-continuity.json`, `restore-r4-tenant.stdout.private.log`, `restore-r4-tenant.stderr.private.log`, `restore-r4-ledger-release-comparison.json`, and `restore-r4-result.json`. SQL extractions, TOC partitions, scripts and detailed query outputs are retained privately, not committed.
