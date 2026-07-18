# ADR-006: Trust Decision Engine

## Status

Accepted.

## Context

Consequential workflows need one explainable decision contract across identity, evidence, authority, policy, session integrity and governance. Provider-specific or UI-specific decisions would produce inconsistent enforcement and audit records.

## Decision

The Trust Decision Engine is the authoritative domain decision boundary. It accepts normalized, tenant-scoped inputs and returns bounded actions, risk, reason codes, evidence references and review requirements. Authorization and trust enforcement occur before execution. Provider evidence, ORI, UI state and analytics cannot override the decision.

## Alternatives

- Let each route decide independently: rejected because policy and audit behavior would diverge.
- Let providers approve workflows: rejected because provider evidence is neither authorization nor complete context.
- Use one numeric threshold only: rejected because reason, authority and evidence sufficiency would disappear.

## Consequences

- Callers must use canonical input and output types.
- Reason codes and decision actions require compatibility discipline.
- Replay, governance, evidence and receipts link to the authoritative decision.
- Missing or invalid authority fails closed.

## Security impact

The engine separates authentication from authorization, requires scoped inputs and produces auditable reasons. No client-selected decision, tenant or provider status is trusted. Sensitive execution must not occur before the decision and enforcement gates complete.

## Future work

Consolidate remaining legacy decision paths, version policy contracts and add formal conformance tests for every consequential workflow.
