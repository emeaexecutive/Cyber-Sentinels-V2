# Back Office

Baseline commit: `f752e58`

Audit date: 2026-07-18

## Purpose and ownership

`/back-office` is the protected administrative and operational aggregation surface. `/admin` redirects to it. It is not a public product page and must remain noindex and hidden from public navigation.

The page is a large force-dynamic Server Component that queries many operational tables, provider/readiness services and process-local queues. Specialized administration remains distributed across `/admin/*`, `/team-access`, `/dashboard/governance`, `/admin/integrations` and related protected routes.

## Current capabilities

| Required area | Current implementation | Gap or limitation |
| --- | --- | --- |
| Administration | Operational snapshot, launch/demo checks, priority queue, feedback, support and advanced modules | Broad aggregator can obscure canonical ownership; `/admin/access` is the safer navigation entry |
| Users | Candidate/recruiter profiles, waitlist and access requests are summarized | No single account lifecycle administration module; Supabase Auth users are not fully administered here |
| Roles | Workspace/team roles exist in protected access surfaces | Back Office access itself is allowlist/code based, not a complete RBAC model |
| Organisations | Workspace, team, candidate/recruiter organization context appears in records | No canonical organization administration section with lifecycle/ownership controls |
| Verification Cases | Latest cases, statuses, graph health, evidence and decisions | Multiple legacy case/report types remain and need canonical ownership |
| Providers | Links and orchestration/readiness summaries | Provider enablement and secrets remain in specialized admin/server paths |
| Policies | Links to policy/governance engines | Policy creation/review is owned by protected Governance; Back Office does not centralize policy version management |
| Audit Logs | Audit timeline, latest events and decision-pipeline audit | Deployed completeness and retention still require verification |
| System Health | Operational snapshot, provider, graph, queue, Replay and runtime indicators | Several diagnostics are in-process and reset on restart; not production APM |

## Security model

### Authentication and allowlisting

Middleware requires a Supabase-authenticated, email-verified user for admin surfaces. The email must be present in `ADMIN_EMAILS`. Missing configuration, missing user, non-allowlisted user and missing verification state fail closed.

### Admin verification

Back Office additionally requires an admin access code and an HttpOnly, Secure, SameSite=Strict `cyber_admin_verified` cookie. The cookie max age is eight hours. This is a fixed secondary-verification lifetime, not an inactivity-based session timeout or MFA assurance claim.

### Role-based access and least privilege

Workspace roles (`admin`, `reviewer`, `observer`) and reviewer checks exist elsewhere, but Back Office authorization is primarily global email allowlisting plus the admin cookie. Service-role consumers bypass RLS and require server-only isolation, tenant assertions and audit. The current model is **partial RBAC**, not a general enterprise role/permission administration system.

### Administrative audit trail

Admin actions should record actor, time, target, prior/new state, reason and correlation ID. The page reads audit data and many admin APIs write events, but an exhaustive proof that every mutation is audited has not been established.

### Session timeout

The admin-verification cookie expires after eight hours. Supabase session lifetime is separately controlled. No source-level idle-timeout, forced re-authentication timer or centralized session-revocation console was identified.

## Operational boundaries

- Do not expose provider keys, bearer tokens, service-role secrets or raw identity payloads.
- Missing tables render unavailable/empty states; absence is not a healthy result.
- Demo/static fallback content must be labelled and kept separate from retained operational records.
- Process-local event, governance and Replay queue snapshots are diagnostics, not durable fleet state.
- Administrative pages must repeat server-side authorization; middleware is not the only control.

## Usability and performance risks

Back Office is more than 3,000 source lines and fans out across roughly 30 table reads plus local provider/queue evaluation. Although reads are started in parallel, the first response depends on a wide set of data sources. The page contains many panels and navigation links, increasing cognitive load, focus length and query cost.

## Recommendations

1. Keep `/back-office` protected and noindex; do not add it to public enterprise storytelling.
2. Use the existing specialized admin routes as canonical owners and treat Back Office as an index/summary.
3. Define organization and account administration ownership before adding controls.
4. Move from global allowlist/code toward explicit admin roles and stronger re-authentication only through a separately approved security change.
5. Add inactivity/session-revocation requirements and audit coverage evidence.
6. Measure deployed query latency and progressively load low-priority panels before attempting a visual redesign.
