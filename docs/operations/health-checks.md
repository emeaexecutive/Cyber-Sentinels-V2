# Health Checks

**Status:** Proposed contract; only bounded liveness and protected health modeling are partially implemented

## Health classes

| Class | Purpose | Public exposure |
| --- | --- | --- |
| Liveness | Process can return a response | Minimal public status only |
| Readiness | Instance can safely serve critical workflows | Protected/internal |
| Dependency | Supabase, provider, queue and storage state | Protected/internal and sanitized |
| Provider | Real health sample, latency and source mode | Admin only |
| Degraded operation | Which capabilities fail closed or remain available | Protected status plus safe user messaging |

## Current endpoint

`GET /api/health` is a public liveness check returning a bounded success envelope. It must not be interpreted as authentication, database, provider or Trust Decision readiness.

## Target behavior

Readiness checks validate configuration names, database query, migration expectation, critical queue state and authorization/trust dependencies without mutating data. Provider health must distinguish configured, live-success, degraded, offline and awaiting credentials. A configured secret is not a successful health sample.

## Safety

Health responses never expose credentials, tokens, stack traces, database topology, internal hostnames, customer data, evidence, exact table counts or provider payloads. Public failure responses remain generic; detailed diagnostics require authenticated administrator access.

## Degraded-mode rules

- Authentication unavailable: protected operations unavailable.
- Authority/policy unavailable: deny or pause execution.
- Provider unavailable: mark evidence insufficient and require review/step-up; never invent success.
- Replay/graph/memory write failure: preserve primary decision/evidence and create durable reconciliation work before claiming completeness.
- Reporting unavailable: preserve source records and retry without changing the decision.

## Tests

Exercise healthy, missing environment, database unavailable, provider timeout, queue backlog and partial-write states. Confirm safe response fields and recovery transitions. Results are attached to release evidence.
