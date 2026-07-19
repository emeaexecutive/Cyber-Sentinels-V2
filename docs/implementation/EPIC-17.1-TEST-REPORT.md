# EPIC 17.1 — Test Report

**Executed:** 2026-07-19

**Environment:** local Windows workspace; Node.js test runner; Next.js production build with non-secret placeholder Supabase values
**Overall local result:** PASS WITH EXTERNAL TESTS BLOCKED

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | PASS | `npx tsc --noEmit` exited 0 |
| ESLint | PASS WITH PRE-EXISTING WARNINGS | `npm run lint` exited 0; six warnings remain in pre-existing, out-of-scope files |
| EPIC identity unit/API/integration tests | PASS | 8 tests passed |
| EPIC identity RLS source tests | PASS | 3 tests passed |
| Full repository test chain | PASS | `npm test` exited 0, including provider, Hopae, RLS, security, trust lifecycle, and release-candidate suites |
| Production build | PASS | `next build` compiled, type-checked, generated 161 static pages, emitted all new API/dashboard routes, and exited 0 |
| Diff whitespace check | PASS | `git diff --check` exited 0 |

The first production-build attempt compiled and generated all pages but exceeded the 180-second command wrapper while collecting build traces. It was rerun with a 300-second limit and completed successfully in 152.4 seconds. This is not recorded as a product failure.

## New behavioral coverage

- Supported signal validation and deduplication.
- Stable idempotency digests independent of JSON object key order.
- Zero contribution from inconclusive or client-reported evidence.
- Contribution only from successful server-verified evidence.
- Persisted blocked provider results.
- Same-body idempotent replay without duplicate evidence.
- Same-key/different-body HTTP 409 behavior.
- Authenticated membership-based enterprise selection.
- Body-supplied enterprise authority rejection.
- World ID fail-closed callback semantics.
- Canonical Hopae callback alias and middleware ingress.
- RLS enablement, anonymous denial, tenant-scoped reads, service-only writes, and append-only audit history.

## Tests not executed

| Test | Status | Reason / unblocker |
| --- | --- | --- |
| Hosted migration apply | BLOCKED BY EXTERNAL CONFIGURATION | Requires approved Supabase project and migration authority |
| Live two-tenant RLS denial | BLOCKED BY EXTERNAL CONFIGURATION | Requires migration applied plus two authorized test identities/workspaces |
| Hopae sandbox session/callback | BLOCKED BY CREDENTIALS | Requires approved Hopae credentials, provider registry enablement, and callback URL |
| Hopae forged/stale callback against deployed URL | BLOCKED BY EXTERNAL CONFIGURATION | Requires deployed preview and webhook configuration |
| World ID valid/invalid upstream proof exchange | BLOCKED BY EXTERNAL CONFIGURATION | Server verification integration does not exist |
| Email/phone/network/geolocation provider tests | MISSING | No providers are selected or implemented |
| Production smoke test | BLOCKED BY EXTERNAL CONFIGURATION | Must follow approved merge, migration, and deployment workflow |

## Build warnings

The build reported existing lint warnings in:

- `app/api/receipts/[id]/route.ts`
- `app/login/page.tsx`
- `app/team-access/page.tsx`
- `app/trust/data-sovereignty/page.tsx`
- `app/trust-graph-engine/page.tsx`
- `lib/operational-trust/api.ts`

No new EPIC 17.1 file produced a lint warning at final validation.

## Acceptance decision

Local repository acceptance gates pass. Production acceptance remains blocked until the external tests above are completed and the separate legacy RLS release blocker is resolved.
