# Release 0.8.3 - Enterprise Decision UX

## Summary

Release 0.8.3 changes the public and primary operator experience from feature discovery to decision support. Major pages now state the outcome, current responsibility and next action before presenting detail.

## Shipped

- Reusable Executive Summary and Decision Summary patterns.
- Decision-led homepage, Platform, Solutions, Trust, Enterprise, Developers, Pricing, Replay, Governance, Hiring Security, Data & AI Sovereignty, Pilot and conversion experiences.
- Decision summaries across primary user dashboards and protected Trust Memory/Evidence Graph surfaces.
- Trust Memory\u2122 timeline language for gained, lost, restored, decayed, challenged and confirmed states.
- Bounded Evidence Graph relationship presentation.
- Explicit ML evidence classes.
- Nine-stage guided enterprise demo.
- Complete public route content classification and narrative guidelines.

## Verification

- `npm run lint` - PASS; 153 static pages generated.
- `npm run typecheck` - PASS.
- `npm run build` - PASS; final production build generated 153 static pages.
- `npm run test:standards-readiness` - PASS; 6/6 tests.
- Local HTTP smoke test - PASS across 15 canonical public pages.

Interactive screenshot QA was unavailable because the in-app browser control surface was not present. Production rendering, HTML assertions and responsive source patterns were verified; final staging visual QA remains required.
