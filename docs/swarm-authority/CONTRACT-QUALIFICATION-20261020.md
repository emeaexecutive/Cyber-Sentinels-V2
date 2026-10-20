> Historical qualification. Follow-up implementation and current limits: [CPTO closure](CPTO-CLOSURE-20261020.md). Original results below remain preserved.

# TENENTE Swarm Authority Control - local contract qualification

Authoritative contract: `TENENTE_SWARM_CODEX_COMPLETE.md` (all sixteen sections plus twelve adversarial scenarios). This supersedes prior missing-specification and unwired-server statements. Branch: `feat/tenente-swarm-authority-control`; implementation parent `eb51d89826d02adadc945aca336a0651d2dd05ee`. The commit containing this report identifies the reviewed implementation; qualification JSON records source hashes.

## A-C. Reuse, implementation and authority

Reuses existing identity, delegated-action evaluator, Authority Graph, Authorization Gateway, canonical transaction, native executor, registered HTTP/MCP adapters, Replay and Trust Memory. No alternate permissive decision engine. The new server composition resolves current authority and canonical decision on admission and dispatch, authenticates the current owner/admin session, and requires current provider health and immutable persisted policy. Caller JSON cannot supply these claims. Child membership never grants authority. Parent membership revocation recursively invalidates descendants and credentials; independent memberships survive.

## D-I. Budgets, concurrency, revocation, decisions and execution

Safe integer EUR minor units; atomic tenant CAS commits reservations with hash-linked receipts. Root-authority-derived budget keys prevent caller or swarm ID changes resetting money. Per-action limits do not invent aggregate limits. Explicit operation quotas support bounded windows; uncertain prior work retains capacity. DISPATCHED/UNKNOWN reserves cannot automatically refund. Only verified outcome evidence settles spending. The live server conservatively charges the full reservation for a verified effect; generic failure retains it.

Mandatory local HTTP and MCP tests each run an orchestrator and five concurrent agents sharing EUR500. Five first calls overlap; one independently verified zero-effect failure permits one bounded retry. Six calls total, five paid effects, EUR500 committed, zero overspend. Duplicate and overflow attempts add no calls. Parent revocation blocks all five descendants with zero subsequent calls. A fresh unused budget probe ensures revocation is not merely budget exhaustion. Each transport persists one SQL state record and 38 journal receipts. Separate two-agent final-budget race and ten-agent tests prove one and five admitted effects respectively.

Persisted task policy binds task ID, member, transaction and payload. Parent task decisions are freshly loaded, tenant scoped, and must remain ALLOW before dispatch. Missing/cyclic/deep dependencies fail closed. Independent tasks do not inherit unrelated denial. REVIEW/DENY never executes. Kill switches are authorized, tenant scoped and durable; queued leases are revoked, in-flight calls become UNKNOWN. Restoration requires a distinct authorized human, reconciliation, new credential generation and heartbeat. Already dispatched external effects cannot be recalled; no exactly-once or external cancellation claim.

## J-L. Evidence, Replay, Memory and console

Journal receipts include decision-time authority snapshots, context and causal hashes. Journal sequence means commit order, not external execution order. Projection uses existing canonical Replay and Trust Memory tables with deterministic idempotent IDs. Local SQL integration persists eight Replay and eight Memory rows; replaying projection does not duplicate them and tampering is rejected. Console shows persisted collective/participant/authority/budget/receipt state and supports reasoned containment and descendant revocation. Console is flag gated, authenticated, tenant scoped, same-origin and no-store.

Projection failures fail closed before execution. Lifecycle containment remains committed if later projection fails: retry projection from the immutable journal; do not undo the kill switch. The journal is the recovery source. Automatic durable projection retry and complete lifecycle enrollment/UI remain release work.

## M-N. Database and API

Forward-only migration: `supabase/migrations/20261020091324_tenente_swarm_authority_control.sql`, generated through Supabase CLI. Private CAS state/event tables, restricted service RPCs, RLS and append-only journal. Existing Replay event constraint is extended while preserving its original expression; prerequisites fail closed. Tested in disposable PGlite using actual canonical table DDL. This is not a PostgreSQL 17 full-stack restore or hosted migration test. No shared migration applied.

Existing native execution HTTP route and registered HTTP/MCP adapters use server composition when `SWARM_AUTHORITY_REQUIRED` is enabled. Existing public API/OpenAPI/SDK contract remains unchanged; internal console endpoint is not a public swarm SDK. Flag and configuration were not changed remotely. Console flag remains opt-in.

## O-P. Acceptance mapping and validation

Full `npm test`: 2,232 passed, zero failed/skipped. Final focused swarm suite: 59 passed, zero failed/skipped, including the additional wrong tool/resource/environment test added after the full run (the other four server-composition tests were rerun). Lint passed with ten pre-existing warnings; typecheck passed. Optimized build passed with all 209 pages generated. See `ACCEPTANCE-32-20261020.md`, qualification JSON and retained logs. The twelve additional scenarios are named TEST 01-12 in `tests/swarm-authority.test.mjs`, with initial authority, requested action, decisions, actual side-effect count and receipt references emitted into evidence. Local module mocks are identified as composition tests; real network tests use controlled loopback destinations; SQL tests execute actual SQL. None is hosted-provider evidence.

## Q-R. Hosted status and limitations

No hosted qualification performed in this change. TENENTE remains PARTIAL despite proven local execution controls: operator provisioning and authenticated heartbeat credential enrollment need a supported end-to-end ingress; task/policy provisioning and provider-to-tool health configuration require qualification; automatic projection retry and complete console workflows remain incomplete. Provider-independent commercial execution and cancellation are unproven. Current signed outcome integration uses the existing destination trust mechanism and must be qualified against each configured provider. No secret rotation or external credential revocation is claimed.

## S-V. Preservation and release boundaries

Implementation files and hashes are in qualification evidence. Frozen Core RC `5e7b9ed` and TENENTE `cb1a082` remain ancestors, untouched. Existing dirty About page and migration-reconciliation report are excluded from the commit. Prior backup and restore evidence is preserved: original archive SHA-256 `081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307`, reported 284-table / 11,133-row restore. No repeat backup, Production access or synchronized Storage claim.

Production mutations: **0**. Shared Staging mutations: **0**. No push, merge or deployment. Promotion requires separate approval, local full-stack migration rehearsal, credential/task/provider provisioning, hosted human/agent security qualification, and existing recovery/account/release decisions. Application rollback does not undo database grants: disable the feature flags and preserve journal/reservations; use reviewed forward repair, never delete uncertain leases or refund without evidence.

**CORE PRODUCTION: NO-GO** - this local work does not close existing release gates.

**TENENTE SWARM: PARTIAL** - local enforcement and controlled execution are proven; full operational and hosted qualification remains unfinished.
