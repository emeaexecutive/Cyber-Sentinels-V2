# Sprint 9.1 Acceptance Criteria

## Platform observability

- [x] A canonical Platform Health service derives application, provider, queue, latency and build state.
- [x] The service reports build version and deployment timestamp from environment configuration without inventing fallbacks.
- [x] Missing measurements display `Awaiting data` rather than zero.
- [x] Operational health remains admin-only.

## Trust decision metrics

- [x] The admin dashboard shows decisions in the last 24 hours.
- [x] `allow`, `review`, `escalate` and `block` totals come from retained decision events.
- [x] Twenty-four UTC hourly buckets display measured trends.
- [x] `step_up` is explicitly grouped with `review`; missing events are not inferred.

## Provider health

- [x] Every provider is classified as `configured`, `healthy`, `degraded`, `offline` or `awaiting credentials`.
- [x] A `healthy` state requires a measured live orchestration result.
- [x] Credentials, limitations and next actions remain visible to operators.

## Performance baseline

- [x] Dashboard server load is instrumented.
- [x] Provider latency is instrumented.
- [x] Replay database write time is instrumented.
- [x] Trust decision latency isolates the Trust Engine algorithm.
- [x] Authorization latency is instrumented.
- [x] The slowest instrumented database query is identified.
- [x] Optimization opportunities and measurement boundaries are documented.

## Enterprise support and UX

- [x] Admin diagnostics show configuration issues, provider issues, missing credentials, failed jobs and retry queue.
- [x] The primary dashboard hierarchy is Health, Risk, Actions and Evidence.
- [x] Engineering detail is collapsed by default.
- [x] Existing access controls and operational routes are retained.

## Demo and documentation

- [x] The demo narrative covers platform start, health, decision, replay, Trust Memory, Evidence Graph and dashboard refresh.
- [x] The demo states where authenticated proof is required and does not fabricate telemetry.
- [x] `docs/OBSERVABILITY.md` documents sources, states and boundaries.
- [x] `docs/PRODUCTION_READINESS.md` documents deployment requirements and risks.
- [x] `docs/OPERATIONAL_RUNBOOK.md` documents operator checks and incident response.

## Quality gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] Scoped changes committed with the Sprint 9.1 release message.
- [x] Commit pushed to `origin/main`.

The unchecked quality-gate items are updated only after the commands and release operation complete successfully.
