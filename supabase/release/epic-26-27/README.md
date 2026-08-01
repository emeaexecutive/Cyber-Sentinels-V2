# Epic 26/27 Staging Architecture Package

This is a review and validation package, not a deployment tool. It contains no secrets and performs no remote operation.

Apply the repository migrations in `ordered-migrations.txt`, only after `preflight.sql` succeeds. Then run `post-apply-validation.sql`, `rls-validation.sql`, and `integrity-validation.sql` in that order. Each script is read-only and fails closed with a descriptive exception.

The authoritative SQL remains in `supabase/migrations`; this directory intentionally contains references and hashes rather than copies. `manifest.json` inventories tables, views, RPCs, prerequisite objects, hashes, checks, limitations, and the canonical fixture.

## Rollback limitation

Epic 26/27 records are append-only and may be referenced by Replay, Trust Memory, Evidence Graph, decisions, packages, and audit history. Destructive rollback is unsupported. If staging validation fails, stop writes to the affected capability and create a new forward migration. Do not drop historical records, rewrite merged migrations, or alter the remote migration ledger.

## Known preflight blocker and forward plan

A clean repository preview currently encounters incompatible historical definitions of `provider_health_snapshots` before reaching Epic 26. The authorized repair is a new forward-only migration that inspects the existing shape, selects a canonical name/model, migrates without evidence loss, records the decision, and validates all dependent RPCs and policies. Until that repair and a clean preview are demonstrated, this package is not approved for staging execution.
