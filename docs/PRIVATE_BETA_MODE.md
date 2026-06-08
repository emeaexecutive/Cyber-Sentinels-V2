# Private Beta Mode

Cyber Sentinels runs in private beta by default through `BETA_MODE=true`.
Set `BETA_MODE=false` only when the product is ready to remove beta labeling.

Private beta mode is for controlled testing with trusted users, early enterprise
evaluators, and design partners. It keeps public learning paths visible while
keeping operational internals and admin tools protected.

## Public

The following can remain public in beta:

- Home
- Demo
- Pricing
- Enterprise Access
- Design Partner Access intent
- Help and legal pages
- Public verification and marketing pages

Public pages may show the `Private Beta` badge and the notice:

> Cyber Sentinels is currently in private beta and evolving through operational feedback and design-partner collaboration.

## User-Only

Authenticated users may access:

- Passport creation and personal passport views
- Evidence upload
- Notifications
- Appeals
- Feedback
- Workspace views only where membership allows access
- Agent views only where ownership or admin access allows access

User-only routes must not expose other users' records, admin review queues, raw
operational internals, service-role behavior, or private evidence storage.

## Admin-Only

The following stay admin-only during private beta:

- Back Office
- Admin integrations
- API test harness
- Launch Control
- Final Readiness Gate
- Admin review routes
- Protected operational diagnostics
- Sensitive governance and review surfaces not intended for testers

Admin access remains controlled by the admin allowlist and admin verification
cookie.

## Beta Behavior

When `BETA_MODE` is enabled:

- Public pages remain visible.
- Signup remains allowed.
- Enterprise Access remains available.
- Operational workflows show private beta positioning.
- Key completion states ask, "Was anything unclear?" and link to `/feedback`.
- Design-partner CTAs point to `/enterprise-access?intent=design_partner`.
- Back Office summarizes enterprise requests, feedback, waitlist activity,
  design-partner interest, and launch blockers.

## Do Not Show Externally Yet

Do not expose these externally during private beta:

- Admin tools
- Operational internals
- API diagnostics
- Raw database errors
- Other user data
- Private evidence files
- Service role behavior
- Hidden trust scoring internals
- AI-assisted recommendations as final decisions

## Founder Learning

Private beta should help the team learn:

- where onboarding is unclear
- which workflows design partners actually need
- whether evidence and review language is understandable
- where operational trust flows feel too complex
- which blockers prevent controlled public testing

Keep feedback loops calm, specific, and human-governed.
