# Sprint 16.1B.1 Enterprise architecture and repository audit

Audit date: 2026-07-18. Repository: `C:\Users\emeae\Desktop\cyber-sentinels-clean`.

## Executive finding

The repository is a Next.js 15 App Router application. The two routes described as initially missing in the brief already exist at commit `359c4452c3c70e8f7de9d78662d500f204c582a0`:

- `/enterprise/buyer-documentation`
- `/enterprise/pilot-checklist`

Both are public, native React pages nested under the existing Enterprise layout. They render with the shared root header/footer, the Enterprise navigation, existing design tokens, framework-native links, canonical metadata and centralized CTA destinations. The production build and local HTTP smoke checks pass.

Part 2 should refine these existing pages rather than create replacement routes or a second Enterprise page tree. The main gaps are breadcrumbs, buyer/source context propagation, page analytics, canonical sitemap registration, CTA completeness, stale ownership documentation, and removal of the two legacy Markdown documents from the raw-document allowlist.

## 1. Repository and route architecture

| Area | Finding |
| --- | --- |
| Framework | Next.js `15.5.20`, React `19.0.0`, TypeScript `5.7.2` |
| Routing | App Router only under `app/`; no `src/app/` or `pages/` tree |
| Route scale | 224 `page.tsx` files, 121 `route.ts` handlers and 3 layouts |
| Root shell | `app/layout.tsx` supplies metadata, auth-aware global navigation, public footer, public adoption rail and authenticated Trust OS shell |
| Enterprise shell | `app/enterprise/layout.tsx` adds one shared Enterprise navigation bar; no parallel header or footer |
| Enterprise contract | `lib/enterprise-experience.ts` owns Request Demo, Book Pilot, Request Controlled Pilot, Buyer Documentation and Pilot Checklist destinations |
| Styling | Tailwind utilities plus shared tokens/classes in `app/globals.css`; dark operational visual language |
| Authentication | Supabase SSR middleware with public, verified-user and admin/allowlisted route classes |
| SEO | Root metadata, route metadata, centralized public-route allowlist, generated sitemap and robots rules |
| Tests | Node test runner; Enterprise route/link coverage is in `tests/enterprise-experience.test.mjs` and public navigation/SEO coverage in `tests/public-surface-navigation.test.mjs` |

## 2. Enterprise route inventory

The status column combines file inspection, the production build and local HTTP checks. A protected route returning `503` without Supabase configuration is fail-closed behavior, not a broken public route.

