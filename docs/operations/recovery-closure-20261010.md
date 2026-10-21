# Recovery closure — 10 October 2026

**Latest Storage closure (10 October): ALL SIX RECOVERY CATEGORIES PASS for the accepted isolated profile with mandatory local hardening. Actual Production payload export and isolated restoration passed; Production was not mutated and targets are stopped. See [final Storage evidence and procedure](storage-recovery-closure-20261010.md). Storage BLOCKED statements below describe the earlier phase and are superseded; historical limitations and security qualifications remain.

This report supersedes the 9 October runtime/automation status. Production remains unchanged. The original archive and historical evidence remain intact. Current machine results are retained outside Git; the final execution record below controls acceptance.

## Acceptance boundaries

The faithful database restore and the application qualification copy are separate databases. `recovery_validation` preserves the archive. `recovery_application` receives the existing repository migration `supabase/migrations/202610040001_p0p1_security_closure.sql` **as postgres, only locally**, before service qualification.

This is a required correction, not an optional difference waiver. A real authenticated Data API request proved that the archive's `ai_agents` policy `ai_select USING (true)` exposed tenant B's synthetic agent to tenant A. The application route itself filtered by owner, but direct Data API access bypassed that route. The same request returned zero rows after the local migration. No Production policy, role, grant, password, data or deployment was changed. Do not infer that the unmodified archive or current Production has passed this newly tested security gate.

The qualified recovery profile therefore includes the recorded hardening migration SHA and its local application. A database/runtime recovery PASS does not authorize a Production rollout. `isolatedRestoreValidated` may be true only for this qualified profile after the complete drill passes its database, runtime and security gates. The old archive manifest retains its historical false value.

## Integrated application validation

The frozen application revision is `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`, running actual Next.js HTTP routes with actual GoTrue and PostgREST against a disposable restored database. Tests use newly created local Auth users, local cookies, two workspaces and synthetic provider evidence. They are not unit mocks. Real provider verification, outbound mail and external infrastructure are outside this drill.

The application runs inside the PostgreSQL container's network-none namespace, bound to loopback, without published ports or a default route. It receives synthetic local keys only. The frozen source excludes all dotenv files; the repository's Production environment files are never mounted into the application. Frozen dependencies are prepared separately before any backup or credential is mounted. Dependency outages are injected by stopping local services.

The HTTP harness records method/path, status, actor, tenant, expected/actual result and private response evidence for:

- Real Auth signup/password login and session establishment; unauthenticated API denial and protected-route redirect; authenticated protected route.
- Workspace and Agent Registry positive controls and cross-tenant denials, including direct Data API access.
- Authority reads, policy version binding and actual ALLOW/REVIEW/DENY transactions.
- Receipt creation/read, owner reads and tenant B denial; persisted Replay and Trust Memory references and data; Replay application route.
- Trust overview/reports, alerts, Trust Events; cross-tenant API denial; local alert acknowledgement/dismissal and resulting audit hash/chain continuity.
- Data-service outage: Agent Registry 500 and trust execution 503, with no receipt. Auth-service outage: middleware 503, exact body `Protected surface unavailable.`

The global `/api/trust-memory` benchmark is admin-only; an ordinary tenant must receive its redirect/denial. Tenant Trust Memory continuity is tested through the real transaction pipeline and authenticated Data API. The drill does not relabel the admin benchmark as a tenant API.

Separate SQL gates verify critical SECURITY DEFINER ownership, execute grants and protected search-path schemas, RLS enablement, removal of the known broad Agent Registry policy, native extension availability and caller-sensitive statistics redaction. The pristine schema comparison rechecks the previously classified 51 expected extension differences; it does not change Supabase extension ownership.

## Storage procedure and remaining gap

