# Trust State Engine

States are `UNKNOWN`, `OBSERVED`, `INCONCLUSIVE`, `TRUSTED`, `VERIFIED`, `CHALLENGED`, `BLOCKED`, `REVOKED`, and `EXPIRED`.

`src/lib/trust-state/engine.ts` validates Evidence Objects against a Decision Contract, downgrades insufficient or stale recommendations, protects revocation, and emits a hashed decision. `transitions.ts` is the transition allowlist. `apply_trust_state_decision_v1` performs compare-and-set persistence, appends the Trust Event, and updates the read model atomically.

`REVOKED` is terminal. `BLOCKED` recovery is disabled unless an explicit policy permits a limited non-positive recovery path. Expired evidence cannot sustain `VERIFIED`; World ID-only and placeholder evidence cannot create positive state.
