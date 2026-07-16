# Trust Memory RC5

## Purpose

Trust Memory™ remains the existing append-only operational memory for contextual trust change. RC5 does not add another history service.

## RC5 contract

Every Trust Memory event can now retain:

- previous and new posture;
- contextual purpose, action and environment;
- evidence references with source attribution;
- Replay, governance, provider, policy-version and authority-lineage references;
- reviewed outcome attribution;
- confidence before, after and delta;
- reassessment state, time and trigger;
- policy history effective at the event time.

The protected `/admin/trust-memory` surface exposes a **Why Trust Changed** panel containing previous posture, new posture, responsible evidence, authority impact, policy applied, reviewer, confidence change, reassessment and Replay link.

## Integrity

`validateTrustMemoryIntegrity()` checks chronology, tenant isolation, reference continuity, reviewed-outcome attribution, reason presence, append-only IDs, evidence-source attribution, policy history and reassessment traceability. It reports failures without rewriting memory.

## Boundary

Trust Memory explains retained history. It does not autonomously learn policy, certify truth, infer an absent reviewer or invent a reassessment schedule.
