# Sprint 16.1A Baseline

Baseline captured on 2026-07-17 in `C:\Users\emeae\Desktop\cyber-sentinels-clean` before source edits.

| Command | Result | File or subsystem | Error or observation | Likely cause | Severity | Predates sprint | Remediation | Final baseline status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `npm ci` | Initial fail, rerun pass | npm cache | `EPERM` reading the user npm cache in the restricted sandbox | Sandbox did not initially permit the external cache path | Low | Environment-specific | Reran with approved npm-cache access | Passed; 448 packages installed |
| `npm ci` audit | Completed with warning | Dependencies | 2 moderate vulnerabilities; World ID packages deprecated | Existing dependency graph | Medium | Yes | Preserve for dependency remediation; do not force a breaking audit fix in this sprint | Open dependency risk |
| `npm run lint` | Pass with 6 warnings | Existing app/lib files | Unused variables/imports and one missing hook dependency | Existing warnings | Low | Yes | Not suppressed; unrelated to ORI | Passed with warnings |
| `npm run typecheck` | Pass | TypeScript | No errors | — | — | — | None | Passed |
| `npm test` | Pass | Full local suite | Node module-type performance warnings only | Package is not declared ESM while tests directly import TypeScript | Low | Yes | No package-mode migration in this sprint | Passed |
| `npm run build` | Pass | Next.js production build | Same 6 lint warnings | Existing warnings | Low | Yes | Not suppressed | Passed |
| `npm run test:ml-validation` | Pass | ML validation foundation | 13/13 tests pass | — | — | — | None | Passed |
| `npm run test:rc6` | Pass | RC6 production evidence gate | 8/8 tests pass | — | — | — | None | Passed |
| `npm run test:rls` | Blocked by design | Live Supabase RLS harness | `RUN_RLS_TESTS=true is required` | Deployed target and credentials were not explicitly configured | Medium | Yes | Run only against an approved Supabase target with test users | Environment-blocked, not suppressed |

The baseline proves local source health. It does not prove deployed RLS, target-environment migration application, production provider health, or production accuracy.
