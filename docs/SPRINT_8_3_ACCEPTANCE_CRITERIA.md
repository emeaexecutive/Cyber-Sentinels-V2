# Sprint 8.3 Acceptance Criteria

## Working software

- [x] Canonical buyer pages start with a reusable Executive Summary.
- [x] Executive summaries contain at most four bullets and two CTAs.
- [x] Primary dashboards show posture, risk, action, evidence, confidence and owner.
- [x] Trust Memory\u2122 uses a timeline and removes the raw-record table from the primary experience.
- [x] Evidence Graph defaults to a bounded relationship view and includes the required entity classes.
- [x] ML transparency distinguishes measured, estimated, awaiting validation, provider supplied and human reviewed.
- [x] Guided demo follows Identity through Outcome.

## Narrative and content

- [x] Public routes are classified in `PUBLIC_CONTENT_AUDIT.md`.
- [x] Major buyer copy leads with outcomes rather than engine inventories.
- [x] Primary CTA language is consolidated around demo, pilot and Trust-team actions.
- [x] Technical names remain available in technical documentation.

## Safety

- [x] No auth, RLS or protected-route boundary was weakened.
- [x] No customer records or admin tooling were made public.
- [x] No new feature silo or application route was added.
- [x] No ML certainty or unsupported metric was introduced.

## Quality gates

- [x] `npm run lint` - PASS. This repository maps lint to a full Next production build; 153 static pages generated.
- [x] `npm run typecheck` - PASS. `tsc --noEmit` completed without errors.
- [x] `npm run build` - PASS. Final production build completed; 153 static pages generated.
- [x] `npm run test:standards-readiness` - PASS. Six standards-readiness tests passed.
- [x] HTTP smoke test - PASS for 15 canonical public routes; all returned 200 and exposed Executive Summary content.

The guided demo journey and six Trust Memory\u2122 states passed HTML assertions. Interactive browser screenshots remain unavailable because the in-app browser control surface was not present; staging visual QA remains a release-operator check.
