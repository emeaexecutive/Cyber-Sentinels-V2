# Continuous Trust State Machine

EPIC 24 reuses the authoritative states already deployed:

```text
UNKNOWN -> OBSERVED -> INCONCLUSIVE -> TRUSTED -> VERIFIED
                         |              |          |
                         +----------> CHALLENGED <-+
                                        |
                                     BLOCKED
                                        |
                                     REVOKED

Any evidence-bearing state may become EXPIRED.
Policy-authorized recovery can return CHALLENGED/BLOCKED to an evidence-backed state.
REVOKED is terminal without an explicit authoritative recovery policy.
```

The suggested EPIC 24 terms map to existing states instead of creating duplicates:

| Signal policy action | Authoritative state proposal |
| --- | --- |
| `WATCH`, `STEP_UP_VERIFICATION`, `REQUIRE_MANUAL_REVIEW` | `CHALLENGED` |
| `RESTRICT`, `SUSPEND` | `BLOCKED` |
| `REVOKE` | `REVOKED` |
| record, alert, or recalculate | Current state until assessment evidence supports a change |

Every proposal requires previous/new state, reason codes, triggering signals, policy identifier, actor, confidence, timestamp, and an override flag. `validateStateTransition` rejects missing context, out-of-range confidence, and transitions disallowed by the canonical transition table.

Automated transitions are produced by the continuous assessment engine and applied through `apply_trust_state_decision_v1`. Manual overrides use `apply_continuous_trust_override_v1`, which wraps that same function in the transaction that records actor, reason, expiration, signal references, audit, and Replay. An override cannot silently edit a score or bypass evidence requirements for trusted/verified states.

Recovery is evidence-driven: fresh independent evidence creates a new assessment and state decision. Historical decisions are append-only.
