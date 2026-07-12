# Release 0.9.4 - Focused Enterprise Experience

Date: 2026-07-12

## Outcome

Cyber Sentinels now presents one enterprise platform through a smaller, canonical buyer journey. The release consolidates public storytelling without deleting protected operations, dynamic evidence records or APIs.

## Public experience

- Rebuilt the homepage around nine buyer-facing sections and the exact operational trust control-plane promise.
- Limited primary navigation to Platform, Solutions, Trust, Enterprise, Developers, Pricing, Resources and Login.
- Grouped solution and trust menus, shortened descriptions, bounded menu height and improved mobile touch behavior.
- Consolidated the footer into Platform, Trust, Solutions, Developers, Company and Legal & Support.
- Kept the larger CYBER SENTINELS wordmark treatment with the established cyan accent.

## Route and content governance

- Classified all 223 Next.js page routes; retained API handlers outside page consolidation scope.
- Added a central route-visibility model for public, authenticated, admin, internal, archived and deprecated states.
- Preserved authenticated Trust Center, Replay, posture, dashboard, agent and passport workflows.
- Added safe redirects for true duplicate public/company/legal routes and public Trust Posture.
- Excluded protected, internal, archived and duplicate routes from discovery controls.
- Defined canonical ownership for Platform, Trust, Solutions, Enterprise, Developers, Resources and Company content.

## SEO

- Added a controlled sitemap containing only canonical public routes.
- Connected robots policy to the central visibility configuration.
- Added canonical metadata to the homepage and major buyer pages.
- Kept homepage, Pricing, Enterprise, Developers and Trust Center indexable.

## Capability boundaries

No provider or ML capability was fabricated. No auth, middleware, RLS, API route or dynamic evidence workflow was weakened or removed. Archived routes remain reversible and protected pending route-specific dependency review.

## Validation

See `docs/SPRINT_9_4_ACCEPTANCE_CRITERIA.md` for executed quality-gate results.
