# Adversarial acceptance evidence

Test source: `tests/swarm-authority.test.mjs`; SQL privilege source: `tests/rls/swarm-authority.test.mjs`. All cases are deterministic local tests. The state-machine fixture uses authenticated synthetic identities and an optimistic-CAS repository. Policy/identity/destination verification services are injected test implementations. The native executor is real; most destination effects are counted test adapters, with an additional real localhost HTTP destination test. PGlite executes the proposed PostgreSQL SQL, grants and RLS. These results do not establish hosted Supabase or commercial-provider execution.

Common initial authority: tenant-scoped enterprise grant for REFUND to an authenticated agent, active membership, fresh authenticated heartbeat, workflow:1, policy v1, canonical ALLOW, resource customer:1. Variations below are applied before dispatch. Each test asserts the actual effect count, not just the decision string. Hash-linked events remain private to the tenant. Cryptographic export uses existing Ed25519 authority receipt signing with pinned trust anchors.

| Mandatory test | Initial authority/policy variation and attempted action | Actual decision and execution | Evidence / receipt | Result |
|---|---|---|---|---|
| 01 Distributed prohibited action | Five members; canonical per-part ALLOW; trusted classifier identifies a mandatory prohibited operation | DENY for all five; zero effects | Five EXECUTION_DENIED receipts, mandatory-restriction reason and policy references | PASS |
| 02 Agent persuasion | Child attempts REFUND while grant only permits READ | DENY; zero effects | AUTHORITY_INVALID denial receipt | PASS |
| 03 Circular delegation | Grant names itself as parent | DENY; zero effects | Graph cycle fails; denial receipt retains request digest | PASS |
| 04 Swarm consensus | Agent consensus says ALLOW while canonical policy is DENY | DENY; zero effects | CANONICAL_DENY receipt; consensus is ignored | PASS |
| 05 Disappearance | One authorised call dispatched; heartbeat becomes stale with unfinished transaction | First ALLOW; subsequent DENY; exactly one initial effect | UNREACHABLE member, UNKNOWN lease, reconciliation/denial receipts; no automatic completion | PASS |
| 06 Revoked credentials | Operator suspends member and increments credential generation; old credential reused | DENY; zero effects | Containment receipt plus CREDENTIAL_REVOKED denial receipt | PASS |
| 07 REVIEW bypass | Independently loaded canonical decision remains REVIEW | DENY at execution boundary; zero effects; approval cannot upgrade REVIEW | CANONICAL_REVIEW denial receipt | PASS |
| 08 Cross-tenant swarm | Authenticated foreign-tenant human requests protected tenant evidence | Authentication denied; no disclosure, no effect | Assertion evidence; intentionally no target-tenant receipt returned to foreign caller | PASS |
| 09 Privileged peer recruitment | Agent tries membership mutation, then attempts action after a privileged peer is legitimately registered | Agent recruitment rejected; out-of-scope action DENY; zero effects | Existing membership history and AUTHORITY_INVALID denial; no privilege transfer | PASS |
| 10 Emergency suspension race | Valid call dispatch starts; operator suspends swarm during adapter execution | Initial effect already in flight; subsequent DENY | Containment lists in-flight lease, UNKNOWN outcome and external-rotation not proven; one total effect | PASS |
| 11 Missing telemetry/policy | Stale heartbeat, or policy service marked unavailable | DENY for both; zero effects | RUNTIME_UNVERIFIED / VERIFICATION_UNAVAILABLE receipts | PASS |
| 12 Human self-approval | Privileged human submits and attempts to approve their own sensitive action | Approval rejected; action DENY; zero effects | Independent-approval-required denial receipt; no approval created | PASS |

Additional tests cover legitimate multi-agent ALLOW, concurrent aggregate budget consumption, containment before dispatch, HMAC/sequence replay, credential transfer and peer retry, independent restoration with destination reconciliation, expiry at dispatch, agent-controlled human identities, unavailable persistence, circular human approval, agent-originated roots and persistent quarantine against newly recruited peers.

An additional observed-combination test uses five individually permitted components: the first four safe components execute and the fifth would complete a forbidden combination. That fifth component is denied with DISTRIBUTED_PROHIBITED_ACTION. This prevents completion within the controlled boundary; it does not retroactively undo earlier effects, nor discover unobserved semantic activity outside the trusted classifier's coverage.

The real localhost HTTP test sees zero requests for DENY/REVIEW, one request for valid ALLOW, and no further request after suspension. It tests transport dispatch rather than a simulated provider response; it is not an external production provider qualification.

Replay verification rejects reordered and modified events. Existing Ed25519 signing verifies a tenant-bound receipt against a pinned key. Proposed SQL tests prove anon/authenticated cannot call state RPCs or read/update/delete protected state/events, service-role direct table access is denied, cross-tenant loads do not return another tenant's document, stale CAS fails, and event rewrite is blocked. The service-role RPC itself is trusted-server scoped, not a user authorization API.
