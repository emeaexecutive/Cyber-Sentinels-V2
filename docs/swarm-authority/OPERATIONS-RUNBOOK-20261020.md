# Swarm operations and qualification runbook

Local implementation only. This document is not approval to apply hosted changes.

## Prerequisites and order

1. Pin the reviewed feature commit and verify the environment project binding. Staging must be `agpyhygpfmppjkxwcpac`; Production `kecgtsfibkypjuaxqbjx` is out of scope without separate founder approval. Verify existing canonical Replay/Trust Memory objects and migration ledger by contents, not names alone.
2. Capture an approved recovery point and ledger/schema evidence. The preserved 12 October backup is historical evidence, not automatically a current recovery point. Establish separate Storage recovery/consistency and secret/infrastructure restoration arrangements.
3. In a disposable environment first, apply `20261020091324_tenente_swarm_authority_control.sql`, then `20261020100706_tenente_swarm_projection_recovery.sql`. Both are forward-only. The second adds a projection cursor and depends on the first's state/event tables. Do not run an unreviewed global migration push.
4. Deploy the exact approved candidate only in an approved Staging window. Keep the swarm flag disabled until existing public API environment binding, canonical authority, provider health, receipt signing and database grants are verified. No remote flags were set by this implementation.
5. Configure public operator trust anchors in server-only `SWARM_CONTAINMENT_PUBLIC_KEYS_JSON`: each entry needs keyId, publicKeyPem (Ed25519), issuerId matching the authenticated independent operator, tenantId, allowed swarmIds, finite expiresAt in epoch milliseconds and revoked boolean. Never provision a private signing key through the web console. Key rotation/revocation changes require operational control.
6. Provision a bounded collective/task policy and members through the authenticated console. Existing collective policies are immutable. Membership does not create underlying Authority Graph grants. Bind agent API clients through the existing tenant-scoped agent binding mechanism; enroll fresh runtime public keys independently.
7. Sign heartbeat claims using the SDK's `signSwarmHeartbeat`. Audience must be the environment's exact `/api/v1` origin, domain `cyber-sentinels:swarm-heartbeat:v1`, tenant/member/current credential generation, increasing sequence, and fresh epoch-millisecond time. Submit with the bound API client. A heartbeat proves signed declaration, not independent process attestation.
8. Exercise ALLOW/REVIEW/DENY, five-agent shared budget, retries, revoke-parent, tenant attacks, signed kill commands, independent recovery, and projection restart against an authorized controlled provider. Confirm actual downstream counts and persistent Replay/Memory rows at the deployed SHA.

## Abort and forward repair

Abort before enabling if binding, prerequisites, grants, signing keys, current authority, migration equivalence or evidence persistence cannot be verified. Disable new controlled dispatch through the approved containment path if qualification fails. Do not refund UNKNOWN/DISPATCHED reservations or restore members to clear a test failure. Reconcile independently verifiable outcomes first.

Application rollback does not reverse database grants, tables, RPCs, journal records or quarantine. Preserve append-only evidence and current containment. Repair projection idempotently from the journal using its cursor; cursor advancement follows successful contiguous projections. Recovery is traffic-triggered; a separate scheduler is not supplied. Database repair requires a reviewed forward migration, not rewriting applied history. Restoring a database is a separate destructive procedure with its own approval and external-effect reconciliation.

Scope restoration and member restoration require a different authorized human from the containment issuer. Unresolved external outcomes block recovery. Restored members need fresh credential generation, fresh runtime key, signed heartbeat and a new admission/dispatch check. REVOKED members are not silently reactivated.

## Remaining runtime integration

`deliverContainment` accepts operator-integrated adapter dependencies, never arbitrary caller URLs. A real cooperating runtime adapter and its authentication, delivery timeout, signed acknowledgement and provider cancellation semantics must be qualified before remote cancellation can be claimed. REQUESTED/PARTIAL/DELIVERY_UNKNOWN/UNSUPPORTED are not evidence that a remote process has stopped. Unintegrated agents can only be denied at controlled boundaries.
