# Canonical Content Ownership

Release: 0.9.4 Focused Enterprise Experience

## Governing rule

One concept has one canonical home. Supporting pages may state a one-sentence outcome and link to that home; they must not reproduce the full explanation, diagram or CTA sequence. Protected operational pages may use the same vocabulary to operate the capability, but they are not public narrative owners.

| Owner | Canonical concepts | Canonical route | Supporting routes |
| --- | --- | --- | --- |
| Platform | Trust Engine; Runtime Engine; Authorization Gateway; Enforcement; Decision Intelligence; Evidence Graph; Trust Memory overview; Enterprise APIs overview | `/platform` | `/developers` for implementation; `/trust` for assurance detail |
| Trust | Trust Center; Trust Posture; Replay; Evidence and audit; Governance transparency; Provenance; AI and data sovereignty; ML validation transparency; Provider transparency; Trust Memory detailed explanation | `/trust` | `/verification-replay`, `/trust/data-sovereignty`, `/governance` |
| Solutions | AI Agent Governance; Machine Identity Trust; Regulated Workflows; Financial Services; Insurance; Executive Protection; Live Session Trust; Identity and Onboarding; Hiring Security | `/solutions` | `/enterprise/agent-governance`, `/enterprise/hiring-security` |
| Enterprise | Enterprise architecture; Deployment; Security; Compliance; SSO and SCIM; Data residency; Pilot programme; Procurement readiness; Enterprise support | `/enterprise` | `/security`, `/enterprise/pilot` |
| Developers | API documentation; Authentication; Webhooks; Integrations; SDK/client examples; Developer console | `/developers` | `/developers/docs`, `/developers/authentication`, protected `/developers/api-keys` |
| Resources | Research; Journal; Methodology; Regulatory material; Documentation; Media centre | Resources dropdown | `/journal`, `/methodology`, `/regulatory`, `/developers/docs`, `/media-centre` |
| Company / footer | About; Mission; People; Careers; Contact; Help; Accessibility; Legal; Privacy; Terms; Cookies; Security; Status | Footer | Relevant company, legal and support routes |

## High-risk duplication decisions

- Replay: `/trust` owns the assurance story; `/verification-replay` owns the public detailed model; authenticated replay routes own customer records.
- Trust Memory: `/platform` introduces its role in the architecture; `/trust#trust-memory` owns the detailed public explanation.
- Governance: `/platform` owns the control-plane capability; `/trust` owns transparency; `/governance` is the focused public model; dashboards own operations.
- AI and data sovereignty: `/trust/data-sovereignty` is the detailed destination. Menus and other pages use only short references.
- Provider transparency and ML validation: `/trust` owns public capability states and limitations. Internal validation tooling remains protected.
- Hiring: one representative solution, not the platform identity. Its detail route points architecture back to Platform and assurance back to Trust.

## Content review contract

Before adding public content, identify its owner in this file. If the concept already has a home, replace the proposed duplicate explanation with a short outcome and link. A new canonical concept requires content-governance review; it does not automatically justify a new route.