`tools/release/recovery-storage.mjs` exports bytes using an explicit synchronized inventory, records keys, size, content type, metadata, source version and SHA-256, and stores files under hashed names in a restricted directory. Credentials are read from a separate local secret file; neither credentials nor signed URLs enter the manifest. Downloads use authenticated object endpoints, never signed URLs. Restore accepts literal local loopback only and rejects a namespace with a default route. It verifies every manifest/payload checksum before the first upload, then redownloads and verifies size/SHA-256 and recursively enumerates restored paths/counts. Corruption and remote-target rejection are tested.

The implemented profile supports **current objects in versioning-disabled buckets**. It explicitly rejects versioned buckets rather than claiming version-history recovery. Object owner/tenant linkage, bucket access settings, lifecycle configuration and original historical version identity must also be reconciled with the restored PostgreSQL metadata before accepting a real Production payload recovery. API uploads can generate new backend versions; preserving byte content alone is not proof of metadata/security equivalence.

Three synthetic objects (text, nested binary, empty file) have been exported and restored between two separate real local Storage API backends. This qualifies the tooling; it does **not** recover the one object referenced by the original Production archive. The local Production environment entries did not yield a usable project-bound Storage credential. No Production object was downloaded or altered. Actual archived object bytes, or usable authorized read-only object access, remain required. A later current-object download must be reconciled against archived identity/version/digests and labelled with its actual acquisition time; it cannot manufacture a dump-time SHA-256.

Storage API v1.81.0 is pinned by digest. Its startup migration ceiling is frozen at `drop-bucketid-objname-index`; migration refresh is disabled. Two readonly upstream historical SQL files match the archive's original migration hashes:

