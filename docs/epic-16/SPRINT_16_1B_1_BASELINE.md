# Sprint 16.1B.1 Enterprise audit baseline

Recorded 2026-07-18 in `C:\Users\emeae\Desktop\cyber-sentinels-clean` before creating the Part 1 audit documents.

## Repository state

| Field | Value |
| --- | --- |
| Branch | `main` tracking `origin/main` |
| Commit | `359c4452c3c70e8f7de9d78662d500f204c582a0` (`Epic 16 Sprint 16.1B.1 internalize enterprise buyer resources`) |
| Initial working tree | Clean |
| Node | `v26.1.0` |
| npm | `11.13.0` |
| Next.js | `15.5.20` |
| Router | App Router under `app/`; no `src/app/` or Pages Router |

The current commit already contains the two native Enterprise routes and their focused tests. This Part 1 pass did not recreate, delete or modify application code.

## Baseline command results

| Command | Result |
| --- | --- |
| `npm ci` | Initial sandboxed attempt failed because the npm user cache was inaccessible (`EPERM`). Re-run with approved cache access passed in 55.5s, installed/audited 449 packages, reported two moderate vulnerabilities and two deprecated World ID packages. |
| `npm run lint` | Passed with 0 errors and 6 pre-existing warnings. |
| `npm run typecheck` | Passed. |
| `npm test` | Passed the complete chained suite, including public-surface, Enterprise adoption and Enterprise experience tests. Node emitted existing module-type performance warnings. |
| `npm run build` | Passed in 85s. Next.js compiled, generated 156 static pages and emitted the same six lint warnings. Both target routes are static and have 106 kB first-load JS. |
| `npm audit --omit=dev` | Exit 1: two moderate vulnerabilities in Next.js's nested PostCSS dependency path. The proposed force fix is breaking; no fix was applied. |
| Existing route/link tests | `test:public-surface` and `test:enterprise-experience` ran inside `npm test` and passed. |
| Accessibility/E2E/UI/SEO scripts | No dedicated scripts exist in `package.json`; none were invented. |

Pre-existing lint warnings:

- `app/api/receipts/[id]/route.ts`: unused `_hidden`.
- `app/login/page.tsx`: missing `useEffect` dependency `recordAuthEvent`.
- `app/team-access/page.tsx`: unused `TeamAccessRole`.
- `app/trust-graph-engine/page.tsx`: unused `Link`.
- `app/trust/data-sovereignty/page.tsx`: unused `Link`.
- `lib/operational-trust/api.ts`: unused `_hidden`.

## Local HTTP smoke results

A production server was started locally from the successful build and stopped after the checks.

| URL | Result | Meaning |
| --- | --- | --- |
| `/enterprise` | HTTP 200, HTML | Public Enterprise landing works |
| `/enterprise/buyer-documentation` | HTTP 200, HTML | Native buyer page works |
| `/enterprise/pilot-checklist` | HTTP 200, HTML | Native checklist page works |
| `/enterprise/readiness` | HTTP 503, private/no-store, noindex | Correct fail-closed behavior without Supabase auth environment |
| `/docs/BUYER_JOURNEYS.md` | HTTP 200, `text/markdown` | Legacy raw buyer document remains exposed |
| `/docs/ENTERPRISE_PILOT_CHECKLIST.md` | HTTP 200, `text/markdown` | Legacy raw checklist remains exposed |

Security headers were present on the checked pages: CSP, `X-Frame-Options: DENY`, strict referrer policy, `nosniff`, HSTS and Permissions Policy.

## Route findings

- Both requested routes exist, are public, inherit the current Enterprise layout, use internal Next links and build successfully.
- Canonical CTA destinations are `/enterprise-access?intent=demo`, `/enterprise/pilot`, `/enterprise-access?intent=pilot`, `/enterprise/buyer-documentation` and `/enterprise/pilot-checklist`.
- `/request-demo`, `/book-pilot`, `/contact`, `/enterprise-summary` and `/production-readiness` do not exist and should not be invented.
- Enterprise Summary already exists as an authenticated Trust Evidence Pack export format.
- Production readiness already exists on protected `/enterprise/readiness` and `/admin/deployment-readiness` surfaces.
- The two public target routes are missing from `canonicalPublicRoutes` and therefore from `sitemap.xml`.
- Legacy buyer/checklist Markdown slugs remain in the `/docs/[slug]` allowlist.

## External-link findings

- No target-route link opens a new tab, uses `window.location`, points to GitHub or leaves the application.
- Four protected evidence links intentionally open dynamic evidence resources in a new tab with `noreferrer`.
- A generic footer external-target branch exists but is dormant because current footer URLs are internal.
- Raw Markdown routes are same-origin, but the two buyer artifacts violate the sprint's native-page-only intent while they remain directly allowlisted.

## Accessibility baseline

Source inspection passes semantic heading/list/link basics, visible focus, mobile-menu ARIA and reduced-motion support. Missing items are breadcrumbs, a skip-to-content link, Enterprise `aria-current`, instrumented contrast results and live keyboard/screen-reader verification. No dedicated accessibility test script exists. Browser automation was unavailable, so no Lighthouse, axe or viewport compliance claim is made.

## Responsive baseline

The target pages use mobile-first single columns, `flex-wrap` CTA groups, capped containers and breakpoint-based grids. The pilot timeline becomes four columns only at `md`, avoiding mandatory mobile horizontal scrolling. The main risk is the many-item Enterprise sub-navigation at 320-430 px; live overflow/tap-order checks remain required. No rendered viewport claim is made.

## Analytics baseline

No page-analytics helper or vendor is installed. Existing telemetry is operational/provider/ML telemetry, not buyer behavior analytics. Privacy and cookie copy reserve optional analytics for a consent-aware future implementation. Proposed events are therefore `Not implemented` and must not be claimed.

## SEO baseline

Both pages have the requested title pattern, description and canonical URL. Root metadata defines the production metadata base. Open Graph, Twitter and structured-data fields are absent. The centralized sitemap allowlist omits both new public pages; robots do not disallow them. Raw Markdown responses have no canonical or noindex treatment.

## Security baseline

The target pages contain no secrets, private pilot data, unsafe HTML, open redirects or arbitrary URL construction. They are static and application-relative. Enterprise access uses a same-origin form, rate limiting, Turnstile and server-side persistence. Protected readiness and Enterprise Summary export preserve authentication and private caching behavior.

## Blockers and recommended next files

Blockers:

1. Browser-backed responsive, keyboard and automated accessibility checks were unavailable.
2. No approved page-analytics/consent stack exists.
3. Protected readiness requires a configured Supabase environment for authenticated runtime validation.
4. Two moderate dependency vulnerabilities remain; the available automated fix is breaking.

Part 2 should begin with:

- `app/enterprise/buyer-documentation/page.tsx`
- `app/enterprise/pilot-checklist/page.tsx`
- `app/enterprise/layout.tsx`
- `app/enterprise-access/page.tsx`
- `lib/enterprise-experience.ts`
- `lib/navigation/route-visibility.ts`
- `app/docs/[slug]/route.ts`
- `tests/enterprise-experience.test.mjs`
- `tests/public-surface-navigation.test.mjs`
- the stale buyer/pilot/route-ownership documents identified in the audit

No code was deleted. At baseline close, the only intended working-tree changes are the three new Part 1 Markdown audit files.
