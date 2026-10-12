# Storage recovery closure — 10 October 2026

All six recovery categories are **PASS** for the accepted isolated recovery profile, including its mandatory local security hardening. `isolatedRestoreValidated=true` remains accepted. Previously passed database, application, security and Trust Evidence gates were carried forward without reopening them. Production was accessed read-only; all recovery containers are stopped.

## Actual inventory and recovery

Production has two private, versioning-disabled buckets: `evidence-files` contains one object (17,504 bytes); `support-screenshots` is empty. Analytics/vector buckets, vector indexes and multipart uploads/parts were also inventoried and were empty. Restricted evidence retains every object path, owner, version, timestamp, MIME type and metadata field.

No usable credential file was found. An existing authenticated Supabase CLI session supplied an existing project API credential in memory through the supported API-key read operation. No key was created or rotated. The exporter downloaded the actual object through the authenticated Storage API without signed URLs, credential logging or payload logging. Restricted backup files contain the original binary and a SHA-256 manifest. Before/after Production metadata matched exactly.

The bytes live in Supabase-managed object storage, outside PostgreSQL; the project region is `eu-west-3`. A private backing bucket identifier was not exposed or inferred. Supabase documents the [metadata/object separation](https://supabase.com/docs/guides/storage/schema/design) and supported [S3 access](https://supabase.com/docs/guides/storage/s3/authentication). This execution used authenticated Storage downloads.

## Faithful isolated restoration

`recovery-storage-payload-drill.mjs` clones the pristine restored database into a disposable local database and applies the already-required hardening migration. It uses PostgreSQL 17.11 and pinned Storage API v1.81.0 with the previously qualified migration ceiling. Containers share a network-none namespace; no ports are published and only local synthetic service credentials enter the target.

The file-backend restorer imports the pinned image's actual `FileBackend`, `TenantLocation` and `withOptionalVersion` implementation. It rehydrates the original version's payload and last-modified time without recreating object rows. This is a version-pinned local recovery adapter, not a claim of a stable cross-version internal API. All bucket/object database fields and the Storage migration ledger match before and after restoration.

Fifteen validation gates passed: original owner and service reads returned HTTP 200 with matching SHA-256, size, MIME, cache metadata and last-modified time; anonymous, unrelated-principal and public-URL reads were denied. Complete bucket/path/count inventory matched. The original metadata, version and archived ETag also match the recovered bytes (computed MD5). The pre-restoration missing-file response was recorded separately as a diagnostic, not treated as a passing object read.

## Evidence

Restricted evidence root (never commit):

```text
C:\Users\emeae\AppData\Local\CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f
```

Relative paths under that root:

- `recovery-platform-closure-20261010-result.json`: final six-category matrix and accepted prior-report hash.
- `latest-platform-validation.json`: current platform result pointer.
- `storage-recovery-20261010-evidence-sha256.json`: evidence checksums.
- `storage-closure-20261010/storage-recovery-point.json`: recovery-point binding and manifest.
- `storage-closure-20261010/verified-payloads/storage-manifest.json`: actual exported object inventory, SHA-256 and bucket mapping.
- `storage-closure-20261010/repo-export-before.private.json` and `repo-export-after.private.json`: unchanged live inventory.
- `storage-payload-drill-b6dfc183/result.json` and `payload-validation.json`: exact request outcomes and metadata checks.

The final manifest SHA-256 is `86e41181ee273c2f9668904280e340031ca49bf52c53b8e7d1ef762c031a333f`. Earlier failed attempts remain retained; they do not replace the successful final execution.

## Repeatable procedures

Current-object export uses `node tools/release/backup-storage-current.mjs <restricted-config.json>`. The configuration specifies `projectRef`, Storage API `url`, `inventoryFile`, external restricted `directory`, and exactly one of `credentialFile` or `useExistingCliSession: true`. The inventory must be project-bound. Credentials are never written into this configuration. Current-object export alone does not establish a synchronized database recovery point.

Storage-only validation, against an existing qualified isolated target:

```powershell
node tools/release/recovery-storage-payload-drill.mjs $EvidenceDirectory $QualifiedLocalContainer $StoragePayloadDirectory
```

The default stops both targets after evidence capture. The internal `--keep-target` integration option leaves the shared database for the outer drill's cleanup; it was exercised and the database was explicitly stopped afterward.

The recurring full drill now accepts actual payloads:

```powershell
./tools/release/run-recovery-drill.ps1 -EvidenceDirectory $EvidenceDirectory -StoragePayloadDirectory $StoragePayloadDirectory
```

It also discovers `storage-payloads` under a future recovery point. Missing actual payload evidence remains BLOCKED; synthetic fixture success cannot substitute. The Storage child was executed successfully; the already-passed full application/database drill was not rerun in this closure phase. No unattended host task was installed.

`backup-recovery-point.mjs` now supports the same existing-session credential source. Its existing exported-snapshot coordinator captures database archive, catalog, counts, ledger, ownership/ACL/RLS, extensions and Storage inventory/checksums. Full synchronization still requires documented Storage write quiescence and matching before/after metadata; it must not infer atomic object-storage capture from a PostgreSQL snapshot alone.

## Retained limitations

- The accepted local security hardening remains mandatory. No Production remediation or deployment occurred.
- Bytes were acquired on 10 October after the database backup. Exact archived metadata/version and ETag binding support this object's recovery; no historical dump-time SHA-256 is fabricated.
- Independent dump-time database snapshots remain unavailable for the old archive.
- PASS covers the defined isolated recovery scope, not cloud/provider/account/CDN failover. Version histories and other Storage types require separate profiles.

Historical database/application evidence is preserved in [the earlier closure](recovery-closure-20261010.md); this document supersedes its Storage BLOCKED status only.