| Migration | Authoritative upstream revision | SQL SHA-256 |
| --- | --- | --- |
| `0002-storage-schema.sql` | [e89d526fa3e3e7600b6a22cedf43aa058924d19a](https://github.com/supabase/storage/blob/e89d526fa3e3e7600b6a22cedf43aa058924d19a/migrations/tenant/0002-storage-schema.sql) | `19562682ff1b77cda9ba096671b873e7e226b10f0b0564bd4823e6c1754393b6` |
| `0062-object-versioning-core.sql` | [52e23bbd850e1e7a75288f94606034d8d9886557](https://github.com/supabase/storage/blob/52e23bbd850e1e7a75288f94606034d8d9886557/migrations/tenant/0062-object-versioning-core.sql) | `45969060b55102f56af317b0d7981434be58927de1ff76e1e1789139a3f2defc` |

The archive migration ledger is never rewritten to bypass compatibility checks. `recovery-storage-stack.mjs` verifies these source checksums and rechecks ledger equality after service startup. Older cached Storage images failed compatibility and were retained as failed evidence.

## Future synchronized backup capture

`backup-production.ps1` now delegates to `backup-recovery-point.mjs`. This implementation was exercised locally, not against Production. The coordinator holds a read-only repeatable-read transaction and exported snapshot open while PostgreSQL 17.11 creates both custom archive and schema dump using `--snapshot`. Counts (`ONLY`, avoiding partition double counting), migration ledgers, catalog/security/RLS/ownership/ACL inventories, extensions and Storage metadata use that same transaction. Access-share locks protect catalogued tables from concurrent destructive DDL.

Artifacts include capture timestamps, project reference, source/client versions, database snapshot identity, archive SHA-256, per-artifact checksums and a checksum-protected recovery-point manifest. Database archive/readability, supplemental completeness, Storage bytes/consistency and isolated validation have distinct flags. Missing Storage configuration yields exit 2/BLOCKED while preserving the usable database archive.

PostgreSQL cannot atomically snapshot external object bytes. A complete recovery point therefore requires **externally enforced Storage write quiescence**, covering the whole capture interval, and matching before/after object and bucket metadata. The proof file records `projectRef`, accountable `operator`, `changeReference`, `startsAt`, `endsAt`. Supplying this file is an attestation of actual operational controls, not a mechanism that freezes writes. Do not invent it. The script never freezes Production or changes source settings. Without that evidence, object acquisition may succeed but recovery-point completeness remains BLOCKED.

Example Storage configuration, kept outside Git and separate from secret values:

```json
{
  "url": "https://<approved-project>/storage/v1",
  "credentialFile": "C:/restricted/approved-storage-read-key",
  "quiescenceProof": "C:/restricted/actual-write-quiescence.json"
}
```

Use the existing guarded backup command with `-StorageConfigPath <path>` only during an authorized future capture. Native PostgreSQL 17.11 and the repository's installed Node dependencies are required. Legacy `-UseDocker` capture is refused because it did not synchronize supplemental evidence. No new Production capture was performed here.

Local evidence: `snapshot-local-1` proves usable database capture with explicit Storage BLOCKED; `snapshot-local-complete` proves synchronized database plus synthetic Storage capture. `snapshot-complete-validation.json` verifies 21 artifact checksums and 283 archive COPY counts against the independent same-snapshot counts; the empty partitioned parent `realtime.messages` correctly has no COPY entry. This new local evidence does not repair the missing independent snapshots from 9 October.

## Repeatable drill and scheduling

```powershell
$evidence = Join-Path $env:LOCALAPPDATA 'CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f'
& .\tools\release\run-recovery-drill.ps1 -EvidenceDirectory $evidence
```

The wrapper prevents overlapping runs. `recovery-drill.mjs` creates a fresh named PostgreSQL 17.11 target, verifies the reviewed archive/image/profile, restores body/ownership before event triggers using the corrected creation sessions, measures restore duration, checks schema/data/FKs/ledgers/Trust Events, launches isolated services, applies the local security correction, executes integrated HTTP/security/Storage-tooling/failure-injection checks and stops every owned service/target in `finally`. Evidence and SHA-256 inventories remain outside Git. Exit codes are 0/PASS, 2/BLOCKED, 1/FAIL. Storage-tooling PASS never converts missing Production payloads to PASS.

This compatibility profile is intentionally bound to the reviewed archive and frozen release. Future archives require review of their source roles, extensions, migration hashes, application release and expected schema baseline. Do not edit hash guards simply to accept another archive. The lower-level restore runner accepts an explicit reviewed manifest; the full integrated profile still requires review.

Prerequisites: Docker running; pinned cached PostgreSQL, Node, PostgREST and Storage images; reviewed authoritative role/bootstrap files; the readonly historical Storage SQL files above; GoTrue v2.196.0 binary; frozen dotenv-free application and its prepared dependency volume. Missing prerequisites stop qualification. No cloud connection, Supabase project link or Production credential is accepted by the drill.

Run quarterly (next due **2027-01-09**) and after material schema/security/extension/backup changes. A local scheduler can invoke the wrapper with `powershell.exe -NoProfile -WindowStyle Hidden -File <absolute-wrapper-path> -EvidenceDirectory <restricted-root>` as the authorized local operator. Retain nonzero scheduler results and inspect machine evidence; BLOCKED is not success. No unattended host task was installed or claimed as exercised. Operator/scheduler assignment and retention/second-copy policy remain operational actions.

## Evidence and final execution

Restricted root: `C:\Users\emeae\AppData\Local\CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f`.

Final drill: `cs-recovery-drill-20261010-dbfe12aa`, completed **2026-10-10T09:08:56.596Z**. Restore SQL exit **0**; measured restore **12.861 seconds**, database/application qualification **204.752 seconds**, complete drill including cleanup **212.920 seconds**. These are local measurements, not a contractual Production RTO or RPO. All six owned containers are stopped; a subsequent Docker inspection found no running recovery targets.

```text
DATABASE RECOVERY: PASS
APPLICATION RECOVERY: PASS
STORAGE PAYLOAD RECOVERY: BLOCKED
SECURITY/RLS RECOVERY: PASS
TRUST EVIDENCE RECOVERY: PASS
FULL PLATFORM RECOVERY: BLOCKED
```

Application/security PASS is qualified by the local hardening step above. **`isolatedRestoreValidated=true` for that qualified profile**, not for an unmodified-archive security claim. The archived baseline's Agent Registry policy failure remains explicitly recorded. Production mutations throughout this closure: **zero**.

| Gate | Final result | Evidence scope |
| --- | --- | --- |
| Database restore | PASS | Fresh PostgreSQL 17.11, atomic body/owner/event-trigger restore, exit 0 |
| Schema fidelity | PASS | Pristine schema matches the reviewed restored baseline |
| Ownership/ACL fidelity | PASS with recorded differences | 51 expected extension differences; no owner remapping; local hardening changes 28 relation ACL/RLS entries within its reviewed scope |
| RLS/security | PASS with required hardening | 10 full-catalog invariance checks; critical RPC/function security; extension access; real A/B denials and dependency outages |
| Data integrity | PASS against archive | 283 table counts/content digests; 452 FK checks |
| Migration integrity | PASS | Preserved application/Auth/Realtime/Storage ledgers; Storage service startup does not rewrite its ledger |
| Trust Event integrity | PASS | 202 original events and chain continuity; new local alert-event hashes/chains also pass |
| Application/runtime | PASS | 85 integrated checks plus 3 dependency-outage checks; real Replay route and tenant denials |
| Storage metadata | PASS | Faithful original database metadata retained |
| Storage payload recovery | BLOCKED | Actual archived object bytes unavailable; separate three-object synthetic tooling round-trip passes |

Exact evidence paths below are relative to the restricted root above:

- `recovery-closure-20261010-result.json` — final six statuses, complete matrix, qualification scope and unresolved limits.
- `latest-isolated-validation.json` — qualified validation flag and mandatory hardening reference; original manifest unchanged.
- `recovery-closure-20261010-evidence-sha256.json` — 217 evidence checksums and 21 recovery tool source checksums.
- `cs-recovery-drill-20261010-dbfe12aa-result.json` — restore/validation steps, measured durations and all stop states.
- `cs-recovery-drill-20261010-dbfe12aa-execution.json`, matching restore stdout/stderr artifacts — exact restore command/exit evidence.
- `cs-recovery-drill-20261010-dbfe12aa-structural-result.json`, `cs-recovery-drill-20261010-dbfe12aa-continuity-result.json` — data, ledgers, schema, FK and Trust Event evidence.
- `cs-recovery-drill-20261010-dbfe12aa-post-hardening-result.json`, matching `recovery_validation-catalog.private.json` and `recovery_application-catalog.private.json` files — full before/after ownership, ACL, policies, functions and roles. This read-only catalog check was executed separately against the same fresh final target while its drill ran; the runner now includes the identical command for future runs.
- `app-frozen/.recovery-evidence/cs-recovery-drill-20261010-dbfe12aa/application-http-result.json` — all 85 checks and individual request/response evidence references.
- The same runtime directory's `dependency-data-result.json`, `dependency-auth-result.json`, `storage-tooling/storage-fixture-result.json` and `storage-tooling/restore-result.json` — outage and real synthetic payload restore evidence.
- `app-frozen/.recovery-evidence/http-02/agent-direct-rls-before.json` and `agent-direct-rls-after.json` — original security defect and local correction positive/negative controls.
- `snapshot-local-complete/recovery-point.json`, `snapshot-complete-validation.json` — same-snapshot future capture test and independent archive/count/checksum validation.
- `production-storage-readonly-access.json` — unavailable usable local Storage credential; no credential values retained.

Historical failed attempts remain retained, including the initial Auth-outage probe's incorrect JSON assumption. The final evidence index was verified against the stored drill artifacts. The original independent dump-time snapshot gap remains historical and cannot be retroactively closed. Actual Storage recovery, external provider/account/platform failover, and unattended scheduler/operator assignment remain outside the demonstrated PASS scope.
