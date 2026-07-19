# Vercel notification policy

## Current status

`REQUIRES VERCEL DASHBOARD VERIFICATION`

Notification preferences are account, team, integration or project settings. Repository changes cannot guarantee that Vercel sends no email. No notification preference was changed during the 2026-07-18 repository/API audit.

## Target policy

| Notification | Target setting | Reason |
| --- | --- | --- |
| Production deployment failure | Enabled | Immediate release and availability signal |
| Production security alert | Enabled | Security response requirement |
| Billing, domain expiry and certificate/domain alert | Enabled | Prevent service interruption |
| Preview deployment success | Disabled where available | Avoid routine Preview noise |
| Preview deployment failure | Disabled for this workflow where available | CS-ENG work does not deliberately create Preview deployments |
| Deployment comments | Disabled unless actively used for review | Reduce non-actionable notifications |
| Integration notifications | Review individually | Retain only actionable operational integrations |
| Team notifications | Least-noise role-appropriate setting | Avoid duplicate delivery while retaining owners |

## Verification procedure

1. Review personal notification preferences for deployment success/failure and comments.
2. Review project and team notification settings for duplicate delivery.
3. Review GitHub/Vercel integration comments and checks.
4. Disable Preview success/failure email where supported, while keeping Production failure, security, billing and domain-expiry alerts.
5. Record the account/team reviewer, date and chosen settings without including email addresses or secrets.

## Decision record

| Date | Reviewer | Scope | Decision |
| --- | --- | --- | --- |
| 2026-07-18 | Codex repository/API audit | Repository and linked Vercel project | Target policy recorded; actual preferences require dashboard verification |
