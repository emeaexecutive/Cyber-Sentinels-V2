# Execution 03 — real PostgreSQL qualification

Date: 12 November 2026. **Local verification only; operational Production NO-GO.** No hosted SQL, hosted synthetic records, deployment or shared database changes occurred.

## Isolated engine and scope

The installed PostgreSQL17 directory genuinely lacked `share/` and `postgres.bki`; elevated inspection confirmed it. Docker Desktop had no running engine pipe. An official EDB PostgreSQL17.6 Windows binary archive was downloaded into ignored task scratch (SHA256 `d378882abd001a186735acd6f6ba716bca6ccd192e800412d4fd15ed25376b3e`). Its binaries initialized a new cluster owned by the local operator, bound only to `127.0.0.1:55473`, with SCRAM authentication and a random task-only password. No existing database was reused. Credentials, raw schema metadata and dump files remain ignored scratch and are not release artifacts.

## Actual final-slot and stop races

`tests/swarm-postgres-loop-execution03.test.mjs` has two real PostgreSQL tests; no PGlite fallback is allowed. Both passed. Each test creates a unique disposable database. Distinct PostgreSQL client/backend identities arbitrate actual `load_swarm_state_v1` / `cas_swarm_state_v1` calls. A separate Node process runs an authenticated loopback HTTP destination backed by its own PostgreSQL connection. The destination verifies a committed DISPATCHED lease and the exact request digest before inserting a unique effect row. An independent observer connection queries effects directly.

- Agent1 consumes the first of two shared allowances. Two distinct agents/request IDs race for the last allowance: exactly one committed winner, a verifiable loser receipt with `COLLECTIVE_LIMIT_EXCEEDED`, and exactly one additional independently observed destination effect.
- 240 further attempts, alternate operation/handoff, revocation, emergency stop and cross-tenant attempts produce zero additional effects. Replay survives a newly constructed store. CAS collision counts and independent backend/process IDs are recorded.
- A second test explicitly holds the tenant advisory lock and observes two independent clients blocked on that lock. Stop queues before dispatch. After release, stop commits first, dispatch retries against current state and denies. The destination has zero effects; recovered lease is REVOKED and Replay verifies.

Evidence: `artifacts/execution03/postgres-final-slot.tap`, `postgres-final-slot.json`, `postgres-stop-race.json`. JSON includes Git SHA and exact source hashes for the tested dirty integration source; final immutable-SHA requalification must replace these captures before release claims. Existing additional unit tests cover altered quota/window policy, rollover, budget interaction and other edge cases; do not describe every unit scenario as a real PostgreSQL race.

## Full schema dependency rehearsal

The root workstream captured current Staging metadata with a read-only SELECT, using `execution03-application-catalog.sql`. The capture contains table/type/function/constraint/policy/grant definitions and migration identities, not customer rows. Captured `session_security` dependencies were necessary; omitting that schema was an actual reconstruction failure and was corrected in the capture/reconstructor rather than silently stubbing its gate.

The isolated schema reconstructor loads the captured application schema plus necessary Auth/Storage table definitions and session-security functions. It reconstructs **284 tables, 206 functions and 567 policies**, then applies all 12 locally pending versions in ledger order, including:

| Dependency | Migration |
|---|---|
| Private Swarm state/event CAS and Replay | `20261020091324_tenente_swarm_authority_control.sql` |
| Projection recovery cursor | `20261020100706_tenente_swarm_projection_recovery.sql` |
| Preserved PR128 approval invariant | `20261028230354_single_use_high_consequence_approval.sql` |
| PR130 workload identity binding | `20261104150000_workload_identity_bindings.sql` |
| Exact PR132 durable approval/dispatch boundary | `20261108100241_atomic_native_dispatch.sql` |
| SOC/Watchtower Replay kinds | `20261112104809_soc_replay_event_types.sql` |
| Model budget Replay kinds | `20261112141743_soc_model_budget_replay.sql` |

The remaining five pending versions are pre-existing historical/comment-only reconciliation markers. Their local ledger handling is not approval to replay or rewrite hosted history. Every source migration hash and local result appears in `artifacts/execution03/database-rehearsal.json`. This is a reconstruction from current schema metadata plus forward dependencies, not a claim that all divergent historical branches have identical ancestry.

