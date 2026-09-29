# Execution proof: SQL lint review

Reviewed 2026-09-29 on `feat/execution-proof-provider-qualification`, base main `d40a0a14772af190a2d82e454b6294113ad35bd2`. Production project: `kecgtsfibkypjuaxqbjx`. Hosted operations in this review were catalog reads and lint; no repair was applied, no migration history was changed, and no deployment was performed.

**NEW SQL REQUIRED = YES.** All four existing lint errors reproduce as real PostgreSQL execution failures. One forward migration fixes four expressions, with zero new tables, policies, scopes, or dependencies:

[`20260929084417_repair_execution_proof_sql_lint.sql`](../supabase/migrations/20260929084417_repair_execution_proof_sql_lint.sql), created with the installed Supabase CLI's `migration new` command.

## Defect classifications

| Object | Rule / SQLSTATE | Real security/correctness risk | Classification | Fix required |
| --- | --- | --- | --- | --- |
| `public.persist_rc1_trust_assessment(uuid,text,text,text,bigint,text,jsonb,jsonb,jsonb,jsonb)` | `42P10`: no unique/exclusion constraint matches `ON CONFLICT` | An otherwise valid provider assessment aborts before webhook/evidence/receipt persistence. This is a correctness/availability defect, not an observed privilege bypass. | ACTIONABLE, pre-existing; P1 evidence persistence | Add the existing unique index's `WHERE event_id IS NOT NULL` predicate to conflict inference. |
| `public.ingest_continuous_trust_signal_v1(jsonb,text,uuid,jsonb)` | `42702`: ambiguous `signal_id` | First ingestion can succeed, but a retry with the same fingerprint fails while reading its processing status. Clients cannot receive the intended idempotent response. | ACTIONABLE, pre-existing; P2 retry correctness | Alias `trust_signal_processing` and qualify its status, tenant and signal columns. |
| `public.persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid)` | `42725`: non-unique `unknown - unknown` operator | Lease-hash initialization fails before the function can persist any scope decision, attestation, graph or memory. | ACTIONABLE, pre-existing; P1 scope/evidence persistence | Parenthesize the JSONB authorization extraction before subtracting volatile keys. |
| `public.persist_serious_incident_case_v1(jsonb,jsonb,jsonb,uuid,uuid)` | `42883`: nonexistent `text ->> unknown` operator | Incident creation containing Trust Memory artifacts reaches the invalid expression and rolls back the case and related records. A case with an empty memory array may avoid the branch, which does not make this a false positive. | ACTIONABLE, pre-existing; P1 incident/outcome evidence | Parenthesize the JSONB event-kind extraction before text concatenation. |

None is classified as a harmless historical artifact or false positive. The signal, scope and incident repositories still invoke their affected RPCs. The RC1 function remains a dependency of the provider identity persistence function in `202607170002_provider_abstraction_hopae.sql`; this review does not assert recent Production traffic through that legacy path.

### Exact repairs

RC1's live index is `hopae_webhook_events_event_id_uidx`, a unique index on `event_id` with predicate `event_id IS NOT NULL`. The repair changes:

```sql
on conflict (event_id) do nothing
-- to
on conflict (event_id) where event_id is not null do nothing
```

It uses the existing index and preserves its existing null behavior. No new index or uniqueness constraint is created.

The signal duplicate branch changes:

```sql
select status from public.trust_signal_processing
where tenant_id=tenant and signal_id=existing.id
-- to
select processing.status from public.trust_signal_processing as processing
where processing.tenant_id=tenant and processing.signal_id=existing.id
```

The scope hash now subtracts keys from `(p_input->'authorization')`, instead of leaving operator precedence to interpret the unparenthesized extraction. Only `consumedActionCount`, `createdAt`, and `immutableHash` remain excluded; tenant, targets, authority, duration and other immutable authorization values remain hash-bound.

The incident memory source becomes `incident::text||':'||(item->>'eventKind')`. It still stores exactly `<incident UUID>:<event kind>` and retains the existing memory type, provenance, timestamps and idempotency behavior.

The migration uses `CREATE OR REPLACE FUNCTION`, preserving existing owners and execution grants. It retains `search_path=public` on RC1/signal and the later `search_path=public,extensions` on scope/incident. There is no drop/recreate, broader grant, change to validation/tenant predicates, update to existing evidence, data backfill, or RLS/trigger change. The executable regression compares every original/fixed body and allows only the four expected expression changes.

## Live state and permission closure

Fresh read-only checks found 117 applied migrations, including `20260926113958`; the new `20260929084417` migration is absent. All 243 public tables have RLS enabled. RLS enabled is not by itself proof of every tenant policy; the scope/incident checks below exercise their actual policies locally.

The four helpers hardened by PR #109 remain inaccessible to `anon` and `authenticated`, with `service_role` execution retained:

