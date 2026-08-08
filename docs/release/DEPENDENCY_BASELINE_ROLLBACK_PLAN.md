# Dependency baseline rollback plan

## Approval boundary

Rollback is an owner-approved Git revert of the bounded Epic 35 commits. Do not edit the lockfile by hand, force-push, deploy automatically, change a database, or reuse stale preview evidence. After any revert, run `npm ci`, focused subsystem tests, full lint/type/test/build and a new Vercel Preview.

| Group | Pre-upgrade state | Epic 35 state | Commit/evidence | Rollback strategy | Data/schema impact | Deployment/cache impact |
| --- | --- | --- | --- | --- | --- | --- |
| React runtime/types | React 19.2.8; React DOM 19.0.0; React types 19.2.18; DOM types 19.2.3 | React/DOM 19.2.8; types 19.2.18/19.2.4; Scheduler 0.27.0 | `823004e`; React review and two clean builds | Revert dependency commit only as an emergency, then coordinate both runtimes to one known-compatible version before deploying | None | Invalidates Next.js/Vercel cache; full rebuild required |
| Stripe | SDK 22.2.0; API `2026-05-27.dahlia` | SDK 22.4.0; API `2026-07-29.dahlia` | `823004e`; contract/signature/type/build tests | Revert SDK and API-version source together | No schema change; webhook payload interpretation may differ | Redeploy required; re-run test-mode webhook/checkout evidence |
| CSS | PostCSS 8.5.14; Autoprefixer 10.4.20 before merged PRs #21/#23 | PostCSS 8.5.25; Autoprefixer 10.5.4 retained | Merged main plus final CSS size/hash and browser evidence | Revert both CSS packages together from a fresh main branch if a verified browser regression appears | None | Clear build cache and compare generated CSS |
| Security actions | Floating checkout/setup-node and CodeQL version tags; Gitleaks pinned | All actions immutable; checkout credentials not persisted | `f0d95c8`; supply-chain review | Revert only to a separately reviewed immutable commit, never a floating tag | None | Workflow-only; no application deploy required |
| Unused package | Deprecated `@worldcoin/idkit` plus 76 exclusive transitives | Removed | `823004e`; usage audit/full regression/build | Re-add with npm only if an implemented World ID exchange first proves a runtime requirement | None | Rebuild bundle; no current route behavior should change |
| Audit remediation | `brace-expansion` 1.1.16 and 5.0.7 | 1.1.18 and 5.0.9 | `823004e`; zero final audit | Revert only if parent-tool incompatibility is proven; vulnerability then reopens | None | Development/CI graph only |
| Regression/artifacts | No baseline preflight or deterministic SBOM | Dependency/React gates; CycloneDX, SPDX, licence inventory | `823004e` | Revert only with equivalent replacement evidence | None | CI/review evidence only |

No database rollback is expected. None of the dependency changes applies a migration or intentionally changes persisted data. Owner approval remains required for merge, rollback and any deployment.
