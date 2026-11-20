# Execution 18 restricted Preview gateway

## Local implementation

`lib/qualification/restricted-preview-gateway.ts` implements a fixed
operation-level boundary. It does not accept relation names, arbitrary RPC
names, SQL, filters or caller-selected provider origins.

The allowlist is limited to:

- `qualification.schema.read`
- `qualification.agent.register`
- `qualification.authority.read`
- `qualification.decision.create`
- `qualification.review.read`
- `qualification.replay.read`

Every request must match an explicitly configured synthetic tenant, synthetic
subject, qualification run and destination. Capabilities are HMAC-authenticated,
operation-specific and expiring. Requests are size-bounded and all ALLOW or DENY
decisions produce an audit record with a request digest.

The gateway rejects destructive action prefixes, Production targets, unapproved
fields, stale capabilities, cross-tenant changes, run substitution and
unallowlisted destinations. `RestrictedPreviewTestAdapter` is intentionally
in-memory and performs no database or provider operation.

`lib/qualification/restricted-preview-client.ts` is the acceptance application's
transport adapter. It allows only the fixed HTTPS endpoint, disables redirects,
limits response size and fails closed if a direct Supabase service-role or
management token is still present in the acceptance process.

## Tests

`tests/restricted-preview-gateway.test.mjs` covers:

- exact allowlisted execution and audit evidence;
- synthetic tenant and run isolation;
- stale capability denial;
- destination and arbitrary-operation denial;
- payload-field allowlisting and Production/destructive denial;
- exact subject, run and operation capability binding;
- acceptance fallback-credential refusal.

## Not implemented or authorized

This change does not create or modify a hosted role, schema, project,
deployment, credential or environment binding. No arbitrary database adapter is
provided. A concrete server adapter must expose only reviewed wrapper functions
for the six operations after the following gates are approved and evidenced:

1. A restricted database login has no service-role, Auth-admin, superuser,
   bypass-RLS, schema-ownership or unrelated `PUBLIC` privileges.
2. Synthetic tenant, subject and run rows are immutable for the qualification
   run and unreachable by foreign identifiers.
3. Wrapper transitive privileges, search paths and nested function/RPC closure
   have been reviewed.
4. The acceptance application has no Supabase or provider credential fallback.
5. The exact capability lifetime, gateway URL, destination and source SHA are
   bound in the approved hosted change set.
6. Existing immutable deployments, Production bindings and the quarantined
   historical acceptance backend remain unchanged.

Until those gates pass, hosted developer API execution is BLOCKED even though
the local gateway policy is implemented and tested.
