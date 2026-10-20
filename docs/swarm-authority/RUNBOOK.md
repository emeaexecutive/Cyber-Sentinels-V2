# Operator and qualification runbook

## Scope and prerequisites

This is an opt-in local control-plane implementation. No hosted deployment, migration, environment edit, account mutation, credential change or synthetic fixture was performed in this task. Never enable `SWARM_AUTHORITY_REQUIRED` in a hosted environment until the reviewed persistence proposal and authenticated resolver integration are qualified there. The existing native server entry point takes an internal `controls.swarmGuard`; request JSON cannot supply or disable that control. With the server flag enabled and no guard, dispatch is denied.

The deployment integration must supply `SwarmDependencies` from trusted server services: current authenticated identities and permissions (including live sessions), current canonical decisions and authority graphs, independently classified exact actions, live policy/provider availability, heartbeat key lookup, verified destination evidence and clock. No Boolean or graph supplied by an agent is a substitute. The current repository route does not construct this production resolver; completing that adapter and qualifying its bindings is an explicit engineering gate, not something that a deployment approval alone resolves.

## Register and operate

Use `SwarmContainment.register` with an authenticated human `swarm:manage` permission. Record original authority, shared objective, workflow, tenant, member identity, parent and credential generation. Membership does not add a grant. Recruitment beyond the configured membership ceiling fails. A heartbeat is required after registration; caller-supplied timestamps at registration never establish runtime health.

Heartbeats bind tenant/member/credential generation/monotonic sequence/time through HMAC-SHA256 with a server-provisioned per-member key. Accept only the authenticated member, within 30 seconds, once per sequence. Never put heartbeat keys or authentication proofs in evidence. Sensitive admissions require a distinct independently authenticated human approver, a risk owner, evidence references, exact request digest and at most five-minute validity. Canonical REVIEW remains non-executable even after a local approval; the canonical workflow must independently produce ALLOW.

Attach `swarmNativeGuard` to the existing native executor. Admission reserves a 15-second single-dispatch lease and collective budget using CAS. Dispatch rechecks current policy/authority/availability/runtime/approval/containment immediately before the adapter. Budget is tenant/resource/operation scoped across agents, swarms and workflows: agents cannot reset it by changing their correlation ID. Trusted classification supplies component combinations for split-action detection. Cumulative limits include uncertain and revoked reservations conservatively; no automatic refunds.

## Emergency containment

1. Authenticate a human operator with `swarm:contain`; select agent, descendant chain, swarm or workflow and provide a reason.
2. `contain` atomically suspends affected members, advances credential generations and revokes undispatched leases. It records each affected member and in-flight request in a hash-linked receipt.
3. Subsequent controlled dispatches fail. Existing external calls may continue. DISPATCHED transactions become UNKNOWN; the receipt explicitly says external credential rotation is not proven. Perform provider-specific revocation/rotation using its authorised procedure, collect independent evidence and do not claim completion from a requested control.
4. Run `reconcile` after missing heartbeats/expiry. Preserve UNREACHABLE/EXPIRED and UNKNOWN transaction states. Do not retry an incomplete action automatically; first reconcile destination idempotency and results.
5. `outcome` accepts only independently verified, tenant/lease-bound destination evidence supplied through the trusted verifier. Unknown remains unknown. A COMPLETED membership transition requires a verified completed transaction and no outstanding leases.
6. Swarm/workflow/chain quarantine persists across recruitment and future grant use. `restoreScope` requires a different human and resolved in-flight transactions; it does not reactivate suspended members. Restoration requires `swarm:restore` from a different independently authenticated human, the containment receipt, and no unresolved in-flight transactions. It advances credential generation again and requires fresh heartbeat and lease. A historical receipt never becomes an execution credential.

## Persistence, Replay and failure handling

`proposed-persistence.sql` is deliberately outside `supabase/migrations`. It is not part of the reviewed sixteen-migration Production plan. Test it only in a disposable local PostgreSQL environment. The private schema has RLS/FORCE RLS, no browser/agent table grants, no browser/agent RPC grants, append-only events and service-only CAS/load RPCs. Service-role compromise remains a trusted-server threat; the service role can address any tenant, so callers must derive the tenant from authenticated context rather than raw input.

CAS validates tenant, sequence, prior history and hash linkage. Application validation uses the existing canonical hash function. Receipts reuse the existing Ed25519 authority-signature format for export, with a pinned platform public key. Hash chains alone are not a substitute for an externally anchored signature. Native integration projects admission/dispatch references into existing native Replay and material Trust Memory. Those remote projections have not been hosted-qualified. This is a state journal for the new control, not a replacement policy engine or replacement canonical transaction ledger.

Currency budgets additionally reserve safe integer minor units under an immutable tenant/budget ceiling and parallel limit. A known never-dispatched READY lease can refund its currency reservation once when expired/revoked. DISPATCHED/UNKNOWN never refunds from a timeout or generic failure alone. Independently verified actual spend settles the reserved amount, retaining actual spend permanently. The older cumulative operation-unit limit remains conservative and is not automatically refunded. See `SWARM-CONTROL-20261019.md` for the five-agent EUR500 demonstration and console activation boundary.

Persistence outage/contention, unavailable resolver, unavailable policy/provider, missing heartbeat, stale approval or missing guard fails closed. If a post-admission projection fails, the lease remains reserved/unknown and no tool call should be retried blindly. Reconcile from the journal and native idempotency records.

## Verification / abort criteria

Run `npm run test:swarm-authority`, `npm test`, lint, typecheck and an isolated build with synthetic configuration. Current local tests use an in-memory CAS adapter for the adversarial state machine, a real local HTTP destination, and PGlite executing the proposed SQL and privilege checks. They are not hosted Supabase or real provider execution.

Stop hosted rollout on mismatched tenant/project/SHA, absent fresh authentication, untrusted classification, incomplete resolver bindings, failed SQL/RLS tests, missing signature trust anchors, unproven Replay/Memory projections, unknown destination outcomes, or any invocation after denial. Staging must be separately approved for an exact candidate and proposed schema. Production remains NO-GO under its independent recovery/account/migration/hosted qualification gates. Application rollback alone cannot reverse schema, grants, consumed budgets or journal history.

## Recovery and founder workstreams

The earlier reconciliation remains authoritative: the preserved October 12 archive checksum matches, with 284 tables and 11,133 rows verified in the isolated restore. Separate Storage payload hash matches; synchronized DB/Storage recovery, payload rehydration/ACL drill, service/credential restoration, encryption re-attestation and offsite/retention/custody remain separate operational gaps. No backup was repeated and no Production access occurred here.

The approved Aragon/TENENTE founder story was already present in the unrelated About-page edit and passed local rendered-HTML verification. It remains preserved, uncommitted and unpromoted. This work neither changes the frozen Core RC nor claims TENENTE is Production-live.
