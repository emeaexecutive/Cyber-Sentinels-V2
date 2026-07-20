# Provider Health Runbook

Provider health modifies operational availability only; it never converts failed evidence into a pass.

1. Confirm tenant, provider, observation time and correlation ID without copying secrets or raw payloads.
2. Review latency, error/timeout rates, signature/schema failures, provider incidents and circuit state.
3. Mark `DEGRADED` for elevated failures, `UNAVAILABLE` for incidents/open circuits, `BLOCKED` for missing credentials, or `DISABLED` for intentional shutdown.
4. Evaluate affected subjects again only after a healthy snapshot and provider evidence have been independently verified.
5. Use non-mutating outage simulation to quantify policy impact before operational changes.
6. Record the incident, health transition and recovery evidence. Never manually edit a historical snapshot.

World ID must remain `INCONCLUSIVE — Server verification pending — Zero positive consensus contribution` until a separately reviewed server-verification implementation is deployed and proven. Placeholder providers remain zero.
