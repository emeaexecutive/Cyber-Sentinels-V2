# Enterprise Pilot Guide

## Pilot objectives

Validate one consequential workflow with named human accountability, explainable Trust Decisions, Replay continuity, evidence linkage and measurable operational behavior. The pilot is evidence gathering, not a production certification or an accuracy guarantee.

## Deployment checklist

- Name the workflow owner, security owner, governance reviewer and escalation contact.
- Confirm tenant boundaries, authentication, administrator access and RLS in the target environment.
- Record the build version and deployment timestamp.
- Select only approved provider adapters; keep all others disabled or Awaiting Credentials.
- Exercise allow, review, escalate, block, Replay failure and Trust Memory failure paths.
- Confirm Replay, Evidence Graph and Trust Memory references resolve for retained decisions.
- Define latency, error, queue-age and continuity-write stop conditions.
- Complete data classification, retention, residency, incident and deletion review.

## Provider prerequisites

For each enabled provider, document credentials, endpoint, region, timeout, normalization, audit logging, restricted-data egress, retention, shutdown behavior and a successful real health check. `Configured`, `Prototype` and `Awaiting Credentials` are not interchangeable with `Live` or Healthy.

## Customer responsibilities

The customer supplies accountable owners, lawful workflow purpose, approved policy, authoritative access controls, representative reviewed cases, provider contracts, data-handling requirements and timely governance decisions. Authorization remains external to agent or machine runtimes and is evaluated before execution.

## Success metrics

- 100% of sampled Trust Decisions include all eight explanation fields.
- 100% of sampled decisions have resolvable Replay, evidence and authority continuity unless a deliberately tested failure blocks execution.
- Reviewed outcomes are attributable to a named reviewer and workflow.
- Agreed Trust Decision, provider and evidence-write latency budgets are met on the representative cohort.
- No unresolved critical authentication, tenant-isolation, queue or continuity-write failure remains.
- Provider reality states and limitations match observed evidence.

Accuracy, false-positive and false-negative targets require a named dataset and enough reviewed ground truth; otherwise the result is `Calibration incomplete - insufficient reviewed ground truth.`

## Exit criteria

Exit to the next controlled phase only when critical readiness checks are ready, owners accept remaining cautions, observability coverage is sufficient for the workflow, explainability samples pass, and the security/data review is signed off. Exit to remediation when any fail-closed path, tenant boundary, authority chain or evidence continuity check fails.
