# Staging Baseline Verification

> **NOT APPROVED FOR PRODUCTION**

## Isolation record

```text
Staging project reference: local-disposable-reconciliation-staging
Staging database host: 127.0.0.1:55433
PostgreSQL version: 17.10
Schema restore date: 2026-07-29
Synthetic dataset version: reconciliation-fixtures-v1
Source baseline: docs/production-schema-baseline-normalised.sql
```

The repository remains linked to Supabase project `kecgtsfibkypjuaxqbjx`.
That linked project was positively identified as Production and was not used for
any migration, repair, schema write, data write or test in this run.

The staging target is a new local PostgreSQL 17.10 cluster in the operating
system temporary directory. It listens only on `127.0.0.1:55433`, contains no
Production records or credentials, has no webhook/email/billing process, and
can be destroyed or reset without affecting Supabase.

## Restore verification

The normalized Production schema was restored into an empty database with
`ON_ERROR_STOP=1`. The restore completed without an error after adding only the
cross-schema compatibility objects listed below.

```text
public tables:   87
public routines: 43
public policies: 176
```

These counts exactly match the captured Production baseline. Because the
normalized artifact contains the public definitions and the restore was
executed in full, the following public-schema definition classes were restored:

- table and column names, types, defaults and nullability;
- primary, unique, check and foreign-key constraints;
- indexes;
- public functions and signatures;
- triggers;
- RLS enablement and policies;
- table/function grants and default privileges;
- required extension context.

The baseline is schema-only. Before reconciliation tests, public application
tables contained zero rows.

## Differences

| Difference | Classification | Rationale |
|---|---|---|
| PostgreSQL 17.10 locally versus Production 17.6 | Harmless | Same required major version; 17.10 client/server were already used for the verified baseline restore |
| Local `auth.users(id uuid)` compatibility table | Expected staging-only | Required only to satisfy public foreign keys in the schema-only dump; contains no users |
| Local `auth.uid()`, `auth.jwt()` and `auth.role()` compatibility functions | Expected staging-only | Minimal Supabase API-role behavior for PostgreSQL-only RLS/RPC tests; no tokens or credentials |
| No GoTrue, PostgREST, Storage, Realtime or platform-managed schemas | Material for API/E2E coverage, not material for public DDL application | Prevents claiming PostgREST discovery or browser application success from this local target |
| No Production data | Expected staging-only | Synthetic fixtures are used; no live PII or operational data was copied |

No unexplained material difference exists in the restored `public` schema.
The absence of the Supabase platform services is an explicit limitation and
blocks Preview/PostgREST/real-browser acceptance from this database.

## Positive isolation checks

- Target host is loopback-only.
- Target database is `reconciliation_staging`.
- Target is not project `kecgtsfibkypjuaxqbjx`.
- No Supabase CLI linked-project migration command was run.
- No `.env`, webhook, mail, billing or service credential was loaded.
- Only fixed synthetic UUIDs, labels and digests are used by fixtures.

## Result

The local database is a verified Production-public-schema clone suitable for
PostgreSQL-level reconciliation authoring and destructive reset tests.

It is not a Supabase staging project and cannot prove PostgREST schema cache,
deployed application, consent browser flow or a real Cloudflare Turnstile
challenge.
