# Release Stop and Escalation

Immediate stop conditions:
- migration failure
- unexpected migration head
- schema mismatch
- RLS failure
- cross-tenant leakage
- Auth regression
- widespread 5xx
- missing required object
- Trust Object corruption
- Replay corruption
- Trust Memory corruption
- consent failure
- request-demo failure
- unexpected Production database activity

Owners:
- release owner: release engineering
- database owner: platform engineering
- security escalation: security operations
- rollback authority: release manager
- forward-repair authority: database owner
- incident evidence location: release evidence package
