# Trust Memory™ Validation

Release 0.9.3 adds `validateTrustMemoryIntegrity` to the existing Trust Memory implementation.

## Event coverage

The event vocabulary supports trust gained, reduced/decayed, challenged, blocked and restored through posture transitions plus explicit reviewer override, provider conflict, authority revocation, credential rotation, session-integrity failure and lifecycle completion events.

## Integrity checks

| Check | Local result | Boundary |
|---|---|---|
| Chronology is valid | Pass | ISO timestamps are ordered; deployed clock/source integrity still matters |
| References resolve | Pass in controlled fixture | Persisted tenant references require staging validation |
| Tenant isolation | Pass and negative test passes | No RLS claim is made by an in-memory test |
| Reviewed outcomes attributable | Pass | Reviewed events require governance references |
| Reasons present | Pass | Empty reasons fail integrity |
| No silent overwrite | Pass and duplicate-ID test passes | Duplicate event IDs are reported; never repaired silently |

The acceptance test uses a tenant-scoped provider-conflict event and verifies negative duplicate/cross-tenant cases. Trust Memory remains enterprise operational memory, not autonomous learning. Reviewed outcomes generate recommendations/history only; they do not retrain a model or mutate production policy.
