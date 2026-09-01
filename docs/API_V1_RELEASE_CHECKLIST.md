# API V1 release checklist

Record evidence for every gate against the exact release candidate. Any failed mandatory gate is **NO-GO**.

- [ ] Exact Git SHA recorded.
- [ ] Node 22 and npm 10 confirmed.
- [ ] CI green: lint, typecheck, tests and build.
- [ ] Preview is bound to Staging, never Production.
- [ ] `GET /api/health` returns healthy release metadata.
- [ ] `GET /api/ready` returns `200 READY` for the authoritative data plane.
- [ ] Migration ledger is ordered, complete and reviewed.
- [ ] Public API key is provisioned, hashed at rest, shown once and safely stored.
- [ ] API-key rotation proves atomic success, rollback on replacement/revocation/audit failure, concurrent single-winner behavior, revoked/expired/foreign/unauthorized rejection, and same-operation uncertain-response recovery.
- [ ] Required least-privilege scopes are proven; missing/wrong, expired and revoked keys fail.
- [ ] Agent registration is proven.
- [ ] Credential, Manifest, challenge and proof lifecycle is proven.
- [ ] Owner/admin authority grant, current projection, immutable history/version, expiry, and monotonic revocation are proven.
- [ ] In-authority action returns canonical `ALLOW`.
- [ ] Outside-authority action returns canonical `DENY`.
- [ ] `REVIEW` reference, tenant/client-isolated read, authorized immutable resolution, agent self-approval denial, and required fresh evaluation are contract-tested.
- [ ] Agent-asserted evidence persists immutably with its canonical digest.
- [ ] Receipt retrieval is proven for ALLOW and DENY.
- [ ] Replay retrieval is proven for ALLOW and DENY.
- [ ] A later action after authority revocation uses a new idempotency key and does not return `ALLOW`.
- [ ] Tenant and API-client isolation matrix passes for agents, authority, evidence subjects, transactions, receipts, Replay and outcomes.
- [ ] Guessed/foreign identifiers do not authorize access.
- [ ] Subject spoof is blocked.
- [ ] Digest spoof is blocked.
- [ ] Provider namespace spoof is blocked.
- [ ] Canonical evidence mutation is blocked.
- [ ] Sequential and concurrent idempotency equivalence/conflict tests pass.
- [ ] Atomic rate limits are tenant/client isolated and 429 includes safe retry metadata.
- [ ] OpenAPI operations exactly match runtime routes, scopes, examples, errors and version metadata.
- [ ] Repository-local unpublished SDK matches OpenAPI and passes SDK typecheck/tests.
- [ ] curl, TypeScript and PowerShell quickstarts execute against the approved non-Production host.
- [ ] Logs contain no bearer/API/service-role/access/refresh tokens, passwords, private keys, raw sensitive evidence, or chain-of-thought.
- [ ] Content type, cache control, body limits, JSON parse failure, OPTIONS/CORS posture and method rejection are verified.
- [ ] Non-Production performance baseline records p50/p95/p99 and harness settings; no Production load test was run.
- [ ] Production recoverability and rollback are established.
- [ ] Production migration is explicitly approved by an authorized human.
- [ ] Exact Production SHA is verified immediately before release.
- [ ] Post-deploy smoke proof is recorded without exposing secrets.

Final decision: `GO` only when every mandatory item above is checked; otherwise `NO-GO` with the exact failed gate.
