# Information Architecture

Release: 0.4 Enterprise Experience

## Primary Navigation

The public navigation is:

1. Platform
2. Solutions
3. Trust Center
4. Enterprise
5. Developers
6. Pricing
7. Resources
8. Login

About is footer-only.

## Page Jobs

- `/`: answers who we are, what we do, why now, why trust us and why we are different.
- `/platform`: owns architecture and product model.
- `/solutions`: owns business problems and solution entry points.
- `/trust`: owns public trust, replay, AI sovereignty and trust boundaries.
- `/enterprise`: owns enterprise buying clarity, pilot confidence and buyer questions.
- `/developers`: owns implementation entry points, API docs and integration pathways.
- `/pricing`: owns plan packaging and commercial entry points.
- `/resources`: not a required page; resources live in the Resources dropdown and footer.

## Canonical Concept Homes

| Concept | Canonical home | Supporting detail |
| --- | --- | --- |
| Trust Memory | `/platform` | Platform describes it as durable product memory. |
| Runtime Trust | `/platform` | Platform describes current execution state and runtime context. |
| Governance | `/platform` | Platform owns the architecture; protected dashboards own operations. |
| Persistent Trust Posture | `/platform` | Platform owns posture lifecycle and meaning. |
| Five-engine model | `/platform` | Trust, Runtime, Replay, Governance and Validation engines. |
| Replay | `/trust` | Trust Center introduces it; `/verification-replay` provides the detailed model. |
| AI Sovereignty | `/trust` | Trust Center introduces it; `/trust/data-sovereignty` provides the detailed model. |
| Evidence boundaries | `/trust` | Trust Center owns public evidence and trust principles. |
| Security posture | `/trust` and `/security` | Trust Center routes to Security for operational commitments. |
| Business problems | `/solutions` | Solutions pages describe buyer pain, not architecture. |
| Enterprise buying questions | `/enterprise` | Enterprise keeps board/risk/compliance confidence clear. |
| API integration | `/developers` | Developers owns endpoints, auth and implementation details. |

## Solution Page Rules

Solution pages may:

- Describe the business problem.
- Name the buyer audience.
- Show operational outcomes.
- Link to Platform for architecture.
- Link to Trust Center for replay, sovereignty and evidence boundaries.

Solution pages must not:

- Re-explain the five-engine model.
- Recreate the TrustOps operating stack.
- Define AI Sovereignty, Replay, Trust Memory, Runtime Trust or Governance from scratch.
- Add duplicate CTAs beyond one primary and one secondary action.

## Protected vs Public

- `/trust` is the public Trust Center.
- `/trust-center` remains an authenticated operational trust dashboard.
- `/trust-replay`, `/dashboard/*`, `/admin/*` and case-level replay/receipt routes are operational surfaces, not public narrative owners.

## CTA Model

- Primary enterprise CTA: `Request Enterprise Access`.
- Demo CTA: use where the page is explicitly demo-led.
- Architecture CTA: `Explore Platform`.
- Trust CTA: `Trust Center`.
- Avoid stacking more than two CTAs in one section.

## Navigation Ownership

- Primary navigation should stay stable.
- Dropdowns should contain only the most useful next choices.
- Footer may contain broader company, legal, trust and contact links.
- About remains footer-only unless a future release explicitly changes company storytelling.
