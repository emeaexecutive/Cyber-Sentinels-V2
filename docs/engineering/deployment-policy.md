# Production deployment policy

## Canonical production path

Cyber Sentinels production changes are deployed from main.
CS-ENG documentation work does not use a dedicated feature branch.
Preview deployments are temporary validation environments only and are not canonical.
The production domain is www.cybersentinels.com.

| Concern | Canonical value |
| --- | --- |
| Git branch | `main` |
| Vercel environment | Production |
| Application URL | `https://www.cybersentinels.com` |
| Deployment trigger | Vercel Git integration after an approved push to `main` |

## Required release sequence

1. Confirm the Cyber Sentinels repository, remote, clean worktree and active `main` branch.
2. Synchronize with `git pull --ff-only origin main`.
3. Review every changed path and exclude credentials, generated output, unfinished migrations and unrelated work.
4. Run only repository-defined quality gates: `lint`, `typecheck` or `type-check`, `test`, `build`, followed by `npm audit --omit=dev`.
5. Commit the reviewed files explicitly; do not use an unreviewed `git add .`.
6. Push `main` once. Git integration should create the Production deployment.
7. Verify the Vercel deployment target, expected commit, canonical domain, protected routes, critical APIs, security headers and Production logs.

Do not run the Vercel CLI without `--prod`. Do not point the canonical domain at a Preview deployment or present a `*.vercel.app` URL as the official application. Documentation is evidence and specification; it does not prove runtime functionality without code, configuration, tests, deployment and live checks.

## Rollback

Identify the last known-good Production commit and prefer `git revert <bad-commit-sha>` followed by `git push origin main`. Use a Vercel rollback or promotion only after identifying the correct known-good deployment. Never rewrite shared `main` with a destructive reset.
