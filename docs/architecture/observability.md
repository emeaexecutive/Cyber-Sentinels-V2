# Trust architecture observability

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

Trust observability proves whether the pipeline is operating and where evidence or decisions are delayed, degraded or incomplete. Metrics describe application execution; they do not prove correctness, provider SLA, security or model accuracy.

The shared in-process profiler is `lib/performance/runtime-profiler.ts`. `lib/performance/durable-telemetry.ts` can persist sanitized samples through the approved telemetry path. `buildPlatformHealth()` is the canonical aggregate for admin health and reports missing measurements as `Awaiting data`.

## Required measurements

| Blueprint measurement | Current signal | Required production definition | Gap |
| --- | --- | --- | --- |
| Verification latency | Provider lifecycle/orchestration and callback stages | P50/P95/P99 from accepted request to normalized verification result, separated by provider/outcome | No single end-to-end verification metric |
| Replay duration | `replay_latency` measures timeline write | Separate replay-write latency from full snapshot/re-evaluation duration | Exact replay duration not instrumented |
| Evidence ingestion | `provider_normalization_latency`, `evidence_graph_latency` and write stages | Accepted bytes to immutable evidence commit, plus rejects/duplicates | Evidence Graph write is not equivalent to complete ingestion |
| Provider failures | Provider telemetry, orchestration state and health snapshots | Failure/timeout/rate-limit/invalid-signature counts by provider and operation | In-process snapshots are not retained SLAs |
| Policy evaluations | Authorization/enforcement stages and audit context | Count, latency and result by policy version without sensitive input | No dedicated universal policy-evaluation metric |
| Decision latency | `trust_latency`; workflow/end-to-end stages | TDE evaluation separately from persistence/enforcement and total workflow | Current trust latency excludes provider and side effects |
| ORI latency | `executionDurationMs` and ORI telemetry | Inference latency by mode/model/version plus abstention/failure | No first-class shared `ori_latency` stage |

## Existing stage model

The profiler defines lifecycle, provider, callback, normalization, consensus, trust decision, workflow, replay, queue, authorization, enforcement, Evidence Graph, Trust Memory, trust profile, evidence pack, parallel orchestration, governance queue, dashboard and database-query stages. Samples are bounded and contain technical labels/metadata, not raw customer evidence.

In-process metrics reset with the process. A displayed zero is valid only when actual samples measured zero; absent samples are `Awaiting data`. Platform health must never infer Live provider health from configuration alone.

## Metric contract

Every durable metric includes:

- metric/stage name and schema version;
- UTC time, duration/count and success/degraded/failure outcome;
- environment, deployment/commit and region;
- provider, policy, decision-engine or ORI version where applicable;
- safe correlation and tenant pseudonym/reference where authorized;
- retry/timeout/abstain/duplicate dimensions; and
- sampling and retention classification.

Do not include raw payloads, evidence content, tokens, email addresses, provider secrets, signatures or free-form reviewer notes.

## Service objectives and alerts

Thresholds become objectives only after a measured baseline and owner approval. Alert on:

- sustained provider failures or callback signature failures;
- evidence-ingestion rejects/queue backlog beyond the approved window;
- replay write failure or durable reconciliation gap;
- decision or policy latency regression by version;
- ORI error/abstention or drift change, without treating risk distribution as ground truth;
- cross-tenant/RLS denial anomalies; and
- missing telemetry from a path known to be active.

Alerts name an owner, runbook, severity and correlation reference. Security events use the incident path rather than a public uptime message.

## Tracing

Propagate a safe correlation ID through provider request, normalized evidence, graph projection, decision, Replay, Trust Memory, ORI, governance and report generation. Provider event/session IDs remain scoped and redacted. Trace continuity cannot replace persisted decision/evidence references.

## Current limitations

- Replay and governance queue diagnostics can be process-local and are not durable recovery mechanisms.
- Shared profiling is not a distributed APM system.
- ORI has duration data but no platform-health latency category.
- Policy evaluations lack a unified versioned measurement.
- Repository source cannot verify production collectors, dashboards, alerts or retention.

## Verification

Production acceptance requires a synthetic governed workflow, correlation across every active stage, known failure injection for provider/evidence/replay paths, confirmation that secrets never enter telemetry, durable sample retrieval after restart, and alert/runbook evidence. Missing paths remain `Awaiting data`.
