# Recovered environment migration history

These files preserve database-recorded histories missing from the canonical
`supabase/migrations` directory. They are archival inputs for an explicitly
selected environment, not new forward migrations for every deployment.

Use `node tools/release/prepare-migration-context.mjs staging` or `production`
to prepare a fresh, unlinked temporary CLI context containing the canonical
chain plus only that environment's recovered SQL. The helper performs no
network operations. Link and verify the exact project separately before use.

Staging: 109 canonical + 21 archived = 130 entries, all applied after the
September 2026 reconciliation. Production: 109 + 5 = 114 expected entries after
the separately authorized future plan; its live ledger remains at 108.

Original statement arrays are preserved in each `ledger-definitions.json`.
SQL files concatenate those statements; line endings may follow Git checkout
normalization. Existing canonical migration files have not been edited.

See `docs/release/v1-database-reconciliation/RECONCILIATION_PLAN.md` for the
pre-repair evidence and `PRODUCTION_PLAN.md` in the same directory for the
read-only Production audit and future execution sequence.
