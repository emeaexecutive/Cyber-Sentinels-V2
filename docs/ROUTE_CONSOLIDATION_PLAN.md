# Route Consolidation Plan

Enterprise Readiness Mode freezes route expansion. The current app inventory is 219 page routes and 119 route handlers under `app/`. The plan below classifies every route family into a keep, merge, remove, hide or internal-only path before any deletion work. No route should be removed until traffic, auth behavior and linked docs are checked.

## Decision Rules

| Decision | Meaning | ERM Rule |
| --- | --- | --- |
| Keep | Core product, buyer, auth, replay, governance or evidence path. | Maintain and harden. |
| Merge | Valuable content, but overlapping with a stronger canonical route. | Move content into the canonical route before redirect/removal. |
| Remove | Placeholder, obsolete duplicate or non-strategic surface. | Remove only after link and auth checks. |
| Hide | Not buyer-ready or too technical for public navigation. | Keep route protected or unlinked. |
| Internal only | Admin/operator diagnostic or sensitive technical route. | Require auth, admin allowlist or back-office verification. |

## Page Route Families

| Family | Examples | Decision | Canonical Destination | Reason |
| --- | --- | --- | --- | --- |
| Core public narrative | `/`, `/platform`, `/enterprise`, `/trust-center`, `/security`, `/privacy`, `/terms` | Keep | Same routes | Buyer and compliance confidence. |
| Enterprise readiness | `/enterprise/readiness`, `/enterprise/control-plane`, `/enterprise/compliance`, `/enterprise/auditability`, `/enterprise/identity-governance` | Merge | `/enterprise` and `/enterprise/readiness` | Too many enterprise subpages split the same governance/replay story. |
| Enterprise pilots | `/enterprise/pilot`, `/enterprise/pilot-setup`, `/pilot/welcome`, `/pilot/getting-started`, `/admin/pilot-overview` | Merge | `/enterprise/pilot` plus protected admin overview | Design partner onboarding should be one guided journey. |
| Trust/replay/evidence | `/trust`, `/trust-replay`, `/replay/[id]`, `/trust/receipt/[id]`, `/verification/receipt/[id]`, `/verification-replay`, `/verification-receipts` | Keep | Replay and receipt routes | These are the product spine. |
| Trust graph variants | `/trust-graph`, `/trust-graph-engine`, `/trust-graph-explorer`, `/trust-fabric`, `/trust-ledger`, `/trust-timeline` | Merge | `/trust-graph` and protected admin graph view | Useful concepts, but fragmented. |
| Trust posture variants | `/trust-posture`, `/trust/posture`, `/dashboard/trust-posture`, `/trust/analytics` | Merge | `/dashboard/trust-posture` | Repeated dashboard concepts should become one operational view. |
| Detection and validation | `/deepfake-detection`, `/video-verification`, `/dashboard/validation`, `/admin/detection-status`, `/admin/benchmarking`, `/trust-evaluation-lab` | Hide/Internal only | `/admin/detection-status` and `/admin/benchmarking` | Public detection pages risk overclaiming. |
| Agent trust | `/agents`, `/agents/register`, `/agents/[id]`, `/agents/[id]/runtime`, `/agent-registry`, `/agent-passport`, `/enterprise/agent-governance` | Merge | `/agents` plus `/enterprise/agent-governance` | Keep agent story enterprise-governed, not scattered. |
| Candidate/hiring workflow | `/verify/*`, `/interview/session/[id]`, `/recruiter/dashboard`, `/enterprise/hiring-security`, `/hiring-shield` | Keep/Merge | `/enterprise/hiring-security` and protected workflow routes | Preserve hiring wedge while reducing candidate-heavy public messaging. |
| Developer surfaces | `/developers`, `/developers/docs`, `/developers/authentication`, `/developers/api-keys`, `/api-docs`, `/developer-console` | Hide/Internal only | `/developers` and protected `/developers/api-keys` | Do not expose immature platform internals publicly. |
| Admin operations | `/admin/*`, `/back-office`, `/launch-control`, `/launch-console`, `/qa-console`, `/command-center` | Internal only | `/admin` and `/back-office` | Operational diagnostics must remain protected. |
| Dashboard variants | `/dashboard`, `/dashboard/governance`, `/dashboard/session-security`, `/dashboard/session-integrity`, `/dashboard/network-risk`, `/dashboard/agent-risk`, `/dashboard/access-governance`, `/dashboard/interview-risk` | Merge | `/dashboard` with focused tabs | Overlapping risk dashboards reduce enterprise confidence. |
| Reality/origin primitives | `/reality-*`, `/origin-*`, `/synthetic-counterpart`, `/human-presence-*`, `/state-verification` | Hide | Existing protected/internal routes | Strong concepts, but too speculative for public navigation. |
| Legal/corporate | `/about`, `/about-us`, `/about/mission`, `/about/future-of-trust`, `/accessibility`, `/cookies`, `/modern-slavery`, `/modern-slavery-statement`, `/sustainability`, `/corporate-sustainability` | Merge | `/about`, `/legal`, statutory pages | Reduce duplicated corporate pages. |
| Status/help/content | `/status`, `/status/verification`, `/help`, `/knowledge-base`, `/journal`, `/media-centre`, `/methodology`, `/operational-principles` | Keep/Hide | `/trust-center` and `/help` | Keep buyer support; hide noisy internal content. |

