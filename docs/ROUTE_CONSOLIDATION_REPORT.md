# Route Consolidation Report

Last updated: 2026-07-08

## Summary

The route inventory is captured in `docs/ROUTE_MAP.md` with 338 page and route-handler entries. Routes are classified as PUBLIC, ENTERPRISE, DEVELOPER, ADMIN, INTERNAL, or DEPRECATED. This is a consolidation map, not a deletion list.

## Actions Completed

- Compressed global navigation to Platform, Solutions, Enterprise, Developers, Pricing, Resources, Trust Center, and Login.
- Removed raw dashboard, registry, provider, validation, and admin-adjacent routes from top-level public discovery.
- Preserved authenticated/admin access paths for enterprise operations.
- Generated a route-by-route map with purpose, owner, used-by, merge candidate, replacement, and visibility.

## Merge Families

| Family | Keep | Merge or hide |
| --- | --- | --- |
| Replay and evidence | `/trust-replay`, `/replay/[id]`, `/trust/receipt/[id]`, `/verification-replay` | receipt variants remain linked by context; avoid new replay routes. |
| Enterprise | `/enterprise`, `/enterprise/hiring-security`, `/enterprise/agent-governance` | readiness/control-plane/compliance/auditability pages stay enterprise-contextual. |
| Dashboards | `/dashboard` | child dashboards stay authenticated; future consolidation should use tabs or modules. |
| Developer | `/developers` | `/api-docs` and `/developer-console` remain hidden/internal. |
| Validation/provider status | `/admin/detection-status`, `/admin/benchmarking`, `/admin/provider-status` | public detection pages stay hidden to avoid capability overclaims. |
| Admin operations | `/admin`, `/back-office` | launch, QA, command, mission, repair and seed surfaces remain internal. |

## Visibility Rules

- PUBLIC: eligible for navigation and SEO when buyer-facing.
- ENTERPRISE: protected or enterprise-contextual; may be linked after login or in demos.
- DEVELOPER: discoverable via Developer nav; credentials protected.
- ADMIN: allowlisted admin only, noindex, hidden.
- INTERNAL: route/API runtime only, hidden.
- DEPRECATED: hidden until merged or redirected after link and usage checks.
