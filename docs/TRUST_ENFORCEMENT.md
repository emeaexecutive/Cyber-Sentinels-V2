# Trust Enforcement

Release: 0.8 Standards Foundation

## Purpose

Trust Enforcement evaluates before execution. Authentication proves identity; authorization decides whether an action is allowed. Enforcement verifies that execution can proceed safely under the current policy record.

## Authorization Gateway

`lib/core/authorization-gateway.ts` returns:

- ALLOW
- DENY
- APPROVAL REQUIRED
- STEP-UP REQUIRED

Authorization must be external to the agent runtime. If authorization is evaluated inside the agent runtime, the gateway denies by design.

## Enforcement Checks

`lib/core/trust-enforcement.ts` checks:

- policy lookup
- argument validation
- delegation validation
- purpose validation
- nonce validation
- timestamp validation

The layer defaults to deny whenever a required check fails.

## Execution Receipt

Every enforcement result includes an execution receipt with:

- receipt ID
- workflow ID
- policy version
- authorization decision
- enforcement decision
- replay requirement

## Limitations

This layer does not replace enterprise IAM, policy engines or legal review. It provides a replayable trust-control decision point before execution.
