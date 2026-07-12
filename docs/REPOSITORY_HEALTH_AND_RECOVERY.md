# Repository Health and Recovery

Release 1.0.2 audit date: 2026-07-12. Repository: `C:\Users\emeae\Desktop\cyber-sentinels-clean`. Branch: `main`.

## Root cause and repair

`fatal: Cannot fast-forward to multiple branches` occurs when Git resolves more than one upstream merge target for the current branch, normally because `branch.main.merge` has been added more than once. A normal fetch refspec may cover every remote branch; that does not make `main` track every branch. The historical command that introduced the extra value is not retained by Git config, so it cannot be attributed safely.

The local configuration was normalized without changing commit history:

```text
branch.main.remote = origin
branch.main.merge = refs/heads/main
remote.origin.fetch = +refs/heads/*:refs/remotes/origin/*
```

Each key now has exactly one value. `main` therefore tracks exactly `origin/main`. No reset, rebase, force push or published-history rewrite was used. The sample hooks in `.git/hooks` are inactive because they retain their `.sample` names; no active repository hook was found.

## Safe routine commands

```powershell
git status --short --branch
git fetch origin
git pull --ff-only origin main
git push origin main
```

Before pulling, preserve uncommitted work with a normal commit or a deliberately named stash. Never discard it merely to make a pull succeed.

## Recovery

1. Inspect every value with `git config --get-all branch.main.remote` and `git config --get-all branch.main.merge`.
2. Confirm the intended remote with `git remote -v`.
3. Normalize with `git config --replace-all branch.main.remote origin` and `git config --replace-all branch.main.merge refs/heads/main`.
4. Run `git fetch origin`, inspect `git status --short --branch`, then use `git pull --ff-only origin main`.
5. If local and remote history diverge, stop and inspect `git log --graph --decorate --oneline --all`; choose an explicit merge or rebase only after reviewing the unpublished commits.

Prohibited recovery shortcuts: `git reset --hard`, destructive checkout/restore of unreviewed work, rewriting published `main`, deleting `.git`, and `git push --force` or `--force-with-lease` to `main`.

## Generated-file result

The tracked `tsconfig.tsbuildinfo` cache was removed from the index and remains a locally regenerable file. `.gitignore` contains one `*.tsbuildinfo` rule and covers `.next/`, `node_modules/`, coverage, Playwright/test results, logs, temporary directories/exports and common OS metadata. Source, migrations, fixtures and benchmark manifests remain tracked.
