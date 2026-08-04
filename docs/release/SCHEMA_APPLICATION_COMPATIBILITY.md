# Schema and Application Compatibility

| Scenario | Classification | Deployment order |
| --- | --- | --- |
| Current Production app against target staging schema | read-only compatible | schema first |
| Epic 29 app against Production baseline schema | degraded but safe | app first |
| Epic 29 app against partially applied schema | intentionally blocked | maintenance window |
| Rollback app against target schema | degraded but safe | phased |