The new model-budget migration only extends the existing Replay CHECK for RESERVED / UNKNOWN / RECONCILED / DENIED journal events. It changes no grants, policies, tables or existing data. It was generated using the installed Supabase CLI. Hosted application still requires separate explicit review/approval.

## Approval SQL and recovery

All **23 original PR132 real PostgreSQL tests passed**, including twelve concurrent keys producing one effect, scope substitution/replay denial, rollback, uncertain outcomes, lost claim acknowledgements, crash-after-claim and a policy update during an independently observed delegation-lock wait. `execution03-native-dispatch-tests.mjs` generates a test copy changing only the explicit local port/data-directory fence to this isolated cluster. Original security assertions are preserved; provenance hashes and exact adaptations are recorded. Tests retain their minimal predecessor fixture classification even though a separate full-schema migration rehearsal also passes.

All **nine original PR134 River PostgreSQL scenarios also passed** against the same isolated cluster: scoped temporary containment/expiry, independent approval, outside-scope denial, revocation, destructive recommendation restrictions, twelve-key approval race, UNKNOWN acknowledgement/reconciliation, direct-provider/tenant/policy adversaries, and signed warning → relay → advisory → SQL claim → independently observed destination composition. Exact source `25f82561435be959e4b14b61873fb454cc1aa51a` and its unmodified helper are preserved. The generated local test changes only the asserted port/data-directory fence. The helper retains its exact clean PR135 checkout assertion (`202117ae82a48a7f8d536c29d5d700e8fbf11c70`). Current warning source matches that Git blob after CRLF→LF normalization only; both raw and normalized hashes are recorded. `river-test-provenance.json` and `watchtower-river-postgres.tap` preserve the result. No existing security assertion was removed.

The schema-only database is dumped and restored into a second new database through SCRAM-authenticated PostgreSQL clients. Enhanced recovery passed: 252 public/private/Swarm tables, all 252 RLS-enabled, 558 policies, two Swarm RPCs and two native dispatch RPCs; incorrect-password authentication was rejected. Exact effective-schema fingerprints matched (`60752cc6e11e5b7c0f6225fa19d88e1aace4e843ddee25de62840be112bdd8ba`) after identical query/deparse search paths were applied. Service-only RPC privileges, append-only DELETE rejection and an actual synthetic hash-linked SOC event survived restoration. Consult the final machine-readable report for immutable-candidate results; count equality alone was not treated as sufficient recovery proof.

No customer data is restored. Supabase Auth HTTP, Storage object bytes, Vault secrets, managed background services, synchronized DB/Storage recovery and Production recovery remain unqualified. No HTTP/cron job was invoked during schema reconstruction. The service-role RPC boundary is server trusted; its tenant parameter must never be exposed as a raw client proxy.

## Reproduce at the frozen candidate

With the isolated cluster running and its scratch password supplied only through process environment:

```powershell
$env:PGPASSWORD = Get-Content -LiteralPath tmp/pg-execution03/password.txt -Raw
$env:TENENTE_LOCAL_PG_PORT = '55473'
$env:APPROVAL_TEST_PASSWORD = $env:PGPASSWORD
$env:APPROVAL_TEST_PORT = '55473'
node --import=tsx --test tests/swarm-postgres-loop-execution03.test.mjs tests/native-dispatch-postgres-loop-execution03.test.mjs
$env:WATCHTOWER_SIGNAL_SOURCE = 'C:\Users\emeae\Desktop\cyber-sentinels-swarm-qual-20261021\tmp\watchtower-runtime-clean-20261109'
node --import=tsx --test tests/watchtower-river-postgres-loop-execution03.test.mjs
node --import=tsx tools/qualification/execution03-database-rehearsal.mjs
```

The schema capture and engine binaries are intentionally not committed. A subsequent operator must produce their own authorized schema-only capture and isolated engine. The generators and fences are checked-in reproducibility tools; no environment files or hosted database URLs are loaded.