| Route | Purpose | Access | Exists | Status | Part 2 action |
| --- | --- | --- | ---: | --- | --- |
| `/enterprise` | Enterprise landing and four buyer journeys | Public | Yes | Working, HTTP 200 | Preserve; add explicit onward context only if the shared CTA contract can carry it |
| `/enterprise-access` | Demo, pilot, design-partner and general Enterprise request form | Public | Yes | Working; `intent=demo` and `intent=pilot` are recognized | Reuse; extend the existing safe query contract for buyer/source context |
| `/enterprise/buyer-documentation` | Native buyer documentation | Public | Yes | Working, prerendered, HTTP 200 | Preserve and refine; do not recreate |
| `/enterprise/pilot-checklist` | Native controlled-pilot checklist | Public | Yes | Working, prerendered, HTTP 200 | Preserve and refine; do not recreate |
| `/enterprise/pilot` | Public pilot programme and operating evidence | Public | Yes | Working, HTTP 200 | Reuse as canonical Book Pilot destination |
| `/enterprise/agent-governance` | Public agent-governance buyer surface | Public | Yes | Builds | Preserve |
| `/enterprise/hiring-security` | Public hiring workflow wedge | Public | Yes | Builds | Preserve; do not make it the platform identity |
| `/enterprise/demo-stories` | Public Enterprise demo stories | Public | Yes | Builds | Preserve |
| `/enterprise/walkthrough` | Public Enterprise walkthrough | Public | Yes | Builds | Preserve |
| `/enterprise/pilot-setup` | Pilot workspace initialization | Verified user | Yes | Protected by middleware | Preserve protection |
| `/enterprise/auditability` | Evidence/audit operations | Admin | Yes | Protected by middleware | Preserve protection |
| `/enterprise/compliance` | Compliance operations | Admin | Yes | Protected by middleware | Preserve protection |
| `/enterprise/control-plane` | Enterprise control-plane operations | Admin | Yes | Protected by middleware | Preserve protection |
| `/enterprise/identity-governance` | Identity governance operations | Admin | Yes | Protected by middleware | Preserve protection |
| `/enterprise/consortium` | Consortium operations | Admin | Yes | Protected by middleware | Preserve protection |
| `/enterprise/readiness` | Enterprise readiness dashboard | Admin | Yes | Fails closed with HTTP 503 when auth environment is absent | Reuse as the protected production-readiness equivalent; do not add `/production-readiness` |
| `/admin/deployment-readiness` | Deployment/environment readiness | Admin | Yes | Protected by middleware | Reuse for operator deployment evidence |
| `/request-demo` | Proposed alias in the brief | Public | No | Missing by design | Do not create; use `/enterprise-access?intent=demo` |
| `/book-pilot` | Proposed alias in the brief | Public | No | Missing by design | Do not create; use `/enterprise/pilot` |
| `/contact` | Proposed alias in the brief | Public | No | Missing by design | Do not create; use `/enterprise-access` |
| `/enterprise-summary` | Proposed standalone summary | N/A | No | No page; protected export exists | Reuse `/api/audit/export?...&format=pack-summary`; do not expose a dead route |
| `/production-readiness` | Proposed standalone readiness page | N/A | No | Equivalent protected routes exist | Reuse `/enterprise/readiness` and `/admin/deployment-readiness` |
| `/pilot/getting-started` | Legacy operator onboarding/checklist | Verified user | Yes | Protected by `/pilot` middleware prefix | Keep separate from public buyer checklist; clarify ownership in docs |

## 3. Enterprise layout audit

- `app/layout.tsx` is the single root layout. It renders the sticky global header, authenticated shell when a session exists, public adoption rail and the seven-section public footer.
- `app/enterprise/layout.tsx` is the only Enterprise-specific layout. It uses `enterpriseNavigation` and `enterpriseCtas`; both new pages inherit it automatically.
- Header behavior is responsive: one shared link set is rendered in a disclosure-controlled mobile menu and inline from the `sm` breakpoint.
- Enterprise navigation uses `flex-wrap`, but has no mobile disclosure, active-route state or `aria-current`. Its `ml-auto` Request Demo action should be checked at 320-430 px in Part 2.
- Page width is consistently `max-w-6xl`; the global header/footer use `max-w-7xl`.
- Typography, surfaces, focus styles, colors and reduced-motion behavior come from `app/globals.css` and Tailwind utilities.
- There is no separate light theme or theme switcher; the established product theme is dark.
- Root `app/loading.tsx` and `app/error.tsx` exist. There are no route-specific loading or error files under `app/enterprise`, which is acceptable for static pages but should be reconsidered only if Part 2 adds asynchronous work.

## 4. Reusable component inventory

