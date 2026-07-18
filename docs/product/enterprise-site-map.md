# Enterprise site map

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Purpose

This site map records the current enterprise experience from public evaluation through protected operations. It does not authorize new routes, redirects or navigation changes.

The repository contains 224 `page.tsx` routes. `lib/navigation/route-visibility.ts` identifies 33 canonical, indexable public routes. Middleware, robots and redirects separately govern protected, internal, archived and duplicate routes.

## Canonical public inventory

| Area | Current routes | Experience ownership |
| --- | --- | --- |
| Landing and company | `/`, `/about`, `/about/mission`, `/our-people`, `/careers`, `/media-centre` | Homepage owns the enterprise category promise; company detail remains footer-owned |
| Platform and trust | `/platform`, `/trust`, `/trust/data-sovereignty`, `/verification-replay` | Platform owns mechanisms; Trust owns public assurance; Replay owns the buyer-facing chronology explanation |
| Solutions | `/solutions`, `/enterprise/agent-governance`, `/enterprise/hiring-security` | Solutions owns business/workflow problems; hiring remains one solution, not the platform identity |
| Enterprise | `/enterprise`, `/enterprise/buyer-documentation`, `/enterprise/pilot`, `/enterprise/pilot-checklist`, `/enterprise-access`, `/security` | Buying, controlled-pilot, deployment and assurance journey |
| Pricing | `/pricing` | Commercial discovery and pilot scoping; no self-service enterprise entitlement claim |
| Documentation | `/developers`, `/developers/docs`, `/developers/authentication`, `/methodology`, `/journal`, `/regulatory` | Technical integration, methodology and assurance material |
| Support and legal | `/help`, `/accessibility`, `/privacy`, `/terms`, `/cookies`, `/legal`, `/modern-slavery` | Support, accessibility, privacy and legal boundaries |

`/login` is the public authentication entry in the header but is not part of `canonicalPublicRoutes` or the sitemap. This is a classification inconsistency, not a missing page.

## Current public navigation

The shared header exposes exactly six actions:

```text
Platform | Solutions | Trust | Enterprise | Pricing | Sign In
```

Detailed discovery is footer-owned across Platform, Trust, Solutions, Enterprise, Developers & Resources, Company, and Legal & Support. The footer links to `/governance`, which is public but outside the canonical route set, and `/status`, which middleware treats as protected/internal. Both destinations exist, but their discovery and access semantics are inconsistent with a public footer.

## Enterprise navigation hierarchy

The blueprint hierarchy maps to current destinations as follows:

```text
Homepage                /
  -> Platform           /platform
  -> Enterprise         /enterprise
  -> Documentation      /enterprise/buyer-documentation or /developers/docs
  -> Buyer Journey      /enterprise/buyer-documentation
  -> Pilot              /enterprise/pilot and /enterprise/pilot-checklist
  -> Enterprise Access  /enterprise-access
  -> Dashboard          /dashboard (authenticated)
  -> Governance         /dashboard/governance (reviewer/admin)
  -> Trust Reports      /trust/transparency, /trust/receipt/[id], audit APIs (authenticated)
  -> Back Office        /back-office (allowlisted and admin-verified)
```

This is a customer-lifecycle sequence, not one literal menu. Public, authenticated, reviewer and administrator navigation remain separate security contexts.

## Protected enterprise inventory

| Area | Canonical current home | Access boundary |
| --- | --- | --- |
| Login and account recovery | `/login`, `/reset-password`, `/verify-email` | Public entry with Supabase Auth session transition |
| Dashboard | `/dashboard` and `/dashboard/*` | Authenticated, email-verified user |
| Workspace | `/workspace` and `/workspace/[id]` | Authenticated plus tenant/RLS data boundaries |
| Governance | `/dashboard/governance` | Workspace reviewer/admin or allowlisted administrator |
| Replay and reports | `/trust-replay`, `/replay/[id]`, `/trust/transparency`, `/trust/receipt/[id]` | Authenticated; record access remains subject to RLS |
| Trust operations | `/trust-center`, `/dashboard/trust-posture`, `/dashboard/session-integrity` | Authenticated operational surfaces |
| Provider operations | `/admin/provider-status`, `/admin/integrations` | Verified administrator |
| Back Office | `/back-office`, `/admin/*` | Allowlisted admin plus admin-verification cookie |

## Publicly reachable routes outside the canonical set

Thirty-one page routes are reachable without matching the central canonical, redirected, protected, internal or archived contracts. They require ownership decisions before being promoted as enterprise discovery:

| Family | Routes | Recommended classification |
| --- | --- | --- |
| Company and strategy | `/about/future-of-trust`, `/corporate-sustainability`, `/sustainability`, `/funding`, `/investor`, `/why-now`, `/operational-principles` | Consolidate into canonical company/enterprise owners or explicitly add to the public register after content review |
| Demos and adoption | `/demo`, `/demo/agent-tracking-flow`, `/demo/hiring-attack`, `/demo/session-integrity`, `/demo/trust-execution-flow`, `/demo/trust-memory`, `/design-partner`, `/enterprise/demo-stories`, `/enterprise/walkthrough` | Keep discoverability intentional; demo routes must preserve simulated/controlled-test labels |
| Trust and governance explanation | `/governance`, `/transparency`, `/trust-principles`, `/verification-receipts`, `/ai-governance` | Assign a canonical owner and sitemap decision; do not duplicate `/trust` |
| Developer and verification utilities | `/developers/trust-events`, `/verify`, `/verify/[id]`, `/seal/[id]`, `/embed/[id]` | Review sharing/auth semantics before indexing |
| Authentication and conversion | `/login`, `/reset-password`, `/verify-email`, `/pro-waitlist` | Utility/conversion routes; normally no need for primary SEO ownership |
| Guidance | `/how-to-use` | Consider consolidation with `/help` |

`/enterprise-access` is already canonical and therefore is excluded from this table.

## Duplicate and redirected routes

Seven intentional redirects retire duplicated framing:

- `/about-us` -> `/about`;
- `/design-partners` -> `/design-partner`;
- `/modern-slavery-statement` -> `/modern-slavery`;
- `/trust-posture` -> `/trust#trust-posture`;
- `/reality-os` and `/trust-os` -> `/platform`; and
- `/trust-fabric` -> `/platform#trust-fabric`.

Protected `/trust-center`, `/trust-replay` and `/trust/posture` are distinct operational surfaces and must not be redirected to marketing pages.

## Future-route rule

No future route is required to satisfy the documented enterprise journey. Before any route is added, owners must show that no canonical current page can hold the content, define visibility/auth/SEO/analytics/accessibility contracts, and update route governance. The immediate priority is classifying or consolidating the 31 publicly reachable outliers.
