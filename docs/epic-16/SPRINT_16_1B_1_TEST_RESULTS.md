# Sprint 16.1B.1 Test Results

Date: 2026-07-18

## Commands run

| Command / check | Result |
| --- | --- |
| `node --test tests/enterprise-experience.test.mjs tests/public-surface-navigation.test.mjs` | Passed: 19 tests |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed with 0 errors and 6 pre-existing warnings outside this scope |
| `npm.cmd test` | Passed: complete chained repository suite, including 10 Enterprise experience tests |
| `npm.cmd run build` | Passed: Next.js 15.5.20, 156 static pages generated |
| Lighthouse 13.4.0 mobile + desktop for both routes | Reports generated and measured; see Lighthouse document |

No `test:routes`, `test:links`, `test:a11y`, `test:e2e`, `test:ui` or `test:seo` script exists, so none was invented or claimed.

## Production HTTP matrix

| Destination | Result |
| --- | --- |
| `/enterprise/buyer-documentation` | 200 |
| `/enterprise/pilot-checklist` | 200 |
| `/enterprise-access?intent=demo` | 200 |
| `/enterprise/pilot` | 200 |
| `/enterprise-access?intent=trust-team` | 200 |
| `/docs/BUYER_JOURNEYS.md` | 308 to Buyer Documentation |
| `/docs/ENTERPRISE_PILOT_CHECKLIST.md` | 308 to Pilot Checklist |
| `/sitemap.xml` | 200; both canonical routes present |
| `/robots.txt` | 200; the two canonical routes are not disallowed |

Production HTML checks found canonical and Open Graph metadata, no `noindex`, no new-tab target and no raw document link. Lighthouse reported zero console errors after navigation remediation.

## Behavioral coverage

- Native route files and direct public visibility.
- Enterprise layout, active sub-navigation and hierarchical breadcrumbs.
- Four buyer roles and semantic description-list cards.
- Before Kickoff, Week 0-3, Success Metrics, Responsibilities and visible Rollback.
- Shared Request Demo, Book Pilot and Contact Enterprise CTA contract.
- Bidirectional contextual route links.
- Internal native destinations and no unsafe/external navigation.
- Exact metadata, sitemap inclusion and Markdown retirement.
- Responsive class contracts, semantic list structure and touch sizing.
- No private-data, secret, query-authorization or unsafe-rendering path.
- Purpose-built CTA pages do not mount the hydration-shifting adoption rail.

## Not run

- Exact 320/375/390/430/768/1024/1280/1440 rendered viewport matrix.
- Manual keyboard/assistive-technology session.
- Playwright/Cypress E2E click journey.
- Visual-regression screenshots.

Those tools were unavailable or not installed, so no pass claim is made for them.

## Deployment recommendation

The two public content routes are suitable to advance to Part 4 verification: tests, build, HTTP integrity, metadata, automated accessibility and final Lighthouse checks pass. Analytics go-live remains blocked by the absence of an approved provider and consent framework. Exact-width and manual assistive-technology QA should be completed in a browser-capable environment before describing those checks as passed.
