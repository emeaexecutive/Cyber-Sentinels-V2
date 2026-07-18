# Enterprise experience implementation review

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Executive finding

Cyber Sentinels has a coherent public enterprise spine, a server-first authenticated shell, protected governance and administration, Replay/receipt continuity, and working JSON/PDF evidence-pack exports. It is not yet a uniformly governed enterprise experience: route classification has drifted, several deep workflows expose parallel or legacy surfaces, protected accessibility/performance evidence is limited, and readiness still depends on credentialed integration, reviewed outcomes and deployed security proof.

This review is documentation only. It does not authorize runtime, route, UI or business-logic changes.

## Navigation issues

| Severity | Finding | Evidence/impact | Recommendation |
| --- | --- | --- | --- |
| High | Thirty-one publicly reachable page routes are outside the central canonical/redirect/protected/internal/archived contracts | Discoverability, robots and ownership can drift independently | Classify each route; consolidate into current canonical owners before adding any public route |
| Medium | `/governance` is public and footer-linked but not canonical | Public governance story has ambiguous SEO/content ownership relative to `/trust` | Choose `/trust` as owner or explicitly register the supporting route |
| Medium | `/status` appears in the public footer but middleware treats it as protected/internal | A public visitor can meet an authentication boundary without warning | Align footer visibility with its intended audience |
| Medium | `/login` is the header authentication entry but is absent from the canonical public register and sitemap | Utility-route semantics are implicit | Document it as a public no-index utility or add an explicit route class |
| Medium | Dashboard provider status links directly to `/admin/provider-status` | Non-admin users can encounter an avoidable denial; the authenticated shell already uses `/trust-center#providers` | Reuse the role-aware destination when implementation changes are authorized |

## Duplicate pages and concepts

- Seven redirects intentionally retire duplicated route names and should remain tested.
- `/compliance-export` is a legacy/demo reporting surface whose “PDF unavailable” statement conflicts with the canonical audit API's PDF Evidence Pack.
- Public `/governance`, protected `/dashboard/governance` and administrative governance tools serve different audiences but require clearer naming and cross-boundaries.
- Verification explanation, receipt indexes, individual receipts, transparency reports and audit exports form one evidence journey but are distributed across several route families.
- `/trust-center`, `/trust-replay` and `/trust/posture` are protected operational surfaces, not duplicates of public `/trust`; wording and links must preserve that distinction.

No route should be deleted from this documentation finding alone. Consolidation requires traffic, access, SEO and inbound-link evidence.

## Broken links and CTA findings

Source-level enterprise navigation tests confirm native destinations for the current Enterprise, Buyer Documentation, Pilot and shared CTA links; no literal missing enterprise destination was identified in that scope. A fresh browser crawl was unavailable, so runtime redirects, role-specific denials and client navigation were not exhaustively retested.

The material risks are semantic rather than literal:

- public footer `/status` has a protected access boundary;
- the dashboard provider link is not role-aware;
- buyer content groups nine requested stakeholder journeys into four broader personas;
- persona-specific questions and next steps are not consistently exposed;
- some public explanatory routes outside the canonical register have no decided primary CTA; and
- report/receipt surfaces lack one universally visible return path through the enterprise journey.

Keep one primary action and one supporting action at each buyer decision point. Reuse the shared Demo, Pilot, Contact, Buyer Documentation and Pilot Checklist actions rather than creating new funnels.

## Accessibility risks

- Existing Lighthouse accessibility 100 results cover Buyer Documentation and Pilot Checklist only.
- No fresh keyboard-only, screen-reader, zoom or responsive traversal was possible in this audit.
- Command-palette focus trap, focus return and option semantics are incomplete or unproven.
- Mobile-menu Escape behaviour and a global skip link were not identified.
- Dense Back Office tables, truncated shell context, dynamic messages and report downloads need assistive-technology verification.
- No automated accessibility scanner is included in the repository validation gate.
- PDF tagging and reading order are unverified.

See [`../product/accessibility.md`](../product/accessibility.md) for the release matrix.

## Performance risks

- The route surface is large: 224 page files, with 129 declaring `force-dynamic`.
- Recorded public mobile Lighthouse performance is 79 and 83, driven in part by 770 ms and 590 ms Total Blocking Time.
- Back Office performs the broadest identified server read fan-out and needs representative tenant/load testing.
- Root session/platform context cost on public routes has not been isolated.
- Only five route families have explicit loading boundaries.
- No bundle budget, bundle analyzer or representative protected-route performance baseline is enforced.
- Runtime profiler state is process-local, not distributed observability.

See [`../product/performance.md`](../product/performance.md) for target budgets and test design.

## Enterprise readiness

| Capability | Current finding | Readiness truth |
| --- | --- | --- |
| Public buyer journey | Core Enterprise, buyer documentation, pilot and access routes exist | `Caution`: coherent spine; persona and route-ownership gaps remain |
| Identity/provider integration | Adapter and provider-readiness architecture exists | `Blocked` until target credentials and real provider evidence are recorded |
| Reviewed validation | Reviewed-outcome gates exist | `Blocked` when the required approved ground truth is absent; do not publish accuracy claims |
| Evidence and Replay | Receipts, Replay and continuity contracts exist | `Caution`: durability/reconciliation must be demonstrated in the deployment environment |
| Trust Reports | JSON, PDF, summary/text and API exports exist | `Caution`: CSV absent, legacy surface inconsistent, completeness fields not universal |
| Governance | Human approval workflow and policy creation exist | `Caution`: policy versioning, delegated-authority management and mutation-time authorization need hardening |
| Administration | Verified Back Office and system-health views exist | `Caution`: administration is broad but not a complete user/organisation/RBAC console |
| Security deployment | Protected routes, RLS and admin verification exist | `Blocked` until deployed denial-path and security-review evidence is complete |
| Accessibility | Strong source patterns and limited public Lighthouse evidence | `Caution`: protected/manual/assistive-technology coverage incomplete |
| Performance | Server-first design and public desktop evidence are strong | `Caution`: mobile main-thread and protected representative-load evidence incomplete |
| Analytics | No active provider or consent controller | `Not implemented`; operational events must not be presented as product analytics |

## Prioritized recommendations

### P0 — release evidence

1. Keep enterprise readiness blocked until credentialed target integration, reviewed evidence, Replay durability, report export, administrator training and deployed security review are evidenced.
2. Prove denial paths, tenant/RLS boundaries and admin authorization in the deployment environment.
3. Establish representative protected-journey accessibility and performance evidence before enterprise claims.

### P1 — coherence and control

4. Classify the 31 public route outliers and resolve the `/status`, `/governance` and `/login` visibility contracts without route expansion.
5. Make the provider-status dashboard destination role-aware.
6. Name one canonical report/export experience; retire or clearly label the legacy compliance-export experience.
7. Add mutation-time role/authority checks to governance actions when implementation is authorized.
8. Represent all nine buyer personas in documentation/content planning while keeping one shared CTA system.

### P2 — measurable quality

9. Add automated accessibility checks plus manual keyboard, screen-reader, zoom and PDF verification.
10. Add route/bundle budgets and representative dashboard, governance, Replay, export and Back Office load tests.
11. Define a versioned Trust Report schema with explicit optional/missing states and evaluate CSV only against a real buyer requirement.
12. Activate analytics only after consent, privacy, event-schema and data-minimization controls are approved.

## Acceptance conclusion

All twelve Part 4 architecture documents now describe the current implementation and gaps without changing UI, routes or business logic. “Documented” does not mean every capability is ready: the readiness table above remains the authoritative summary for this review.