## API Route Families

| Family | Examples | Decision | Canonical Destination | Reason |
| --- | --- | --- | --- | --- |
| Auth/session | `/api/auth/*`, `/auth/callback`, `/api/session/*` | Keep | Existing routes | Required for auth, expiry, replay events and session trust. |
| Admin APIs | `/api/admin/*` | Internal only | Existing routes | Must remain protected by middleware/admin utilities. |
| Trust execution | `/api/trust/execute`, `/api/trust/check`, `/api/trust/decision`, `/api/trust/posture`, `/api/trust/evidence`, `/api/trust/events` | Merge | `/api/trust/execute` plus specific read endpoints | Avoid parallel decision APIs. |
| Trust reports/receipts | `/api/replay/[id]`, `/api/receipts/[id]`, `/api/trust-reports`, `/api/audit/*`, `/api/compliance/export` | Keep | Existing replay/export routes | Evidence export is a buyer-critical path. |
| ML/detection | `/api/ml/*`, `/api/detection/status`, `/api/providers` | Internal only | `/api/ml/status`, `/api/ml/readiness`, `/api/ml/benchmark` | Status must remain honest and preferably admin-facing. |
| Provider-specific | `/api/verify/world`, `/api/provenance/*`, `/api/badges/verify`, `/api/seals/verify/[id]` | Keep/Hide | Provider registry and verification APIs | Use only as normalized evidence inputs. |
| Agents | `/api/agents/*` | Keep | Existing agent APIs | Needed for AI agent registration/runtime control. |
| Workflow/cases | `/api/workflows/*`, `/api/interview/*`, `/api/candidate/verify`, `/api/recruiter/verify` | Keep/Merge | Workflow-specific APIs | Keep where they support replay and receipts. |
| Stripe/billing | `/api/stripe/*`, `/api/billing/checkout` | Keep | One Stripe checkout and portal path | Merge duplicated checkout naming after usage check. |
| Public intake | `/api/enterprise-access`, `/api/waitlist`, `/api/support/issues`, `/api/feed/public` | Keep | Existing routes | Public intake and support are acceptable if rate-limited. |
| Demo/test | `/api/demo/seed`, `/api/admin/api-tests/run`, `/api/status` | Internal only | Admin diagnostics | Never expose seed or diagnostic behavior publicly. |

## Immediate Consolidation Backlog

1. Merge duplicated enterprise subpages into `/enterprise` and `/enterprise/readiness`.
2. Collapse public detection pages into protected readiness/status pages.
3. Reduce dashboard routes into one dashboard shell with focused tabs.
4. Hide developer, demo, launch and QA routes from public navigation.
5. Keep replay, governance, evidence, auth and receipt routes stable until enterprise demos are verified.

## Quality Bar

No route consolidation merge should ship unless build and typecheck pass, protected-route behavior is unchanged, affected docs are updated and no public page gains internal provider or ML implementation leakage.
