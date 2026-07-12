# Workspace Information Architecture

Cyber Sentinels uses one authenticated Enterprise Trust OS shell. Existing protected routes remain directly addressable; the shell consolidates discovery without creating duplicate dashboards.

| Area | Canonical entry | Existing capabilities mapped here |
| --- | --- | --- |
| Overview | `/dashboard` | Current posture, material risks, required actions and platform summary |
| Operations | `/workspace` | Workspaces, workflows, decisions, enforcement and Replay links |
| Trust | `/trust-center` | Trust Posture, Evidence Graph, Trust Memory™, Replay continuity and validation transparency |
| Runtime | `/dashboard/session-integrity` | AI agents, machine identities, sessions, anomalies and runtime change |
| Governance | `/dashboard/governance` | Reviews, policies, approvals, ownership and escalation |
| Providers | `/admin/provider-status` for verified admins; bounded trust-center provider view for users | Connections, health, credentials state and limitations |
| Administration | `/admin/access` for verified admins; `/team-access` for enterprise users | Users, access, support and protected configuration entry |

The single shared context bar exposes organization, workspace, workflow, entity, trust posture, authority state, active investigation and correlation ID. It derives only from authenticated route context, uses `Not present` rather than invented identifiers, and is omitted on login, email-verification and admin-access steps where it adds noise.

Public information architecture remains separate: homepage owns the enterprise story; Platform owns architecture; Trust owns public assurance concepts; Solutions owns use cases, including hiring as one solution; Enterprise owns deployment/readiness. About and Help remain footer-only. Internal/admin tools remain absent from public navigation. Authenticated users see the calmer global header plus the denser operating shell, with visible logout and mobile access to the same seven areas.

Trust Memory™ retains one canonical explanation under Trust: the governed historical record of how trust changes across evidence, authorization, runtime events, Replay and reviewed outcomes.
