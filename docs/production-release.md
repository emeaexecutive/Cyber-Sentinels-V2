# Node 22 production release

The TypeScript release manager at `tools/release/release-manager.ts` is the authoritative Cyber Sentinels production-validation workflow. PowerShell only locates the repository, checks Node 22, forwards arguments, and preserves the release manager's exit code.

## Requirements

- Activate Node.js 22 using `.nvmrc` or `.node-version`.
- Use npm 10 or newer.
- Review working-tree changes. A dirty tree is reported as a warning, never hidden.
- Link the intended Supabase project before using a migration command.

## npm commands

```powershell
npm run release
npm run release:full
npm run release:migrate
npm run release:full:migrate
npm run release:dry
```

The default release runs locked dependency installation, targeted consent tests, lint, TypeScript validation, and the production build. `--full` adds the complete test suite. `--migrate` adds the migration audit, Supabase CLI validation, linked database push, and linked database lint verification. `--dry-run` validates configuration and creates reports without installing, testing, building, or migrating; it never reports deployment readiness as READY.

## Thin PowerShell launcher

```powershell
.\scripts\release-node22.ps1
.\scripts\release-node22.ps1 --full
.\scripts\release-node22.ps1 --migrate
.\scripts\release-node22.ps1 --full --migrate
```

The compatibility entry point `.\scripts\Run-From-Clean.ps1` forwards to the same thin launcher. Build, test, SQL, security, and reporting decisions live in TypeScript, not PowerShell.

## Migration verification

Migration runs are explicit and never occur during default validation. The manager blocks a migration push when the static auditor reports an `ERROR`, runs `supabase db push --include-all`, and follows with linked-database linting. The read-only `supabase/verification/production-verification.sql` is provided for operator-reviewed execution against the intended project; static analysis and CLI linting do not prove live-database correctness.

## Reports and failure behavior

Every non-help release attempt writes the eight release reports under `reports/`, including a failure attempt such as using the wrong Node major. Mandatory stages stop on the first failure. `READY` is never printed when Node, repository, security, consent, lint, TypeScript, tests requested by `--full`, or build validation fails.

The release manager does not commit, push Git changes, deploy the application, or migrate Supabase unless the explicit `--migrate` command is invoked.
