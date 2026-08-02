# Production-to-Target Schema Difference

> Historical capture note (2026-08-02): this report records the pre-correction target state. Authoritative ledger and branch evidence subsequently proved both provider-health migrations unapplied, and Epic 16 was narrowly corrected to create `provider_operational_health_snapshots`. See `PROVIDER_HEALTH_SNAPSHOT_SCHEMA_RECONCILIATION.md`.

> **NOT APPROVED FOR PRODUCTION**

## Status and scope

The Production side is exact and schema-only. The local target side is incomplete because the clean migration sequence fails at `202607200003_provider_consensus_engine.sql:20`.

This report therefore contains:

- exact Production definitions for the known collisions;
- intended local definitions derived from the pending migrations and current application queries;
- an exact name-level inventory of missing pending objects;
- provisional canonical decisions requiring owner approval.

It does not claim that the current 71-file migration history is a valid final target.

## Summary

| Classification | Count |
|---|---:|
| Pending unique table names | 100 |
| Pending table names present in Production | 12 |
| Pending table names absent from Production | 88 |
| Pending unique function names | 63 |
| Pending function names present in Production | 0 |
| Pending function names absent from Production | 63 |
| Confirmed same-name incompatible tables | 12 |
| Confirmed missing table/function names | 151 |

Additional index, constraint, trigger, policy, grant and RLS differences exist. They cannot be reduced to a final count until the target sequence builds.

Direct execution evidence on the disposable Production-baseline restore confirms that the first pending migration fails and rolls back at line 15 because `runtime_validation_logs.deployment_state` does not exist.

## Incompatible objects and canonical decisions

| Object | Production definition | Intended/current-code definition | Impact | Canonical decision |
|---|---|---|---|---|
| `runtime_validation_logs` | `overall_status`, `health_score`, `summary` | `deployment_state`, `health_percent`, blocker/warning arrays, `summary` | Runtime logger inserts/selects the local columns and currently cannot use Production shape | **MERGE DEFINITIONS**: retain legacy fields, add new fields, backfill aliases, switch code, later deprecate legacy |
| `trust_certifications` | Subject/certification/status/score; `reviewed_by uuid`; no `created_by` | Current API requires `created_by`, `reviewed_by text`, owner-scoped CRUD | API reads and mutations fail or cannot enforce ownership | **MERGE DEFINITIONS** with new actor UUID/text compatibility fields and explicit owner RLS |
| `trust_alerts` | `title`, `description`, `severity`, `detected_at`, status `open` model | Earlier migration expects `alert_title`, `alert_description`, `risk_level`; continuous trust expects both newer fields and status transitions | Governance and continuous-trust code expect different contracts | **MERGE DEFINITIONS**; preserve legacy aliases and adopt one versioned status transition contract |
| `provenance_events` | `report_id`, `event_type`, `event_detail`, `enterprise_id` | API requires subject fields, `event_title`, description, risk, creator and metadata | Current CRUD route cannot persist or owner-filter | **MERGE DEFINITIONS**; preserve report provenance and add application fields |
| `session_integrity_checks` | Subject/session and separate liveness/deepfake/injection/channel/anomaly statuses | API requires interview/user/overall/manual-review/evidence fields | `POST /api/session/integrity` fails | **MERGE DEFINITIONS** with explicit legacy-to-new mapping and no silent overwrite |
| `injection_risk_events` | Check ID, risk type/level, evidence/explanation | API also requires interview session and risk score | Child write is incomplete | **MERGE DEFINITIONS** |
| `verification_signals` | Subject/signal source/type model | API requires check/session/category/status/badge/evidence | Signal writes and RLS contract differ | **MERGE DEFINITIONS**; retain subject fields during compatibility window |
| `device_channel_evidence` | Check ID, evidence type/status | API requires interview session, integrity state and evidence source | Channel write fails | **MERGE DEFINITIONS** |
| `hopae_verifications` | `user_id`, passport, raw userinfo/status and legacy provider fields | Current provider code requires owner, redirect, workspace/workflow, correlation, authority, policy, retention and provider-session fields | Provider creation/retrieval cannot persist current contract | **MERGE DEFINITIONS** with additive fields and guarded backfill; do not discard raw legacy columns |
| `hopae_webhook_events` | Verification/event, `signature_valid`, `payload` | Current code requires event ID, signature timestamp/status, raw/normalised payload, duplicate and processing fields | Webhook idempotency and audit fail | **MERGE DEFINITIONS**; retain `payload`, introduce versioned digest/processing contract |
| `trust_relationships` | Legacy polymorphic `source_type/source_id/target_type/target_id` | Enterprise graph code requires tenant-scoped entity UUID relationships | Legacy UI and new graph code require mutually incompatible shapes | **KEEP PRODUCTION DEFINITION** for legacy; **REPLACE NEW CONTRACT WITH VERSIONED OBJECT** `trust_graph_relationships_v2` |
| `trust_signals` | Legacy `trust_score_id`, `signal_type`, text value and weight | Continuous-trust code requires tenant/entity/source/fingerprint/replay fields | Dashboard legacy count works, continuous-trust repository fails | **KEEP PRODUCTION DEFINITION** for legacy; **REPLACE NEW CONTRACT WITH VERSIONED OBJECT** `continuous_trust_signals_v2` |

