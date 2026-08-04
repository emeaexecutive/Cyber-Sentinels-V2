# Technical incident runbook

## Detection sources
- Monitoring or health check alert.
- Support escalation from a design-partner pilot.
- Release-health degradation or stale schema health.

## Immediate containment
- Pause or disable the affected workflow if the incident creates risk.
- Preserve evidence and correlation identifiers.
- Avoid broad production changes.

## Escalation owner
- Engineering lead for the affected service.
- Security owner for suspected secret or access compromise.

## Rollback / forward repair
- Revert the latest risky change if safe and reviewable.
- Apply a forward repair only when the change is constrained and auditable.

## Customer communication boundary
- Keep communication factual and limited to the current verified status.
- Do not claim full availability or recovery before evidence exists.

## Post-incident review
- Document the cause, response, and follow-up items.
- Update the design-partner readiness gap and tooling inventory if new control gaps are revealed.
