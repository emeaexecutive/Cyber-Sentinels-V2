# Recovery Capture Runbook

Status: **no fresh Production recovery point exists.** The earlier qualified isolated-restore PASS stays valid only for its recorded scope, with LOCAL SECURITY HARDENING REQUIRED preserved. This runbook adds no evidence and approves no Production mutation.

Production is `kecgtsfibkypjuaxqbjx`; Staging is `agpyhygpfmppjkxwcpac`. Never substitute one for the other.

## 1. Preflight gates (all must be true; otherwise BLOCKED)

| Gate | Evidence | Failure behaviour |
| --- | --- | --- |
| Read-only DB access confirmed | Operator read-only probe, recorded without credentials | BLOCKED |
| Credential handling | Password only via secure prompt into `PGPASSWORD`, config via stdin (`backup-production.ps1`) | Coordinator rejects any `database.password` |
| Release binding | 40-hex `-ApplicationReleaseSha` plus sanitized inventory (names and `configured` flags only) | Coordinator throws before connecting |
| Fresh target | No `production.dump` or `recovery-point.json` in the directory | Coordinator throws |
| Tooling | PostgreSQL client 17.11 | Coordinator throws |
| Encryption at rest | Verified volume or object-store encryption (an ACL is not encryption) | BLOCKED |
| Quiescence | Completed attestation from `templates/production-write-quiescence-attestation.template.json` covering capture start to end | Storage consistency stays `false`, limitation recorded |

## 2. Quiescence and consistency

PostgreSQL and object storage cannot be snapshotted atomically. The database dump uses one exported repeatable-read read-only snapshot. Storage bytes are downloaded separately, so consistency is claimed only if:

1. the attestation covers `startedAt` through completion and matches the project ref;
2. `storage.buckets` and `storage.objects` metadata is byte-identical before and after capture;
3. the freeze mechanism is an external control. The tooling must never create or infer it.

Any mismatch is a failed capture. Do not repair a mismatch by editing the manifest.

## 3. Reconciliation after capture

- Recompute SHA-256 for `production.dump`, `storage-manifest.json` and every payload; compare with the manifests.
- Compare `table-counts.json` with the restored copy; compare the Storage object count and per-object hash with the metadata snapshot.
- Run `pg_restore --list` on the archive; the required categories are enforced by the coordinator.
- Record the exact snapshot time, Storage window and residual gap in the manifest limitations.

## 4. Encrypted and offsite copy (owner decision, no spend implied)

The owner must name: destination, immutability or object-lock mode, key owner, retention period, access policy, and the second-copy verification method. After copying, verify by re-downloading and re-hashing against the manifest, then record the destination identifier (not credentials). Until then `OFFSITE_COPY = NOT VERIFIED`. Any paid service needs explicit owner approval.

## 5. Isolated restore drill

Use `tools/release/run-recovery-drill.ps1` against a disposable, network-isolated target only; never restore into Production or Staging. A drill passes only if the restore SQL exits 0, the security catalog (RLS, grants, extensions) matches the manifest, and the application smoke checks run against the restored copy.

## 6. RTO and RPO

- **RTO (measured):** wall-clock from restore start to the last passing smoke check, per drill. Record the drill ID and operator. Earlier drills do not transfer to a new recovery point.
- **RPO (evidence-supported):** time from the snapshot to the incident, plus the Storage gap. It is a claim only for points that carry a valid manifest, and the interval between recovery points bounds the achievable RPO.
- No RTO or RPO target is committed without owner approval.

## 7. Retention and cadence

Retention length and the immutable-copy policy are owner decisions. The quarterly drill remains due 2027-01-09 and also after any material schema, security, extension or backup change. A BLOCKED or FAIL drill is an incident to retain, not a pass.
