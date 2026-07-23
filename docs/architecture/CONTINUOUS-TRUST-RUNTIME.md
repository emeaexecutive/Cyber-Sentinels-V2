# Continuous Trust Runtime

EPIC 19 adds a deterministic assessment layer in front of the existing Trust State Engine. It does not add a competing state engine.

```text
canonical events + current evidence + provider health + resolved policy + prior state
  -> continuous assessment (score, confidence, freshness, drift, alert decisions)
  -> existing Trust State Engine (transition validation and immutable decision)
  -> apply_trust_state_decision_v1 (atomic compare-and-set)
  -> runtime read model + Trust Memory + Evidence Graph + alerts
```

Identical inputs, evaluation time and policy version produce identical assessment, drift, alert and decision identifiers. Provider outage and disagreement reduce confidence; they never invent negative identity proof. Expired, revoked and superseded evidence remains available for Replay but cannot sustain current trust.

Runtime reads are bounded by tenant and limit. Mutations require authenticated enterprise roles, JSON/CSRF validation and the service-only RPC boundary. The dashboard polls as a connectivity fallback. Durable realtime subscriptions are intentionally optional and may be enabled only where tenant-scoped Supabase channel authorization is configured.
