# Production backup verification — 12 October 2026

**Database archive and isolated restore: PASS. Separate Storage object capture: PASS. Overall Production recovery is not unconditionally qualified. No Production migration was applied.**

Owner: Keith Speres. Source project: `kecgtsfibkypjuaxqbjx`. The existing archive and original manifest were preserved, not overwritten. New private artifacts were added beside them; no Production data was placed in Git.

## Archive identity

- Filename: `production.dump`
- Directory: `C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\20261012T082626Z-01474853552c4315ad62e4497df96bbe`
- Archive header created: **12 October 2026, 10:26:48 Europe/Madrid (08:26:48 UTC)**.
- Capture verification completed: `2026-10-12T08:27:20.9712346Z`.
- Size: **4,103,536 bytes**; custom format, gzip; PostgreSQL server 17.6, pg_dump 17.11.
- SHA-256: `081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307`.
- Independently recomputed before and after verification; both match the original manifest.
- Original manifest SHA-256: `094efa6ed57e6fdc8f1747b1f556c42e82297aa2268174c1fcf2615a54d44eb5`.

The capture script gates writes on C: being fully encrypted with protection ON. Its successful manifest records that gate passed. The directory has protected ACL inheritance. This is recorded capture-time encryption evidence; the agent has not independently repeated the elevated BitLocker query.

## Isolated restore and completeness

Pinned Supabase PostgreSQL image: `public.ecr.aws/supabase/postgres@sha256:06ddc7962e11ab0f4f0334fd05671e97c30ea202f6e6a7113800bd3d6e416108`.

Fresh container `cs-recovery-20261012-081310d3`, database `recovery_validation`: Docker network **none**, no published ports, archive directory mounted **read-only**, cron execution disabled. It is now stopped and preserved. The restore made zero Production connections.

Restore executed successfully with `ON_ERROR_STOP=1` and a single transaction. All **3,579 selectable archive entries** were included: 3,572 body entries followed by seven event triggers under their recorded owner. The archive header reports 3,586 total entries including non-selectable/internal entries. No application table entries were excluded. Local image roles were used, with the missing managed `supabase_realtime_admin` role created locally only; cluster passwords are not restored by pg_dump.

Restore SQL duration: **14.373 seconds**; setup/restore/stop elapsed approximately **35.5 seconds**. This is a database drill duration, not end-to-end application RTO.

Validation against later read-only Production observations:

- **10 schemas and 284 table/partition-parent identities match.** Schemas: auth, extensions, graphql, graphql_public, pgbouncer, public, realtime, storage, supabase_migrations, vault.
- **283 TABLE DATA entries**: the remaining relation is partitioned parent `realtime.messages`, whose physical rows live in child partitions.
- **All 284 per-table counts match: 11,133 physical rows.**
- **All 284 per-table SHA-256 row-content fingerprints match**, using sorted canonical JSONB text and C collation. No row values or private object paths were published.
- Five Auth users, 36 API-key records, 119 migration entries, two buckets and one Storage object metadata row restored.
- Required public/Auth/Storage/migration data and public functions/constraints are present. Restored catalog contains 1,717 constraints, 358 policies and zero invalid indexes.

These comparisons confirm current schema/table coverage and row content. They compare the archived snapshot to later source observations, not two simultaneous snapshots. A pg_dump is not a cluster/infrastructure backup: role passwords, project secrets, platform configuration, and external service state require separate recovery arrangements. Full application/Auth/RLS journey validation and rehearsal of the 14 pending migrations on a clone of this fresh restore are still separate gates.

## Why ssl = f appeared

The capture connected through the session pooler at `aws-0-eu-west-3.pooler.supabase.com:5432`. PostgreSQL's `pg_stat_ssl` reports the connection seen by the database backend. With a pooler in between, that is the **pooler-to-PostgreSQL hop**. It does not report the laptop-to-pooler TLS session. Thus the reported `ssl = f` is not evidence that the laptop connection was plaintext; it does indicate that TLS on the backend hop was not in use for that reported session. Full TLS across both hops is not established here.

Native PostgreSQL 17.11/libpq acceptance tests used `sslmode=verify-full` throughout:

1. Correct project CA and hostname: TLS verification succeeds and libpq reaches `fe_sendauth: no password supplied` (no credential supplied during this test).
2. Wrong hostname with the real pooler IP: rejected with certificate hostname mismatch.
3. Untrusted CA bundle: rejected with certificate verification failure.

The archive capture script sets `PGSSLMODE=verify-full` and the same `PGSSLROOTCERT` for both psql and pg_dump, and aborts on failure. That script plus successful archive creation supports verified transport for the historical dump; there is no retrospective packet capture. No new authenticated database login was claimed by the credential-free TLS probe. Certificate verification was never disabled. No Production SSL setting was changed.

Auxiliary probes were not used as acceptance evidence: Node verified the peer but crashed during cleanup; Python's stricter X.509 parser rejected the legacy CA's missing key-usage extension. The native libpq tests above exercise the actual dump client's validation behavior.

References: [PostgreSQL pg_stat_ssl](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW), [libpq verified TLS](https://www.postgresql.org/docs/17/libpq-ssl.html), [Supabase PSQL configuration](https://supabase.com/docs/guides/database/psql). Backend TLS should be reviewed with the platform owner; changing enforcement can reboot the database and was not authorized or attempted.

## Separate Storage capture

Private payload directory: `storage-capture-20261012` beside the archive. Captured through authenticated HTTPS using existing CLI authorization; credential values stayed in process memory and were not logged or persisted.

- **One object, 17,504 bytes**, captured with its two-bucket inventory.
- SHA-256: `bdf014e1c83eec26e1fccf73231b500620c5deed0d98b80079b5bc011ad31b92`.
- Local file rehash matches its manifest; a second independent GET matches size and SHA-256.
- Every bucket/object metadata field matches the restored archive and live observations before and after capture.

This verifies a separate current-object backup with strong observed consistency. It is **not an atomic database-plus-object snapshot** and does not prove absence of transient changes or recover overwritten historical versions. No database quiescence was requested. The object was not uploaded back to Production. A local Storage service rehydration/access-control drill has not been performed against this new payload.

## Production non-mutation and release gates

Reviewed capture commands are a read-only SELECT and pg_dump with `default_transaction_read_only=on`. Verification used SELECTs, TLS handshakes and Storage GETs. The credential helper retrieves existing API keys through the authenticated API and does not create or rotate them. No DDL, DML, role changes, credential resets, SSL configuration changes, or Production migrations were issued. All table counts and row fingerprints still match the archived state, and the migration count remains 119. This is operation-level evidence, not an exhaustive audit of unrelated concurrent users or internal statistics/log writes.

Do not interpret the successful database restore as blanket Production recovery/release PASS. Backend TLS, separate-capture consistency limits, offsite recovery, full application recovery and the fresh restored-data migration rehearsal remain explicit qualification items. No Production migration is authorized by this report.

Machine-readable evidence: [archive and execution](production-recovery-verification-20261012.json), [restore comparisons](recovery-restore-validation-20261012.json), [TLS tests](recovery-tls-20261012.json), [Storage verification](recovery-storage-verification-20261012.json). Detailed SQL, inventory, restore logs and payloads stay under the protected laptop backup directory.
