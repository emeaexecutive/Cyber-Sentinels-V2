# Enterprise Readiness Mode

Enterprise Readiness Mode changes the default operating rule: no feature sprawl. Every merge must improve credibility, reliability, performance, enterprise confidence or investor confidence.

## Merge Gate

No feature merge should proceed unless:

| Gate | Required Evidence |
| --- | --- |
| Build passes | `npm run build` exits successfully. |
| Typecheck passes | `npm run typecheck` exits successfully. |
| Replay works | Replay route or replay writer remains intact for touched workflows. |
| Trust Engine works | Trust decision paths preserve evidence, source labels and limitations. |
| Governance works | Escalation/review paths preserve actor, reason, outcome and replay references. |
| Auth works | Protected routes still require session and verified email. |
| RLS works | Database access remains owner/admin scoped or explicitly documented. |
| Dashboard works | Changed dashboards render without exposing internal-only details publicly. |
| Documentation updated | Relevant readiness docs and limitations are updated. |

## Default Decisions

- Prefer consolidation over new routes.
- Prefer provider normalization over provider-specific public pages.
- Prefer replay-backed proof over marketing claims.
- Prefer reviewed datasets over model claims.
- Prefer protected admin diagnostics over public implementation leakage.

## Stop Conditions

Stop and reassess if a change:

- adds a new route where an existing route can be extended
- creates an unreviewed provider dependency
- exposes provider internals or secrets
- claims accuracy without reviewed dataset evidence
- weakens auth, admin access, RLS or audit logging
- makes replay or governance optional for material trust changes
