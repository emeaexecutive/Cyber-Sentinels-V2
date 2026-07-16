# RC3 Navigation and Content Audit

Audit date: 2026-07-16. Source of truth: the clean checkout at `C:\Users\emeae\Desktop\cyber-sentinels-clean` before RC3 navigation changes.

## Top-level public navigation

| Label | Route | Purpose | Audience | Footer equivalent | Canonical owner | Duplicate content | Current inbound links | Authentication | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Platform | `/platform` | Explain architecture and mechanisms | CIO, CTO, architects | Platform Overview | Platform | No top-level duplicate; legacy `/trust-fabric`, `/trust-os`, `/reality-os` redirect here | Global header, homepage architecture preview, Enterprise journeys, footer | Public | KEEP_TOP_NAV |
| Solutions | `/solutions` | Organize business and workflow outcomes | Buyers and workflow owners | Solution links | Solutions | Some older solution pages remain, but the overview is canonical | Global header, homepage protected-activity section, footer | Public | KEEP_TOP_NAV |
| Trust | `/trust` | Public Trust Center for proof, limitations and transparency | CISO, compliance, risk | Trust Center | Trust | `/trust-center` is authenticated operations and must not be redirected | Global header, homepage flow, trust links, footer | Public | KEEP_TOP_NAV |
| Enterprise | `/enterprise` | Deployment, governance, readiness and buying journeys | CISO, CIO/CTO, compliance, executives | No dedicated footer group before RC3 | Enterprise | No equivalent public owner | Global header, homepage CTA, buyer journeys | Public | KEEP_TOP_NAV |
| Developers | `/developers` | Integration entry point | Developers and architects | Developer Overview | Developers | `/api-docs` and `/developer-console` are internal, not public equivalents | Global header, Platform and Enterprise journeys, footer | Public | KEEP_TOP_NAV |
| Pricing | `/pricing` | Commercial entry point | Buyers | No footer equivalent before RC3 | Pricing | No duplicate canonical route | Global header and public conversion links | Public | KEEP_TOP_NAV |
| Resources | `/methodology`, `/developers/docs`, `/journal`, `/regulatory` | Group detailed public material | Technical and assurance evaluators | Distributed across Developers and footer | Each linked destination | The dropdown is a discovery group, not a content owner | Global header; linked pages also have direct links | Public | KEEP_TOP_NAV |
| Login | `/login` | Enter protected product surfaces | Customers and administrators | None | Authentication | No duplicate | Global header and protected-route redirects | Public entry; destination authenticates | KEEP_TOP_NAV and rename to `Sign In` |

About and Help are already absent from the primary header. They remain footer-owned. No header item should be removed merely because its destination also appears in the footer.

## Navigation surface findings

- Desktop and mobile share `components/global-navigation.tsx`; changing the shared public link model updates both without parallel menus.
- Dropdown buttons expose `aria-expanded`, `aria-controls`, Escape handling and outside-click dismissal. Mobile uses the same destinations behind a labelled Menu button.
- Authenticated and admin navigation are separate branches. RC3 must not change their workspace, notification, administration or logout paths.
- The current footer has Platform, Trust, Solutions, Developers, Company and Legal & Support. It lacks a dedicated Enterprise group and does not expose Living Trust Profile or Trust DNA.
- Sitemap membership derives from `canonicalPublicRoutes`; protected, internal, archived and redirected routes remain excluded. Middleware adds `X-Robots-Tag: noindex, nofollow, noarchive` to protected and internal surfaces.

## Overlapping route decisions

| Route | Current purpose/protection | Canonical owner | RC3 action |
| --- | --- | --- | --- |
| `/trust` | Public Trust Center | `/trust` | KEEP_TOP_NAV and index |
| `/trust-center` | Authenticated operational Trust workspace | Itself | AUTHENTICATED_ONLY; never redirect to marketing |
| `/trust-memory` | No page route; API/domain capability only | `/trust#trust-memory` publicly | HIDE_FROM_NAVIGATION; do not add a route |
| `/trust-timeline` | Experimental operational timeline, admin-protected by middleware | Protected Replay/Trust Memory tooling | ADMIN_ONLY; noindex; deferred consolidation |
| `/trust-graph` | Experimental graph surface, admin-protected | `/trust#evidence-audit` publicly | ADMIN_ONLY; noindex; deferred consolidation |
| `/trust-graph-engine` | Admin graph engine | Itself | ADMIN_ONLY; noindex |
| `/trust-graph-explorer` | Experimental graph explorer | Protected graph tooling | ADMIN_ONLY; noindex; ARCHIVE_FOR_LATER |
| `/trust-os` | Legacy product framing | `/platform` | REDIRECT; already permanent |
| `/reality-os` | Legacy product framing | `/platform` | REDIRECT; already permanent |
| `/trust-fabric` | Duplicate public architecture framing | `/platform#trust-fabric` | REDIRECT; already permanent |
| `/operational-trust` | No page route | Homepage category story | DEPRECATE_AFTER_RC1; do not add a route |
| `/platform` | Canonical public mechanisms and architecture | `/platform` | KEEP_TOP_NAV and index |
| `/architecture` | Internal tooling route, admin-protected | `/platform#trust-fabric` publicly | ADMIN_ONLY; noindex; do not redirect protected tooling |
| `/about` | Canonical company overview | `/about` | MOVE_TO_FOOTER |
| `/about-us` | Duplicate company overview | `/about` | REDIRECT; already permanent |
| `/help` | Canonical public support guidance | `/help` | MOVE_TO_FOOTER |
| `/support` | No public page; support API/admin routes only | `/help` publicly; `/admin/support` operationally | HIDE_FROM_NAVIGATION; preserve protected support tooling |

## Safe-change decision

RC3 should rename Login to Sign In, refine dropdown destinations, add the missing Enterprise/footer discovery paths, and preserve the shared authenticated/admin branches. Existing duplicate redirects and middleware boundaries are sufficient; no protected operational route needs a marketing redirect.
