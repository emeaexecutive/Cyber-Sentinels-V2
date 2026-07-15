# Public Content Audit

Sprint 11.4 verification: 2026-07-15. The complete 223-route register in `PUBLIC_SURFACE_ROUTE_INVENTORY.md`, this public-route classification and `CONTENT_OWNERSHIP_MAP.md` were rechecked against the Sprint 11.3 canonical buyer surfaces. Homepage, Platform, Trust, Solutions and Enterprise retain distinct purposes; the four canonical explanation pages retain one primary CTA; Replay, Trust Memory™ and AI & Data Sovereignty keep one explanatory home. No additional public-page rewrite was required in this operational-readiness sprint. Redirect, protected, utility and `DEPRECATE_LATER` routes remain unchanged because deletion or exposure was not authorized.

## Audit rule

Public pages must answer why the visitor is there, what is happening, the next action, accountable ownership and available proof. Canonical buyer pages receive executive summaries; utility, legal and conversion pages retain task-specific layouts. Protected dashboards, admin routes and experimental routes are excluded from the public audit and remain access-controlled.

## Route classification

| Public route | Classification | Decision |
| --- | --- | --- |
| `/` | Keep / rewrite | Canonical enterprise decision narrative and buyer entry. |
| `/about` | Keep | Footer-owned company overview. |
| `/about/future-of-trust` | Merge later | Move durable category copy into Enterprise or Trust, then redirect. |
| `/about/mission` | Keep | Canonical mission page. |
| `/about-us` | Redirect | Already redirects permanently to `/about`. |
| `/accessibility` | Keep | Required support statement. |
| `/ai-governance` | Merge later | Consolidate public use-case copy into `/enterprise/agent-governance`. |
| `/careers` | Keep | Footer-owned company utility. |
| `/cookies` | Keep | Canonical legal page. |
| `/corporate-sustainability` | Merge later | Consolidate with `/sustainability`. |
| `/demo` | Keep / rewrite | Canonical guided enterprise demo index. |
| `/demo/agent-tracking-flow` | Keep | Guided AI-agent scenario. |
| `/demo/hiring-attack` | Keep | Guided Hiring Security scenario. |
| `/demo/session-integrity` | Keep | Guided session-decision scenario. |
| `/demo/trust-execution-flow` | Keep | Canonical end-to-end decision flow. |
| `/demo/trust-memory` | Keep / rewrite | Canonical Trust Memory\u2122 timeline demo; no raw records. |
| `/design-partner` | Keep | Canonical design-partner programme. |
| `/design-partners` | Redirect | Already redirects permanently to `/design-partner`. |
| `/developers` | Keep / rewrite | Public integration outcome overview. |
| `/developers/authentication` | Keep | Public authentication guidance. |
| `/developers/docs` | Keep | Public API documentation index. |
| `/developers/trust-events` | Keep | Technical implementation reference. |
| `/embed/[id]` | Keep | Public verification embed utility. |
| `/enterprise` | Keep / rewrite | Canonical deployment and buying narrative. |
| `/enterprise/agent-governance` | Keep | Canonical AI-agent governance solution. |
| `/enterprise/demo-stories` | Merge later | Consolidate discovery into `/demo`. |
| `/enterprise/hiring-security` | Keep / rewrite | Canonical Hiring Security solution. |
| `/enterprise/pilot` | Keep / rewrite | Canonical pilot decision path. |
| `/enterprise/walkthrough` | Merge later | Fold durable walkthrough content into `/demo` and `/enterprise/pilot`. |
| `/enterprise-access` | Keep / rewrite | Canonical demo, pilot and Trust-team conversion form. |
| `/funding` | Hide from navigation | Investor/funding support page; avoid buyer-path duplication. |
| `/governance` | Keep / rewrite | Canonical public governance framework. |
| `/help` | Keep | Footer-owned support destination. |
| `/how-to-use` | Merge later | Consolidate durable guidance into Help and Developers. |
| `/investor` | Keep, hide from primary navigation | Investor-specific narrative with Trust Memory\u2122 link. |
| `/journal` | Hide from navigation | Editorial archive; not part of buyer decision path. |
| `/legal` | Keep | Canonical legal index. |
| `/login` | Keep | Authentication utility; protected workflow entry. |
| `/media-centre` | Hide from navigation | Media utility; footer/resource discovery only when maintained. |
| `/methodology` | Keep | Public methodological detail under Resources. |
| `/modern-slavery` | Keep | Canonical legal statement. |
| `/modern-slavery-statement` | Redirect | Already redirects permanently to `/modern-slavery`. |
| `/operational-principles` | Merge later | Consolidate into `/trust-principles`. |
| `/our-people` | Keep | Footer-owned company page. |
| `/platform` | Keep / rewrite | Canonical how-it-works page using business outcomes. |
| `/pricing` | Keep / rewrite | Decision-led plan and pilot entry. |
| `/privacy` | Keep | Canonical legal page. |
| `/pro-waitlist` | Keep | Conversion utility for unavailable paid plans. |
| `/regulatory` | Merge later | Consolidate durable regulatory copy into Legal and Enterprise compliance. |
| `/reset-password` | Keep | Authentication utility. |
| `/seal/[id]` | Keep | Public proof-verification utility. |
| `/security` | Keep | Canonical public security statement. |
| `/solutions` | Keep / rewrite | Canonical where-it-is-used overview. |
| `/sustainability` | Keep | Canonical sustainability statement pending merge. |
| `/terms` | Keep | Canonical legal page. |
| `/transparency` | Merge later | Consolidate trust-capability copy into `/trust`. |
| `/trust` | Keep / rewrite | Canonical trust, ML status and capability-boundary home. |
| `/trust/data-sovereignty` | Keep / rewrite | Canonical Data & AI Sovereignty home. |
| `/trust-principles` | Keep | Canonical public Trust Framework. |
| `/verification-receipts` | Keep | Public receipt model and index; case data remains protected. |
| `/verification-replay` | Keep / rewrite | Canonical public Replay explanation. |
| `/verify` | Keep | Public verification entry. |
| `/verify/[id]` | Keep | Public proof-verification utility. |
| `/verify-email` | Keep | Authentication utility. |
| `/why-now` | Merge later | Fold durable urgency narrative into homepage and Enterprise. |

## Hidden and protected

`/trust-posture`, `/trust-center`, `/trust-replay`, `/trust/posture`, case Replay, dashboards, admin tools, provider status, validation labs and internal consoles remain protected or hidden. Public narrative must never expose their customer records or operational internals.

## Duplicate-message priorities

1. Merge AI governance duplication into `/enterprise/agent-governance`.
2. Merge enterprise walkthrough/demo stories into `/demo` and `/enterprise/pilot`.
3. Merge operational principles and general transparency into the canonical Trust Framework.
4. Merge sustainability and regulatory duplicates after legal-owner review.
5. Keep investor, funding, journal and media pages outside the primary buyer path.