| Capability | Existing implementation | Props/variants and behavior | Reuse decision |
| --- | --- | --- | --- |
| Header/mobile navigation | `components/global-navigation.tsx` | `accessLevel`; keyboard-operable button with `aria-label`, `aria-expanded` and `aria-controls`; same public links on mobile/desktop | Reuse unchanged |
| Footer | `app/layout.tsx` | Seven semantic navigation groups; internal Next links; dormant external-target branch | Reuse; add no Enterprise-only footer |
| Enterprise navigation | `app/enterprise/layout.tsx` + `lib/enterprise-experience.ts` | Central link array and one Request Demo action; semantic `nav` | Reuse; add active state and small-screen verification if required |
| Breadcrumbs | None found | No component, breadcrumb landmark or route trail | Add one small reusable breadcrumb component or local semantic nav in Part 2; do not duplicate headers |
| Page shell/container/section | Tailwind utilities and `.operational-shell`, `.operational-panel`, `.operational-card` in `app/globals.css` | Responsive padding, shared max widths and dark tokens | Reuse |
| Hero/executive summary | `components/executive-summary.tsx` | `eyebrow`, `title`, up to four `bullets`, required `primary`, optional `secondary`; semantic `h1`; CTA flex-wrap | Reuse |
| CTA contract | `lib/enterprise-experience.ts` | Typed internal `href`/`label` records | Modify in one place to add Contact Enterprise and safe context builders |
| CTA rendering | `ExecutiveSummary`, `BuyerJourneyGrid`, local CTA sections | First action primary, later actions secondary; native `Link` | Reuse; standardize target set without adding another CTA component |
| Buyer card | `BuyerJourneyGrid` in `components/enterprise-visuals.tsx` | `journeys` with `id`, `role`, answers and three typed actions; responsive two-column grid and semantic `dl` | Prefer reuse on Buyer Documentation instead of its parallel inline card markup |
| Evidence card | `EvidenceCard` in `components/enterprise-visuals.tsx` | `label`, `state`, optional `detail`; semantic `article` | Reuse only if it matches the content; current inline readiness cards are acceptable |
| Timeline | `Timeline` and `TrustFlow` in `components/enterprise-visuals.tsx` | Ordered lists, required accessible labels; desktop/mobile styles | Evaluate reuse; current pilot timeline is already a readable responsive ordered grid |
| Checklist | No dedicated component | Both pilot pages render semantic ordered/unordered lists locally | Keep local unless Part 2 can remove real duplication with a small shared data/render seam |
| Contact Enterprise | No canonical CTA record | Footer `Contact` points to `/enterprise-access` | Add to existing CTA contract, not a new route |

## 5. CTA route map

| Visible action | Canonical destination | Query behavior | Finding |
| --- | --- | --- | --- |
| Request Demo | `/enterprise-access?intent=demo` | `intent=demo` changes form title/button | Working and internal |
| Book Pilot | `/enterprise/pilot` | None | Working and internal |
| Request Controlled Pilot | `/enterprise-access?intent=pilot` | `intent=pilot` changes form title/button | Working and internal |
| Buyer Documentation | `/enterprise/buyer-documentation` | None | Working and internal |
| Pilot Checklist | `/enterprise/pilot-checklist` | None | Working and internal |
| Contact / Contact Enterprise | `/enterprise-access` | No dedicated intent | Destination exists, but the canonical Enterprise CTA contract lacks this action |
| Enterprise Summary | `/api/audit/export?workflow_id=<validated>&subject_type=<encoded>&format=pack-summary` | Authenticated export; validated workflow reference | Existing protected capability, not a public page |
| Production Readiness | `/enterprise/readiness` | No public CTA; admin protected | Existing protected equivalent |

## 6. Authentication and access classification

- Buyer Documentation and Pilot Checklist are correctly public: neither matches a user nor admin middleware prefix.
- `/enterprise`, `/enterprise/pilot` and `/enterprise-access` are also public.
- `/enterprise/pilot-setup` is verified-user protected.
- `/enterprise/readiness`, `/enterprise/auditability`, `/enterprise/compliance`, `/enterprise/control-plane`, `/enterprise/identity-governance` and `/enterprise/consortium` are admin protected.
- Protected routes receive `noindex, nofollow, noarchive` and `private, no-store`. Without Supabase configuration they fail closed with `503 Protected surface unavailable.`
- Enterprise Summary export calls `authenticatedTrustClient()` and validates the workflow reference before returning private, non-cached downloads.
- Buyer context must remain journey/analytics context only. It must never be consulted by middleware or authorization logic.

## 7. Buyer context audit

No `buyer`, `source=buyer-documentation` or `source=pilot-checklist` convention exists in application code. The centralized links carry only `intent=demo` or `intent=pilot`. The Enterprise access page accepts only `success`, `error` and `intent`, and the form does not retain source/buyer values.

Part 2 should extend the existing centralized CTA contract and Enterprise access form with an allowlisted context model. Recommended values are the brief's `ciso`, `cto`, `compliance`, `investor`, `buyer-documentation` and `pilot-checklist`. Unknown values should be ignored, values must be encoded, and none may influence access control or redirect destinations.

## 8. Analytics audit

No buyer-page analytics vendor, client helper or page-event stack is installed. Repository telemetry is operational/provider/ML telemetry and must not be repurposed as behavioral analytics. The Back Office explicitly states that page analytics are not instrumented, while privacy/cookie pages state optional analytics should not be activated without preference controls.

