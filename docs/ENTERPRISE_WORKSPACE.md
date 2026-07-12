# Enterprise Workspace

Release: 1.0 Alpha

## Purpose

The Enterprise Workspace is the authenticated operating experience for Cyber Sentinels. It does not replace existing dashboards or create another data store. It gives the existing operational routes one consistent shell, context model, status strip, search entry point and notification center.

## Canonical areas

| Area | Existing destination | Job |
| --- | --- | --- |
| Overview | `/dashboard` | Summarize current posture, risks, evidence and accountable next action. |
| Operations | `/workspace` | Coordinate workspaces, trust cases and workflow relationships. |
| Trust | `/trust-center` | Review posture, evidence continuity, Replay and Trust Memory. |
| Runtime | `/dashboard/session-integrity` | Inspect runtime and session-integrity change. |
| Governance | `/dashboard/governance` | Assign review, escalation and resolution ownership. |
| Providers | `/admin/provider-status` for verified admins; provider evidence in `/trust-center` for users | Review provider readiness without exposing credentials or inventing connection state. |
| Administration | `/admin/access` for verified admins; `/team-access` for users | Manage protected administrative and team-access workflows. |

## Safety boundaries

- Existing middleware, email verification, admin allowlisting and RLS remain authoritative.
- Public pages do not render the Enterprise Trust OS shell.
- Authenticated users do not receive admin-only provider or health details.
- A missing enterprise, workflow, entity, posture or Replay selection is shown explicitly; the shell does not fabricate one.
- Dynamic evidence and Replay routes remain data-backed destinations rather than duplicated summaries.

## Performance model

The command palette is loaded as a separate client chunk. Dashboard, workspace, Trust Center and notification routes use shared loading boundaries so navigation can stream an immediate skeleton. Private operational data remains dynamic and is not placed in a shared public cache.
