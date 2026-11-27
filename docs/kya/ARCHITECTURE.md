# KYA architecture — Execution05 discovery

Status: existing primitives identified; new continuous KYA product NOT IMPLEMENTED in this work package. Source baseline c6f84ebefd901725440f602288016c741d004b2c. No separate identity database is proposed.

| Concern | Existing implementation | Remaining qualification |
|---|---|---|
| Signed identity / accountable owner / model/runtime/tools | lib/operational-entities/native-verification.ts: Ed25519 manifest, credential states, owner binding and continuity/change types | Registry UX and API parity; rotation/reverification journeys |
| Workload authentication | lib/public-api/v1/workload-token.ts and workload-identity.ts: issuer/audience/subject/tenant/binding checks | Approved hosted issuer/JWKS, lifecycle and tenant-isolation tests |
| Delegation | lib/operational-entities/delegated-authority.ts: signed subset, acceptance, lineage, action evaluation | Continuous verified current-state orchestration and full integration contract |
| Authority Graph | lib/core/authority-graph.ts: chain linkage, scope attenuation, depth, expiry/revocation, resource/action constraints | Treat graph as trusted server-loaded authority; signature validity alone grants nothing |
| Controlled execution | native-enforcement.ts and swarm/native-guard.ts: admission, current dispatch check, durable claim | Current hosted database and destination fence qualification |
| Shared exposure / revocation / evidence | swarm/containment.ts and store.ts: CAS, shared budgets, quarantine, hash-linked events | Financial rolling windows, external anchored export completeness and recovery |

Continuous KYA must load current tenant-bound identity, accountable owner, signed delegation and policy from the existing authority stores. Evaluate exact agent/action/resource/beneficiary/environment/expiration, current revocation and independent approval at controlled dispatch. Return ALLOW, REVIEW or DENY with references into existing Evidence Vault/Replay. ALLOW is bounded to the exact controlled action; an agent recommendation or valid signature cannot substitute for authorization.

Do not expose an unimplemented OpenAPI endpoint or SDK method as working. API contract/examples, interoperability adapters, threat model and new automated qualification remain outstanding. Existing workload trust:request scope must not silently become financial dispatch authority.

