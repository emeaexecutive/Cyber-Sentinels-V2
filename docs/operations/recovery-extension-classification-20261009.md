# Extension ownership and ACL classification — 9 October 2026

All 51 differences are EXPECTED_PLATFORM_DIFFERENCE. No ownership or grant changes were made. This is an explicit administrative ownership variance, not a claim of byte-identical ownership.

Production reference: a read-only catalog transaction at 2026-10-09T15:41:45.142865+00:00. Source PostgreSQL 17.6; isolated target 17.11. All five extension versions match. Production owners: pg_stat_statements, pgcrypto and uuid-ossp = postgres; plpgsql and supabase_vault = supabase_admin. The 7 Vault objects also match; neither Vault nor plpgsql contributes one of these 51 differences.

For every row below, Production owner is postgres and restored owner is supabase_admin. Exact source/restored ACL arrays, grantors, definitions, settings, membership and individual checks are preserved in extension-classification.json in the restricted evidence directory. All non-superuser grantee/privilege/grantable sets match. Administrative grantor provenance and supabase_admin self-grants remain recorded differences.

49 native C SECURITY INVOKER functions have identical definition digests, extension versions, language, volatility and function settings. The two pg_stat_statements views have identical definitions and application grants; local anon/authenticated/service_role tests establish nonvacuous other-user query redaction, denied stats reset, and available stats-info. No application data privilege expansion was observed. These rules must not be generalized to arbitrary SECURITY DEFINER functions or views.

PostgreSQL references: [statistics access restrictions](https://www.postgresql.org/docs/17/pgstatstatements.html), [view execution semantics](https://www.postgresql.org/docs/17/sql-createview.html), [17.11 native implementation](https://github.com/postgres/postgres/blob/REL_17_11/contrib/pg_stat_statements/pg_stat_statements.c).

| # | Object (schema and full identity) | Extension | Classification |
| --- | --- | --- | --- |
| 1 | extensions.armor(bytea) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 2 | extensions.armor(bytea, text[], text[]) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 3 | extensions.crypt(text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 4 | extensions.dearmor(text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 5 | extensions.decrypt(bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 6 | extensions.decrypt_iv(bytea, bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 7 | extensions.digest(bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 8 | extensions.digest(text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 9 | extensions.encrypt(bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 10 | extensions.encrypt_iv(bytea, bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 11 | extensions.gen_random_bytes(integer) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 12 | extensions.gen_random_uuid() | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 13 | extensions.gen_salt(text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 14 | extensions.gen_salt(text, integer) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 15 | extensions.hmac(bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 16 | extensions.hmac(text, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 17 | extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) | pg_stat_statements | EXPECTED_PLATFORM_DIFFERENCE |
| 18 | extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) | pg_stat_statements | EXPECTED_PLATFORM_DIFFERENCE |
| 19 | extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) | pg_stat_statements | EXPECTED_PLATFORM_DIFFERENCE |
| 20 | extensions.pgp_armor_headers(text, OUT key text, OUT value text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 21 | extensions.pgp_key_id(bytea) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 22 | extensions.pgp_pub_decrypt(bytea, bytea) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 23 | extensions.pgp_pub_decrypt(bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 24 | extensions.pgp_pub_decrypt(bytea, bytea, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 25 | extensions.pgp_pub_decrypt_bytea(bytea, bytea) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 26 | extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 27 | extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 28 | extensions.pgp_pub_encrypt(text, bytea) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 29 | extensions.pgp_pub_encrypt(text, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 30 | extensions.pgp_pub_encrypt_bytea(bytea, bytea) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 31 | extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 32 | extensions.pgp_sym_decrypt(bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 33 | extensions.pgp_sym_decrypt(bytea, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 34 | extensions.pgp_sym_decrypt_bytea(bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 35 | extensions.pgp_sym_decrypt_bytea(bytea, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 36 | extensions.pgp_sym_encrypt(text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 37 | extensions.pgp_sym_encrypt(text, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 38 | extensions.pgp_sym_encrypt_bytea(bytea, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 39 | extensions.pgp_sym_encrypt_bytea(bytea, text, text) | pgcrypto | EXPECTED_PLATFORM_DIFFERENCE |
| 40 | extensions.uuid_generate_v1() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 41 | extensions.uuid_generate_v1mc() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 42 | extensions.uuid_generate_v3(namespace uuid, name text) | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 43 | extensions.uuid_generate_v4() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 44 | extensions.uuid_generate_v5(namespace uuid, name text) | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 45 | extensions.uuid_nil() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 46 | extensions.uuid_ns_dns() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 47 | extensions.uuid_ns_oid() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 48 | extensions.uuid_ns_url() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 49 | extensions.uuid_ns_x500() | uuid-ossp | EXPECTED_PLATFORM_DIFFERENCE |
| 50 | extensions.pg_stat_statements | pg_stat_statements | EXPECTED_PLATFORM_DIFFERENCE |
| 51 | extensions.pg_stat_statements_info | pg_stat_statements | EXPECTED_PLATFORM_DIFFERENCE |

Evidence: production-extension-catalog-current.json; restored-extension-catalog-current.json; extension-classification.json; extension-probes-result.json and its stdout/stderr. See [closure matrix](recovery-closure-20261009.md). Current-source comparison is not independent dump-time evidence.
