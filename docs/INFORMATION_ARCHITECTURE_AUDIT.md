# Information Architecture Audit

Release: 0.4 Enterprise Experience

## Scope

Audited the public application surface with emphasis on routes exposed through the global navigation, footer, public route inventory and buyer-facing pages. The app contains many public utility, demo, legal, verification and legacy concept routes; the highest-impact duplication was concentrated in the homepage, Platform, Trust Center, Enterprise, Solutions, replay, sovereignty and governance pages.

## Public Page Groups Reviewed

- Core story: `/`, `/platform`, `/solutions`, `/trust`, `/enterprise`, `/developers`, `/pricing`, `/demo`, `/help`, `/security`, `/about`.
- Trust concepts: `/verification-replay`, `/trust/data-sovereignty`, `/trust-principles`, `/methodology`, `/governance`, `/trust-posture`, `/trust-os`, `/trust-replay`, `/trust-center`.
- Solution and enterprise pages: `/enterprise/hiring-security`, `/enterprise/agent-governance`, `/workforce-trust`, `/marketplace-trust`, `/enterprise/pilot`, `/enterprise/auditability`, `/enterprise/compliance`, `/enterprise/readiness`, `/enterprise/control-plane`, `/enterprise/identity-governance`, `/enterprise/consortium`.
- Developer and integration pages: `/developers`, `/developers/docs`, `/developers/authentication`, `/developers/trust-events`, `/api-docs`.
- Verification and proof pages: `/verify`, `/verify/session`, `/verify/candidate`, `/verify/recruiter`, `/verification-receipts`, `/trust/receipt/[id]`, `/replay/[id]`.
- Company, resource and policy pages: `/about`, `/about-us`, `/careers`, `/investor`, `/media-centre`, `/privacy`, `/terms`, `/cookies`, `/legal`, `/regulatory`, `/accessibility`, `/modern-slavery`.
- Legacy/experimental public concepts: `/trust-fabric`, `/trust-intelligence`, `/trust-graph`, `/trust-ledger`, `/reality-os`, `/reality-chain`, `/origin-trace`, `/human-presence-index`, `/execution-passports`, `/permissions-firewall`, `/policy-engine`.

## Duplicate Concepts

- Replay / Enterprise Memory appeared on homepage, Platform, Trust Center, Enterprise, Hiring Security, Agent Governance, Verification Replay and several protected trust pages.
- AI Sovereignty appeared in Platform navigation, Solutions navigation, Trust Center, Data Sovereignty and Agent Governance.
- Governance appeared as architecture, enterprise value proposition, solution capability and dashboard function across multiple pages.
- Runtime Trust / Persistent Trust Posture appeared on homepage, Platform, Trust Center and several dashboard pages without clear ownership.
- TrustOps operating stack appeared on homepage, Platform, Enterprise and Trust Center.
- Five-engine model appeared on homepage, Platform and Trust Center.

## Repeated Messaging

- "Who or what acted, under whose authority, what changed..." repeated across homepage, Platform, Trust Center and Agent Governance.
- "Replayable enterprise memory" repeated across homepage, Platform, Enterprise, Trust Center and Verification Replay.
- "Cyber Sentinels gives enterprises control over AI providers, operational memory..." repeated in Trust Center, Data Sovereignty and Agent Governance.
- "Not autonomous judgment / not perfect certainty" repeated correctly, but too often on adjacent pages.
- "Trust is continuous, not a moment" appeared as both homepage story and architecture explanation.

## Repeated Features

- TrustOps operating stack cards duplicated core architecture content across public pages.
- Replay chronology diagrams appeared on homepage, Verification Replay, Trust Center and workflow pages.
- Governance review explanations appeared as feature cards in Enterprise, Solutions and Trust Center.
- Capability cards for hiring/security workflows repeated Evidence Chain, Governance Review, Replay Timeline and Verification Receipt.
- Developer pages repeated "core architecture" language already owned by Platform.

## Repeated CTAs

- "Request Enterprise Access" appeared across most major pages. It remains the primary enterprise CTA, but pages now reduce competing secondary CTAs.
- "View Demo" appeared on Enterprise, About, Hiring Security, Enterprise Pilot and demo components.
- "Explore Verification Replay" and "Open Replay Timeline" were used interchangeably across public and protected contexts.
- "Explore the Trust Layer" overlapped with Platform, Trust Center and Enterprise pathways.

## Navigation Duplication

- Primary navigation included both `/trust` and `/trust-center` style concepts, causing public Trust Center and protected operational Trust Center to blur.
- Platform dropdown linked to Trust Center, Replay and AI Sovereignty, duplicating Trust Center ownership.
- Solutions dropdown included architecture concepts instead of solution domains.
- About appeared in Resources and footer; About now lives in footer only.
- Enterprise secondary navigation listed too many routes, functioning like a sitemap rather than a local enterprise nav.

## Content Overlap

- Homepage tried to explain full architecture, five engines, replay chronology, TrustOps stack and continuous trust lifecycle.
- Platform and Trust Center both explained core trust architecture.
- Enterprise mixed buying questions, architecture, operating stack and solution examples.
- Solution pages explained architecture instead of business problems.
- Trust Center mixed public trust principles with authenticated operational dashboard concepts.

## IA Decisions Applied

- Homepage: compressed to the five buyer questions and deeper links.
- Navigation: simplified to Platform, Solutions, Trust Center, Enterprise, Developers, Pricing, Resources, Login.
- Platform: canonical home for Trust Memory, Runtime Trust, Governance, Persistent Trust Posture and five-engine architecture.
- Trust Center: canonical public home for Replay, AI Sovereignty, trust principles and security boundaries.
- Solutions: business-problem hub; solution pages reference Platform and Trust Center instead of repeating architecture.
- Enterprise: buyer-confidence page; removed duplicated operating-stack explanation.
- Enterprise subnav: reduced to the most useful local enterprise links.

## Remaining Watch List

- Legacy concept routes still contain overlapping trust language. They should either become footer/resource references, be consolidated later, or explicitly point to the canonical concept owner.
- Protected product surfaces should keep operational labels, but avoid becoming public narrative owners.
- Future demo pages should use the same concept ownership map in `docs/INFORMATION_ARCHITECTURE.md`.
