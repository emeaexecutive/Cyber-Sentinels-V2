# Sprint 16.1B.1 Deployment, Rollback and Final Acceptance

Date: 2026-07-18  
Repository: `C:\Users\emeae\Desktop\cyber-sentinels-clean`  
Branch: `main`  
Verified application source commit: `e18c0af62d8060563a956f9ddf9033ae9cd9b9cd`

## Release outcome

The Enterprise Buyer Documentation and Pilot Checklist experience is deployed and healthy on the canonical production domain. Vercel's production build log binds the application-bearing release to commit `e18c0af`, and runtime checks confirm the intended routes, navigation, metadata and legacy redirects.

No manual production promotion was performed in Part 4. The Git-connected production deployment had already promoted the verified application commit before the manual preview was created. Every subsequent `main` documentation push creates an equivalent production build automatically; those builds change the deployment identifier but do not change the verified application baseline.

Recommendation: **retain the `e18c0af` application baseline on the current READY production deployment; do not perform a manual promotion until stakeholder sign-off is recorded and the Vercel environment inventory is reviewed.** The two static public Enterprise resources are suitable for production use. Credentialed analytics and wider operational integrations are not accepted by this release record.

## Deployment identity

| Environment | State | Deployment | Source |
| --- | --- | --- | --- |
| Verified application-bearing production snapshot | READY | `dpl_F5NYTPPL3xhNwZSQk6ASWYpZkAzx` / `https://cyber-sentinels-v2-8enz12y8q-keith-speres-projects.vercel.app` | Vercel build log: `main`, commit `e18c0af` |
| Canonical production | READY | `https://www.cybersentinels.com` | Git-connected alias; re-resolve after every `main` documentation push |
| Protected preview | READY | `dpl_6W4mqmmo88C7c24oqKkctE7rUG5r` / `https://cyber-sentinels-v2-imvvon3wp-keith-speres-projects.vercel.app` | Manual deployment from the clean `e18c0af` checkout |
| Previous production / rollback target | READY | `dpl_48nG4sv86rgd62ojeLzGCgzM4gvq` / `https://cyber-sentinels-v2-lrfngs4wi-keith-speres-projects.vercel.app` | Vercel build log: `main`, commit `b2f93fe` |

The preview remains behind Vercel SSO protection. Verification used Vercel's authenticated request path; deployment protection was not weakened. Deployment IDs in this table are retained audit evidence, while the canonical alias may advance to a documentation-only descendant of the same application baseline.

## Pre-deployment gate

| Check | Result |
| --- | --- |
| Working tree and branch | Passed before deployment: clean `main`, synchronized with `origin/main` |
| `npm.cmd run validate` | Passed |
| Lint | Passed with 0 errors and 6 existing out-of-scope warnings |
| Typecheck | Passed |
| Complete chained repository test suite | Passed |
| Production build | Passed locally and in Vercel on Next.js 15.5.20 |
| Static route generation | Passed: 156 of 156 pages |
| Buyer Documentation route source | Present and generated |
| Pilot Checklist route source | Present and generated |
| Enterprise link contract | Passed: application-relative native destinations |
| New-tab / external buyer document links | Passed: none in the deployed Enterprise pages |
| Parts 1-3 reports | Reviewed: accessibility, responsive, analytics, privacy, security, Lighthouse and tests |

Vercel's install step reported two moderate dependency audit findings. No dependency upgrade was attempted because it is outside this sprint's scoped Enterprise experience and could introduce unrelated change.

## Preview and production route verification

The following matrix passed on the protected preview and the canonical production domain:

| Destination | Expected behavior | Result |
| --- | --- | --- |
| `/enterprise/buyer-documentation` | Native page | `200` |
| `/enterprise/pilot-checklist` | Native page | `200` |
| `/enterprise-access?intent=demo&source=buyer-documentation` | Request Demo destination | `200` |
| `/enterprise/pilot` | Book Pilot destination | `200` |
| `/enterprise-access?intent=trust-team&source=buyer-documentation` | Contact Enterprise destination | `200` |
| `/docs/BUYER_JOURNEYS.md` | Permanent retirement redirect | `308` to `/enterprise/buyer-documentation` |
| `/docs/ENTERPRISE_PILOT_CHECKLIST.md` | Permanent retirement redirect | `308` to `/enterprise/pilot-checklist` |
| `/sitemap.xml` | Search discovery | `200`; both canonical routes present |
| `/robots.txt` | Crawl policy | `200`; neither route is disallowed |

Deployed HTML checks passed for both Enterprise pages:

- exact page title;
- canonical URL and Open Graph metadata;
- semantic breadcrumb with the current page identified;
- Request Demo, Book Pilot and Contact Enterprise labels;
- zero external anchors;
- zero `target="_blank"` links;
- zero retired raw-document links;
- zero page-level `noindex` metadata.

The preview protection layer correctly adds `X-Robots-Tag: noindex`; production page markup remains indexable.

## Navigation and browser independence

- Buyer Documentation and Pilot Checklist open directly as native routes.
- Breadcrumbs provide Home, Enterprise and the current hierarchy without requiring browser Back.
- The Pilot Checklist includes Buyer Documentation as its parent breadcrumb.
- Shared CTA destinations are internal and same-tab.
- Legacy Markdown URLs resolve permanently to the native pages.
- Enterprise branding and navigation are shared through the existing Enterprise layout.

## Accessibility and responsive acceptance

