# EPIC 19 Repository Truth Audit

## Authoritative path

The repository already has one authoritative trust path and EPIC 19 extends it:

```text
provider adapters / consent / runtime signals
  -> evidence_objects + trust_events
  -> Provider Consensus recommendation
  -> trust_decision_contracts
  -> src/lib/trust-state engine
  -> trust_state_decisions
  -> subject_trust_state read model
  -> evidence_graph_* + trust_memory_index + Replay
```

`src/lib/trust-state` and `apply_trust_state_decision_v1` are the sole authoritative state decision and mutation boundaries. Provider Consensus is advisory. `trust_events` is the canonical append-only event chain. `evidence_objects` is the normalized evidence ledger.

## Existing implementation

- EPIC 17.1D: signed, tenant-scoped Canonical Trust Events, provider envelopes, idempotency, append-only event chain, normalized evidence and provider capability registry.
- EPIC 17.1E/17.2: consent receipts, provider observations, provider health, deterministic Provider Consensus, conflicts, policies and recommendation lineage.
- EPIC 18: trust domains, evidence contracts, decision contracts, Trust State Engine, `trust_state_decisions`, `subject_trust_state`, typed Evidence Graph tables, Trust Memory index, historical Replay and RLS.
- Earlier product surfaces include `trust_alerts`, `trust_timeline_events`, `trust_replay_sessions`, governance actions and several legacy presentation services.

## Duplicates and abandoned paths

- `/api/trust/calculate`, `/api/trust/decision`, `/api/trust/check` and legacy scoring utilities are compatibility or product-era paths; they are not allowed to mutate `subject_trust_state`.
- `lib/runtime/runtime-trust-engine.ts` is a deterministic signal aggregation utility, not the EPIC 18 authoritative state engine.
- `trust_timeline_events` and `trust_replay_sessions` are older presentation records. EPIC 19 timeline and Replay derive from canonical `trust_events`, `trust_state_decisions`, Evidence Graph and Trust Memory instead of creating another chronology.
- `trust_alerts` is reused and hardened. No second alert table is introduced.
- `lib/evidence-graph` is an older derived UI graph. `evidence_graph_nodes` and `evidence_graph_edges` remain the protected EPIC 18 graph projection.

## Genuine EPIC 19 gaps

- The materialized runtime state lacks score, freshness, next-evaluation, risk flags, source-event and reason-summary fields.
- Evidence lacks explicit observed, freshness-policy, revocation and supersession metadata.
- There is no deterministic continuous assessment layer feeding the Trust State Engine.
- Drift findings are not durably represented.
- Existing alerts are user-owned rather than authoritative tenant-scoped runtime alerts.
- Operational runtime APIs, alert transition APIs and a bounded runtime dashboard are incomplete.
- Replay does not yet include drift and alert context.
- Runtime observability and a dedicated EPIC 19 verifier are missing.

## Implementation constraints

All changes are forward-only, provider-neutral, tenant-filtered, bounded and fail closed. Historical evidence is never deleted. Recalculation must pass through `evaluateTrustState` and `apply_trust_state_decision_v1`. Repeated assessments use deterministic identifiers and database uniqueness for idempotency.
