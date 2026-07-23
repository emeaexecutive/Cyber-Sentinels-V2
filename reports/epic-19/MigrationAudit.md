# EPIC 19.1 Supabase and Migration Audit

## Inventory

- 65 SQL migrations inspected in filename order.
- No duplicate migration timestamp/prefix was found.
- One legacy un-timestamped migration, `001_initial_schema.sql`, sorts first and is the schema baseline.
- 127 `ENABLE ROW LEVEL SECURITY` statements and 248 `CREATE POLICY` statements were identified statically.
- Security-definer functions reviewed use an explicit `search_path = public` pattern.

## Critical blocker

No authoritative linked Supabase migration status or dry run was available. The latest trust-event, consent, consensus, trust-architecture, and continuous-trust migrations therefore remain unproved against the production schema. The live RLS harness also lacked its explicit opt-in, user JWT, tenant-B ID, URL, and anon key.

No migration was applied.

## `candidate_profile_id` verification

`202606090001_hiring_security_interview_integrity.sql` now:

- checks for both `candidate_id` and legacy `candidate_profile_id`;
- performs the legacy backfill only when both columns exist;
- emits a notice and continues when the legacy column is absent;
- separately guards the legacy `status` to `session_status` backfill;
- retains an idempotent null-only risk-level update.

The mandatory cookie-consent test includes a regression assertion for this guard and passed.

## Findings

### HIGH

1. `202605300002_align_evidence_file_url.sql` backfills `file_url` and then drops `evidence_url`. The guard prevents a missing-column error, but the drop is destructive and rollback requires backup or prior schema restoration.
2. `202607210001_enterprise_trust_architecture.sql` and `202607210002_continuous_trust_runtime.sql` contain material backfills/updates. These need staged row-count, lock-duration, and rollback evidence before production.
3. The latest runtime migration changes/reuses `trust_alerts`, extends evidence/state models, and installs service-only security-definer functions. Static contracts pass, but live privilege behavior is unproved.

### MEDIUM

1. Legacy and modern trust tables coexist (`trust_timeline_events` / canonical `trust_events`, legacy replay / modern Replay). Repository truth documentation defines authority, but schema complexity increases migration risk.
2. Several security-definer functions rely on `auth.role() = 'service_role'` plus revoked grants. This is sound statically but requires live privilege inspection after migration.
3. Backfills do not include explicit batching. Staged execution should measure table sizes and lock behavior.

### INFORMATIONAL

- New object creation generally uses `IF NOT EXISTS`.
- Policies are commonly dropped before recreation, improving repeatability.
- Service-only RPC functions revoke public/anon/authenticated execution and grant service-role execution.
- UUID types are consistently used in current trust architecture paths.
- Static RLS tests passed for provider, identity, trust event, consent, consensus, architecture, and continuous trust contracts.

## Required migration gate

1. Link an approved non-production Supabase project.
2. Inspect remote migration status.
3. Back up and record affected row counts.
4. Apply all pending migrations in order in non-production.
5. Run `supabase/verification/production-verification.sql` read-only.
6. Execute the two-tenant live RLS denial harness.
7. Exercise `candidate_profile_id` both with and without the legacy column.
8. Record rollback and lock-duration evidence.
9. Only then schedule reviewed production migration execution.

## Outcome

**MIGRATION GATE BLOCKED.**

