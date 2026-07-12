# Production Readiness

## Sprint 9.1 readiness position

Release 0.9 improves production confidence without claiming production guarantees that the application cannot measure. The existing admin Trust Execution dashboard is now the operating surface for health, risk, actions, evidence, support diagnostics, decision trends and measured latency.

## Readiness checklist

| Area | Evidence | Release position |
| --- | --- | --- |
| Application access | Admin authentication must complete before operational data is shown | Enforced |
| Platform health | Derived snapshot with blockers and next actions | Available, point-in-time |
| Provider health | Canonical five-state model with credentials and limitations | Available |
| Decision metrics | Retained decision events, grouped by UTC hour for 24 hours | Available; capped at 1,000 records |
| Replay persistence | Database write duration plus failed and retry diagnostics | Available; retry diagnostics are process-local |
| Queue support | Governance pending, replay pending, failed and retry counts | Available; not durable queue telemetry |
| Performance | Dashboard, provider, replay, decision, authorization and query measurements | Available after paths are exercised |
| Build identity | Version and deployment timestamp from environment | Requires deployment configuration |
| ML claims | Measured, heuristic, provider-supplied and awaiting-validation boundaries remain distinct | Enforced in health narrative |

## Deployment requirements

- Set `VERCEL_GIT_COMMIT_SHA` or `BUILD_VERSION`.
- Set `DEPLOYMENT_TIMESTAMP` or `VERCEL_DEPLOYMENT_TIMESTAMP` to an ISO-8601 value.
- Configure only approved provider credentials and validate every limitation shown in Provider Status.
- Confirm Supabase migrations and row-level security policies are applied.
- Confirm an authorized operator can open `/admin/trust-execution` and unauthorized users retain the existing denial path.
- Exercise at least one governed trust decision so runtime measurements can be observed.
- Confirm a replay event is retained before treating the decision record as complete.

## Performance baseline

The baseline is captured at runtime rather than documented as a static number. This prevents development-machine results from being presented as production performance.

| Measurement | Instrumented boundary | Optimization opportunity |
| --- | --- | --- |
| Dashboard load | Server-side dashboard data collection and rendering preparation | Split slow protected reads only after a measured regression |
| Provider latency | Parallel provider orchestration | Add provider-specific timeout budgets and durable percentiles |
| Replay write | Actual timeline insert | Batch deliberately and introduce a durable retry worker |
| Decision latency | Trust algorithm only | Profile inputs and algorithm branches before changing logic |
| Authorization | Admin access verification | Review auth network latency and session caching with security preserved |
| Largest database query | Instrumented admin decision query | Use production-like query plans; add aggregation when the row cap is reached |

The decision query now selects exact event types inside the 24-hour window so it can use the existing event-type and creation-time index. This is a code-level optimization opportunity, not proof of a production query plan.

## Outstanding production risks

- Runtime and queue diagnostics reset on process restart and do not provide fleet-wide history.
- The replay retry queue records failures but has no durable worker or ownership SLA.
- Provider health is not an external synthetic probe or contractual SLA.
- Browser paint, client network time and Core Web Vitals are outside the current dashboard-load measurement.
- Database query coverage is limited to explicitly instrumented paths.
- Build metadata remains unavailable when deployment variables are not injected.
- Accuracy and calibration claims remain blocked until reviewed datasets meet validation thresholds.

These risks should remain visible to operators; they must not be converted into reassuring default values.
