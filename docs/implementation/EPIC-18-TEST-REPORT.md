# EPIC 18 Test Report

Final local gate results on 2026-07-21:

| Gate | Result | Evidence |
|---|---|---|
| `npm run lint` | PASS with 6 pre-existing warnings | No lint errors; warnings are outside EPIC 18 files. |
| `npm run typecheck` | PASS | TypeScript completed with exit code 0. |
| `npm test` | PASS | Full chained repository suite completed with exit code 0. |
| `npm run test:trust-architecture` | PASS | 12 tests passed, 0 failed. |
| `npm run test:trust-events` | PASS | 21 tests passed, 0 failed. |
| `npm run test:consensus-engine` | PASS | 25 tests passed, 0 failed. |
| `npm run build` | PASS | Next.js compiled and generated 182 static pages; all EPIC 18 routes were present. |
| `npm run verify:18` | PASS | Branch `main`; 25 required files, typecheck, focused tests and build artifact verified; zero findings. |

The build used process-local, non-secret placeholder Supabase values only to exercise build-time validation. This is not evidence of configured Production environment values.

Coverage includes deterministic JCS/SHA-256, domain failure, Evidence Object validation, World ID inconclusive truth, first and subsequent state transitions, revocation, stale evidence, policy precedence, safe graph metadata, insufficient KPI handling, required SQL tables, RLS/anonymous denial, consensus/state separation, simulation isolation, and consent/provider Evidence Object materialization.

No Supabase Production migration, Vercel Production deployment, or live endpoint result is claimed.
