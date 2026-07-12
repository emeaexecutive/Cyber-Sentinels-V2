# Operational Runbook

## Start-of-shift check

1. Sign in with an authorized admin account and open `/admin/trust-execution`.
2. Confirm Application Health is not `blocked` and review every listed risk.
3. Review Configuration issues, Provider issues, Missing credentials, Failed jobs and Retry queue.
4. Confirm build version and deployment timestamp identify the expected release.
5. Check the 24-hour decision trend for unexpected changes in review, escalation or block volume.
6. Expand engineering details only when the summary identifies a risk or investigation need.

## Incident response

### Application blocked

- Confirm admin authentication and required environment configuration.
- Compare the displayed build version and deployment timestamp with the intended deployment.
- Preserve the existing protected-route behavior; do not bypass authorization to restore visibility.

### Provider awaiting credentials

- Confirm the provider is approved for this deployment.
- Add credentials through the deployment secret store, never source control.
- Re-run the provider path and require a measured live result before changing the state to `healthy`.

### Provider degraded or offline

- Read the provider limitation and latest measured latency.
- Confirm timeout, credential scope and provider availability.
- Treat provider output as one governed signal; keep authorization decisions fail-closed where required.
- Escalate to the provider owner if repeated failures exceed the deployment's agreed threshold.

### Replay write failed

- Treat the decision record as incomplete until database persistence is confirmed.
- Capture the recent failure message and affected subject/event type from diagnostics.
- Verify database availability, permissions and migration state.
- Reconcile or replay through an approved operator workflow. The current retry list is process-local and is not an automatic durable recovery mechanism.

### Queue growth

- Review governance ownership and oldest durable workflow records.
- Assign unresolved review/escalation work to a named operator.
- Do not interpret an empty process-local queue as proof that no durable work remains.

### Latency regression

- Identify the slow category and sample count; do not act on `Awaiting data`.
- Reproduce with the same path and deployment version.
- For database queries, capture a production-like query plan before changing indexes.
- For providers, distinguish local orchestration time from external provider latency.
- For dashboard load, separately inspect browser/network telemetry because it is outside the server measurement.

## Operational demo

Use `/demo/trust-execution-flow` for the narrative and authenticated operator surfaces for proof.

1. Platform starts: load the application and protected admin surface.
2. Health checks pass: inspect application, providers, queues and configuration; resolve or explicitly acknowledge limitations.
3. Trust decision generated: submit the deterministic demo input and record the decision state.
4. Replay stored: confirm the replay/timeline record exists; do not rely only on an emitted event.
5. Trust Memory updated: confirm the governed trust-state transition appears in the existing timeline experience.
6. Evidence Graph updated: confirm the decision's evidence references are linked in the existing graph experience.
7. Dashboard refreshed: reload Platform Health and confirm decision totals, evidence and runtime measurements reflect the run.

The public demo deliberately does not write customer records or fabricate production telemetry.

## Escalation record

For every operational escalation record: deployment version, timestamp, affected workflow or subject, observed state, evidence reference, responsible owner, action taken and verification result. Avoid copying raw secrets or unnecessary customer evidence into support notes.
