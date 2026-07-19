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

## Post-deployment verification

Pending the reviewed alignment commit, push to `main`, automatic Vercel Production deployment and live re-check. The deployed commit must be proven from Vercel; it must not be inferred from Git alone.

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
- full browser mixed-content, asset, accessibility and redirect-loop inspection.

## Rollback

If the Production deployment fails, identify the bad and last known-good commits, run `git revert <bad-commit-sha>`, push `main`, and repeat the canonical-domain checks. Use Vercel rollback only when the intended known-good deployment is explicitly identified. Do not reset shared `main`.
