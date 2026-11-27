# Recovery Capture Readiness — 10 October 2026

## Current result

**No fresh Production recovery point was created.** The historical qualified isolated restore PASS and its LOCAL SECURITY HARDENING REQUIRED condition remain unchanged. The later historical Storage export/restore is preserved, but its payload capture occurred after the database dump and does not prove dump-time synchronization.

Production project binding for any future capture is `kecgtsfibkypjuaxqbjx`. Staging is `agpyhygpfmppjkxwcpac`. Do not link a Production capture to Staging.

## Verified and unverified prerequisites

- The persisted-config search found zero `capture-config.private.json` files in the restricted backup root and worktree. No database password exposure was confirmed; do not rotate solely on that disproven premise.
- The current wrapper omits database passwords from its configuration and passes configuration to the coordinator over stdin. The coordinator rejects a password field. The prompted database password is held in process memory/environment for the operation and restored/cleared in `finally`; never add it to the config, logs, artifacts, or command line.
- A read-only GET to the exact Production Storage bucket endpoint returned HTTP 200 and two buckets using the existing authenticated Supabase CLI session. No key was retained and no Production write was made. This confirms that Storage inventory endpoint only, not complete object download, DB access, or backup success.
- Production database read-only access was not confirmed in this run.
- No valid Production-bound quiescence attestation covering a fresh capture interval was available. The local proof found was not Production-bound and had expired. Never reuse it or infer a write freeze from matching metadata alone.
- Windows denied the BitLocker status query. Artifact encryption at rest is therefore unverified.
- No approved immutable/offsite destination or second-copy retention verification was identified.

## Owner actions before capture

1. Production database operator: use the authorized password manager and dashboard-provided Production connection details to confirm the existing credential with a read-only probe. Do not reset/rotate credentials as part of this run.
2. Storage/change-control owner: provide an approved Production write-quiescence change reference and attestation covering capture start through end. If it requires blocking writes, obtain explicit operational approval before changing Production behavior. Include before/after bucket and object metadata reconciliation.
3. Security/Infrastructure owner: verify encryption at rest and designate an approved immutable/offsite destination, access policy, retention period, and second-copy verification procedure. Do not add paid infrastructure without approval.
4. Backup operator: confirm the restricted local artifact ACL, PostgreSQL 17.11 tools, exact project reference, application release SHA, and sanitized deployment configuration inventory before starting the approved capture. The inventory may contain only `provider`, `environment`, `deploymentId`, `releaseSha`, `capturedAt`, and `configuration`; each configuration entry may contain only `name`, `configured`, and optional `scope` (`public`, `server`, or `shared`). Never include variable values.
5. Restore operator: identify a disposable network-isolated target and confirm pinned images/dependencies. Do not restore to Production or Staging.

After those gates pass, use `tools/release/backup-production.ps1` with `-ApplicationReleaseSha <40-hex-sha>`, `-DeploymentInventoryPath <restricted-sanitized-json>`, the reviewed `-StorageConfigPath`, and native PostgreSQL tooling. The coordinator receives configuration over stdin; no capture-config file is written. The coordinator keeps the exported DB snapshot open for DB artifacts, separately downloads Storage bytes and SHA-256 manifests, and marks Storage point-in-time consistency only when a genuine quiescence proof covers the interval and before/after metadata matches. PostgreSQL and object storage are not an atomic snapshot; record the exact time boundary and residual gap.

The local system-volume encryption query failed for lack of access. Do not treat ACL restriction as encryption. No isolated restore, RTO, or RPO is claimed for a new recovery point. Preserve all existing restricted evidence and failed attempts; never overwrite or delete them.

## Drill schedule

The existing quarterly drill policy remains due **2027-01-09**. No unattended scheduler or alert delivery is verified. Operations must name an accountable operator, approved evidence directory, safe alert destination, and retention owner. Scheduler results `BLOCKED` or `FAIL` are incidents to retain and review, not passes. No paid service or Production mutation is approved by this document.