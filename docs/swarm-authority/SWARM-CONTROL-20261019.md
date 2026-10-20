> Historical report. Current contract, server integration and limitations: [2026-10-20 qualification](CONTRACT-QUALIFICATION-20261020.md). The complete sixteen-section specification is now available.

# TENENTE Swarm Authority Control — isolated qualification

Branch: `feat/tenente-swarm-authority-control`, based on `5e5f28e5ceb9670ec9456771e7f768b19ecbbed2`. The branch preserves the newer Swarm enforcement/persistence work as well as the historical TENENTE and frozen Core RC ancestors. Existing About-page and migration-report edits are excluded from the Swarm commit.

## Acceptance contract

The available attachment `658ea6d3-b153-476b-a141-1b4030df0d1a/Pasted text.txt` contains the earlier ten-section contract and twelve adversarial scenarios. The newly referenced **Pasted markdown(3).md**, sixteen sections and exact thirty-two required tests, was not available in the attachment directory or located by filename/content searches. Its path/text remains requested. The tests below must not be represented as satisfying that missing contract merely because their count exceeds thirty-two.

## Requirements and evidence

| Requirement | Implementation and evidence | Status / next action |
|---|---|---|
| Preserve newer work / isolate branch | Branch based on `5e5f28e`; no remote writes | IMPLEMENTED AND VERIFIED locally |
| Shared atomic EUR budget | `lib/swarm/containment.ts`: safe integer minor units, immutable shared ceiling, CAS reservation, independently verified settlement | IMPLEMENTED AND VERIFIED locally |
| Parallel control | READY, DISPATCHED and UNKNOWN consume parallel capacity; five concurrent calls demonstrated | IMPLEMENTED AND VERIFIED locally |
| Retry / failure safety | Duplicate request cannot dispatch; unknown retains funds; verified zero-effect outcome can release reserve; READY expiry can refund once | IMPLEMENTED AND VERIFIED locally |
| Delegation / revocation / REVIEW / DENY | Existing native guard + graph revalidation + current credentials and scope quarantine; earlier twelve adversarial cases retained | IMPLEMENTED AND VERIFIED locally |
| HTTP / MCP | `tests/swarm-http-budget.test.mjs`: actual loopback HTTP and MCP requests through native executor/guard/adapter; HMAC dispatch and destination evidence | IMPLEMENTED AND VERIFIED for local controlled destination; commercial providers unverified |
| Persisted receipts and Replay | `tests/swarm-budget.test.mjs`: PostgreSQL-compatible PGlite, service-only CAS RPC, five simultaneous reservations, reload and hash-chain verification | IMPLEMENTED AND VERIFIED locally; schema proposal not applied to shared environments |
| Trust Memory | Existing native Replay/Memory projection references inherited from prior commits | IMPLEMENTED BUT hosted projection compatibility UNVERIFIED |
| Trust Operations Console | `app/tenente/swarm`, `app/api/tenente/swarm`, `lib/swarm/operations.ts`; current tenant state, budgets, members, leases, quarantine, recent receipt hashes, audited containment/reconciliation | Local operations tests pass; browser/API session integration still requires qualification |
| Console isolation | Server feature flag defaults disabled; fresh workspace role/access checks, bound user/tenant, same-origin JSON writes, bounded body, rate limit, no-store; no client-provided operator permissions | Four executable route tests pass with mocked session/client boundaries; actual hosted security verification remains open |
| Live execution resolver | Native guard remains an internal dependency; existing public native route does not construct the complete trusted classifier/current graph/provider bindings | PARTIALLY IMPLEMENTED; required guard fails closed. Do not enable as a finished rollout |
| All 32 exact cases + 12 | Twelve earlier cases run; eight budget/network tests and four console tests added to the existing suite | BLOCKED on missing sixteen-section attachment; do not substitute test counts for coverage |
| Shared environments | No deployment, environment mutation, migration, merge or push | Preserved |

## Five-agent EUR500 demonstration