Part 2 must not add the proposed events until an approved first-party event path and consent/privacy decision exists. If instrumentation is authorized, add one small existing-stack-compatible helper and use the repository's naming conventions; do not add a vendor merely to satisfy event names. Until then, mark all proposed buyer events `Not implemented`, not silently tracked.

## 9. SEO audit

- Root `metadataBase` is `https://www.cybersentinels.com`.
- Both target pages have the exact suggested titles, concise descriptions and relative canonical URLs.
- Neither page defines Open Graph, Twitter or structured-data metadata; root metadata also does not provide these fields.
- `app/sitemap.ts` uses `canonicalPublicRoutes` from `lib/navigation/route-visibility.ts`.
- Both target routes are absent from `canonicalPublicRoutes`, so they are absent from the generated sitemap despite being public and canonical.
- Robots allow them by default and do not explicitly disallow them.
- Legacy raw Markdown endpoints remain reachable and have no canonical/noindex response header.

Part 2 should add the two native routes to `canonicalPublicRoutes`, update route-governance docs, and either remove the two legacy Markdown slugs from the allowlist or return a permanent internal redirect to the native pages. Do not create duplicate SEO pages.

## 10. Accessibility baseline

Source-level strengths:

- One `h1` per target page through `ExecutiveSummary`, followed by structured `h2`/`h3` content.
- Semantic `main`, `section`, `article`, `nav`, `ol`, `ul`, `dl`, `dt` and `dd` elements.
- Actions are links or buttons; no clickable `div` was found.
- Global focus-visible outlines and a reduced-motion media query are present.
- Mobile menu state is announced with `aria-expanded` and `aria-controls`.
- The pilot timeline is an ordered list and collapses to one column below `md` without a table or forced horizontal scroll.

Gaps and unmeasured items:

- Required breadcrumbs are absent.
- No skip-to-content link or main target ID exists.
- Enterprise navigation has no `aria-current` state.
- Color contrast was not instrument-measured; source colors were improved globally but must not be claimed compliant without measurement.
- No automated axe/Lighthouse/accessibility script exists in `package.json`.
- The in-app browser automation controller was unavailable in this session, so keyboard traversal, screen-reader output and rendered contrast were not live-verified.

## 11. Responsive baseline

Static inspection covers the requested widths through breakpoint behavior, but is not a screenshot-based certification:

| Widths | Expected source behavior | Risk |
| --- | --- | --- |
| 320, 375, 390, 430 | Single-column content; CTA groups wrap; global header uses mobile menu; pilot timeline is vertical | Enterprise sub-navigation has many wrapped links plus `ml-auto`; verify tap order, vertical growth and no overflow |
| 768 | Two-column bullet/readiness grids; four-column pilot timeline | Long Week 0-3 copy may create uneven cards but should not overflow |
| 1024 | Buyer cards and responsibility sections become two columns; adoption path uses five columns | Check dense five-column buyer progression and Enterprise nav wrapping |
| 1280, 1440 | Content capped at `max-w-6xl`; header/footer at `max-w-7xl` | Low risk; verify line lengths and alignment between shells |

No fixed-width table exists on either target page. The Enterprise access form's fixed `460px` column activates only at `lg`. All target CTA containers use `flex-wrap`. Live horizontal-overflow and visual-regression checks remain a Part 2 requirement.

## 12. External-navigation audit

| Result class | Locations | Classification |
| --- | --- | --- |
| Buyer Documentation/Pilot Checklist links | Enterprise layout, overview, pilot and target pages | Valid internal Next links; same tab; no external navigation |
| `target="_blank"` evidence links | Three Back Office locations and `app/evidence-vault/page.tsx` | Intentional protected evidence resources; use `rel="noreferrer"`; unrelated to buyer journey |
| Dynamic footer target branch | `app/layout.tsx` | Valid generic external-link behavior, currently dormant because all footer destinations are internal |
| `window.location.assign` | `lib/supabase/client.ts` | Intentional internal auth/session redirect; unrelated to Enterprise buyer resources |
| `window.location.origin/search` reads | Login and verify-email pages | Auth callback construction and safe redirect parsing, not external navigation |
| Raw Markdown routes | `app/docs/[slug]/route.ts` | Internal application endpoint returning raw Markdown; valid for approved internal documents, invalid legacy exposure for Buyer Journeys and Enterprise Pilot Checklist |
| Intentional download | `/docs/ENTERPRISE_PROOF_PACK.md?download=1` | Allowlisted Markdown download on protected readiness surface; unrelated to the two buyer resources |

