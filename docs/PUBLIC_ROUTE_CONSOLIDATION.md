# Public Route Consolidation

## Policy

Sprint 8.2 applies one concept to one canonical home without deleting working routes or changing protected-route authorization. Public navigation points only to canonical buyer destinations. Operational and experimental surfaces retain their existing access controls.

## Route decisions

| Route or group | Classification | Canonical destination | Decision |
| --- | --- | --- | --- |
| `/about` | Keep canonical | `/about` | Company overview; footer only. |
| `/about-us` | Redirect | `/about` | Permanent redirect removes duplicate public purpose. |
| `/about/mission` | Keep canonical | `/about/mission` | Mission detail; footer only. |
| `/trust` | Keep canonical | `/trust` | Public Trust Center and canonical Trust navigation home. |
| `/trust-center` | Internal only | `/trust-center` | Authenticated operational records; not a duplicate of the public Trust Center. Hidden from public navigation. |
| `/trustops` | Internal only | `/trustops` | Admin-only operational tooling; retained and hidden. |
| `/trust/posture` | Internal only | `/trust/posture` | Authenticated customer posture dashboard. Public explanation lives at `/trust#trust-posture`. |
| `/trust-posture` | Internal only | `/trust-posture` | Experimental/admin posture surface; hidden from public navigation. |
| `/trust-os` | Internal only | `/trust-os` | Experimental Trust Memory implementation; public concept lives at `/trust#trust-memory`. |
| `/reality-os` | Deprecate later | `/trust-os` | Experimental overlap retained behind admin protection pending a separate data/usage audit. |
| `/verification-replay` | Keep canonical | `/verification-replay` | Public Replay explanation. |
| `/trust-replay` | Internal only | `/trust-replay` | Authenticated operational replay timeline. |
| `/replay/[id]` | Internal only | `/replay/[id]` | Protected case-level replay. |
| `/governance` | Keep canonical | `/governance` | Public governance model. Protected queues remain under dashboard/admin routes. |
| `/trust/data-sovereignty` | Keep canonical | `/trust/data-sovereignty` | Canonical Data & AI Sovereignty home. |
| `/platform` | Keep canonical | `/platform` | How the product works; links to Trust for canonical trust concepts. |
| `/enterprise` | Keep canonical | `/enterprise` | Deployment, security, compliance and buying readiness. |
| `/enterprise/control-plane` | Internal only | `/enterprise/control-plane` | Admin-only operational surface; not public product copy. |
| `/design-partner` | Keep canonical | `/design-partner` | Canonical programme route. |
| `/design-partners` | Redirect | `/design-partner` | Permanent redirect removes duplicate public purpose. |
| `/modern-slavery` | Keep canonical | `/modern-slavery` | Canonical legal statement. |
| `/modern-slavery-statement` | Redirect | `/modern-slavery` | Permanent redirect removes duplicate legal route. |

## Hidden from public navigation

`/trust-center`, `/trustops`, `/trust/posture`, `/trust-posture`, `/trust-os`, `/reality-os`, `/trust-replay`, `/replay/[id]`, `/enterprise/control-plane`, operational dashboards, admin tools and provider/runtime consoles.

## Safety notes

- No route was deleted.
- Redirects cover only clearly duplicate public pages.
- Middleware user/admin checks remain intact.
- Public concept summaries do not expose customer records, credentials, provider internals or admin state.
- Developer overview, API documentation and authentication guidance are public; `/developers/api-keys` remains authenticated.

