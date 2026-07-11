# Release 0.8.2 - Enterprise Trust Experience

## Summary

Release 0.8.2 simplifies the public information architecture around a single authoritative Trust destination. It separates platform mechanics, solution use cases, enterprise readiness and trust evidence so an enterprise buyer can understand the product and its capability boundaries in under 90 seconds.

## Shipped

- Eight-item primary navigation with About and Help moved to the footer.
- Canonical Trust menu covering posture, Trust Memory\u2122, replay, evidence, governance, provenance, sovereignty and validation.
- Platform and Solutions menus aligned to how versus where.
- Enterprise menu aligned to deployment and procurement readiness.
- Canonical homepage hero and Identity-to-Trust-Memory flow.
- Structured six-column enterprise footer.
- Public ML status derived from existing detection and validation state, with guarded metrics.
- Safe redirects for `/about-us`, `/design-partners` and `/modern-slavery-statement`.
- Public buyer demo path from homepage to governance without requiring protected data.

## Trust and security boundaries

No protected route, auth check, RLS policy or admin denial path was weakened. Operational Trust Center, posture, replay and internal tooling remain protected. No first-party trained ML, provider availability or validation metric is claimed unless the existing runtime/validation models support it.

## Verification

- `npm run lint` - PASS (`lint` is configured as `next build` in this repository).
- `npm run typecheck` - PASS.
- `npm run build` - PASS; 153 static pages generated.
- Local HTTP checks - PASS for public canonical routes and permanent redirects.
- Protected `/developers/api-keys` remained fail closed when local Supabase configuration was absent.

Interactive screenshots could not be captured because the in-app browser control surface was unavailable. Responsive layout behavior was reviewed in source and remains a staging visual-QA follow-up.