Automated and structural acceptance is passed:

- Lighthouse accessibility was 100 for both routes on mobile and desktop in Part 3.
- Semantic landmarks, headings, lists, description lists, breadcrumbs and CTA navigation are covered by the Enterprise experience tests.
- CTA touch targets retain a minimum 44-pixel height contract.
- Responsive source contracts cover mobile padding, wrapping breadcrumbs, stacked-to-wrapped CTA groups and timeline/grid breakpoints.
- Part 3 Lighthouse used mobile 412 x 823 and desktop 1350 x 940 profiles; scores and layout-shift measurements remain recorded in `SPRINT_16_1B_1_LIGHTHOUSE.md`.

The in-app browser execution surface was unavailable in Part 4. Therefore no new claim is made for manual keyboard/assistive-technology testing, a live console capture, screenshots, or the exact 320/375/390/430/768/1024/1280/1440 viewport matrix. Part 3's final Lighthouse reports recorded zero console errors, but that is not represented as a new live-browser pass.

## Analytics acceptance

Analytics behavior is verified as intentionally dormant, not live:

- no approved analytics provider is mounted;
- no analytics consent controller exists;
- no Enterprise analytics events are emitted;
- navigation cannot be blocked by an analytics request that does not exist;
- reserved event names and prohibited properties remain documented in `SPRINT_16_1B_1_ANALYTICS.md`.

Analytics go-live remains blocked until an approved provider, optional-cookie controls, failure isolation and duplicate-firing tests exist.

## Environment and operational boundary

`vercel env ls` returned no configured variable names for `keith-speres-projects/cyber-sentinels-v2`. Both preview and production builds completed, but their logs recorded failed durable operational measurement writes. This does not block the two prerendered public Enterprise pages, but it prevents this release from claiming credentialed Supabase, provider, analytics or durable-telemetry readiness.

Before broader production acceptance:

1. review and approve the required Vercel Preview and Production environment inventory;
2. verify Supabase Site URL, callback URLs, migrations, authentication and RLS with credentials;
3. verify configured provider states from protected operational pages;
4. record stakeholder sign-off;
5. complete manual keyboard, assistive-technology and exact-width browser QA.

## Rollback plan

Rollback is ready but was not executed because production is healthy. For a documentation-only deployment failure, use `vercel ls cyber-sentinels-v2` to select the immediately preceding READY production deployment built from the same `e18c0af` application baseline. For an application rollback, use the fixed `b2f93fe` target below.

1. Pause new promotion activity and preserve Vercel, Git and application audit history.
2. Record the trigger, affected routes, timestamps and observed impact.
3. Roll back the canonical aliases to the immediately prior READY deployment:

   `npx vercel rollback dpl_48nG4sv86rgd62ojeLzGCgzM4gvq --yes --scope keith-speres-projects`

4. Verify `/enterprise`, Buyer Documentation, Pilot Checklist, Enterprise Access and the legacy redirects.
5. Confirm the prior Enterprise navigation remains usable and Enterprise Access still returns its expected public response.
6. Preserve source history with `git revert e18c0af` if a source correction is required; do not rewrite or reset shared history.
7. Record root cause, corrective action and owner.
8. Re-run `npm.cmd run validate`, create a protected preview, repeat the route/metadata checks and obtain sign-off before redeployment.

The rollback target is commit `b2f93fe`, the immediately prior implementation release. It retains both native routes while removing the later Part 3 polish, making it a narrow and auditable fallback.

## Final acceptance

| Acceptance item | Status |
| --- | --- |
| Repository clean before release work | Passed |
| Build successful | Passed locally, preview and production |
| Enterprise journey complete | Passed for public direct routes, navigation, breadcrumbs and CTAs |
| Documentation updated | Passed with this release record |
| Preview deployed and verified | Passed |
| Production deployment verified | Passed; application baseline is commit `e18c0af` on a READY Git-connected deployment |
| Rollback target and procedure verified | Passed |
| Stakeholder sign-off | Awaiting evidence |
| Analytics live verification | Blocked by design: no approved provider or consent controller |
| Manual browser/assistive-technology matrix | Awaiting browser-capable session |
| Manual production promotion | Not required; Git-connected production already contains the verified application commit |

## Final Codex report

1. **Files changed:** this final deployment, rollback and acceptance record only; implementation and Part 3 evidence remain in their existing committed files.
2. **Routes added or updated:** no Part 4 route changes; Buyer Documentation and Pilot Checklist were verified on preview and production.
3. **Navigation fixes:** no new Part 4 fix required; shared navigation, breadcrumbs, internal CTAs and permanent legacy redirects pass at runtime.
4. **Accessibility:** automated Lighthouse and semantic contracts pass; manual keyboard and assistive-technology work remains explicitly unclaimed.
5. **Analytics:** dormant state verified; go-live remains blocked pending provider and consent approval.
6. **SEO:** exact title, canonical, Open Graph, sitemap and robots behavior pass on deployed output.
7. **Tests:** `npm.cmd run validate` passed the complete chained suite with 0 lint errors and 6 existing warnings.
8. **Build:** local, preview and production builds pass with 156 generated pages.
9. **Rollback:** exact prior READY deployment, commit and CLI procedure are recorded; audit-preserving Git revert is specified.
10. **Production recommendation:** retain the `e18c0af` application baseline on the current READY production deployment; do not create a manual promotion until stakeholder sign-off and environment review are complete.
