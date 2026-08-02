# Epic 26/27 Staging Architecture Package

This is a review and validation package, not a deployment tool. It contains no secrets and performs no remote operation.

It prepares three canonical forward-only migrations for isolated staging architecture review; it does not apply them.

Apply the repository migrations in `migration-order.txt`, only after `preflight.sql` succeeds. Then run `post-apply-validation.sql`, `rls-validation.sql`, and `integrity-validation.sql` in that order. Each validation script is read-only and fails closed with a descriptive exception.

The authoritative SQL remains in `supabase/migrations`; this directory intentionally contains references and hashes rather than copies. `manifest.json` and `expected-inventory.json` inventory tables, views, RPC signatures, indexes, grants, policies, graph edges, Replay objects, Trust Memory dependencies, hashes, checks, limitations, and the canonical fixture.

See `rollback-limitations.md` for the destructive-rollback boundary and `forward-repair-plan.md` for the only approved response to the known preflight blocker.
