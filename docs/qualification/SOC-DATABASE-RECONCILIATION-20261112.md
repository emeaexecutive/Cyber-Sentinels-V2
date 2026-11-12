# SOC database reconciliation and isolated rehearsal â€” 12 November 2026

Scope: candidate based on warning runtime PR135 with PR137's scratch exclusion fix, in `tmp/master-execution-02`. No hosted database commands, schema changes or hosted synthetic writes were performed.

## Demonstrated gap and minimal migration

The existing private `swarm_private.state` JSON document and append-only `swarm_private.events` journal already support SOC records, model measurements, scoped agent/delegation state, stop state and evidence references through `load_swarm_state_v1` / `cas_swarm_state_v1`. A new parallel SOC table would duplicate this infrastructure.

However `projectSwarmReceipt` writes `SWARM_${kind}` to the canonical `operational_entity_native_replay_events` table, whose enumerated CHECK does not accept new SOC/warning kinds. A genuine projection would fail. CLI-generated migration `20261112104809_soc_replay_event_types.sql` preserves the existing accepted expression and adds exactly nine planned SOC kinds plus WATCHTOWER_WARNING and CHIRIVETA_REVIEW. It changes no rows, grants or RLS policies and creates no public table. Unknown kinds remain rejected.

The migration is transactional and checks its table/constraint prerequisites. Reapplication succeeds without data loss. Its additive extension can be rolled back before commit; after events are written, use forward repair rather than narrowing the CHECK and deleting history. This is a candidate migration, not an approved hosted plan.

## Schema mapping

| Requirement | Existing backing / limit |
|---|---|
| Alerts, incidents, investigation and model execution records | SOC details in tenant-scoped CAS state/events; operational query indexing is future work |
| Agent identities / delegations | Existing swarm members and delegated-authority infrastructure; server authenticated scope is required |
| Approval consumption / dispatch outcomes | Existing native enforcement contracts; candidate warning base does not include later PR132 atomic dispatch SQL automatically |
| Emergency stop / revocation | Existing containment state and serialized CAS; external in-flight limits remain |
| Evidence references / Replay | Immutable private event journal plus canonical projection; new event CHECK extension prepared |
| Trust Memory | Existing trust_memory_index projection with deterministic source identities |
| Tenant isolation | Private schema privileges, forced RLS, service-only RPCs and explicit state/event tenant bindings |
| Tenant authentication boundary | Service role can intentionally name any tenant; application must derive tenant server-side and never expose raw RPC proxy |

## Executed isolated tests

Command: `node --import=tsx --test tests/soc-persistence-sql.test.mjs tests/rls/swarm-authority.test.mjs tests/swarm-projection-sql.test.mjs`

Result: **4 passed, 0 failed, 0 skipped**. Captured rerun: `artifacts/soc-persistence-sql-20261112.tap`.

New rehearsal executes the actual existing migrations against a reduced canonical predecessor fixture and the actual new migration. It verifies:
- transaction rollback restores the exact prior constraint; forward reapply succeeds;
- all eleven kinds persist in the SQL CAS journal, pass hash-chain Replay verification, and produce eleven actual canonical Replay rows and eleven actual Trust Memory rows;
- undeclared event types fail the CHECK;
- anon/authenticated cannot invoke load or read private events; inherited tests also verify CAS/write denial and forced RLS;
- twelve competing writes against version zero have exactly one winner; five independent store instances retain all subsequent appends;
- cross-tenant state substitution fails; other tenant loads remain empty;
- attempted history rewrite fails and leaves prior state unchanged; journal delete fails;
- projection cursor remains service-only, monotonic, bounded and tenant-separated.

Engine is **PGlite**, not hosted Supabase or an independent PostgreSQL server. PGlite serializes queries: these checks establish SQL CAS conflict behavior and application retry behavior, not multi-connection advisory-lock races or cross-instance timing. Installed PostgreSQL17 initdb failed because restricted-token reexecution/share files were unavailable. No attempt was made to bypass the sandbox or touch a shared server.

## Release limits

This is not a full Staging schema rehearsal, hosted RLS proof, provider qualification, backup/restore proof or an AI SOC hosted demonstration. Historical Staging drift and absent swarm/approval RPCs must be rechecked read-only, then full current schema and recovery must be rehearsed in isolation. PR132's single-use approval migration is a separate dependency; this small projection migration does not replace it.

No production SQL was executed. Required approvals remain the reviewed named hosted migration plan, isolated branch bindings, bounded synthetic hosted writes with cleanup, and any later release/promotion.

Supabase skill consulted: [SKILL.md](C:/Users/emeae/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md). Current [changelog](https://supabase.com/changelog.md) and [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) were checked. CLI v3 target/confirmation changes are relevant to future hosted commands; none were used here. Local CLI profile was scoped to task scratch to avoid telemetry writes outside the workspace.


