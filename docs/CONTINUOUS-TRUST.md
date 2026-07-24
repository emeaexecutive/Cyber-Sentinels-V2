# Continuous Trust Engine

## Architecture

EPIC 24 extends the production trust stack already on `main`; it does not create a second Trust State, Evidence Graph, Trust DNA, alert, or Replay subsystem.

```text
Authenticated tenant API / signed server integration
                         |
                  validate + authorize
                         |
             transactional signal ingestion
       immutable signal + outbox + Replay + audit
                         |
             inline attempt / Vercel Cron retry
                         |
        evidence projection -> policy -> drift
                         |
           existing continuous assessment engine
                         |
     authoritative Trust State RPC + canonical Replay
                         |
       decision + alert/review + processing result
```

The implementation lives in `src/lib/continuous-trust`. `signal-service.ts` coordinates ingestion and processing, `signal-engine.ts` contains deterministic drift and signal-policy rules, and `signal-repository.ts` is the only persistence boundary. The database transaction functions are in `202607240003_continuous_trust_engine.sql`.

## Event lifecycle

1. An authenticated owner, administrator, or appropriately scoped reviewer submits a normalized signal with an idempotency key.
2. Server validation rejects unknown enums, invalid identifiers, future timestamps, invalid confidence, unsafe metadata, and unauthorized sources.
3. One database transaction verifies tenant/entity scope, reserves idempotency, stores the immutable signal, queues durable processing, and appends canonical Replay and audit records.
4. The handler attempts processing immediately. A Vercel Cron route later claims queued or retryable work with `FOR UPDATE SKIP LOCKED`.
5. Processing projects normalized evidence into the existing Evidence Graph, derives deterministic drift and a policy decision, and invokes the existing continuous assessment engine.
6. The existing assessment path evaluates evidence, provider health, policy, and current state, then uses the sole authoritative Trust State mutation RPC.
7. One final transaction persists drift, the policy decision, any alert or review, the processing result, audit, and Replay.

No request-process resident worker exists.

## Integration boundaries

- Trust State: `subject_trust_state`, `trust_state_decisions`, and `apply_trust_state_decision_v1` remain authoritative.
- Trust scoring: EPIC 19's deterministic continuous assessment is reused. A signal records affected Trust DNA dimensions and evidence, then recalculates the canonical assessment. Dimension-only recalculation is an extension point because the EPIC 22 branch is not present on current `main`.
- Trust Graph: a signal becomes an `evidence_object` and a `trust_references` link. Existing graph indexing creates the node/reference topology. History is retained; no evidence row is deleted.
- Replay: accepted, rejected, processed/material, manual-review, override, alert-transition, provider-health, and Trust State events use the canonical hash chain.
- Provider health: canonical provider snapshots reduce assessment confidence. `UNAVAILABLE` is operational context and never fabricated as negative identity evidence.

## Operations

Set a high-entropy `CRON_SECRET` only in the server deployment. Vercel calls `GET /api/trust/jobs/process` every five minutes with `Authorization: Bearer ...`. The route processes at most ten jobs; the SQL claimant permits at most 25. A job receives no more than five attempts and exponential backoff. Terminal failures remain visible in `trust_processing_failures`.

Operational checks:

```sql
select status, count(*) from trust_signal_processing group by status;
select error_code, count(*) from trust_processing_failures
where occurred_at > now() - interval '1 day' group by error_code;
select * from trust_manual_reviews
where status in ('REQUESTED','ASSIGNED','IN_REVIEW') order by created_at;
```

On a queue incident, fix the underlying dependency; do not edit immutable signals. Retryable jobs resume when `next_attempt_at` is reached. Terminal jobs require an explicitly audited new signal.

## Deployment and rollback

Apply migrations before deploying application code. The migration is forward-only and additive. Application rollback can return to the previous build while the new tables remain unused. Do not down-migrate by deleting trust history. If EPIC 24 processing must be stopped, disable the Vercel schedule and signal-ingestion route at the application layer while preserving all records.

## Limitations

- No OpenAPI document exists in this repository, so no competing specification was created.
- Live migration execution requires a configured Supabase project; repository tests statically verify SQL/RLS contracts.
- The deterministic evaluator is synchronous, while database and provider latency dominate end-to-end processing.
- ML-assisted drift is intentionally not implemented. Future models must be versioned, validated, explainable, and unable to bypass policy or the Trust State engine.
