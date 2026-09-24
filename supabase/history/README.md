# Recovered environment migration history

These files preserve database-recorded histories outside the canonical SQL
chain. They are archival inputs for an explicitly selected environment, not
new forward migrations for every deployment.

## Hosted Production history compatibility

The Supabase GitHub integration reads committed `supabase/migrations`; it does
not run the local preparation helper. Five comment-only files in that directory
represent these already-applied Production identities:

| Version | Preserved history |
| --- | --- |
| 20260819084252 | Alias of canonical 20260819082001 |
| 20260819084329 | Additional Production evidence-trigger privilege hardening |
| 20260902083450 | Alias of canonical 20260901120000 |
| 20260903095127 | Alias of canonical 20260903093116 |
| 20260904113046 | Alias of canonical 20260904100313 |

These markers contain no executable SQL. Their original statements remain in
`production/` and `production/ledger-definitions.json`, unchanged. They must
never be replaced with the archived SQL in the root migrations directory.
The release audit found all 116 committed versions already present in Production,
with zero pending versions; the hosted check therefore skips every file, without
changing Production history or replaying SQL. Recapture the live version list
before release; unknown remote or pending local versions must stop the release.

A fresh preview can record a marker's version, but the marker does not recreate
the archived operation. In particular, it does not establish Production's extra
trigger-function privilege hardening. These markers are history compatibility,
not proof of fresh-database schema or privilege parity.

The helper validates the exact five marker filenames and comment-only contents,
omits them, then copies the selected environment's archived originals as before.
Production's prepared context remains 111 canonical files plus five original
archive files. Staging receives only its own archive, without Production markers.
All other duplicate versions remain errors. Preparing a context is local only;
it does not authorize running its historical SQL against a new database.

See the [Supabase integration documentation](https://supabase.com/docs/guides/deployment/branching/github-integration)
and the version-based [pending migration selection](https://github.com/supabase/cli/blob/v2.116.0/apps/cli-go/pkg/migration/apply.go).

Use `node tools/release/prepare-migration-context.mjs staging` or `production`
to prepare a fresh, unlinked temporary CLI context containing the canonical
chain plus only that environment's recovered SQL. The helper performs no
network operations. Link and verify the exact project separately before use.

The older reconciliation documents below retain their historical counts and
execution plans; they are not current live release authorization or ledger counts.

Original statement arrays are preserved in each `ledger-definitions.json`.
SQL files concatenate those statements; line endings may follow Git checkout
normalization. Existing canonical migration files have not been edited.

See `docs/release/v1-database-reconciliation/RECONCILIATION_PLAN.md` for the
pre-repair evidence and `PRODUCTION_PLAN.md` in the same directory for the
read-only Production audit and future execution sequence.
