# EPIC 19.1 Validation Report

Validation date: 2026-07-23
Runtime: Node 22.23.1, npm 11.13.0
Audited code commit: `b86baa3`

## Mandatory sequence

| Command | Result |
|---|---|
| `npm ci` | PASS; 450 packages installed |
| `npm run lint` | PASS; 0 errors, 0 warnings after safe cleanup |
| `npm run typecheck` | PASS |
| `npm run test:cookie-consent` | PASS; 13/13 |
| `npm run test:consent` | PASS; 32/32 |
| `npm test` | PASS; 361/361 across 40 TAP summaries |
| `npm run build` | PASS; Next.js 15.5.21, 183 static pages |

## Additional `test:*`

| Script | Result |
|---|---|
| `test:release-manager` | PASS; 6/6 |
| `test:load` | PASS; 100 local mocked flows, 0 errors, 0 timeouts |
| `test:rls` | SKIPPED/BLOCKED; attempted and stopped before assertions because `RUN_RLS_TESTS`, Supabase URL/anon key, User A JWT, and Tenant B ID were unavailable |
| `test:hopae-live` | SKIPPED; requires `RUN_HOPAE_LIVE_TESTS=true`, complete Hopae sandbox credentials, and approved external provider execution |
| `test:deployed` | SKIPPED; requires `RUN_DEPLOYED_SECURITY_TESTS=true`, explicit approved HTTPS staging URL, signing test context, and deployment-specific security targets |

`test:cookie-consent` was also executed separately as required. Other `test:*` scripts are invoked by `npm test`.

## `verify:*`

| Script | Result |
|---|---|
| `verify:17.1d` | PASS |
| `verify:17.1e` | NONZERO; substantive artifacts/invariants/lint/types/tests/build passed, but verifier hard-codes branch `main` |
| `verify:17.2` | NONZERO; substantive artifacts/invariants/lint/types/tests/build passed, but verifier hard-codes branch `main` |
| `verify:18` | NONZERO; files/typecheck/tests/build passed, but verifier hard-codes branch `main` |
| `verify:19` | PASS with no findings |

The branch failures were not bypassed. EPIC 19.1 explicitly required creating and auditing on a safety branch; deployment requires later merge and clean `main`.

## Dependency and runtime checks

- Next.js framework advisories were resolved by 15.5.21.
- `npm audit --omit=dev` still fails with two high-severity `sharp` findings.
- Vercel authentication/project inspection succeeds.
- Vercel runtime consistency fails: project/middleware Node 24.x versus required Node 22.x.

## Current production probes

| URL | Result |
|---|---|
| `/` | 200 |
| `/login` | 200 |
| `/enterprise-access` | 200 |
| `/cookies` | 200 |
| `/privacy` | 200 |
| `/privacy/preferences` | 200 |
| `/security` | 200 |
| `/api/health` | 200, status `ok` |
| `/api/ready` | 503, `ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE` |
| `https://cybersentinels.com/` | 308 to `https://www.cybersentinels.com/` |

TLS verification succeeded for all curl probes. These checks target the previous production commit `7df930298d153cf20d8a6e4bd2ff5188432e18df`, not the EPIC 19 branch.

## Totals

- Primary aggregate: 361 passed, 0 failed, 0 skipped.
- Mandatory consent executions: 13/13 and 32/32 passed (also covered in the aggregate where applicable).
- Additional release-manager: 6/6 passed.
- Local load: 100/100 operations succeeded.
- Credential-bound skipped scripts: 3.
- Historical verifier policy failures: 3, all due to safety branch rather than substantive code checks.
- Build: PASS.

## Validation outcome

Local source validation is strong, but production validation is blocked by dependency security, readiness, runtime consistency, migration/RLS evidence, and branch/merge requirements.
