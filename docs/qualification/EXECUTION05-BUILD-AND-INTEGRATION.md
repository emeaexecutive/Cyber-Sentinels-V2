# Execution05 build and integration — 15 November 2026

This bounded work package preserves the original dirty worktree and creates `codex/execution05-release-20261115` in `tmp/execution05-release`, based on #142 at `c6f84ebefd901725440f602288016c741d004b2c`. Source fix commit: `35a979fdabc9c52d13871af8270b1c54e00e0e36`. No push, PR merge/closure, hosted mutation or deployment occurred.

## Fresh local results

Node 22.23.1. Locked offline install succeeded: 426 packages in four minutes; lifecycle scripts were disabled. Initial attempts were blocked by PowerShell's npm.ps1 policy and default npm-cache permissions; npm.cmd and an approved cache read completed installation. No execution policy changed. Installation with scripts disabled is narrower than the normal CI install and is recorded explicitly.

| Check | Result | Scope / limits |
|---|---|---|
| Uncached `tsc --noEmit --incremental false --extendedDiagnostics` | PASS, exit 0 | Baseline c6f84eb, 2,144 files, 1,726,151K compiler memory, 125.61 seconds. Fresh Next route generation had not run. No heap override or source exclusion added. |
| Full lint | PASS, exit 0; 10 warnings, 0 errors | Baseline; warnings in inherited recovery tooling |
| Shared budgets, loop/delegation, twelve-scenario enforcement/approval SQL, workload identity | PASS 32/32; zero skips | Local synthetic/PGlite; not independent hosted PostgreSQL connection races |
| API security + workload identity + new workload boundary | PASS 50/50; zero skips | 35a979f executable source; overlaps the 32-test set, so counts must not be added as unique tests |
| New workload boundary tests | PASS 2/2 | Actual server dependency factory and route, mocked auth/database edges; configured relay is not called for decision-only ALLOW |
| Changed-file ESLint | PASS, exit 0 | Final source and test after fixing one Next lint naming error in the new test harness |
| Source inventory | PASS | 278 non-ES page templates, 45 public mappings, 11 notice routes, 167 overlapping PR path pairs; no browser completion claim |
| Production build | PASS, exit 0 | Application source 35a979f; candidate c08831b adds only test/runner wiring. Compiled in 3.0 minutes, generated type validation passed, 209/209 static pages, optimization/traces completed. Webpack emitted large-string cache warnings. |
| Full local npm test / hosted integration | NOT RUN in Execution05 | Earlier CI results are separately preserved; no fresh full-suite or hosted PASS invented |

## Security change

The existing API-client factory inherited external relay execution. Workload trust:request credentials are documented as decision-only. The workload route now supplies server-owned `allowExternalExecution: false`; runtime forwards that restriction to the existing canonical dependency factory. Valid ALLOW decisions remain decisions and cannot use the relay through this path. API-key callers retain their existing behavior. This is a narrow local security fix, not complete KYA.

Four other #130 review findings remain open: middleware recovery JWT classification, idempotency-header bounds, workload-specific schema and revoked-binding selection. Passing token/source-contract tests do not dismiss them. #143 secret scan finding and #139 conflict also remain open. Required branch-protection review policy is not established by returned reviews.

## Integration and release limits

No branch is discarded. No migration added/applied, ledger rewritten or hosted environment changed. The existing #142 selective integration needs per-behavior equivalence review before original security/database PRs can be closed. Website release remains separate. Current Production source/environment is UNKNOWN. Current release verdict: NO-GO.

The baseline typecheck confirms the prior 4GB failure did not recur for that compiler scope. A future candidate still requires generated-route typecheck and production-build completion at its own source SHA. CI associated with #142 reports successful jobs; GitHub merge-ref checkout must not be confused with an independently pinned local source check.

Final candidate: c08831b43d9c3a8c020b3314c25cd33519dde446. The existing test:execution03 runner now includes the new boundary regression and passed 16/16, zero skips. Final application files are identical to 35a979f. Logs and a SHA256 manifest are in artifacts/execution05. This package has no new remote CI, hosted test or browser journey result.
