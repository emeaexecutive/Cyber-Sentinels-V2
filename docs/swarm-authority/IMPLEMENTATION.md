# Swarm Authority implementation contract

Historical ten-section implementation baseline: d2b06d29a231fddf4e68432f4e9ece2293ba595c, feature branch feat/authority-of-record-tenente. The earlier ten-section missing-specification blocker was resolved. The subsequent sixteen-section directive is a separate, still unavailable attachment. Current branch, monetary budgets, HTTP/MCP concurrency, console and qualification status are recorded in [SWARM-CONTROL-20261019.md](SWARM-CONTROL-20261019.md).

| Capability before this change | State | Existing implementation / gap |
|---|---|---|
| Agent identity, delegated authority, bounded graph | IMPLEMENTED | lib/operational-entities; lib/core/authority-graph.ts; no collective registry |
| Canonical ALLOW / REVIEW / DENY and native dispatch | IMPLEMENTED | canonical trust transaction, native-enforcement.ts; reuse rather than replace |
| Swarm membership and relationships | MISSING | Generic registry only; membership must never grant authority |
| Cross-agent budgets / denial correlation | MISSING | Per-action risk exists; no atomic collective accounting |
| Runtime heartbeats / leases | PARTIAL | Runtime signals exist; no swarm dispatch lease |
| Scoped containment / independent recovery | PARTIAL | Individual authority revocation exists; no collective lifecycle |
| Receipts, Replay, Trust Memory | IMPLEMENTED | Canonical hashes, authority signatures and native Replay; extend structured links |
| Twelve specified adversarial scenarios | MISSING | Existing TENENTE regressions are different acceptance cases |
| Recovery / founder story | IMPLEMENTED locally, release PARTIAL | Previous reconciliation and rendered About evidence remain valid |

## Architecture and threat model

A tenant-scoped control service supplies additional restrictions to the existing native execution boundary. It never upgrades a canonical REVIEW or DENY. Authority comes from the existing graph and independently loaded canonical decision. Membership, consensus and recruitment cannot issue grants. A trusted classifier binds correlation/resource/operation and cost to the exact action; agent-supplied labels cannot reset budgets. Unknown classification fails closed.

The persistence contract serializes tenant mutations and appends structured, hash-linked evidence atomically. Leases are short lived, single-dispatch and bound to action digest, credential version, membership and policy. Collective resource budgets include outstanding/unknown execution; no automatic refund or retry after disappearance. Admission is checked again immediately before adapter dispatch. Containment invalidates subsequent admission; external work already dispatched may be uninterruptible and must be reconciled with destination evidence.

Trust boundaries: authentication, canonical decision resolution, action classification, current authority graph and policy availability are trusted server dependencies, never client booleans. Operators require authenticated human identities and explicit permissions. Restoration requires a different authorised human, fresh credentials, heartbeat and a fresh lease. Mandatory restrictions remain immutable to agent consensus and human risk acceptance.

Threats covered: forged/cross-tenant credentials; ID/type laundering; cyclic grants; scope escalation; aggregate-limit races; repeated denied equivalents; membership expansion; credential/data transfer; stale heartbeats; replayed heartbeat sequence; missing policy; approval self/circular control; containment during dispatch; evidence mutation/reordering; unavailable persistence. Detection is limited to controlled calls and trusted classifications; arbitrary semantic task splitting outside observable scope is not claimed.

Database/RLS changes will be proposed and tested locally only. No route is enabled, migration applied or environment changed in hosted services by this work.

## Implemented local scope and remaining acceptance gates

| Contract section | Implemented files / demonstrated behavior | Remaining scope |
|---|---|---|
| 1 Registry/relationships | `lib/swarm/containment.ts`: AGENT_SWARM, tenant membership/parent history, original authority, objective/workflow; `lib/core/entity-identity.ts`: additive agent_swarm type | Hosted registry ingress and trusted authentication binding not qualified |
| 2 Collective risk | Trusted classification, forbidden component combinations, tenant-wide resource/operation limits, peer denial correlation, recruitment ceiling, transfer prohibition | No universal semantic detector; approved resource/cost/component mappings and live telemetry adapters required |
| 3 Authority containment | Existing Authority Graph and native executor reused; no agent root, no canonical DENY/REVIEW override; current dispatch recheck | Hosted canonical resolver integration must be implemented/qualified before activation |
| 4 Runtime disappearance | HMAC/sequence heartbeats, generation-bound 15-second leases, provider/policy availability checks, UNREACHABLE/EXPIRED/UNKNOWN reconciliation, verified completion | Production credential/session authentication and independent outcome verifier require deployment-specific integration |
| 5 Emergency containment | Agent/swarm/chain/workflow scopes, persistent quarantine including new peers, lease revocation, distinct human restoration | External provider revocation/rotation and cancellation adapters not implemented; already-running external effects not assumed stopped |
| 6 Human authority | Independently authenticated human permission checks; self/circular/agent-controlled approval denied; scoped expiring approval and risk owner | Live human identity/session integration, organisation policy and risk-owner assignment remain necessary |
| 7 Evidence/Memory | Canonical hash-linked append-only journal, receipt signing reuse, tenant Replay validation; native admission/dispatch projection references in Replay/Memory | Hosted projection/schema compatibility and exported receipt anchoring remain unqualified |
| 8 Adversarial tests | All twelve named cases plus positive, concurrency, quarantine, cryptographic, SQL and HTTP tests | Hosted replay of the same scenarios requires separate approval and qualified integration |
| 9 Engineering constraints | Additive native guard, server-only opt-in flag, default denial when required guard unavailable; no shared mutations | No release/production capability claim |
| 10 Release verification | Local verification and preserved recovery/founder workstreams; reports separate local/hosted evidence | Staging and Production NO-GO remain until independent gates close |

### Deployment integration boundary

`requestNativeEnforcement` accepts only an internal guard dependency; raw request JSON cannot supply it. No current HTTP handler constructs the complete trusted Swarm resolver. This is a real remaining implementation/integration item, not a claim that turning on a feature flag completes rollout. Server deployment policies, authentication, independent heartbeat keys and destination-verifier bindings must be supplied and tested without using caller assertions. The local enforcement module and persistence adapter are concrete and executable; hosted readiness is not established.

### Sources

Persistence review follows the [Supabase RLS/grants guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). Local SQL tests are the evidence for this proposal; no remote advisor or hosted database check was run.
