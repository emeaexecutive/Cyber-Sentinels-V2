# Recovery closure — 9 October 2026

**Historical report.** The [10 October closure](recovery-closure-20261010.md) supersedes the runtime, security and automation status below. Preserve this report and its evidence as the earlier checkpoint.

**RECOVERY BLOCKED — required service/runtime qualification remains incomplete.** The database restore and tested SQL/application paths pass. The extension classification blocker is resolved. `isolatedRestoreValidated=false`; complete platform recovery is not claimed. Storage payload recovery is a separate open DR gap, not evidence of database corruption.

## Recovery matrix

| Area | Result | Evidence and scope |
| --- | --- | --- |
| Database restore | PASS | r4 atomic restore exit 0; repository automation also restores a fresh r5 with exit 0 and stops it |
| Schema fidelity | PASS with documented extension variance | 3,291 named blocks; all application definitions preserved; 51 extension owner/ACL blocks classified individually |
| Ownership/ACL fidelity | PASS with explicit platform variance | 51 EXPECTED_PLATFORM_DIFFERENCE: pgcrypto 36, pg_stat_statements 5, uuid-ossp 10; zero unresolved or fidelity-defect classifications. Administrative owner/grantor differences remain; no owners/grants changed |
| RLS/security | PASS for exercised gates | All 358 policies match; prior workspace read/write/member/revoked/anonymous probes pass; runtime receipt/Replay/Memory/graph A-positive/B-denial pass; critical RPC execute grants and protected search-path schemas pass |
| Data integrity | PASS against archive | 283/283 table counts and sorted COPY content digests match; 452 FK checks, zero violations |
| Migration integrity | PASS against archive/frozen inventory | Application 119, Auth 82, Realtime 89, Storage 73 rows match; 118 frozen migration files covered; known later Production ledger entry retained |
| Trust Event integrity | PASS for internal continuity | 202 event hashes/fields/links, two chain heads; no cross-tenant canonical-event or replay-session linkage mismatch |
| Application/runtime | PARTIAL — acceptance blocker | Frozen evaluator + real restored decision/graph/Replay/Memory RPCs pass ALLOW/REVIEW/DENY, authority reads and tenant denials. Real local GoTrue HTTP signup/login/token validation/refresh/logout pass. Integrated Next.js/API routes, reports/alerts and browser/session middleware remain unexercised |
| Storage metadata | PASS | Database metadata preserved, including one object row |
| Storage payload recovery | GAP OPEN | No external object bytes in this archive; no payload recovery or delivery claim |

The existing archive remains usable. The missing independent dump-time counts/catalog inventory cannot be recreated retrospectively. Archive-derived comparisons prove faithful reconstruction of captured data, not completeness relative to everything that existed in Production.

## Extension decision

[Individual classification of all 51 objects](recovery-extension-classification-20261009.md) is based on the actual current Production catalog captured in a **read-only** transaction at 2026-10-09T15:41:45.142865Z. This phase contacted Production only for that authorized catalog comparison; it did not mutate Production. Earlier statements that Production was never contacted describe the earlier restore phase only.

All extension versions match. Native function definitions, settings, execution identity and application grants match. The two statistics views received additional caller-sensitive redaction/reset-denial probes. Owner differences are accepted as isolated platform installation differences, not repaired through privilege escalation. The full source and restored ACL arrays preserve administrative grantor and self-grant differences for review. This acceptance does not authorize arbitrary extension owner remapping in future restores.

## Runtime evidence

Frozen release: `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`. The harness uses its actual canonical evaluator and payload mapping, synthetic local identities/evidence, actual restored authority/policy rows, and all four real persistence RPCs. No provider requests occur. Disposable clones preserve the pristine `recovery_validation` database.

The first private adapter attempt failed because it read RPC response keys with the wrong casing. It was retained as failed evidence. The corrected adapter passed on fresh `recovery_runtime2`. The repository harness passed again on fresh `recovery_runtime3`, additionally checking positive reads and cross-tenant denial for Replay, Memory and graph after each decision. A fixture provenance guard initially stopped before clone creation because Git archive and Git show used different line endings; comparison now hashes normalized text. This did not change application code or database privileges.

The separate `recovery_auth1` clone then passed actual GoTrue v2.196.0 HTTP signup, password login, signed-token user read, invalid-password denial, invalid-signature denial, refresh and logout. Its binary came from cached image digest `sha256:c0c25187a6b835e65a6f6e6c6b39d090e832d40e6de5186f2c038e0411944232` and ran inside r4's network-none namespace on loopback only. `auth serve` started the service without applying migrations. The complete schema and Auth migration ledger still matched the pristine baseline after the test. A synthetic signing key and strong local-only password for the existing `supabase_auth_admin` role were used; no attributes, memberships, object owners or grants changed. The protected local password/key files are not Production credentials.

These tests do **not** establish browser cookies or Next.js middleware, end-to-end application API tenant denial, or integrated reports/alerts. Passing the SQL harness or standalone Auth service must not set the full recovery flag by itself. Required next work is an isolated application/API stack using synthetic credentials, with outbound provider calls disabled, proving tenant A/B API denial, canonical receipts/Replay/Memory routes and required reports/alerts. The inspected local image cache contains PostgreSQL, Auth, Realtime and Storage, but no application/PostgREST runtime; the inspected repository configuration has not been qualified as a complete isolated restored-service stack. Do not launch ordinary development commands that may load Production environment files. Storage-backed delivery remains separately blocked until bytes exist.

## Automation and recurring drills

