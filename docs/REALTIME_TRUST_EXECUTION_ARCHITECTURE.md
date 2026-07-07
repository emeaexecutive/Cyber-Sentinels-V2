# Real-Time Trust Execution Architecture

Cyber Sentinels real-time trust execution is an orchestration model, not an ML-only model. ML or provider output can improve evidence quality, but enterprise trust execution requires detection, decisioning, workflow action, replay and governance to operate together with bounded latency.

## Why ML alone is insufficient

ML can produce a signal. It does not by itself prove identity, confirm authority, preserve evidence, decide organizational policy, notify a reviewer, write a replay record or explain why an action was allowed or blocked. Cyber Sentinels treats ML, providers, heuristic baselines and runtime intelligence as labelled sources inside a governed workflow.

The current implementation does not claim production-grade proprietary ML detection or benchmarked precision/recall/F1. Real ML remains inactive unless a deployed model, versioned evidence and validation data exist.

## Execution pipeline

`lib/runtime/trust-execution-pipeline.ts` coordinates the runtime path:

1. Signal Collection
2. Signal Normalization
3. Detection Evaluation
4. Trust Algorithm Calculation
5. Decision Engine
6. Workflow Executor
7. Replay Writer
8. Governance Hooks
9. Notification/Event Hooks

The pipeline is async, timeout-aware, replay-safe and tolerant of partial provider availability.

## Event-driven architecture

`lib/events/event-bus.ts` provides a lightweight internal event bus for runtime trust events:

- `signal.received`
- `trust.updated`
- `workflow.allowed`
- `workflow.review`
- `workflow.escalated`
- `workflow.blocked`
- `replay.created`
- `governance.created`
- `provider.timeout`
- `provider.failed`
- `stepup.required`

Handlers run without blocking the caller. This keeps the operational response fast while replay and governance work continues safely.

## Parallel signal processing

`lib/runtime/parallel-signal-runner.ts` runs provider checks, heuristic baseline, provenance, runtime anomaly, session integrity and intent risk checks in parallel. Each check has a timeout window. A failed or slow provider is isolated and labelled instead of blocking the whole decision.

Signals are aggregated with source labels:

- Provider API
- Heuristic Baseline
- Runtime Intelligence
- Real ML
- Demo Data
- Awaiting Credentials
- Not Implemented

## Provider orchestration

`lib/providers/provider-orchestrator.ts` normalizes provider availability, latency, weights and graceful degradation. Provider states are:

- Live
- Simulated
- Awaiting Credentials
- Timeout
- Failed
- Disabled

Provider output is evidence, not autonomous certainty.

## Decision strategy

`lib/trust/decision-engine.ts` uses normalized evidence and weighted scoring to return:

- `allow`
- `step_up`
- `review`
- `escalate`
- `block`
- `insufficient_evidence`

Every decision includes reason, evidence, confidence, limitations and source labels. Heavy provider calls are kept out of the decision engine so it can execute quickly.

## Workflow execution model

`lib/workflows/trust-workflow-executor.ts` preserves evidence, writes audit records, creates replay events and issues receipts for allow/block outcomes. When the caller marks side effects as async-safe, replay, audit and receipt work is scheduled after the immediate decision response.

The executor never silently deletes data. Blocking stops the action while retaining evidence and replay context.

## Replay architecture

`lib/replay/replay-writer.ts` writes append-only replay events in small batches. Replay remains the trust record: chronology, evidence references, decision source, trust posture, governance action and outcome stay reconstructable after runtime ends.

## Caching strategy

`lib/cache/trust-cache.ts` caches trust posture, provider states, session integrity, replay summaries, governance status and agent runtime posture with TTL and stale-state detection. Cache updates are replay-safe and can be invalidated by scope.

## Governance decoupling

`lib/governance/governance-queue.ts` queues reviews, escalations, evidence exports, replay exports and notification placeholders. Governance queues do not block the core decision response.

## Runtime trust posture

`lib/runtime/trust-posture-engine.ts` supports incremental trust updates and posture drift. Runtime posture changes are evented instead of forcing a full recalculation on every event.

## UX strategy

The admin execution monitor shows provider latency, workflow decisions, replay writes, escalation queues, provider failures, posture updates and runtime anomalies. The demo flow shows staged evaluation rather than a long opaque waiting state.

Recommended UI states:

- evaluating signals
- awaiting provider
- governance review pending
- replay updated
- trust posture changed

## Future scaling direction

Production scaling should add durable queues, idempotency keys, replay sequence constraints, provider-specific circuit breakers, multi-region cache invalidation and deployment-specific latency SLOs. Those additions should be driven by validated pilot requirements and must not weaken authentication, RLS or evidence retention.
