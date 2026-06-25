# Public vs Protected Route Strategy

Cyber Sentinels separates public product narrative from operational trust workflows and internal/admin tooling.

## Public Informational Routes

These routes explain the platform and may show demo-safe workflow examples without requiring login:

- `/governance`
- `/trust-posture`
- `/verification-replay`
- `/verification-receipts`
- `/agents`
- `/enterprise-access`
- `/design-partner`
- `/enterprise/pilot`
- `/demo`
- `/demo/hiring-attack`
- `/demo/session-integrity`

Public pages should explain capabilities, workflow shape and demo-safe states. They must not query or expose customer operational data.

## Protected Operational Routes

These routes contain evidence, reviewer actions, receipts, replays, workspaces or dashboard data and require authentication:

- `/dashboard`
- `/dashboard/governance`
- `/dashboard/trust-posture`
- `/dashboard/session-integrity`
- `/workspace`
- `/workspace/[id]`
- `/passport`
- `/trust-replay`
- `/trust/posture`
- `/trust/session/[id]`
- `/replay/[id]`
- `/verification/receipt/[id]`

Protected routes should preserve `next` redirects to `/login` and explain that the destination contains operational trust data.

## Admin and Internal Routes

These routes must remain internal and admin protected:

- `/admin`
- `/admin/integrations`
- `/admin/runtime-validation`
- `/admin/founder-control`
- `/back-office`

Admin Integrations and Runtime Validation should not appear in public navigation. If they appear in navigation for signed-in admins, they must remain behind the existing admin access checks.

## Navigation Rules

The Platform dropdown points to public informational pages first:

- Governance -> `/governance`
- Trust Posture -> `/trust-posture`
- Verification Replay -> `/verification-replay`
- Verification Receipts -> `/verification-receipts`
- AI Agent Governance -> `/agents`
- Compliance -> `/transparency`

The Enterprise dropdown keeps public commercial entry points:

- Enterprise Access -> `/enterprise-access`
- Design Partner -> `/design-partner`
- Pilot Program -> `/enterprise/pilot`
- Integrations -> `/enterprise`

Admin-only tooling can appear only in the admin navigation branch.

## Login Boundary UX

When a protected route sends a visitor to `/login`, the login page explains that the requested destination contains operational trust data such as verification evidence, reviewer actions, receipts or customer workflow records.

This keeps the product journey clear:

1. Public narrative explains what Cyber Sentinels does.
2. Demo-safe pages show the workflow shape.
3. Authenticated routes handle operational trust data.
4. Admin routes remain internal and separately protected.
