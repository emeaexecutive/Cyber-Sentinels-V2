# Epic 16 Sprint 16.1B.1 Enterprise Experience

## Outcome

Buyer documentation and the controlled-pilot checklist now live in the product at:

- `/enterprise/buyer-documentation`
- `/enterprise/pilot-checklist`

Both routes inherit the existing Enterprise layout. Enterprise overview, pilot, navigation and buyer-journey actions now use the centralized CTA contract in `lib/enterprise-experience.ts`.

Part 2 adds shared breadcrumbs, the reusable buyer-journey grid, mobile-safe Enterprise navigation actions and complete Demo / Pilot / supporting-resource CTA paths. Both routes now publish canonical and Open Graph metadata.

## Link audit

`tests/enterprise-experience.test.mjs` inventories literal links in the Enterprise route tree and its navigation/readiness contracts. It rejects non-application-relative targets and links without a native Next.js page or route destination. It also prevents the two buyer resources from regressing to raw Markdown navigation.

Legacy raw Markdown URLs permanently redirect to the canonical product routes, and the legacy slugs are no longer served by the Markdown document handler.

## CTA contract

- `Request Demo` -> `/enterprise-access?intent=demo`
- `Book Pilot` -> `/enterprise/pilot`
- `Request Controlled Pilot` -> `/enterprise-access?intent=pilot`
- `Buyer Documentation` -> `/enterprise/buyer-documentation`
- `Pilot Checklist` -> `/enterprise/pilot-checklist`

Primary actions use `brand-primary-action`. Supporting actions use `brand-secondary-action`.

## Acceptance

- No external navigation: Enterprise links are application-relative and audited.
- Native routes: both buyer artifacts render as React pages.
- Reuse Enterprise layout: both pages are nested under `app/enterprise`.
- Accessible context: both pages render a semantic breadcrumb and preserve keyboard-safe native links.
- Responsive navigation: the Enterprise CTA spans the narrow layout and returns to inline sizing at `sm`.
- SEO: both pages have canonical and Open Graph metadata and are present in centralized public-route visibility.
- Audit all Enterprise links: covered by the focused route audit.
- Standardize CTAs: one typed contract supplies labels and destinations.
