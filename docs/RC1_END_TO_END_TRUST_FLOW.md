# RC1 End-to-End Trust Flow

`Establish Trust` posts `action=establish_trust` and `provider_id=hopae_connect` to the existing authenticated `/api/trust/execute` route. The server resolves the workspace, trust case and a policy whose explicit allowed actions/purposes match. Evidence minimum, expiry and revocation are policy fields; client input cannot declare or widen authority.

The signed callback uses the existing `/api/providers` surface. Middleware permits only its POST callback path to reach route-level HMAC authentication; provider-registry GET remains session protected.

Identity → Authority → Provider Evidence → Evidence Quality → Trust Decision → Enforcement → Replay → Evidence Graph → Trust Memory™ → Governance → Evidence Pack.

The callback re-fetches provider status instead of trusting callback claims and re-reads the tenant policy before authorization. It retains an event digest, normalized evidence and references only. One security-definer database function commits idempotency, Replay, evidence chain/graph relationship, append-only Trust Memory event, receipt, audit and provider state atomically.

| Condition | Outcome |
| --- | --- |
| Valid evidence, current scoped authority and matching policy | `allow` |
| Freshness/provider limitation | `step_up` or `insufficient_evidence` |
| Missing evidence | `insufficient_evidence` |
| Conflicting or duplicate evidence | `review` or fail-closed enforcement |
| Expired, revoked or excessive authority | `block` |
| Forged/stale/cross-tenant callback | Rejected before evidence use |
| Proof commit failure | Atomic rollback; execution remains blocked |

No downstream engine consumes Hopae raw payload shape. No raw document, biometric template, credential, secret or challenge token is persisted.
