# Production recovery procedure

Production remains frozen at `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`, deployment `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`. This procedure does not authorize a Production migration or deployment.

## Connection prerequisite

Keith must retrieve the **existing database password** from the authorized password manager and the **direct connection or session-pooler hostname** from Supabase → project `kecgtsfibkypjuaxqbjx` → Connect. Run the script locally and enter the password at its secure prompt. Do not paste it into chat, a connection URI, a command argument, Git, or an environment file. No password reset or new database role is required by this procedure. If the existing password cannot be recovered, credential access remains blocked; do not reset it automatically.

```powershell
& .\tools\release\backup-production.ps1 -DatabaseHost 'db.kecgtsfibkypjuaxqbjx.supabase.co'
```

If the direct hostname is unreachable over IPv6, use the dashboard's session-pooler hostname on port 5432 and `-DatabaseUser 'postgres.kecgtsfibkypjuaxqbjx'`. Do not use transaction pooling.

The script requires native PostgreSQL 17.11 tools, creates a directory outside the repository with access limited to the current Windows account, dumps the whole database including Auth, Storage metadata and migration history, verifies archive readability and required object categories, and records SHA-256. The password is present only in process memory/environment while the native client runs and is restored/cleared afterward. Do not run with shell tracing or memory dumps enabled.

Classification: **SENSITIVE LOCAL RECOVERY ARTIFACT — NEVER COMMIT**. It contains sensitive account data. Archive readability is not proof of restore success. Storage object bytes are not PostgreSQL data and need a separately validated private object backup.

## Isolated restore gate

Provision a disposable **local PostgreSQL 17.11 Supabase-compatible instance** containing the required extensions and platform roles. Neither Production nor Staging may be the restore target. Use a newly created empty validation database; never use `--clean` against an existing environment.

With local authentication configured securely, execute:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\createdb.exe' --host=127.0.0.1 --port=55432 --username=postgres --no-password recovery_validation
& 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe' --host=127.0.0.1 --port=55432 --username=postgres --dbname=recovery_validation --no-password --exit-on-error --single-transaction '<restricted artifact directory>\production.dump'
```

Stop on any nonzero exit code. Do not ignore extension, ownership, ACL, constraint, function or trigger errors. A generic PostgreSQL installation without Supabase dependencies is insufficient. Retain restore logs inside the restricted artifact directory.

Compare application catalog definitions, RLS policies, owners/grants, functions, triggers, constraints, migration versions and per-table row counts with a read-only snapshot captured at dump time. Check Auth rows and Storage metadata separately. Validate the separately downloaded private Storage objects against their checksums. Record the isolated target identity, tool version, checksums, comparison results and cleanup disposition. Mark `isolatedRestoreValidated=true` only after all checks pass.

## Current readiness

Native PostgreSQL 17.11 client tools are available. The procedure is prepared; an actual fresh Production dump and isolated restore have **not** been performed. Existing database credentials and a disposable compatible server remain prerequisites. PGlite schema reconstruction is useful migration testing but is not a native backup restore test. No recoverability PASS is claimed.