`npm run test:swarm-authority` runs the twelve earlier adversarial scenarios, existing enforcement/SQL tests, six budget tests, two HTTP/MCP budget tests, four operations tests and four route tests: **42 tests passed** across the current-source runs (38 core tests plus four route tests). This count includes the earlier twelve; it is not the missing contract's 32-plus-12 acceptance claim.

For each transport, five agents reserve EUR100 each under one EUR500 ceiling and reach five concurrent destination requests. The controlled destination records four EUR100 effects and one explicitly verified zero-effect failure. All EUR500 stays reserved until reconciliation. A duplicate produces no network call. Only after signed zero-effect verification is EUR100 released for a new retry. The retry reaches EUR500 total effects. Another request produces no network call. Final balance: reserved 0, spent 50000 minor units; six network calls. This is an actual local network test with a synthetic destination, **not commercial provider execution**.

The independent persistence test repeats the concurrency/failure/retry accounting using actual SQL CAS RPCs in PGlite and reloads state through a new store instance. It verifies the same journal and budget after reload. This does not demonstrate multi-host PostgreSQL performance, crash recovery or synchronized Storage recovery.

A provider's generic FAILED response is not automatically evidence of zero spend. The local test destination explicitly signs its zero-effect assertion and binds the exact transaction, tenant, member, action digest, target, request key and destination. Production verifier bindings must establish an equally strong independent result before releasing a reservation.

## Activation / limitations

`TENENTE_SWARM_CONSOLE_ENABLED=true` is a server-only, opt-in console flag. No environment was changed. Before any separate Staging approval: qualify the persistence proposal, current-session RLS, actual canonical resolver, server-controlled budget classifications, per-member credentials/heartbeat keys, provider health and outcome verification, and Replay/Memory projections. The console cannot grant authority, approve an execution, restore a scope or refund a dispatched action. Restoration remains the independently authorized control-service operation.

The five-agent budget is enforced at the controlled dispatch boundary. A destination that ignores the authorized maximum or effects outside that boundary are not magically contained. Unknown outcomes continue consuming budget and parallel capacity. Application rollback cannot reverse spent funds, grants, quarantine or journal history.

## Separate release decisions

- **Core Production: NO_GO**, unchanged independent recovery/account/admin/hosted qualification gates. Historical 284-table / 11,133-row restore evidence is preserved; no new backup or Production access occurred.
- **TENENTE Swarm engineering: PARTIAL**, local behavior demonstrated; exact sixteen-section acceptance mapping and full live resolver integration remain open.
- **TENENTE hosted Staging: NOT QUALIFIED**, no new hosted change or hosted test performed.
- **TENENTE Production: NO_GO**. No promotion is authorized or implied by local tests.

Validation uses an isolated copy of the current working tree with synthetic environment configuration. It includes the preserved, pre-existing About-page edit, which is not included in this Swarm commit. Source hashes bind every changed implementation/test/package file to that validation copy; this is not a claim that a clean checkout excluding the user's edits was tested.

Current validation completed: **2,215 tests passed**, zero failed/skipped in the completed suite segments; **42 Swarm checks** included. Full lint exited 0; the introduced unused-import warning was removed and every changed file then passed lint without warnings (ten pre-existing warnings remain elsewhere). Typecheck exited 0. Production build exited 0 and generated all 209 static pages. The console's rendered HTML contains its heading and workspace input; no real authenticated browser flow is claimed.

The isolated harness initially omitted `.env.example`, causing two ENOENT failures, and lacked Git route metadata, causing the deployment inclusion test to fail before inspecting routes. Both harness omissions were corrected; the affected suites and all remaining suites then passed. Aggregate counts exclude those superseded failed suite segments. No application behavior was weakened to pass them.

[Machine-readable evidence](qualification-evidence-20261019.json) records source hashes, log hashes, exact test counts, preservation checks and remaining gates. Full raw logs remain under `tmp/tenente-*.log`. No prior build is used as evidence for this revision.
