# Final QA Repair Pass

Date: 2 July 2026

## Demo path verification

The final demo path is present and included in the production route inventory:

- `/`
- `/login`
- `/security`
- `/trust-center`
- `/enterprise/hiring-security`
- `/verify/candidate`
- `/verify/session`
- `/replay/demo`
- `/verification/receipt/demo`
- `/admin/test-lab`

Public pages remain public. Trust Center, verification workflows, governance,
and admin tooling retain their existing authentication and authorization gates.
Protected CTAs preserve the requested destination through the login flow rather
than linking to a public duplicate.

## Link and fallback verification

- Homepage, Hiring Security, candidate, session, Trust Center, replay, receipt,
  and validation-lab CTA targets were checked against existing route files.
- Demo replay links to `/verification/receipt/demo`.
- The compatibility receipt route reuses the canonical receipt implementation.
- Demo receipt links back to `/replay/demo`.
- Both replay and receipt render controlled demo-safe data for the `demo`
  identifier before protected database lookup.
- No new route or fallback trust abstraction was added.

## Authentication QA

The login surface exposes:

- Sign in
- Create account
- Confirm Password
- Use magic link
- Forgot password

Create-account mode requires matching passwords and explains email
verification. Administrative access remains a discreet footer link, while
admin navigation is shown only to allowlisted admin states. Existing verified
email, middleware, admin allowlist, and admin-cookie gates remain unchanged.

## Provider status QA

Core providers and ATS integrations use the same operator-facing states:

- `Live`
- `Simulated`
- `Awaiting Credentials`
- `Disabled`

Implementation details remain in notes and capability fields. Credential values
are never rendered. `Live` does not claim provider uptime, accuracy, or a
successful verification.

## Visual repairs

Small metadata labels on Trust Center, Replay Timeline, and Verification Receipt
used low-contrast `zinc-600` text against near-black surfaces. Demo-critical
labels were raised to `zinc-500` while preserving the existing visual hierarchy.

Responsive source checks confirm:

- navigation and CTA groups wrap;
- dropdown width is constrained to the viewport;
- login collapses before the large breakpoint;
- replay, Trust Center, and receipt grids collapse to one column; and
- print-only receipt controls remain separated from interactive actions.

## Security QA

- Admin routes and `/admin/test-lab` retain middleware and route-level admin
  checks.
- Governance routes retain authenticated reviewer/workspace checks.
- Support screenshots remain authenticated, consented, type/size-limited,
  privately stored, and reviewed through short-lived signed URLs.
- Fake-actor enforcement remains behind admin API access.
- No auth, RLS, service-role, storage-policy, or provider-secret boundary was
  changed.

## Remaining manual validation

The in-app browser automation control surface was unavailable in this
environment. A deployed-domain walkthrough is still required for:

- public, user, reviewer, admin-unverified, and verified-admin navigation;
- mobile dropdown interaction and outside-click/Escape behavior;
- email verification, magic link, password reset, and redirect allowlists;
- live provider timeout and invalid-credential behavior;
- support screenshot upload to the target storage project; and
- replay/receipt rendering against seeded pilot tenant data.
