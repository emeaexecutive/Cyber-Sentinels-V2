NOT APPROVED FOR PRODUCTION

# Staging Reconciliation Proposal

These migrations are an isolated reconciliation sequence intended for testing
against a verified Production-like staging database.

Staging validation only.
Do not run against Production.
Do not mark historical migrations as applied.
Do not move into `supabase/migrations` without explicit approval.
No file in this directory is executed automatically by a deployment.

## Safety gate

Every phase requires the database session setting below:

```sql
set app.reconciliation.environment = 'staging';
```

The setting is deliberately absent from the SQL files. An operator must set it
on an explicit isolated staging connection. The linked Supabase project must
never be used to execute this proposal.

## Order

1. `202607300001_reconciliation_preflight.sql`
2. `202607300002_reconciliation_ledger.sql`
3. `202607300003_canonical_trust_foundation.sql`
4. `202607300004_consent_foundation.sql`
5. `202607300005_consent_persistence_rpc.sql`
6. `202607300006_consent_security_and_rls.sql`
7. `202607300007_reconciliation_validation.sql`

The sequence is forward-only, preserves the legacy `trust_events` rows, and
does not apply or mark applied any file in `supabase/migrations`.

## Execution

Use `psql` with `ON_ERROR_STOP=1` and an explicit staging connection. Set the
gate through the session, for example with `PGOPTIONS`, and apply one file at a
time. Stop on the first failure.

The rollback scripts are operator aids, not automatic down migrations. They
must be reviewed against the actual staging state before execution.
