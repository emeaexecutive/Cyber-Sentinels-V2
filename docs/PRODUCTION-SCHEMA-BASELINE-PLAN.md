# Production Schema Baseline Plan

> **NOT APPROVED FOR PRODUCTION**

## Outcome

An exact schema-only dump of the linked Production `public` schema was captured on 2026-07-29.

- Raw baseline: `docs/production-schema-baseline.sql`
- Normalised baseline: `docs/production-schema-baseline-normalised.sql`
- Migration ledger snapshot: `docs/production-migration-history.txt`
- Source database: linked project `kecgtsfibkypjuaxqbjx`
- Server version: PostgreSQL 17.6
- Dump client: PostgreSQL 17.10
- Public tables: 87
- Public routines: 43
- Public RLS policies: 176
- Table data: none
- Auth users or storage objects: none
- Credentials or connection strings: none

Capture SHA-256 fingerprints:

```text
production-schema-baseline.sql
  C8C14B79573FABC4C1A5FD3FBF133D34FD6E7B1376BF11BC3EF0A06702065206
production-schema-baseline-normalised.sql
  F06E3C908FC497AC9B7BFBD8815ECAC45FA3E3DC8ECDBFDFA306F9CC3A70D507
production-migration-history.txt
  58F7DB88EE688E7DB2E57B3456BB875253BB42CDF64DA7D92C3D83F277A2B8E0
```

The Supabase CLI dump command could not run directly because Docker is not installed. The official PostgreSQL 17.10 Windows binaries were downloaded to a temporary directory and `pg_dump --schema-only --schema public` was invoked with the CLI's temporary linked login entirely in process. Temporary credentials were not written into either baseline and were refreshed after use.

## Normalisation

The normalised baseline preserves:

- tables and columns;
- data types and defaults;
- constraints and foreign keys;
- indexes;
- RLS enablement;
- policies;
- routines and signatures;
- triggers;
- grants and default privileges;
- required extension context.

It removes:

- `pg_dump` session restriction tokens;
- object ownership statements;
- connection details;
- Supabase-managed schemas outside `public`;
- credentials and data.

The installed extension context relevant to comparison is recorded as:

- `pgcrypto` 1.3 in `extensions`;
- `uuid-ossp` 1.1 in `extensions`.

`pg_stat_statements`, `supabase_vault`, and platform-managed schemas are intentionally excluded from the normalised public-schema artifact.

## Baseline verification

The normalised baseline was restored successfully into:

```text
local://127.0.0.1:55432/prod_baseline_20260729
```

This is an isolated temporary PostgreSQL 17.10 database. Supabase roles and minimal `auth`/`storage` compatibility objects were created locally only. The restored catalog matched the raw baseline counts:

```text
public tables:   87
public routines: 43
public policies: 176
```

Fifteen synthetic non-PII rows were added locally across tenant, runtime-validation, certification, alert, provenance, session-integrity, Hopae, relationship and signal tables. They include nullable fields, repeated signal types and an intentionally orphan-like legacy relationship reference.

No Production records were copied.
The local PostgreSQL server was stopped after validation.

The first pending migration was then executed transactionally against this disposable restored baseline to validate the earlier prediction. It rolled back at:

```text
202606100001_runtime_validation_logs.sql:15
ERROR: column "deployment_state" does not exist
```

The failed transaction left `deployment_state` absent. This is direct staging evidence that the current 26-file push cannot start against the Production schema.

## Limitations

- The local restore is PostgreSQL-only; it has no PostgREST, GoTrue, Storage API, Realtime, or Supabase schema cache.
- Cross-schema Supabase platform internals are represented only by minimal local compatibility stubs.
- The baseline proves database definitions, not why unrecorded schema changes occurred.
- The baseline is not itself a canonical future migration.
- The baseline must be security-reviewed before commit because it exposes function, policy and grant definitions, although it contains no secrets.

## Tooling and runtime review

| Item | Finding | Recommendation |
|---|---|---|
| `.gitignore` | Local change ignores `.vercel` and `.env*`; the latter can also hide a deliberate example file | Keep secret protection, but review an explicit `!.env.example` exception |
| `supabase/.gitignore` | CLI-generated ignores for `.temp`, branch state and local env/key files | Safe after review; do not commit generated `.temp` state |
| `supabase/config.toml` | Generated local configuration, no linked project reference or credential | Optional; review local ports, DB major and network settings before commit |
| `package.json` / lock | No Supabase or Vercel CLI dependencies; manifests match HEAD | Keep CLIs out of application runtime dependencies |
| Supabase CLI | Analysis used `supabase@2.110.0` | Pin the same version in CI or a tooling script |
| Vercel CLI | Known environment version is 58.1.0 | Pin in CI/tooling if deployment automation requires it |
| Local Node | 26.1.0 | Do not use as compatibility evidence |
| Declared Node | `package.json`, `.nvmrc`, `.node-version` specify 22 | Use Node 22 for CI/build verification |
| Vercel project | Local project metadata reports `nodeVersion: 24.x` | Resolve the 22-versus-24 mismatch explicitly before release |

Preferred model: pinned, CI-managed CLI versions or pinned `npx --yes package@version` commands. Do not add Node 26-specific dependencies.

## Clean target build result

The repository migration sequence was applied to a separate clean PostgreSQL 17 database with minimal Supabase compatibility objects.

```text
Migrations applied before failure: 62 of 71
First failure:
  supabase/migrations/202607200003_provider_consensus_engine.sql:20
Error:
  relation "provider_health_snapshots" already exists
```

`202607170002_provider_abstraction_hopae.sql` creates `provider_health_snapshots`; `202607200003_provider_consensus_engine.sql` attempts to create it again without a compatibility transformation.

Therefore:

- `docs/local-target-schema.sql` was not created;
- the repository does not currently define a buildable clean target;
- a Production-to-final-target diff cannot be represented as fully authoritative yet.

## Approval gates

Before this baseline is used operationally:

1. Database owner reviews routine bodies, RLS policies and grants.
2. Security owner reviews broad privileges, including legacy `TRUNCATE`, `TRIGGER`, `REFERENCES`, and `MAINTAIN` grants.
3. Engineering resolves the duplicate `provider_health_snapshots` contract.
4. Canonical contracts for the 12 incompatible tables are approved.
5. A new target sequence builds from an empty Supabase environment.
6. The same sequence builds from this restored Production baseline.
7. PostgREST, RLS, API and rollback tests pass in an isolated Supabase staging environment.
