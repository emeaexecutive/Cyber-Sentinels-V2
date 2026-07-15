# Provider Setup Guide

The canonical provider control surface is `/admin/provider-status`. It consolidates readiness, credential state, retained health evidence, supported signals and limitations. `/admin/integrations` remains the adapter registry; it is not a second readiness dashboard.

## Readiness states

- `Production Ready`: a real successful check is recorded and production mode, normalization, timeout handling and audit logging are present.
- `Configured`: credentials and configuration are present; no production-health claim follows.
- `Awaiting Credentials`: required credential names are absent and no call is made.
- `Prototype`: a simulated, test, normalized or partial adapter path exists.
- `Deprecated`: the adapter is retired or legacy.

## Setup procedure

1. Confirm provider purpose and supported signals.
2. Review restricted-data egress, retention, sovereignty and shutdown risk.
3. Add secret values only to the approved deployment secret store; never to source control or client-visible variables.
4. Verify required environment names without exposing values.
5. Run `Test Connection`. The control rechecks configuration and retained health evidence; it never fabricates a successful network call.
6. Confirm canonical response normalization, timeouts and protected audit handling.
7. Run approved benchmark cases and record reviewed outcomes before accuracy claims.
8. Approve the adapter for a named workflow and keep human review authoritative.

## Health evidence

Each provider displays Provider, Purpose, Current status, Health, Credential state, Last successful connection, Documentation, Test Connection, Supported signals and Known limitations. A missing successful real check remains `Unknown` or blocked. Process-local health is not fleet availability or an SLA.

## Normalized response boundary

Only canonical evidence and result fields enter decision, Replay and receipt flows. Raw provider payloads remain protected. Provider confidence is supporting evidence, not a final verdict, and provider-side retention remains contract-dependent.