## Constraint, policy, grant and RLS differences

High-risk exact Production findings include:

- 176 existing policies whose names and predicates diverge from the pending replacements;
- many legacy table grants include `TRUNCATE`, `TRIGGER`, `REFERENCES`, and `MAINTAIN` for API roles;
- owner-scoped columns required by pending RLS are missing on several tables;
- the canonical event helper functions and all consent functions are absent;
- pending migrations drop or replace policy and constraint names without proving their current definition;
- `trust_relationships` and `trust_signals` are RLS-enabled legacy tables but are targeted by unconditional new table definitions later.

Grant reconciliation must use explicit `REVOKE`/`GRANT` statements after a reviewed privilege matrix. It must not copy broad legacy privileges into new versioned objects.

## Missing Production objects

Name-level comparison confirms 88 missing pending tables and 63 missing pending functions.

Critical missing objects include:

- `trust_event_envelopes`, `trust_event_chain_heads`, `trust_event_links`, `trust_event_audit`;
- `append_trust_event_v1`, `reserve_trust_event_envelope_v1`;
- all 11 consent-manager tables;
- `persist_consent_change_v1`, `create_consent_policy_v1`;
- all identity-signal engine tables and functions;
- release-evidence, ORI and provider-registry objects;
- provider-consensus objects;
- enterprise trust architecture, continuous-trust, trust-intelligence, graph, DNA, replay and Trust Centre objects.

The full name list remains derivable from the 26-migration inventory in `docs/SUPABASE-MIGRATION-RECONCILIATION.md`.

## Drift origin evidence

| Object/group | Git evidence | Conclusion |
|---|---|---|
| `trust_relationships` | Created by applied migration `202606080001_trust_relationships.sql` | Expected pre-gap legacy object, not unexplained drift; later migration creates a conflicting second contract |
| `runtime_validation_logs` legacy columns | No reachable migration commit contains `health_score` for this table | Origin unknown; consistent with manual/dashboard/prototype DDL or history no longer reachable |
| Certification/alert/provenance legacy shapes | Pending commit `1eb1544` introduces different definitions; remote-only column combinations are not found in migration history | Origin unknown |
| Session-integrity legacy shapes | Pending commit `c21fac3` introduces different definitions; legacy liveness/deepfake column combination is not in reachable migrations | Origin unknown |
| Hopae legacy shapes | Pending commit `2d176aa` introduces a different owner/raw schema; remote column combination is not in reachable migrations | Origin unknown |
| `trust_signals` legacy shape | `trust_score_id` appears in application history but not in a reachable SQL migration defining this table | Likely prototype/manual DDL; not proven |
| `provider_health_snapshots` duplicate | Both pending migrations 13 and 18 create the same name | Confirmed repository target-history defect, independent of Production drift |

There is no evidence sufficient to claim who manually changed Production. Dashboard SQL, deleted unpushed migrations and operational scripts remain possible.

## Required transformations

For every merge:

1. Assert the exact Production fingerprint.
2. Add nullable compatibility columns.
3. Count legacy/null/invalid rows.
4. Backfill in bounded batches.
5. Validate checks and FKs as `NOT VALID` first where appropriate.
6. Add new RLS without dropping the legacy policy until behavior is tested.
7. Switch application dependencies.
8. Retain legacy columns through a measured compatibility window.
9. Remove legacy contracts only in a later approved cleanup.

For `trust_relationships` and `trust_signals`, do not alter in place into the new meaning. Introduce versioned tables and update new repositories explicitly.
