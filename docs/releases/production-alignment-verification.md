# Production alignment verification

## Release scope

CS-ENG-001 Parts 1-5 documentation is consolidated onto `main`, Preview-first instructions are removed, and the implementation matrix distinguishes runtime implementation from documentation and external configuration. A narrow PostCSS override removes the moderate transitive advisory in Next without changing the Next version.

## Pre-deployment baseline - 2026-07-18

| Check | Result |
| --- | --- |
| Active branch | `main` |
| Remote baseline before consolidation | `origin/main` at `9b6fecf` |
| Safety tag | `pre-production-alignment-20260718-233926`, pushed to `origin` |
| Reviewed prior branch | Four documentation-only commits; 66 files under `docs/`; no runtime, migration, credential or generated files |
| Consolidation | Merge commit `9484a95` on local `main` |
| Vercel project | `cyber-sentinels-v2` |
| Vercel Production Branch | `main` (verified through project API) |
| Baseline Production deployment | `dpl_9mqUFURpjiUpbSi7WCmz23nz39PE`, `Ready`, target `production` |
| Canonical domain | `https://www.cybersentinels.com` returned 200 |
| Apex behavior | HTTP -> HTTPS -> 308 to canonical `www` |
| Login | `/login` returned 200 |
| Enterprise access | `/enterprise-access` returned 200 |
| Protected routes | `/dashboard` and `/back-office` returned 307 to login with `noindex` |
| Critical protected API | `/api/trust/posture` returned 401 without a session |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy present |
| Edge | Live responses served through Cloudflare; no mixed-content conclusion was possible without a browser DOM/network pass |
| Production errors | No Vercel Production error logs found in the bounded previous 24-hour query |

## Quality gates

All repository-defined gates passed after the dependency remediation:

- `npm run lint`: passed with zero errors and six pre-existing warnings in unchanged runtime files.
- `npm run typecheck`: passed.
- `npm test`: all configured test families passed.
- `npm run build`: Next.js Production build passed.
- `npm audit --omit=dev`: passed with zero vulnerabilities.

The initial audit identified Next's nested PostCSS `8.4.31`. npm's automatic forced fix proposed an unsuitable breaking Next downgrade, so it was not used. `package.json` now pins PostCSS `8.5.14` and uses npm's direct-dependency override reference; `npm ls postcss --all` confirms that Next and all other consumers resolve to `8.5.14`. The complete validation chain passed again after this change.

## Post-deployment verification - 2026-07-19

| Check | Result |
| --- | --- |
| Pushed commit | `b3fa291` |
| Production deployment | `dpl_9gvF9qNmCRRqGHgoL7ueSLx4RtT1`, `Ready`, target `production` |
| Commit proof | Vercel build log: Branch `main`, Commit `b3fa291` |
| Canonical aliases | `www.cybersentinels.com`, `cybersentinels.com` and the project production aliases attached to the deployment |
| Canonical redirect chain | HTTP apex reached canonical HTTPS `www` in two redirects; HTTPS apex reached it in one; no loop |
| Public pages | Homepage, `/login` and `/enterprise-access` returned 200 |
| Protected routes | `/dashboard` and `/back-office` each redirected once to `/login` and completed with 200 |
| Critical APIs | `/api/health` returned 200 with `status: ok`; unauthenticated `/api/trust/posture` returned 401 |
| Assets and mixed content | All ten homepage `/_next/static/` references returned 200; no `http://` asset reference or visible `*.vercel.app` URL appeared in homepage markup |
| Security headers | CSP, HSTS, framing, content-type, referrer and permissions policies present on the deployed canonical homepage |
| Runtime errors | Bounded error-log query for the new deployment returned no logs after smoke checks |
| Branch cleanup | Superseded local and remote CS-ENG branch deleted after zero-unique-commit checks; safety tag retained |

The initial successful Vercel alignment builds emitted non-fatal `Durable operational measurement write failed` messages for telemetry stages while collecting page data. The follow-up runtime guard skips durable telemetry persistence only during Next's `phase-production-build`; in-process measurement and deployed runtime persistence remain enabled. Production deployment `dpl_9xrwQQs2tXzPEEa4KeVou9Rokqgu` built `main` commit `386f55c` successfully with `durableFailureCount=0`, and the bounded post-smoke error-log query returned no logs.

## Manual and credentialed boundaries

The following remain unverified until an authorized operator supplies the relevant platform access or test account:

- authenticated session persistence, logout and refresh;
- authenticated Supabase reads and writes;
- Production environment variable completeness;
- Preview Deployment Protection;
- Vercel notification preferences;
- Cloudflare DNS/WAF/bot dashboard configuration;
- applied Supabase migration/RLS state;
- live Hopae/provider transaction;
- full interactive-browser accessibility and authenticated redirect/session inspection.

## Rollback

If the Production deployment fails, identify the bad and last known-good commits, run `git revert <bad-commit-sha>`, push `main`, and repeat the canonical-domain checks. Use Vercel rollback only when the intended known-good deployment is explicitly identified. Do not reset shared `main`.
