# Approval dispatch security boundary

A request-key reservation is not a single-use approval. Different keys previously reserved the same approved action and could each dispatch.

The application now requires `claim_native_enforcement_dispatch_v2` after current-state revalidation and immediately before calling its adapter. Missing RPC/configuration fails closed. Approval issuance uses `issue_native_enforcement_approval_v2` so the database captures tenant, executor, agent, canonical action/destination, parameter digest, authority/delegation and policy versions. Legacy approvals without the snapshot cannot dispatch.

The separate migration PR supplies these RPCs and immutable tables. It must be reviewed and separately authorised for Staging application; this application PR does not apply any migration. Deploying the application without them intentionally disables dispatch and approval issuance. This is not a website release change.

The database claim is unique by tenant+canonical transaction, request and approval. It is never released, leased or automatically reissued. A successful claim permits one adapter invocation only. Exceptions after dispatch return UNKNOWN, not success or an automatically retryable failure. A retry returns existing evidence or is denied by the consumed claim. A crash before dispatch can leave zero effects and UNKNOWN. A crash after the provider effect can leave one effect and UNKNOWN. Independent destination evidence must reconcile either case; gateway ALLOW or a committed claim does not prove provider execution. Generic exactly-once remote execution is not claimed.

The executor is currently the approving owner/admin and the delegated agent remains bound separately. Approving another user's future execution is not enabled by this change.

Local regression proofs: revocation/runtime/expiry races, exact-action idempotency conflicts, fail-closed missing claim and UNKNOWN outcome handling. The migration PR additionally runs actual SQL concurrency against local PostgreSQL17 and a real loopback HTTP destination. Hosted tenant isolation, Auth, migrations and provider behavior remain separate gates.
