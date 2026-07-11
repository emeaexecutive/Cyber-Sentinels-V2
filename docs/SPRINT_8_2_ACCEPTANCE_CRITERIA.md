# Sprint 8.2 Acceptance Criteria

## Working software

- [x] Primary navigation uses Platform, Solutions, Trust, Enterprise, Developers, Pricing, Resources and Login.
- [x] Trust renders as the authoritative concept group.
- [x] Structured enterprise footer renders across responsive grid breakpoints.
- [x] Mobile navigation collapses behind a clear Menu control while desktop navigation remains directly scannable.
- [x] Canonical public links resolve to existing routes or same-page anchors.
- [x] Protected routes and middleware authorization remain intact.

## Information architecture

- [x] About is absent from primary navigation and present in the footer.
- [x] Help is footer-owned.
- [x] AI Sovereignty, Trust Memory\u2122 and Replay each have one canonical public home.
- [x] Platform explains how; Solutions explains where; Enterprise explains deployment and buying readiness.
- [x] Hiring Security remains one solution.
- [x] No new application route was added.
- [x] Duplicate public pages use safe redirects; protected overlaps are retained and hidden.

## ML transparency

- [x] Real ML, provider-backed, heuristic, runtime, dataset, reviewed-outcome and unimplemented states remain distinct.
- [x] Precision, recall and F1 stay guarded until reviewed-data thresholds are met.
- [x] The UI states what ML does and does not do.
- [x] No invented ML percentage or authenticity guarantee is present.

## Documentation and demo

- [x] Route consolidation plan exists.
- [x] Content ownership map exists.
- [x] ML transparency specification exists.
- [x] A public buyer walkthrough is documented in `SPRINT_8_2_INFORMATION_ARCHITECTURE.md`.

## Quality gates

- [x] `npm run lint` - PASS. This repository maps `lint` to `next build`; 153 static pages generated.
- [x] `npm run typecheck` - PASS. `tsc --noEmit` completed without errors.
- [x] `npm run build` - PASS. Production build completed and 153 static pages generated.
- [x] HTTP smoke tests - PASS. Public homepage, Trust and Developers returned 200; duplicate public routes returned 308 to their canonical destinations; protected API-key access remained fail closed without runtime auth configuration.

Interactive screenshot QA was unavailable because the in-app browser control surface was not present in this session. Responsive source review confirms the mobile Menu control, tablet/desktop wrapping, bounded dropdown widths and responsive footer grid; final staging visual QA remains a release-operator check.
