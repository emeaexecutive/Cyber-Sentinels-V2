# Twelve-scenario engineering audit — 29 October 2026

## Result

**Two gaps reproduced and patched locally. The full hosted benchmark is not qualified.**

Audited baseline: `43af4fcf96481039fcb920ce7871b3bf39842e2b`, `swarm/qualification-hardening` (PR #123, stacked on PR #118). This is a feature-branch audit, not proof of what is currently deployed on main, Staging or Production. The previously reported local investor commit `a1f840a` was not the source checked out for this audit.

Scope: native identity/delegation/execution, exact human approval, signed evidence, Replay and swarm containment. Tests use synthetic fixtures, loopback HTTP/MCP and embedded PostgreSQL (PGlite). No shared Staging/Production mutations, external-provider execution, deployment or migration application occurred.

## Reproduced findings and fixes

### F1: high-consequence approval could be reused with a fresh idempotency key

The approval is bound to tenant, transaction, entity and action digest. The request table previously enforced uniqueness by idempotency key and request digest, but neither prevented multiple authorized reservations for the same transaction with different keys. The SQL reservation function checks an existing approval without consuming it. A regression using the actual original request-table DDL accepted a second HIGH reservation.

Fix: forward migration `20261028230354_single_use_high_consequence_approval.sql` adds a partial unique index on `(enterprise_id, transaction_id)` for `REQUESTED` HIGH/CRITICAL rows. Database uniqueness arbitrates competing inserts, including callers using different idempotency keys. It does not grant any new table access, alter RLS, delete rows or rewrite history.

Verification: the previously failing PGlite regression now rejects subsequent HIGH and CRITICAL reservations with PostgreSQL `23505`; a REVIEW_REQUIRED row does not consume the slot. This verifies the database invariant, not concurrent multi-process hosted RPC execution. The existing RPC fails closed on a uniqueness error; this patch does not add a dedicated user-facing conflict code.

Migration risk: historic duplicate HIGH/CRITICAL REQUESTED rows will make the index build fail. Classify those records before rollout; do not automatically delete evidence. Approved slots are conservatively consumed at reservation, even if a later dispatch check blocks execution. Recovery requires a fresh canonical transaction and approval, not reuse of the old approval. Low-consequence execution semantics are unchanged.

### F2: revocation or approval expiry during reservation could escape the generic execution check

`executeAuthorizedAction` checked current state before awaiting reservation. With no required swarm guard, authority revoked while reservation awaited still reached the adapter. An approval expiring during that await also reached the adapter. A simulated failure of a second state lookup was never observed because no second lookup happened.

Fix: reload current enforcement state and re-evaluate eligibility using current time immediately before adapter execution, after reservation and any asynchronous swarm dispatch guard. A failed lookup throws before the tool. Revocation, runtime/owner changes and approval expiry reject dispatch.

Verification: negative tests observe zero adapter effects for revocation, expiry and state-service failure; a valid request still executes once. An additional regression covers approval expiry inside the asynchronous swarm guard.

Boundary: this closes the demonstrated application-level window, not a universal distributed-transaction race. The generic state resolver does not atomically lock remote tool execution, re-evaluate every policy/scope field, or cancel already committed work. Destination-side current-authority enforcement and durable consumption remain required for the strongest test-09 guarantee. No blanket race-free claim is justified.

## Scenario audit

“Local evidence” below refers to the listed implementation/tests, not a full document-publication scenario against a hosted provider. “Partial” means the exact end-to-end benchmark remains unproven even where component tests pass.

| # | Scenario | Local evidence / finding | Remaining qualification |
|---|---|---|---|
| 01 | Identity binding | Local Ed25519 tests reject invalid/wrong keys, tenant/entity/audience substitution and replayed challenges | Hosted identity API plus zero tool-side effects under impersonation |
| 02 | Valid scoped action | Exact authority tests and signed HTTP/MCP loopback dispatch pass; valid action executes once in new regression | Customer document connector, hosted policy/evidence linkage and latency measurement |
| 03 | Delegation narrowing | Negative scope tests and 300-seed delegation-property tests pass | Hosted persisted multi-hop scopes; audience/purpose expansion remains a documented product gap |
| 04 | Cross-tenant access | Native identity/API boundary tests, swarm tenant separation and local embedded SQL/RLS tests pass | Hosted data, evidence and real destination isolation under two independent tenants |
| 05 | Governed review | DENY/REVIEW execute no adapter; new REVIEW test does not reserve | Full hosted review lifecycle with independent tool-side ledger |
| 06 | Exact approval | Local digest binding rejects changed transaction/action parameters; native approval checks are transaction/entity/time-bound | Hosted reviewer authentication and exact publication-to-review binding |
| 07 | Approval reuse | **F1 fixed locally:** different idempotency keys cannot reserve HIGH/CRITICAL transaction twice after new index | Migration preflight/application; full reserve RPC under concurrent distinct processes and altered-action retries |
| 08 | Revocation | Local descendant revocation and loopback tests block subsequent calls after parent revocation | Hosted durable state, stale caches and multi-worker concurrency |
| 09 | Decision/execution race | **F2 fixed locally:** final state/time check prevents demonstrated stale dispatch | Partial: remote commit boundary, full policy/scope changes and destination-side revalidation |
| 10 | Bypass/failure | Required-guard absence, DENY/REVIEW, state outage and restricted destination tests fail closed locally | Direct real-provider bypass, evidence-service outage and crash/restart proof |
| 11 | Receipt integrity | Ed25519 tests use verifier-supplied trusted keys and reject tampered receipt/tenant/key/algorithm | Full exported package binds chain, original policy, approval, actual outcome and key-rotation trust roots independently |
| 12 | Replay/containment | Native Replay tests and signed containment/cancellation tests pass, including local transport abort and honest unconfirmed outcomes | Full original-policy reconstruction without side effects; hosted containment/recovery with unrelated agent continuity |

Primary tests: `tests/native-operational-entity-verification*.test.mjs`, `tests/authority-of-record-*.test.mjs`, `tests/native-delegated-authority*.test.mjs`, `tests/native-enforcement-outcome-proof*.test.mjs`, `tests/swarm-*.test.mjs`, `tests/rls/swarm-authority.test.mjs`, `tests/receipt-verification.test.mjs`, `tests/replay-*.test.mjs`, `tests/public-api-v1-security.test.mjs` and the two new twelve-scenario regression files. Some existing integration tests assert source/SQL contracts; they do not all execute the database or deployed routes.

## Verification evidence

Detailed test logs, environment paths and raw execution metadata are retained locally and are not included in this public branch. The following is a validation summary, not published execution evidence:

| Check | Result |
|---|---|
| Initial new regression set against baseline | 1 pass / 5 fail |
| Final new regression set | 7 pass / 0 fail |
| Authority, native enforcement/delegation and evidence | 142 pass / 0 fail |
| Local swarm and embedded SQL | 73 pass / 0 fail |
| HTTP/MCP boundary, transport cancellation and budgets | 23 pass / 0 fail; loopback only |
| Mocked server composition and routes | 11 pass / 0 fail |
| Identity, Replay API contracts and public API security | 73 pass / 0 fail |
| Replay engine/service | 6 pass / 0 fail |
| TypeScript | Passed |
| Repository lint | Zero errors; ten existing warnings outside edited code |

Total: **335 focused checks passed**, excluding the initial failing regressions and duplicate diagnostic runs. To reproduce the new regressions, run `npm run test:authority-audit-regressions`. They are also registered in `test:authority-of-record`. The existing test scripts cover the other listed suites. Initial test-runner incompatibilities were resolved by using the appropriate TypeScript loaders; no product changes were made for those runner differences.

Node in this workspace is 24.22.1; package engines specify Node 22.x/npm 10.x. Requalification on the supported runtime is required. No full build, complete repository suite, hosted benchmark or external-provider run is claimed.

## Rollout and next gates

1. Review this patch on top of the TENENTE qualification branch, retaining its stacked PR dependencies.
2. Before migration, run this read-only duplicate preflight in the intended non-production database:

```sql
select enterprise_id, transaction_id, count(*)
from public.native_enforcement_requests
where request_state = 'REQUESTED' and consequence in ('HIGH', 'CRITICAL')
group by enterprise_id, transaction_id
having count(*) > 1;
```

3. Resolve any duplicates with an explicit evidence-preserving remediation plan. Apply the migration through the normal reviewed release process; rerun full RPC, RLS, cross-process concurrency and restore/rollback qualification. The existing RPC definition is unchanged; original RLS and service-only permissions remain in force.
4. Run all twelve exact scenarios against a disposable first-party hosted tool and independent outcome ledger. Preserve request/policy/approval/authority/effect references. Expand test 09 to full policy changes at destination commit.
5. Validate the complete portable evidence package with external trust anchors. Test key rotation and honest UNKNOWN outcomes after failures.

**Release disposition: not production-qualified.** The patch fixes two demonstrated local gaps. It does not remove previously outstanding recovery, schema, hosted or external-provider release gates.
