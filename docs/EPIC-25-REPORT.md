# EPIC 25 — Enterprise Trust Centre™

## Architecture

Implemented a responsive operational console at `/trust-centre` using the
existing Trust OS shell and App Router. The Centre composes authoritative
Enterprise Trust Architecture, Continuous Trust Runtime, evidence graph,
canonical event, policy and provider stores through one bounded tenant read
model. No competing scoring, state or Replay authority was introduced.

## Pages added

- `app/(enterprise)/trust-centre/page.tsx`
- Trust OS sidebar and command-palette navigation entry

The page has Overview, Trust Graph, Trust DNA, Replay, Continuous Trust, Alerts,
Policies, Providers and Reports workspaces.

## Components

`EnterpriseTrustCentre` provides live refresh, global search, score bands,
high-risk and review queues, interactive graph inspection, explainable Trust
DNA dimensions, Replay filters and audit mode, continuous state, alert bulk
operations and audit history, policy simulation, provider operations and report
generation.

## APIs

- `GET /api/trust-centre/overview`
- `GET /api/trust-centre/search`
- `GET /api/trust-centre/reports`
- `POST /api/trust-centre/alerts/bulk`
- `GET /api/trust-centre/alerts/{id}/activity`

Existing subject graph and policy simulation APIs are reused directly.

## Database

Migration `202607240001_enterprise_trust_centre.sql` adds only the missing alert
collaboration boundary:

- immutable `trust_alert_activity`;
- tenant RLS and bounded timeline index; and
- service-only `manage_trust_centre_alerts_v1` RPC with state validation,
  workspace assignee validation and architecture audit writes.

It does not change trust scoring, evidence, Replay, policy resolution or the
authoritative Trust State Engine.

## Security review

- Authentication: protected page plus authenticated API contexts.
- Authorization: Viewer, Analyst, Investigator, Administrator and Super
  Administrator capability profiles derive from existing workspace authority.
- RLS: the new table enables RLS and uses
  `user_can_access_trust_workspace`; browser mutation grants are absent.
- Tenant isolation: all service queries and RPC mutations require verified
  `enterprise_id` membership and explicit tenant predicates.
- Sensitive data: search and graph projections do not select evidence payloads,
  normalized facts, secrets, biometrics, contact data or credentials.
- API protection: no-store responses, correlation IDs, same-origin JSON
  mutations, payload and batch limits, validation and fail-closed errors.
- Audit: alert actions record immutable activity and architecture audit entries.
- Simulation: existing simulation artifacts retain zero production mutation.

## Performance

The initial read model uses parallel queries, bounded limits, indexed tenant
access and no per-row lookup. Views lazy-render; search is debounced/abortable;
visible-tab polling runs every 30 seconds. Graph and export sizes are bounded.

## Accessibility

The UI uses landmarks, labelled controls, tab semantics, keyboard-operable
native elements, focus rings, live status regions, textual status labels,
responsive overflow handling and high-contrast dark surfaces. Automated
contract tests verify critical keyboard and ARIA markers.

## Tests

Added `tests/enterprise-trust-centre.test.mjs` covering:

- unit projections and missing-data behavior;
- CSV escaping;
- API authentication and tenant-scope contracts;
- UI live-data, keyboard and ARIA contracts;
- RLS, append-only integrity and service-only mutation;
- bounded query/performance constraints; and
- middleware regression protection.

Quality evidence:

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed, including EPIC 25, RLS and load groups
- `npm run build` — passed; `/trust-centre` emitted as a dynamic route with an
  8.36 kB route bundle and 114 kB first load
- local unauthenticated HTTP smoke check — returned fail-closed `503` because
  the local middleware did not have a usable public Supabase configuration

## Known limitations

- `main` contains the authoritative EPIC 18/19 architecture and continuous
  runtime, but no separate merged EPIC 22 Trust DNA profile tables or EPIC 23
  `replay_events` table. The Centre therefore exposes an explicitly labelled,
  explainable evidence projection and canonical Trust Events/Trust Memory; it
  does not fabricate unavailable authorities.
- Provider snapshots currently expose latest latency, error rate, circuit state
  and observation time. Confidence and longitudinal availability remain
  “Not measured” until the canonical provider contract retains those values.
- Manual review is a tenant-safe operational projection of challenged states
  and review alerts because the legacy `admin_reviews` table is not workspace
  scoped.
- Assignment accepts a workspace participant UUID; a future people picker can
  expose a masked directory.
- The in-app browser execution bridge was unavailable, and the local protected
  route correctly failed closed without Supabase middleware configuration.
  Authenticated rendered WCAG and interaction evidence should be captured in a
  configured staging tenant before production rollout.

## Recommendations for EPIC 26

1. Merge and adopt one canonical versioned Trust DNA profile contract, then
   replace the evidence projection without changing the Centre UI contract.
2. Standardize Replay entity-event storage behind the existing canonical event
   chain and expose cursor pagination.
3. Add fleet-level provider SLO history and confidence to the provider snapshot
   contract.
4. Add tenant-scoped manual-review ownership and SLA fields.
5. Run authenticated browser accessibility and load evidence in a seeded staging
   tenant.

EPIC 25 READY