No raw GitHub links, `window.open`, literal `location.href`, `download` HTML attributes or literal Enterprise external URLs were found.

## 13. Security findings

- The two public pages are static content and contain no secrets, customer data, raw pilot data, unsafe HTML rendering or dynamic URL construction.
- All page links are centralized application-relative strings and use `next/link`.
- The Enterprise access POST uses a fixed same-origin action, Turnstile verification, request rate limiting, required-field checks and server-side Supabase credentials.
- Current buyer routes do not parse redirect values and therefore introduce no open redirect.
- Middleware redirect targets are constructed from fixed paths; login/verify flows use an existing safe redirect parser.
- Legacy raw Markdown exposure is the relevant boundary issue: the two old source documents remain directly readable at allowlisted `/docs/*.md` endpoints.
- Protected evidence new-tab URLs are dynamic database values. They are outside this sprint's two pages, but scheme/source validation should remain part of the broader evidence-upload security model.

## 14. Content and ownership conflicts

- `docs/BUYER_JOURNEYS.md` says no buyer-specific route is introduced and calls the tracked document the Documentation destination. This is now stale.
- `docs/CONTENT_OWNERSHIP_MAP.md` says buyer journeys live only at `/enterprise#...` and says not to add buyer routes. This conflicts with the current committed native route.
- `docs/ENTERPRISE_PILOT_KIT.md` calls `/pilot/getting-started` the pilot checklist. That route is a protected operator onboarding guide, while `/enterprise/pilot-checklist` is now the public buyer checklist; the ownership difference must be explicit.
- `docs/ROUTE_INVENTORY.md` and `docs/ROUTE_MAP.md` predate the two new routes and need regeneration or scoped additions.

## 15. Exact Part 2 modification set

Recommended application files:

- `app/enterprise/buyer-documentation/page.tsx`
- `app/enterprise/pilot-checklist/page.tsx`
- `app/enterprise/layout.tsx`
- `app/enterprise/page.tsx`
- `app/enterprise/pilot/page.tsx`
- `app/enterprise-access/page.tsx`
- `lib/enterprise-experience.ts`
- `components/enterprise-visuals.tsx`
- `components/executive-summary.tsx` only if the existing API cannot carry context accessibly
- `lib/navigation/route-visibility.ts`
- `app/docs/[slug]/route.ts`

Recommended tests and documentation:

- `tests/enterprise-experience.test.mjs`
- `tests/public-surface-navigation.test.mjs`
- `docs/BUYER_JOURNEYS.md`
- `docs/CONTENT_OWNERSHIP_MAP.md`
- `docs/ENTERPRISE_PILOT_KIT.md`
- `docs/ROUTE_INVENTORY.md`
- `docs/ROUTE_MAP.md`
- `docs/epic-16/SPRINT_16_1B_1_ENTERPRISE_EXPERIENCE.md`

Do not create `/request-demo`, `/book-pilot`, `/contact`, `/enterprise-summary`, `/production-readiness`, a second Enterprise layout, a second CTA system or an analytics vendor integration.

## 16. Blockers and Part 1 conclusion

1. Live browser viewport, keyboard and automated accessibility checks could not run because the in-app browser automation controller was unavailable.
2. No approved page-analytics/consent stack exists, so analytics events cannot be truthfully implemented or verified in Part 1.
3. Protected readiness cannot be locally authenticated without Supabase environment configuration; the middleware correctly returned 503 rather than weakening access.
4. `npm audit --omit=dev` reports two moderate vulnerabilities in Next.js's PostCSS dependency path; the offered force fix is breaking and is out of scope.

Part 1 is complete. No application code was edited or deleted. The only changes in this pass are the three required audit documents under `docs/epic-16/`.
