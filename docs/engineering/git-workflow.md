# Git workflow

## Branch model

| Branch | Purpose | Source | Merge destination |
| --- | --- | --- | --- |
| `main` | Deployable, protected production history | Approved release or hotfix | N/A |
| `develop` | Integrated next-release history | Completed feature branches | `release/*` |
| `feature/*` | One bounded implementation or documentation change | `develop`, or `main` until `develop` is established | `develop` |
| `release/*` | Stabilization only: tests, docs, versioning and release fixes | `develop` | `main`, then back to `develop` |
| `hotfix/*` | Urgent production correction | `main` | `main`, then back to `develop` |

At this baseline only `main` exists locally. This policy defines the target workflow; it does not falsely claim that `develop` or branch protection is already configured.

## CS-ENG-001 production-alignment exception

CS-ENG-001 is governed by `docs/engineering/deployment-policy.md`. Approved CS-ENG production-alignment work is performed on `main` under explicit release authority; it does not create a dedicated documentation or Preview branch. The general target branch model above remains proposed for other work until it is adopted and enforced in the Git host.

For CS-ENG-001, synchronize and publish only with:

```powershell
git checkout main
git pull --ff-only origin main
git push origin main
```

When Git integration is active, pushing `main` is the single deployment trigger. If an explicitly approved CLI deployment is required, it must use `vercel --prod`.

## Branch names

- `feature/<issue-or-scope>`
- `release/<version-or-release-name>`
- `hotfix/<incident-or-fix>`

Use lowercase kebab case and one clear scope. Do not combine unrelated work.

## Merge strategy

- Feature pull requests use squash merge into `develop` to keep a single reviewable change unit.
- Release pull requests use a merge commit into `main` so the release boundary remains visible.
- Hotfix pull requests use a merge commit into `main`, followed by a back-merge to `develop`.
- Never rewrite shared `main`, `develop` or release history.
- Tags identify accepted releases and point to the reviewed `main` commit.

If the repository remains on a temporary `main`-only workflow, feature branches must still use pull requests and squash merge. Direct production pushes are an exception requiring explicit release authority and recorded evidence.

## Pull-request policy

Every pull request must include:

- problem and bounded scope;
- affected routes, APIs, migrations and providers;
- risk and security impact;
- tests and exact commands run;
- screenshots or manual evidence when UI changes;
- documentation changes;
- deployment and rollback plan;
- known limitations and unverified environment requirements.

At least one domain owner reviews every pull request. Security review is mandatory for auth, authorization, secrets, providers, webhooks, external calls, storage or RLS. Accessibility review is mandatory for user-facing interaction changes.

## Protected branches

Protect `main` and `develop` with:

- pull requests required;
- required approving reviews;
- stale approval dismissal after material changes;
- required lint, typecheck, test and build checks;
- conversation resolution;
- no force pushes or deletion;
- restricted bypass permissions;
- signed commits or verified identities where organizational policy supports them.

Protect release branches from force pushes while active. Branch protection is configured in the Git host and must be verified there; this document alone does not enforce it.

## Commit standards

- Use imperative, scoped messages that describe the outcome.
- Prefer Conventional Commit prefixes such as `feat`, `fix`, `docs`, `test`, `refactor`, `security` and `chore`.
- Keep generated output, local environment files and unrelated changes out of the commit.
- Never commit secrets, credentials, production payloads or personal data.

## Release and hotfix sequence

1. Confirm the source branch is synchronized and clean.
2. Run the Definition of Done quality gate.
3. Review migrations, environment variables and rollback targets.
4. Merge through the required pull request.
5. Verify the deployed commit and canonical routes.
6. Tag the accepted release.
7. Back-merge release or hotfix history to `develop`.
