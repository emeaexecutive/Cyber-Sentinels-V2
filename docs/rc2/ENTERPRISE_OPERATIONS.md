# RC2 Enterprise Operations

## Operating model

The Enterprise Operations view is a read projection over canonical health, provider, tenant, policy, audit and lifecycle systems. It does not become another configuration database.

**Production untouched.** This runbook describes operation; RC2 did not execute any Production action.

## Status vocabulary

- `HEALTHY`: current evidence satisfies the bounded check.
- `DEGRADED`: the service is available but failures or retries require action.
- `BLOCKED`: a required dependency or control prevents reliance.
- `UNKNOWN`: required telemetry was not supplied.
- `MAINTENANCE`: the deployment is explicitly placed in maintenance mode.

Never convert absent samples into zero or healthy.

## Routine checks

| Frequency | Check | Response |
| --- | --- | --- |
| Every release | Liveness, readiness, release version, environment, security headers | Block handoff on mismatch |
| Every shift | Provider state, governance/replay queues, retries, DLQ, recovery jobs | Assign owner for degraded/unknown state |
| Daily | Admin/security events, failed webhooks, pending reviews, expired evidence | Investigate with correlation and replay references |
| Weekly | Role/membership review, API keys, webhook endpoints, notification delivery | Revoke stale access and record evidence |
| Per policy change | Version, reviewer, reason, evidence, authority, replay, rollback target | Reject incomplete transitions |
| Per pilot close | Export, retention, legal hold, access revocation, recovery evidence | Obtain owner/auditor sign-off |

## Queue operations

The current platform reports in-process governance, replay and retry state. Durable background worker, dead-letter and recovery telemetry must be connected by the deployment owner. Until then those controls remain `UNKNOWN`.

For a failed item:

1. Capture release, environment, correlation ID and queue/job identifier.
2. Classify retryable versus non-retryable without exposing payload data.
3. Confirm idempotency before retry.
4. Move exhausted work to the durable dead-letter path.
5. Create an incident when evidence, decision or replay completeness may be affected.
6. Record recovery result and replay reference.

## Provider lifecycle

Use only these distinctions: configured, awaiting credentials, healthy from current runtime evidence, degraded/offline, prototype or deprecated. Credentials are not health evidence. Disable or isolate a failing provider according to policy; never silently substitute a weaker provider as equivalent evidence.

## Maintenance mode

Set `ENTERPRISE_MAINTENANCE_MODE=true` only through the target environment's controlled configuration path. Record approver, reason, start/end, affected tenants, release and incident/change reference. Maintenance does not bypass authorization, audit, retention or evidence integrity.

## Audit investigation

Start with correlation ID. Resolve the actor, timestamp, reason, evidence references, authority reference and replay reference. Compare policy version and reviewer attribution, then inspect provider/webhook and lifecycle events. Missing links are evidence gaps, not proof of normal operation.

## Recovery

- Preserve append-only governance and audit history.
- Prefer forward repair for schema changes.
- Restore isolated environments only from a recorded backup.
- Re-run tenant denial, policy approval, replay and report checks after recovery.
- Do not declare recovery complete until a named reviewer confirms evidence continuity.

## Incident escalation

Escalate when tenant isolation, authority, policy approval, evidence integrity, webhook authenticity, replay completeness, secret exposure or recovery integrity may be compromised. Use the serious-incident workflow for chronology, evidence snapshot, impact, corrective actions, reporting decision and closure approval.
