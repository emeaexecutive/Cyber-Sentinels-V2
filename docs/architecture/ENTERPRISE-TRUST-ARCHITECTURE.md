# Enterprise Trust Architecture™

Enterprise Trust Architecture is the permanent boundary between observations and authoritative trust state.

```text
Providers / consent / runtime
            ↓
Canonical Trust Events + Evidence Objects
            ↓
Provider Consensus → ConsensusRecommendation
            ↓
Decision Contract + resolved policy
            ↓
Trust State Engine → append-only TrustStateDecision
            ↓
subject_trust_state (materialized read model)
            ↓
Evidence Graph + Trust Memory + Replay + KPIs
```

The architecture is tenant-scoped by `enterprise_id`. All integrity-bearing objects use JCS and SHA-256. Unknown domains and invalid transitions fail closed. Recommendation engines cannot mutate state. Historical objects are immutable and policies are versioned rather than rewritten.

Implementation owners are `src/lib/trust-core`, `src/lib/trust-architecture`, `src/lib/trust-state`, `src/lib/trust-policy`, the EPIC 17 trust/consent/consensus modules, and migration `202607210001_enterprise_trust_architecture.sql`.