- `ensure_governance_policy(text,text,text,text,text)`
- `create_governance_action_if_needed(uuid,text,uuid,text,text)`
- `notification_insert(uuid,text,text,text,text,jsonb)`
- `trust_timeline_record_event(jsonb,text,text,text,text,text)`

The four affected lint RPCs also remain `postgres`-owned `SECURITY DEFINER` functions with ACL `{postgres=X/postgres,service_role=X/postgres}`. These findings establish current permission state, not successful execution of the unrepaired hosted bodies. No exposed writer was invoked against real Production data.

The existing helper-permission PGlite regression still passes: direct client calls fail with `42501`, an owner-owned definer trigger continues creating a governance action, and a service call succeeds. This is bounded local service/internal execution evidence; it is not a newly generated Production business event.

## Executable verification

The new [`execution-proof-sql-lint.test.mjs`](../tests/execution-proof-sql-lint.test.mjs) executes actual historical function bodies, then the actual forward migration, in disposable PGlite PostgreSQL with real `pgcrypto`. Its 13 reported tests pass. They prove:

- Original SQLSTATEs `42P10`, `42702`, `42725`, and `42883`, including rollback of failed writes.
- Successful RC1 evidence/replay/memory/receipt writes and unchanged references on duplicate.
- Successful signal duplicate resolution with its persisted processing status; changed fingerprint and unavailable tenant subject remain denied.
- Successful scope decision, graph, memory and attestation persistence. Volatile authorization fields preserve the lease hash; changed authorization targets conflict. Changed decision retries are denied.
- Successful incident chronology, graph and correctly keyed memory persistence; identical retry is idempotent and changed case content conflicts.
- Foreign-tenant reads return no rows, foreign-tenant upstream incident references fail, and scope/incident evidence still rejects updates and deletes.
- Identical owners, ACLs, search paths, definer flags, RLS flags, policies and immutable triggers before/after repair; direct anonymous/authenticated RPC calls still fail with `42501`.

The harness loads actual scope/incident table DDL, foreign keys, check constraints, RLS policies and append-only triggers from the historical migrations. [`execution-proof-sql-prerequisites.sql`](../tests/fixtures/execution-proof-sql-prerequisites.sql) supplies minimal RC1/shared dependencies. The event append dependency is a controlled `APPENDED` stub; this suite does not claim to exercise the full Trust Event chain, every RC1 integration trigger, all Production schema constraints, or actual provider traffic.

The illustrative serious-incident scenario's default first-ingestion time predates some later chronology events and fails its real `ingested_at >= occurred_at` constraint. The test deliberately supplies a valid later ingestion time before generating its artifacts; it does not weaken that constraint or silently change product behavior. This scenario limitation is separate from the four repaired SQL expressions.

Combined focused validation passed **77/77**, zero failures or skipped tests:

```powershell
node --experimental-strip-types --test --test-reporter=spec tests/execution-proof-sql-lint.test.mjs tests/internal-governance-helper-permissions.test.mjs tests/epic-26-lease-hash-sql.test.mjs tests/rls/scope-continuity.test.mjs tests/rls/serious-incident.test.mjs tests/migration-namespace-reconciliation.test.mjs tests/migration-context-fix.test.mjs tests/hosted-migration-context.test.mjs
```

Targeted ESLint passed. The repository migration audit returned `PASS WITH WARNINGS`, no blocking errors; it includes historical legacy-column warnings and is not a SQL execution proof. The new file has only an informational legacy-name reference finding. Namespace/context validation passed with the new migration present. A fresh local-only Production context contained 118 migrations, remained unlinked, and made no database change; historical 108/114/116/117 ledger evidence was not edited to manufacture that result. Full application validation is reported by the parent PR work, separately from these focused results.

## Lint status and release boundary

Hosted lint was rerun after preparing/testing the migration:

```powershell
npx --no-install supabase db lint --linked --level error --fail-on error
```

**DATABASE LINT = FAIL, four pre-existing errors still present in Production pending application of the reviewed migration.** The command exited 1 and reported exactly the four objects/SQLSTATEs above. This is expected because Production was not mutated. No suppression, schema exclusion, or lower failure threshold was used to obtain a green result.

Local CLI lint was not available: Docker's Linux engine is stopped, and the available PGlite build does not include the `plpgsql_check` extension. The successful execution regressions are evidence for the repaired paths; they are not labeled a local CLI lint pass. Supabase documents why static function lint can detect branches that a particular invocation does not exercise in its [PL/pgSQL linter guide](https://supabase.com/docs/guides/database/extensions/plpgsql_check).

Before any later authorized migration release, rerun lint and target/catalog checks, require the exact pending migration set in a fresh isolated context, and apply through the repository's reviewed forward migration process. Afterwards require hosted lint to pass, preserve PR #109's helper restrictions and the four RPCs' service-only grants, and exercise the relevant tenant/runtime paths. This task authorizes preparation and a PR only: no auto-merge, deployment, or Production data mutation.
