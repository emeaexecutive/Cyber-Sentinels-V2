# Sprint 12.2 Acceptance

## Acceptance matrix

| Objective | Evidence | Status | Remaining validation |
| --- | --- | --- | --- |
| Category positioning | Homepage and global metadata use Operational Trust Infrastructure; Enterprise Trust Fabric™ remains internal architecture | Implemented | Buyer-language review |
| Buying journeys | `/enterprise` answers five buying questions for CISO, CIO / CTO, Compliance and Executive / Investor | Implemented | Design-partner interviews |
| Homepage simplification | Homepage reduced from seven to six content sections with detailed content re-homed | Implemented | Rendered mobile/desktop QA unavailable in this environment |
| Visual language | Seven reusable visual and journey components share one style contract | Implemented | Browser motion and responsive review |
| Navigation | Public dropdown choices reduced and aligned to canonical owners; route count unchanged | Implemented | Analytics and buyer findability review |
| Interactive hero | User-triggered seven-stage walkthrough completes in approximately 11.2 seconds | Implemented | Rendered browser QA |
| Trust Evidence Packs | Existing audit export supports authenticated `format=pack` downloads | Implemented | Credentialed RLS and download test |
| Enterprise demo | Seven-screen controlled demo is 6.5 minutes | Implemented | Rehearsal against deployed release |
| Release readiness | 1.2.2 scorecard uses an evidence-defined 0–4 scale across nine areas | Implemented | Pilot and production evidence |
| Documentation | Five required documents plus demo guide exist | Implemented | Named owner sign-off |

## Quality gate

Working software, configured lint/typecheck/tests/build, documentation, the controlled demo and acceptance evidence must all pass. Source success does not clear provider credentials, reviewed datasets, deployed security, production performance, customer outcomes or browser QA.

## Verification record

Verified on 2026-07-15 from the clean release checkout:

- `npm run lint`: passed with 0 errors and 9 existing warnings.
- `npm run typecheck`: passed.
- `npm test`: passed, 98 tests across 16 suites.
- `npm run build`: passed with 154 static pages generated.
- Rendered browser QA: not available in the current tool environment; the source, accessibility markers, focused interaction tests and production build were verified instead.
