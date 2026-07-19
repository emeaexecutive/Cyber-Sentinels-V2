# Required CI Checks

**Status:** Proposed; branch protection and checks are not currently repository-verifiable

## Merge-blocking checks

| Check | Command or evidence | Pass condition |
| --- | --- | --- |
| Repository metadata | Pinned toolchain and clean lockfile | Supported versions and unchanged lockfile after install |
| Lint | `npm run lint` | Zero errors; warnings at or below approved budget |
| Typecheck | `npm run typecheck` | Zero errors |
| Default test inventory | All intended non-live tests | Zero failures/skips outside explicit inventory |
| Migration apply | Fresh ephemeral Supabase/Postgres | All 58+ ordered migrations apply cleanly |
| RLS isolation | Two-user/two-tenant suite | All allow/deny expectations pass |
| Build | `npm run build` | Successful optimized production build |
| Dependency audit | Production dependency advisory scan | No unaccepted high/critical issue |
| Secret scan | Repository and diff scan | No verified secret |
| Documentation consistency | Blueprint links, status vocabulary and required files | No broken required reference or unsupported claim |

## Release checks

Credentialed provider, deployed security, authenticated browser, migration status, production smoke and rollback-readiness checks are release gates. They run only against approved environments. A blocked release check requires explicit `NO-GO` or a signed scope exclusion; it cannot silently pass.

## Branch controls

`main` should require pull requests, at least one accountable review, security/data review for relevant paths, stale-approval dismissal, required checks, conversation resolution and restricted force-push/deletion. Emergency bypass requires an incident/change record and post-event review.

## Warning policy

The publication baseline has six lint warnings. They are recorded debt, not a growing allowance. New warnings fail CI; the existing budget should be reduced to zero.

## Evidence

The merge commit or release record links every check run, expected SHA and retained artifact. Git-host settings must be exported or screenshotted periodically because repository files alone cannot prove enforcement.
