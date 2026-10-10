# Isolated restore preflight closure — 9 October 2026

> Current status: see [recovery closure and matrix](recovery-closure-20261009.md). This is the historical preflight. Its original direct restore command is superseded by the complete two-phase procedure in isolated-restore-execution-20261009.md and the tested repository runner.

**Execution follow-up:** the original single-session command below failed on event-trigger creation identity. It is superseded by the [executed two-phase procedure and validation report](isolated-restore-execution-20261009.md). The corrected restore succeeded; recovery remains blocked by extension-object ownership differences and incomplete recovery evidence. This document retains the original preflight record.

Scope: local preflight only. No Production connection, mutation, deployment, or restore was performed. The existing database archive remains valid input to a restore test; missing supplemental evidence does not invalidate it.

| Gate | Status |
| --- | --- |
| Backup creation, readability, SHA-256 | PASS |
| Missing Realtime owner role | RESOLVED for isolated restore compatibility; bootstrapped and verified locally |
| Isolated database restore | NOT RUN |
| Recovery validation | NOT VALIDATED; full recovery PASS remains blocked by unperformed checks and evidence limitations |
| `isolatedRestoreValidated` | `false`; original manifest unchanged |

## Artifact and target identity

Restricted artifact directory: `%LOCALAPPDATA%\CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f`.

- Archive: `production.dump`, 4,103,562 bytes; SHA-256 `f5e263a834f91ba5786efaa6a7a275df95c4ede96fa6277a0b96dbdc68f73358`.
- Source database reports PostgreSQL 17.6 in the archive; dump client is 17.11. Source image patch release and hosted Realtime service version are not established by this archive.
- Target: `cs-recovery-20261009-739ff760`, ID `83d25e9363777bec2e9bac918025eb4d3ee87c00c8a56e34be220b105b8ecb17`.
- Image: `public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108` (17.11.0.004; actual server 17.11).
- Network `none`, no published ports, archive mount read-only, `cron.launch_active_jobs=off`. No Auth, Storage, Realtime, mail, or application services started against the archive.
- Required extensions available: `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`. Availability does not yet prove source/target extension-version or Vault-key equivalence.
- Target is stopped and retained. No validation database has been created; no Production data has been loaded.

## Authoritative Realtime role definition

Sources are pinned to Supabase Realtime commit `d46540b3a4a79113f40301d5e5cb690f41150b9b`, inspected locally. Relevance comes from matching migration versions **inside this archive**, not assuming the latest service version was deployed:

1. [20240401105812: create Realtime admin](https://github.com/supabase/realtime/blob/d46540b3a4a79113f40301d5e5cb690f41150b9b/lib/realtime/tenants/repo/migrations/20240401105812_create_realtime_admin_and_move_ownership.ex) defines the role and historical grants.
2. [20260707120000: restrict Realtime schema](https://github.com/supabase/realtime/blob/d46540b3a4a79113f40301d5e5cb690f41150b9b/lib/realtime/tenants/repo/migrations/20260707120000_restrict_realtime_schema.ex) repeats the role definition, moves ownership, restricts the ledger, and conditionally revokes membership from `postgres` when `supautils.policy_grants` covers both Realtime tables.
3. [20260922120000: revoke schema grant option](https://github.com/supabase/realtime/blob/d46540b3a4a79113f40301d5e5cb690f41150b9b/lib/realtime/tenants/repo/migrations/20260922120000_revoke_realtime_schema_grant_option_from_realtime_admin.ex) removes the schema grant option.

All three versions occur in the archived `realtime.schema_migrations`; the archived ledger has 89 rows and ends at `20261002120000`. The target's `supautils.policy_grants` includes both `realtime.messages` and `realtime.subscription`.

Exact role bootstrap, already executed once as the isolated image's `supabase_admin`:

```sql
CREATE ROLE supabase_realtime_admin WITH NOINHERIT NOLOGIN NOREPLICATION;
```

On a fresh PostgreSQL 17 role, omitted attributes default to `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, unlimited connection count, no expiry, no password and no role-specific settings; see [PostgreSQL 17 CREATE ROLE](https://www.postgresql.org/docs/17/sql-createrole.html). The local `pg_roles` verification confirms the boolean attributes, connection limit `-1`, null expiry/settings and zero memberships involving this role. No password was set. Do not rerun creation against the existing target or silently alter a mismatching role.

Do **not** replay the historical migrations wholesale. Ownership, schema/table/function grants, and ledger restrictions already belong to the archive and must be restored from it. In particular, do not restore the old `GRANT supabase_realtime_admin TO postgres`, add `WITH GRANT OPTION`, or grant superuser/replication/BYPASSRLS to make restoration pass. The upstream development fixture has additional convenience grants; it is not evidence of this project's cluster ACLs and was not applied.

The [Realtime PostgreSQL compatibility guidance](https://github.com/supabase/realtime/blob/d46540b3a4a79113f40301d5e5cb690f41150b9b/README.md) identifies `supabase_admin` as the migration connection role on PostgreSQL 17. The owner role is not a replacement service login. Creation from matching upstream migrations resolves restore compatibility; it does **not** prove there were no out-of-band Production changes to cluster roles, memberships, parameter ACLs, or settings. Those globals are absent from a database-only `pg_dump`.

## Archive role and Storage audit

Offline extraction produced `archive-derived-audit.json` in the restricted directory. No extracted SQL was executed.

| Finding | Evidence and consequence |
| --- | --- |
| 25 owner statements | Five Realtime types, 18 functions, two tables (`messages`, `subscription`); retain these owners |
| One explicit role ACL | `GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin`, without grant option |
| Other role-name references | 55 dump comments; no other executable schema references; no COPY data rows mentioning the role |
| Function execution | All 18 owned functions are SECURITY INVOKER; none are SECURITY DEFINER |
| Runtime dependencies | `apply_rls` and `authorize` switch execution roles; `list_changes`/`list_changes_sync` set `log_min_messages`; logical-slot functions require an appropriately privileged caller. These are not grounds to elevate the NOLOGIN owner |
| Cluster membership evidence | Database dump has no cluster role definitions/memberships; their absence cannot prove source memberships were absent |
| Row comparison evidence | Counts extracted from 283 COPY blocks, including Auth, Storage and migration ledgers; these are archive-derived, not independently captured source counts |
| Storage | One `storage.objects` metadata row; no PostgreSQL large-object TOC entries. No external Storage payload is contained in this logical database backup |

[Supabase's Storage schema documentation](https://supabase.com/docs/guides/storage/schema/design) distinguishes PostgreSQL bucket/object metadata from payload bytes held in an object provider. Restoring `storage.objects` does not restore a file. A metadata size, ETag, or embedded digest is not proof that bytes were backed up; ETags must not be presumed to be SHA-256. PostgreSQL large objects, if present in another archive, are also distinct from Supabase Storage payloads.

## Exact next restore procedure — prepared, NOT executed

Run only in a later authorized isolated-restore phase. These commands have no Production endpoints. Preserve output inside the restricted directory. Never use `--clean`, `--no-owner`, `--no-acl`, `--disable-triggers`, or a filtered TOC to bypass a restore error. Use the cluster's existing platform roles and the verified additional Realtime role; do not import application migrations on top of the backup before comparing it.

```powershell
$ErrorActionPreference = 'Stop'
$recoveryDir = Join-Path $env:LOCALAPPDATA 'CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f'
$targetName = 'cs-recovery-20261009-739ff760'
$target = (& docker inspect $targetName | ConvertFrom-Json)[0]
if ($LASTEXITCODE -ne 0 -or
    $target.Id -ne '83d25e9363777bec2e9bac918025eb4d3ee87c00c8a56e34be220b105b8ecb17' -or
    $target.Config.Image -ne 'public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108' -or
    $target.HostConfig.NetworkMode -ne 'none' -or
    @($target.HostConfig.PortBindings.PSObject.Properties).Count -ne 0 -or
    $target.Config.Labels.'cybersentinels.workstream' -ne 'isolated-production-restore') {
  throw 'Isolated target identity mismatch'
}
$mount = @($target.Mounts | Where-Object { $_.Destination -eq '/recovery' })
if ($mount.Count -ne 1 -or $mount[0].RW) { throw 'Read-only archive mount required' }
if ((Get-FileHash (Join-Path $recoveryDir 'production.dump') -Algorithm SHA256).Hash -ne
    'F5E263A834F91BA5786EFAA6A7A275DF95C4EDE96FA6277A0B96DBDC68F73358') {
  throw 'Archive checksum mismatch'
}
& docker start $targetName
if ($LASTEXITCODE -ne 0) { throw 'Target start failed' }
# Wait for readiness, at most 30 seconds; no remote probe.
$ready = $false
for ($attempt = 0; $attempt -lt 15; $attempt++) {
  & docker exec $targetName pg_isready -U supabase_admin -d postgres | Out-Null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) { throw 'Local target is not ready' }
$gate = & docker exec $targetName psql -X --no-password -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -Atc "SELECT current_setting('server_version') = '17.11' AND current_setting('cron.launch_active_jobs') = 'off' AND EXISTS (SELECT 1 FROM pg_roles r WHERE rolname = 'supabase_realtime_admin' AND NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolcanlogin AND NOT rolreplication AND NOT rolbypassrls AND rolconfig IS NULL AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid OR m.roleid=r.oid));"
if ($LASTEXITCODE -ne 0 -or $gate -ne 't') { throw 'Role/server preflight mismatch' }
$mountedHash = & docker exec $targetName sha256sum /recovery/production.dump
if ($LASTEXITCODE -ne 0 -or ($mountedHash -split '\s+')[0] -ne
    'f5e263a834f91ba5786efaa6a7a275df95c4ede96fa6277a0b96dbdc68f73358') {
  throw 'Mounted archive checksum mismatch'
}
# template0 avoids inheriting platform objects that would collide with a full dump.
& docker exec $targetName createdb --no-password -U supabase_admin --template=template0 --owner=postgres recovery_validation
if ($LASTEXITCODE -ne 0) { throw 'Fresh database creation failed; never reuse or clean an existing database' }
$priorPreference = $ErrorActionPreference
try {
  # Windows PowerShell can turn native stderr into errors; use the process exit code.
  $ErrorActionPreference = 'Continue'
  & docker exec $targetName pg_restore --no-password -U supabase_admin --dbname=recovery_validation --exit-on-error --single-transaction /recovery/production.dump 1> (Join-Path $recoveryDir 'isolated-restore.stdout.private.log') 2> (Join-Path $recoveryDir 'isolated-restore.stderr.private.log')
  $restoreExit = $LASTEXITCODE
} finally { $ErrorActionPreference = $priorPreference }
if ($restoreExit -ne 0) { throw 'Restore failed; preserve logs and stop. No validation PASS.' }
```

Use the Unix socket inside the network-disabled container. The superuser restore connection preserves original ownership without making the target `postgres` role a member of protected owner roles. If any command fails, stop further steps, retain evidence and stop this target. Do not mark PASS merely because `pg_restore` returns zero. Record start/end times and effective server, extension, collation and role configuration before interpreting results.

## Validation sequence and proof limits

1. **Restore mechanics:** require one successful, error-free atomic restore into the newly created database. Recompute the archive hash. Retain logs, target identity and elapsed restore time. This measures restore time only, not full service RTO or an accepted RPO.
2. **Migration history:** compare restored application and platform migration ledgers with the archive-extracted ledgers. Compare repository migrations at the frozen release revision; separately report missing, extra, changed and later repository migrations. Do not replay later migrations to make history match the working branch.
3. **Catalog, owners, grants, RLS:** extract target tables, columns, types, sequences, indexes, constraints, functions, triggers, publications, owners, ACLs/default ACLs, RLS enabled/forced flags and policies. Compare with archive definitions, allowing only explicitly documented PostgreSQL-version formatting differences. Verify actual role attributes and memberships separately; never infer cluster-global equivalence from object ACLs.
4. **Data and foreign keys:** compare exact per-table counts to archived COPY counts (account for partition routing; compare physical leaf counts without double counting parents). Check sequence state, uniqueness/check constraints and FK orphan queries, including constraints originally marked NOT VALID. Successful constraint creation is useful but does not cover intentionally unvalidated constraints. Add normalized per-table data digests where feasible; counts alone cannot establish content identity. Auth records and Storage metadata receive separate results.
5. **Tenant isolation and grants:** test positive owner/tenant cases and denied cross-tenant, anonymous, pending and revoked cases under actual application roles/JWT claims, never only under `supabase_admin`. Cover reads and writes. Run synthetic writes on a separate local test copy or roll them back; retain the pristine restored baseline. Test function execute grants and SECURITY DEFINER boundaries throughout the application, not only Realtime.
6. **Audit/evidence continuity:** check preserved IDs, timestamps, chains, signatures/digests, linkage and referential integrity. Distinguish internally consistent archived history from proof of completeness against external events or records absent from the dump. Encryption/signature verification needs the applicable keys; absent keys remain a limitation rather than a fabricated PASS.
7. **Critical workflows:** separately qualify authentication, core verification, trust decisions, Replay/graph/memory, reports and alerts using a fully local harness with synthetic clients and outbound operations disabled. The database-only container cannot establish end-to-end service recovery. Do not start services against restored sessions/secrets with network egress, Production URLs, mail or provider credentials. Realtime runtime checks use the appropriate caller role and local replication setup, not an elevated owner role.
8. **Storage recovery:** reconcile archived metadata to separately available private files, checking bytes, length, digest and linkage. Missing payloads prevent Storage recovery PASS but do not prevent testing the database archive. Any later object retrieval would be separately authorized and timestamped; it cannot retroactively prove dump-time byte consistency without immutable versions or matching trusted digests.
9. **Disposition:** retain per-check results and limitations, stop the isolated target, and record retention/cleanup. `isolatedRestoreValidated` remains false until required validations pass under an explicitly recorded scope; full recovery must not silently exclude unproven Storage or service workflows.

| Still provable from this archive and an isolated restore | Not provable retrospectively from this archive alone |
| --- | --- |
| Native restore success, recorded DDL/ACL/RLS/owner preservation | Independent completeness against the source database at dump time |
| Restored row counts/content against archived data; archived migration history | Missing independent source counts/catalog snapshot; exact historic cluster globals/settings |
| FK/constraint consistency, role-based tenant tests, internal audit chain checks | External audit-event completeness, source role drift, signing/decryption keys not backed up |
| Storage metadata and database references | Recovery of external object bytes; exact object state at dump time |
| Local workflows with explicit synthetic configuration | Production-equivalent Auth/provider/Realtime runtime, full RTO/RPO without end-to-end evidence |

The missing supplemental snapshots are evidence limitations, not grounds to discard this archive or block a useful native database restore test now that the owner role exists.

## Future backup enhancement plan — not executed

Inspection of `tools/release/backup-production.ps1` confirms it currently creates a full custom-format database dump, checks TOC categories/readability and hashes the archive. It does not separately capture cluster roles, a synchronized catalog/count/ledger inventory, or Storage payloads. Its `capturedAt` is a completion timestamp, not the precise exported snapshot time. Preserve its hidden credential prompt, read-only database connection, restricted filesystem ACLs, pinned client, private logs, and separate validation flag.

1. **One consistent database snapshot:** in a future explicitly authorized backup, open a read-only REPEATABLE READ coordinator transaction, export its snapshot and keep it alive while `pg_dump --snapshot=...` and read-only inventory transactions import it. Record transaction/snapshot identifiers, server/client versions, start/end UTC, encoding, locale/collation and extension versions. Coordinate schema-change freezes or appropriate locks and document concurrent-DDL limits; do not present sequential unsynchronized queries as dump-time consistency. Exercise this on local fixtures first and fail supplemental status if a worker cannot import the snapshot.
2. **Schema/catalog snapshot:** save schema-only SQL and machine-readable catalog definitions, functions/triggers/constraints/indexes/sequences/publications and extension configuration, excluding credentials from public reports. Hash every artifact. Inventory which schemas/tables were included or excluded.
3. **Table counts:** exact `count(*)` with safely quoted identifiers and explicit partition handling on the same snapshot; do not use planner estimates. Record duration and timeouts. If counting exceeds a budget, report missing evidence rather than silently substituting estimates.
4. **Migration ledgers:** save ordered rows for `supabase_migrations` and Auth/Storage/Realtime platform ledgers present in the source, including statement hashes where available. Keep sensitive migration contents private. Link the intended release SHA and migration-file hashes.
5. **Security inventory:** capture owners, ACLs and default ACLs, function security/search paths, policy expressions and role targets, RLS flags, non-secret `pg_roles` attributes, memberships with ADMIN/INHERIT/SET options, role/database settings, parameter privileges and relevant platform configuration. Do not collect password hashes. Keep cluster-global snapshot/configuration limitations explicit; a database dump does not export these globals. This inventory should detect custom roles needed for restoration.
6. **Storage metadata and payloads:** inventory all relevant buckets/objects on the database snapshot, including version, tenant/evidence linkage, size/type and recorded hashes where available. Separately download recoverable private bytes through authorized Storage APIs, store SHA-256/length and acquisition time/version, and verify a second protected copy. Use immutable versions or before/after version checks to detect changes during copying. Record unavailable/deleted objects and digest mismatches without modifying originals. External object copying is not part of PostgreSQL's transactional snapshot; explicitly record any unresolved consistency window. Never create public URLs or put bearer URLs in reports.
7. **Manifest and acceptance:** separate `archiveCreated`, `archiveReadable`, `checksumVerified`, `supplementalSnapshotComplete`, `storagePayloadsVerified` and `isolatedRestoreValidated`. Missing supplements must not retroactively mark a readable archive corrupt. Hash the evidence manifest/artifacts, preserve ACLs, and run the same isolated restore qualification before claiming recovery PASS. Adding this plan does not authorize another Production backup or any Production operation.

Private evidence retained: original manifest/dump/list, schema and data SQL extractions, `realtime-ledger.private.sql`, `archive-derived-audit.json`, pinned upstream source checkout, `isolated-role-verification.json`, original preflight report, and revised closure report. No raw backup data or extracted SQL is committed to Git.
