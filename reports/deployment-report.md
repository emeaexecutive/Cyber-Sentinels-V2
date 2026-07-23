# Deployment validation report

Date: 2026-07-22

## Outcome

Code validation: PASS. Deployment: NOT EXECUTED.

No commit, Supabase push, or production deployment was performed.

## Acceptance gates

- `npm run test:cookie-consent`: PASS (13 tests).
- `npm run test:consent`: PASS (32 tests).
- `npm run lint`: PASS (0 errors, 6 warnings).
- `npm run typecheck`: PASS.
- `npm run build`: PASS; Next.js 15.5.20 compiled successfully and generated 183 static pages.
- `git diff --check`: PASS; only line-ending conversion notices were emitted.
- All PowerShell runners, including `scripts/Run-From-Clean.ps1`, parse successfully.

## Clean production runner

`scripts/Run-From-Clean.ps1` is the canonical validation entry point. It:

- validates Git repository state, conflicts, and whitespace;
- requires Node.js 22 and the `22.x` package engine;
- runs `npm ci`, both consent suites, lint, typecheck, and build in fail-fast order;
- optionally runs the full test suite with `-RunAllTests`;
- optionally runs `supabase db push --include-all` with `-RunSupabaseMigrations`;
- always writes this fixed deployment report path and returns a non-zero exit code on failure.

The local shell used for this implementation reports Node.js 26.1.0. The runner was syntax-validated but intentionally not executed past its Node 22 production guard.

## Product-direction check

The changes are limited to consent, migration safety, validation tooling, tests, and reports. Existing Operational Trust Infrastructure architecture remains intact, including Trust Memory™, Evidence Graph, Replay, Authority Lineage, provider-neutral consensus, Continuous Trust, Decision Intelligence, human/agent/machine identity, delegated authority, runtime controls, and cryptographic/auditable evidence. Identity verification remains one replaceable evidence source rather than the product category.
