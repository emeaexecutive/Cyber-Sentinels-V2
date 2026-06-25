# Navigation Compression and Enterprise UX

This pass reduces public navigation clutter while preserving existing routes,
auth boundaries and operational trust language.

## Primary Visible Navigation

The public top navigation is compressed to:

- Platform
- Hiring Security
- Session Integrity
- Demo
- Enterprise
- Pricing

No routes were deleted. Experimental routes remain available by direct URL or
existing internal references, but they are no longer promoted as primary public
navigation concepts.

## Platform Dropdown

Platform groups the concepts that explain the product without overloading the
top bar:

- Governance
- Verification Replay
- Verification Receipts
- Trust Posture
- AI Agent Governance
- Compliance

Some linked surfaces are protected operational pages. They should continue to
use existing auth and redirect behavior.

## Enterprise Dropdown

Enterprise groups pilot and buyer actions:

- Enterprise Access
- Design Partner
- Pilot Program

For verified admin sessions, the same group also exposes:

- Integrations
- Runtime Validation

Admin-only destinations remain protected by the existing admin access model.

## De-Emphasized Experimental Routes

The following routes were not deleted and were not made public-primary:

- `/reality-os`
- `/reality-chain`
- `/trust-os`
- `/trust-fabric`
- `/origin-dna`
- `/synthetic-counterpart`
- `/trust-prediction`
- `/human-presence-genome`

## Enterprise UX Refinement

- The enterprise section keeps a small contextual subnav instead of repeating
  demo and hiring links already present in the global nav.
- The enterprise overview removes a repeated CTA block and keeps one clear
  hero CTA area.
- The page now uses fewer headings and one direct workflow section before the
  rationale and pilot path.
- The tone remains calm, operational and evidence-led.

## Runtime Safety Notes

- No new routes, APIs or tables were added.
- No auth, middleware, RLS or admin access logic was weakened.
- Public dropdown links do not expose admin-only tooling.
- Admin-only enterprise operations appear only for admin sessions and continue
  to use existing protected routes.
