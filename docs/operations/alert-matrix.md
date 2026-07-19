# Alert Matrix

**Status:** PROPOSED — no centralized platform alert routing is repository-verified

Thresholds below are starting hypotheses and require baseline tuning. Product `trust_alerts` records are not infrastructure alerts.

| Signal | Initial trigger | Severity | Owner | Channel/escalation | Suppression and recovery | Runbook |
| --- | --- | --- | --- | --- | --- | --- |
| Production deployment failed | Any Production build/deploy failure | SEV2 | Release | Release channel; page Operations after 10 min | Group by SHA; recover on successful known-good deployment | Production deployment |
| Domain/TLS failure | Canonical HTTPS unavailable or certificate invalid | SEV1 | Operations/Security | Page immediately; domain owner escalation | No suppression during outage; recover after multi-probe success | Disaster recovery |
| Error-rate spike | Critical route errors exceed baseline for 5 min | SEV2 | Engineering/Operations | Page on-call | Group route/category; recover after 15 min below threshold | Incident operations |
| Authentication anomaly | Material failure/denial spike or bypass signal | SEV1/2 | Security | Security page and incident channel | Suppress known test tenant; recover after containment and baseline | Incident operations |
| Provider outage | Enabled provider timeout/failure sustained 5 min | SEV2 | Provider owner | Operations plus vendor escalation | Group provider; recover after real successful checks | Provider/degraded runbook |
| Database unavailable | Readiness query fails twice | SEV1 | Data/Operations | Page immediately | No suppression except approved maintenance | Disaster recovery |
| Webhook failures | Signature-valid events fail processing or backlog grows | SEV2 | Integration owner | Operations channel; vendor if needed | Deduplicate event ID; recover when backlog reconciles | Incident operations |
| Cross-tenant event | Any verified unauthorized tenant access | SEV1 | Security/Data | Page and incident declaration | Never auto-suppress | Incident operations |
| Service-role misuse | Unexpected privileged operation or source | SEV1 | Security | Page immediately | Suppress only approved maintenance identity | Incident operations |
| Evidence backlog | Durable queue age/count breaches approved budget | SEV2 | Trust runtime | Operations channel | Group tenant-safe aggregate; recover after reconciliation | Incident operations |
| Trust Decision failure | Decision/enforcement cannot complete safely | SEV1/2 | Trust owner | Page if user-impacting | Group correlation/error category; recover after safe decisions | Incident operations |
| Report generation failure | Sustained failure or missing critical references | SEV3 | Reporting owner | Team channel; escalate by customer impact | Group format/version | Incident operations |

Every configured alert must link a dashboard, evidence field allowlist, owner schedule, test result and recovery condition. Untested alerts remain `PROPOSED`.
