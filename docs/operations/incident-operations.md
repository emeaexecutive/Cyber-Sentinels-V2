# Incident Operations

**Status:** Approved procedure; no exercised program is claimed

## Workflow

```text
Detect -> Declare -> Triage -> Contain -> Communicate
-> Recover -> Verify -> Review -> Close
```

## Severity

- **SEV1:** Cross-tenant exposure, authentication/authorization bypass, domain compromise, destructive data loss, unsafe trust allow or widespread outage.
- **SEV2:** Major degraded capability, provider/database disruption, evidence backlog or failed Production release with material impact.
- **SEV3:** Limited defect with workaround and no boundary violation.

## Command roles

The Incident Commander owns decisions and cadence. Technical leads investigate and recover. Security leads containment/evidence for security events. Communications owns customer/internal updates. A scribe maintains the timeline. One person may hold multiple roles only when explicitly recorded.

## Procedure

1. **Detect/declare:** Open an incident ID, severity, commander, affected systems and trusted channel.
2. **Triage:** Establish known facts, customer/tenant impact, current SHA/configuration and evidence sources.
3. **Contain:** Fail closed, disable affected provider/feature, revoke credentials or restrict traffic without deleting evidence.
4. **Communicate:** Use verified contacts and a fixed cadence; distinguish confirmed facts from hypotheses.
5. **Recover:** Follow approved application/database/provider/domain procedures. Record every material command/decision.
6. **Verify:** Re-run boundary, integrity, health and customer-impact checks. Do not close on deployment success alone.
7. **Review/close:** Document root cause, contributing controls, actions, owners, dates and evidence retention.

## Evidence safety

Preserve logs, audit records, deployment IDs, migration state and hashes. Do not place secrets, raw identity evidence or unnecessary personal data in the incident channel/template.

## Exercises

Run quarterly tabletop exercises and at least annual restore/domain/credential scenarios. An unexercised runbook remains documentation-only.