- `tools/release/recovery-restore-20261009.mjs`: executable, archive-specific two-phase restore, pinned SHA/image, fresh named network-none target, no ports, read-only evidence mount, native owner/session preservation, stdout/stderr/exit evidence, automatic stop on success/failure. Validated against fresh r5. It deliberately refuses different archives; future archives require a reviewed manifest/role/extension configuration, not removal of guards.
- `tools/release/recovery-runtime.mjs`: guarded local clone creation, frozen-code provenance checks, real SQL adapter, sensitive evidence outside Git; never marks complete recovery. Requires the pinned local target and frozen-runtime directory. The operator stops the target after all evidence is captured.
- `tools/release/recovery-extension-catalog.sql`, `classify-recovery-extensions.mjs`, `recovery-extension-probes.sql`: retained current-catalog inventory, offline per-object classification and local effective-access checks. Classifier is scoped to this 51-object exercise and requires successful matching probe evidence.

Example for another **fresh** local rehearsal of this same archive:

```powershell
$evidence = Join-Path $env:LOCALAPPDATA 'CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f'
node tools/release/recovery-restore-20261009.mjs $evidence cs-recovery-20261009-new-drill --execute-local
# Runner always stops the new target. Restart only for separately planned local validation.
# After identity/isolation checks, runtime harness creates a new clone, never reuses one:
# node --experimental-strip-types tools/release/recovery-runtime.mjs $evidence <isolated-container> recovery_runtime4
# Always stop the owned target after evidence capture, including failure paths.
```

Quarterly isolated archive drills remain the repository policy; next due **2027-01-09**, and repeat after material schema/security/extension/backup changes. Record an accountable operator, archive identity, release, measured restore time, all matrix results and remediation. No unattended Production job or external scheduler was installed. Until an operator/scheduler and complete gate runner are in place, recurring execution is an open operational action, not a claimed automation PASS.

## Remaining closure work

| Issue | Implemented/evidenced now | Remaining acceptance requirement |
| --- | --- | --- |
| Extension ownership fidelity | Closed for this archive; 51 classified; no privilege changes | Repeat current catalog/version/security comparison for each future target |
| Restore automation | Archive-specific runner tested on fresh r5 | Generalize only with explicit manifest, source role definitions and version compatibility; add end-to-end gate orchestration |
| Runtime qualification | Repeatable local evaluator + real RPC/RLS harness; real standalone Auth HTTP checks | Integrated application/API/session and reports/alerts gates above; standalone services cannot substitute |
| Backup completeness | Existing backup script inspected; synchronized snapshot design documented | Implement/test read-only exported-snapshot coordinator with pg_dump, exact counts, ledger/catalog/security inventories; preserve restricted logs and independent status flags |
| Storage payload backup | Metadata/payload distinction established | Implement private version-aware object acquisition, SHA-256/byte-length inventory, second-copy verification and isolated object restore/delivery test. A new current copy cannot prove historic dump-time object state |
| Recurring drills | Procedure, evidence format, quarterly due date | Assign operator/scheduler and exercise complete database + runtime + Storage workflow |

The detailed [future backup enhancement plan](isolated-restore-preflight-20261009.md#future-backup-enhancement-plan--not-executed) remains required. Do not retrofit sequential later counts as synchronized dump-time evidence or discard the existing archive. No new Production backup, Storage download, deployment, role alteration or schema change was performed in this closure phase.

## Exact evidence location

Restricted root:

`C:\Users\emeae\AppData\Local\CyberSentinels\production-backups\20261009T134327Z-739ff760249b4aa8a48032c8fb46270f`

Key files (all relative to that exact root):

- `recovery-closure-result.json` — final machine-readable matrix, limits and stop state.
- `recovery-closure-evidence-sha256.json` — final evidence checksums.
- `extension-classification.json` — all 51 source/restored objects, exact ACLs, rules and checks.
- `production-extension-catalog-current.json`, `restored-extension-catalog-current.json` — actual catalog references.
- `extension-probes-result.json`, `extension-probes.stdout.private.log`, `extension-probes.stderr.private.log` — view/extension security probe exit 0.
- `closure-security.sql`, `closure-security-result.json`, `closure-security.stdout.private.log`, `closure-security.stderr.private.log` — Replay/Memory/graph isolation and critical security checks.
- `recovery_runtime3-result.json`, `recovery_runtime3-*.sql`, `recovery_runtime3-*.stdout.private.log`, `recovery_runtime3-*.stderr.private.log` — repository runtime harness and real SQL execution.
- `runtime-closure-result.json`, `runtime-closure-result-v2.json` — retained failed adapter attempt and corrected fresh-clone run.
- `auth-http-result.json`, `auth-http-*.response.private.log`, `auth-service.stdout.private.log`, `auth-service.stderr.private.log` — real isolated Auth HTTP tests and service logs; responses contain synthetic local tokens and stay private.
- `restore-r4-execution.json`, `restore-r4.stdout.private.log`, `restore-r4.stderr.private.log`, `restore-r4-validation.json`, `restore-r4-continuity.json` — successful restore and rechecked pristine baseline.
- `cs-recovery-20261009-739ff760-r5-execution.json`, matching stdout/stderr — successful fresh-target automation test and automatic stop.

Historical evidence files and the original manifest keep their recorded status. The current final report also keeps `isolatedRestoreValidated=false`. All six retained isolated/helper containers are stopped, verified by Docker state inspection; stopping r4 also stopped the local Auth process. The final checksum inventory covers 241 evidence files. Sensitive SQL, catalog contents and restored data are not committed.
